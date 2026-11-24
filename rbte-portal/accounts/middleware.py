from django.http import HttpResponse
from .limits import consume


class PortalMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        limited = request.method == "POST" and (request.path in ("/", "/admin/login/", "/register/", "/forgot-password/") or request.path.startswith("/reset/"))
        if limited:
            # Nginx overwrites this header; Waitress is loopback-only.
            ip = request.META.get("HTTP_X_REAL_IP", request.META.get("REMOTE_ADDR", "unknown"))
            if not consume("post-ip", ip, 30, 600):
                return self.finish(HttpResponse("Слишком много попыток. Повторите через 10 минут.", status=429))
            identity = request.POST.get("username", request.POST.get("email", "")).strip().lower()[:254]
            if identity and not consume("post-email", identity, 10, 600):
                return self.finish(HttpResponse("Слишком много попыток. Повторите через 10 минут.", status=429))
        return self.finish(self.get_response(request))

    @staticmethod
    def finish(response):
        response["Cache-Control"] = "no-store"
        response["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        if response.status_code == 429:
            response["Retry-After"] = "600"
        return response
