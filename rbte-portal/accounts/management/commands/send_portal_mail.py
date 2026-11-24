"""One bounded batch, run by a systemd timer. Never log message bodies or SMTP errors."""
import secrets
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from accounts.models import MailJob, User, RateBucket


def deliver(job_id):
    # IMMEDIATE SQLite transaction serializes workers and password updates.
    # SMTP remains inside the transaction: a failed send rolls back a password change.
    with transaction.atomic():
        job = MailJob.objects.select_for_update().get(pk=job_id)
        if job.sent_at or job.failed or job.next_attempt > timezone.now():
            return
        if timezone.now() - job.created_at > timedelta(hours=24):
            job.failed = True
            job.save(update_fields=["failed"])
            return
        if job.kind == "reset":
            user = User.objects.get(pk=job.user_id)
            if not user.is_active or not user.has_usable_password() or user.password != job.password_snapshot:
                job.failed = True
                job.password_snapshot = ""
                job.save(update_fields=["failed", "password_snapshot"])
                return
            new_password = secrets.token_urlsafe(18)
            user.set_password(new_password)
            user.save(update_fields=["password"])
            recipient = user.email
            subject = "RBTE: новый пароль для входа"
            body = (f"Для вашей учётной записи запрошено восстановление доступа.\n\n"
                    f"Вход: https://rbte.pro/\nEmail: {user.email}\nНовый пароль: {new_password}\n\n"
                    "Старые сеансы входа завершены. При желании измените пароль в личном кабинете.\n"
                    "Если вы не запрашивали восстановление, свяжитесь с администратором портала.\n"
                    "Не пересылайте это письмо и удалите его после смены пароля.")
        elif job.kind == "request":
            access = job.access_request
            recipient = settings.ADMIN_EMAIL
            subject = "RBTE: заявка на подключение к порталу"
            body = (f"Имя: {access.name}\nEmail: {access.email}\nОрганизация: {access.organization}\n\n"
                    "Проверьте заявку в https://rbte.pro/admin/accounts/accessrequest/\n"
                    "Создайте пользователя в разделе «Пользователи», назначьте пароль и передайте его по согласованному каналу.\n"
                    "После обработки отметьте заявку как обработанную.")
        else:
            recipient = settings.ADMIN_EMAIL
            subject = "RBTE: проверка отправки почты"
            body = "Отправка писем портала RBTE настроена.\nhttps://rbte.pro/"
        if send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=False) != 1:
            raise RuntimeError("Mail backend did not accept the message")
        job.sent_at = timezone.now()
        job.attempts += 1
        job.password_snapshot = ""
        job.save(update_fields=["sent_at", "attempts", "password_snapshot"])


class Command(BaseCommand):
    help = "Отправить до 20 писем очереди; пароли и SMTP-секреты не выводятся."

    def handle(self, *args, **options):
        failures = 0
        jobs = list(MailJob.objects.filter(sent_at__isnull=True, failed=False, next_attempt__lte=timezone.now()).order_by("id").values_list("id", flat=True)[:20])
        for job_id in jobs:
            try:
                deliver(job_id)
            except Exception:
                # Exception text can include SMTP credentials, addresses or message data.
                with transaction.atomic():
                    job = MailJob.objects.get(pk=job_id)
                    job.attempts += 1
                    job.failed = job.attempts >= 5
                    job.next_attempt = timezone.now() + timedelta(minutes=5)
                    if job.failed:
                        job.password_snapshot = ""
                    job.save(update_fields=["attempts", "failed", "next_attempt", "password_snapshot"])
                failures += 1
                self.stderr.write(f"Письмо #{job_id}: ошибка доставки; проверьте SMTP и очередь в кабинете администратора.")
        RateBucket.objects.filter(expires__lt=timezone.now()).delete()
        MailJob.objects.filter(created_at__lt=timezone.now() - timedelta(days=30)).delete()
        if failures:
            self.stderr.write(f"Не отправлено писем: {failures}. Следующая попытка через 5 минут, максимум 5 попыток.")
