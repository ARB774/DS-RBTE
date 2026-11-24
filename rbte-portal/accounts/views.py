from django.contrib.auth.decorators import login_required
from django.contrib.auth import login as auth_login
from django.contrib.auth.views import LoginView
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods, require_GET
from django.utils import timezone
from django.db import transaction
from .forms import LoginForm, AccessRequestForm, ResetRequestForm
from .models import User, Service, AccessRequest, MailJob
from .limits import consume, consume_cooldown


class PortalLogin(LoginView):
    template_name = "registration/login.html"
    authentication_form = LoginForm
    redirect_authenticated_user = True

    def form_valid(self, form):
        if self.request.headers.get("Accept") == "application/json":
            target = self.get_success_url()  # Django validates next against this host.
            auth_login(self.request, form.get_user())
            return JsonResponse({"redirect": target})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get("Accept") == "application/json":
            return JsonResponse({"error": "Не удалось войти. Проверьте email и пароль."}, status=400)
        return super().form_invalid(form)


@login_required
@require_GET
def services(request):
    return render(request, "accounts/services.html", {"services": Service.objects.filter(enabled=True)})


@require_http_methods(["GET", "POST"])
def register(request):
    form = AccessRequestForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        if not consume("registration-global", "all", 200, 86400):
            form.add_error(None, "Приём заявок временно ограничен. Повторите завтра.")
            return render(request, "accounts/register.html", {"form": form}, status=429)
        email = form.cleaned_data["email"]
        with transaction.atomic():
            if User.objects.filter(email__iexact=email).exists():
                form.add_error("email", "Этот email уже зарегистрирован. Войдите в портал.")
                return render(request, "accounts/register.html", {"form": form})
            access, created = AccessRequest.objects.get_or_create(
                email=email,
                defaults={"name": form.cleaned_data["name"], "organization": form.cleaned_data["organization"]},
            )
            if created:
                MailJob.objects.create(kind="request", access_request=access, next_attempt=timezone.now())
                return redirect("request_done")
        form.add_error("email", "Заявка с этим email уже получена.")
    return render(request, "accounts/register.html", {"form": form})


@require_GET
def request_done(request):
    return render(request, "accounts/request_done.html")


@require_http_methods(["GET", "POST"])
def forgot_password(request):
    form = ResetRequestForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        email = form.cleaned_data["email"]
        permitted = consume_cooldown("reset-recipient", email, 3600) and consume("reset-global", "all", 200, 86400)
        if permitted:
            # No SMTP in the request path. Public reply is identical for unknown accounts.
            user = User.objects.filter(email=email, is_active=True).first()
            if user and user.has_usable_password():
                MailJob.objects.create(kind="reset", user=user, password_snapshot=user.password, next_attempt=timezone.now())
        return redirect("password_reset_done")
    return render(request, "registration/password_reset_form.html", {"form": form})


@require_GET
def health(request):
    # A SELECT verifies DB reachability, not SMTP delivery or service integrations.
    Service.objects.exists()
    return JsonResponse({"status": "ok"})
