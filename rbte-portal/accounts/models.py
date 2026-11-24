from urllib.parse import urlsplit
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=email.strip().lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if not extra["is_staff"] or not extra["is_superuser"]:
            raise ValueError("Superuser requires is_staff and is_superuser")
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField("Email / логин", unique=True)
    pilot_enabled = models.BooleanField("Доступ к Pilot", default=False, db_default=False)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        constraints = [models.UniqueConstraint(Lower("email"), name="user_email_case_unique")]
        verbose_name = "пользователь"
        verbose_name_plural = "пользователи"

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


def service_url(value):
    URLValidator(schemes=["https"])(value)
    parsed = urlsplit(value)
    host = parsed.hostname or ""
    if not host.endswith(".rbte.pro") or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValidationError("Укажите HTTPS-адрес сервиса в поддомене rbte.pro без пароля и нестандартного порта.")


class Service(models.Model):
    name = models.CharField("Название", max_length=100)
    description = models.CharField("Описание", max_length=250, blank=True)
    url = models.URLField("Адрес", unique=True, validators=[service_url])
    enabled = models.BooleanField("Показывать в кабинете", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "сервис"
        verbose_name_plural = "сервисы"

    def __str__(self):
        return self.name


class AccessRequest(models.Model):
    email = models.EmailField("Email", unique=True)
    name = models.CharField("Имя", max_length=120)
    organization = models.CharField("Организация", max_length=160, blank=True)
    created_at = models.DateTimeField("Получена", auto_now_add=True)
    processed = models.BooleanField("Обработана", default=False)

    class Meta:
        verbose_name = "заявка на подключение"
        verbose_name_plural = "заявки на подключение"

    def __str__(self):
        return self.email


class MailJob(models.Model):
    kind = models.CharField(max_length=20, choices=[("request", "Заявка"), ("reset", "Сброс пароля"), ("test", "Проверка SMTP")])
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
    access_request = models.ForeignKey(AccessRequest, null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    next_attempt = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    failed = models.BooleanField(default=False)
    # Hash snapshot invalidates a queued reset when a password changes before sending.
    password_snapshot = models.CharField(max_length=256, blank=True)

    class Meta:
        indexes = [models.Index(fields=["sent_at", "failed", "next_attempt"])]
        verbose_name = "почтовое задание"
        verbose_name_plural = "почтовая очередь"


class RateBucket(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    count = models.PositiveIntegerField(default=0)
    expires = models.DateTimeField(db_index=True)


class SimulatorGrant(models.Model):
    code_hash = models.CharField(max_length=64, primary_key=True)
    challenge = models.CharField(max_length=64)
    session_key = models.CharField(max_length=40)
    code_expires_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    grant_hash = models.CharField(max_length=64, unique=True, null=True)


class PilotGrant(models.Model):
    code_hash = models.CharField(max_length=64, primary_key=True)
    challenge = models.CharField(max_length=64)
    session_key = models.CharField(max_length=40)
    code_expires_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    grant_hash = models.CharField(max_length=64, unique=True, null=True)
