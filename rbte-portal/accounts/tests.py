import re
from datetime import timedelta
from unittest.mock import patch
from django.conf import settings
from django.contrib.auth import authenticate
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase, Client
from django.utils import timezone
from .models import User, AccessRequest, MailJob, Service, RateBucket, service_url
from .management.commands.send_portal_mail import deliver

PASSWORD = "Initial-Strong-Pass!2026"
NEW_PASSWORD = "My-New-Strong-Pass!2026"


class PortalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("member@example.test", PASSWORD)
        self.client = Client()

    def login(self):
        return self.client.post("/", {"username": self.user.email, "password": PASSWORD}, secure=True)

    def reset_job(self):
        return MailJob.objects.create(kind="reset", user=self.user, password_snapshot=self.user.password, next_attempt=timezone.now())

    def test_login_ui(self):
        response = self.client.get("/", secure=True)
        self.assertContains(response, "Авторизоваться")
        self.assertContains(response, "Зарегистрироваться")
        self.assertContains(response, "Забыл пароль")

    def test_services_require_login(self):
        self.assertRedirects(self.client.get("/services/", secure=True), "/?next=/services/", fetch_redirect_response=False)

    def test_email_case_and_session_rotation(self):
        self.client.get("/", secure=True)
        before = self.client.session.session_key
        response = self.client.post("/", {"username": "MEMBER@EXAMPLE.TEST", "password": PASSWORD}, secure=True)
        self.assertEqual(response.status_code, 302)
        self.assertNotEqual(before, self.client.session.session_key)
        self.assertEqual(self.client.get("/services/", secure=True).status_code, 200)

    def test_wrong_password_and_inactive_user(self):
        self.assertEqual(self.client.post("/", {"username": self.user.email, "password": "wrong"}, secure=True).status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.user.is_active = False
        self.user.save()
        self.login()
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_external_next_not_followed(self):
        response = self.client.post("/?next=https://evil.example/", {"username": self.user.email, "password": PASSWORD}, secure=True)
        self.assertEqual(response.url, "/services/")

    def test_csrf_required_on_login_registration_reset_logout(self):
        browser = Client(enforce_csrf_checks=True)
        for url in ("/", "/register/", "/forgot-password/", "/logout/"):
            self.assertEqual(browser.post(url, {"email": self.user.email}, secure=True).status_code, 403)

    def test_foreign_origin_csrf_rejected(self):
        browser = Client(enforce_csrf_checks=True)
        response = browser.get("/", secure=True)
        token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.content.decode()).group(1)
        response = browser.post("/", {"csrfmiddlewaretoken": token, "username": self.user.email, "password": PASSWORD}, secure=True, HTTP_ORIGIN="https://pilot.rbte.pro")
        self.assertEqual(response.status_code, 403)

    def test_same_origin_csrf_login_succeeds(self):
        browser = Client(enforce_csrf_checks=True)
        response = browser.get("/", secure=True, HTTP_HOST="rbte.pro")
        token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.content.decode()).group(1)
        response = browser.post("/", {"csrfmiddlewaretoken": token, "username": self.user.email, "password": PASSWORD}, secure=True, HTTP_HOST="rbte.pro", HTTP_ORIGIN="https://rbte.pro")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(browser.get("/services/", secure=True, HTTP_HOST="rbte.pro").status_code, 200)

    def test_secure_host_only_cookies(self):
        response = self.login()
        cookie = response.cookies[settings.SESSION_COOKIE_NAME]
        self.assertTrue(cookie["secure"])
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertFalse(cookie["domain"])
        self.assertEqual(cookie["path"], "/")

    def test_logout_post_only_and_invalidates_session(self):
        self.login()
        self.assertEqual(self.client.get("/logout/", secure=True).status_code, 405)
        self.client.post("/logout/", secure=True)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_regular_user_cannot_access_admin(self):
        self.login()
        self.assertEqual(self.client.get("/admin/", secure=True).status_code, 302)

    def test_role_headers_cannot_elevate(self):
        self.login()
        response = self.client.get("/admin/", secure=True, HTTP_X_PORTAL_ROLE="admin", HTTP_X_PORTAL_USER_ID="admin")
        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_register_queues_admin_mail_without_creating_user(self):
        response = self.client.post("/register/", {"email": "NEW@example.test", "name": "Иван", "organization": "Тест"}, secure=True)
        self.assertEqual(response.url, "/register/done/")
        self.assertFalse(User.objects.filter(email="new@example.test").exists())
        job = MailJob.objects.get(kind="request")
        deliver(job.pk)
        self.assertEqual(mail.outbox[0].to, [settings.ADMIN_EMAIL])
        self.assertIn("new@example.test", mail.outbox[0].body)

    def test_registered_email_is_reported_without_creating_request_or_mail(self):
        response = self.client.post(
            "/register/", {"email": self.user.email.upper(), "name": "Test"}, secure=True
        )
        self.assertContains(response, "Этот email уже зарегистрирован. Войдите в портал.")
        self.assertFalse(AccessRequest.objects.exists())
        self.assertFalse(MailJob.objects.exists())

    def test_duplicate_request_is_reported_without_duplicate_mail(self):
        data = {"email": "new@example.test", "name": "Test"}
        first = self.client.post("/register/", data, secure=True)
        second = self.client.post("/register/", data, secure=True)
        self.assertRedirects(first, "/register/done/", fetch_redirect_response=False)
        self.assertContains(second, "Заявка с этим email уже получена.")
        self.assertEqual(AccessRequest.objects.count(), 1)
        self.assertEqual(MailJob.objects.count(), 1)

    def test_reset_unknown_and_known_same_response(self):
        known = self.client.post("/forgot-password/", {"email": self.user.email}, secure=True)
        unknown = self.client.post("/forgot-password/", {"email": "unknown@example.test"}, secure=True)
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.url, unknown.url)
        self.assertEqual(MailJob.objects.count(), 1)

    def test_reset_sends_random_password_revokes_session_change_is_optional(self):
        self.login()
        original = self.user.password
        job = self.reset_job()
        deliver(job.pk)
        self.user.refresh_from_db()
        self.assertNotEqual(original, self.user.password)
        password = re.search(r"Новый пароль: (\S+)", mail.outbox[0].body).group(1)
        self.assertGreaterEqual(len(password), 24)
        self.assertTrue(self.user.check_password(password))
        self.assertEqual(self.client.get("/services/", secure=True).status_code, 302)
        self.client.post("/", {"username": self.user.email, "password": password}, secure=True)
        self.assertEqual(self.client.get("/services/", secure=True).status_code, 200)
        response = self.client.post("/password/", {"old_password": password, "new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD}, secure=True)
        self.assertEqual(response.url, "/password/done/")
        self.user.refresh_from_db()
        self.assertEqual(self.client.get("/services/", secure=True).status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.password_snapshot, "")

    def test_smtp_failure_keeps_old_password(self):
        job = self.reset_job()
        with patch("accounts.management.commands.send_portal_mail.send_mail", side_effect=OSError("test smtp failure")):
            with self.assertRaises(OSError):
                deliver(job.pk)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
        job.refresh_from_db()
        self.assertIsNone(job.sent_at)

    def test_retry_does_not_log_smtp_secrets(self):
        import io
        job = self.reset_job()
        output = io.StringIO()
        with patch("accounts.management.commands.send_portal_mail.send_mail", side_effect=OSError("DO-NOT-LOG-secret")):
            call_command("send_portal_mail", stderr=output)
        self.assertNotIn("DO-NOT-LOG-secret", output.getvalue())
        job.refresh_from_db()
        self.assertEqual(job.attempts, 1)
        self.assertGreater(job.next_attempt, timezone.now())

    def test_reset_job_not_replayed(self):
        job = self.reset_job()
        deliver(job.pk)
        self.user.refresh_from_db()
        password_hash = self.user.password
        deliver(job.pk)
        self.user.refresh_from_db()
        self.assertEqual(password_hash, self.user.password)
        self.assertEqual(len(mail.outbox), 1)

    def test_stale_reset_cancelled_after_password_change(self):
        job = self.reset_job()
        self.user.set_password(NEW_PASSWORD)
        self.user.save()
        deliver(job.pk)
        job.refresh_from_db()
        self.assertTrue(job.failed)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_disabled_user_no_mail(self):
        self.user.is_active = False
        self.user.save()
        self.client.post("/forgot-password/", {"email": self.user.email}, secure=True)
        self.assertEqual(MailJob.objects.count(), 0)

    def test_reset_rate_limited_one_per_hour(self):
        for _ in range(3):
            self.client.post("/forgot-password/", {"email": self.user.email}, secure=True)
        self.assertEqual(MailJob.objects.count(), 1)

    def test_login_rate_limit_is_shared_and_email_based(self):
        for i in range(10):
            response = Client().post("/", {"username": self.user.email, "password": "wrong"}, secure=True, HTTP_X_REAL_IP=f"192.0.2.{i}")
            self.assertEqual(response.status_code, 200)
        response = Client().post("/", {"username": self.user.email, "password": PASSWORD}, secure=True, HTTP_X_REAL_IP="198.51.100.1")
        self.assertEqual(response.status_code, 429)
        self.assertNotIn(self.user.email, " ".join(RateBucket.objects.values_list("key", flat=True)))

    def test_unknown_host_rejected(self):
        self.assertEqual(self.client.get("/", secure=True, HTTP_HOST="evil.example").status_code, 400)

    def test_security_headers(self):
        response = self.client.get("/", secure=True)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response["X-Frame-Options"], "DENY")
        self.assertIn("form-action 'self'", response["Content-Security-Policy"])

    def test_service_link_validation(self):
        for url in ("http://simulator.rbte.pro/", "https://evil.example/", "https://rbte.pro.evil.example/", "https://user:pass@pilot.rbte.pro/", "https://pilot.rbte.pro:8100/"):
            with self.assertRaises(ValidationError):
                service_url(url)
        service_url("https://simulator.rbte.pro/")

    def test_email_unique_case_insensitive(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user("MEMBER@EXAMPLE.TEST", PASSWORD)

    def test_service_text_escaped_and_disabled_hidden(self):
        Service.objects.create(name="<script>alert(1)</script>", url="https://a.rbte.pro/")
        Service.objects.create(name="Hidden", url="https://b.rbte.pro/", enabled=False)
        self.login()
        response = self.client.get("/services/", secure=True)
        self.assertContains(response, "&lt;script&gt;")
        self.assertNotContains(response, "<script>alert(1)</script>")
        self.assertNotContains(response, "Hidden")

    def test_admin_can_create_user_with_password(self):
        admin = User.objects.create_superuser("admin@example.test", PASSWORD)
        self.client.force_login(admin)
        response = self.client.post("/admin/accounts/user/add/", {"email": "created@example.test", "first_name": "Анна", "last_name": "", "password1": NEW_PASSWORD, "password2": NEW_PASSWORD, "_save": "Save"}, secure=True)
        self.assertEqual(response.status_code, 302, response.content[:1000])
        created = User.objects.get(email="created@example.test")
        self.assertTrue(created.check_password(NEW_PASSWORD))
        self.assertFalse(created.is_staff)

    def test_initial_admin_password_can_access_admin_without_change(self):
        admin = User.objects.create_superuser("admin@example.test", PASSWORD)
        self.client.force_login(admin)
        self.assertEqual(self.client.get("/admin/", secure=True).status_code, 200)

    def test_admin_can_assign_new_password(self):
        admin = User.objects.create_superuser("admin@example.test", PASSWORD)
        self.client.force_login(admin)
        response = self.client.post(f"/admin/accounts/user/{self.user.pk}/password/", {"password1": NEW_PASSWORD, "password2": NEW_PASSWORD, "set-password": "1"}, secure=True)
        self.assertEqual(response.status_code, 302, response.content[:1000])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_cooldown_is_rolling_across_hour_boundary(self):
        from .limits import consume_cooldown
        now = timezone.now().replace(minute=59, second=59)
        with patch("accounts.limits.timezone.now", return_value=now):
            self.assertTrue(consume_cooldown("test", "member@example.test", 3600))
        with patch("accounts.limits.timezone.now", return_value=now + timedelta(seconds=2)):
            self.assertFalse(consume_cooldown("test", "member@example.test", 3600))
        with patch("accounts.limits.timezone.now", return_value=now + timedelta(seconds=3601)):
            self.assertTrue(consume_cooldown("test", "member@example.test", 3600))

    def test_password_change_invalidates_other_sessions(self):
        self.login()
        other = Client()
        other.force_login(self.user)
        self.client.post("/password/", {"old_password": PASSWORD, "new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD}, secure=True)
        self.assertEqual(other.get("/services/", secure=True).status_code, 302)
        self.assertEqual(self.client.get("/services/", secure=True).status_code, 200)
