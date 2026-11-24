from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from accounts.models import MailJob
from .send_portal_mail import deliver


class Command(BaseCommand):
    help = "Отправить проверочное письмо администратору."

    def handle(self, *args, **options):
        job = MailJob.objects.create(kind="test", next_attempt=timezone.now())
        try:
            deliver(job.pk)
        except Exception:
            job.failed = True
            job.save(update_fields=["failed"])
            raise CommandError("SMTP не принял письмо. Проверьте сервер, порт, режим TLS, логин, пароль приложения и отправителя.") from None
        self.stdout.write("SMTP принял письмо. Проверьте входящие и спам администратора.")
