import hashlib
import secrets
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

from django.contrib.sessions.models import Session
from django.test import Client, TestCase
from django.utils import timezone

from .models import SimulatorGrant, User
from .simulator_sso import bridge_key


class SimulatorSSOTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("sso@example.test", "Strong!Test2026-Password")
        self.client.force_login(self.user)
        self.verifier = secrets.token_urlsafe(32)
        self.state = secrets.token_urlsafe(32)

    def authorize(self):
        response = self.client.get("/sso/simulator/", {
            "state": self.state,
            "code_challenge": hashlib.sha256(self.verifier.encode()).hexdigest(),
        }, secure=True)
        self.assertEqual(response.status_code, 302)
        url = urlsplit(response.url)
        self.assertEqual(url.scheme + "://" + url.netloc + url.path,
                         "https://simulator.rbte.pro/auth/callback")
        self.assertEqual(parse_qs(url.query)["state"], [self.state])
        return parse_qs(url.query)["code"][0]

    def internal(self, data, **headers):
        return self.client.post("/internal/simulator/", data, content_type="application/json",
                                secure=True, HTTP_AUTHORIZATION="Bearer " + bridge_key(), **headers)

    def grant(self):
        response = self.internal({"action": "exchange", "code": self.authorize(), "verifier": self.verifier})
        self.assertEqual(response.status_code, 200)
        return response.json()["token"]

    def test_login_required_and_input_validation(self):
        self.assertEqual(Client().get("/sso/simulator/", secure=True).status_code, 302)
        self.assertEqual(self.client.get("/sso/simulator/", secure=True).status_code, 400)

    def test_pkce_replay_and_online_validation(self):
        code = self.authorize()
        self.assertEqual(self.internal({"action": "exchange", "code": code, "verifier": secrets.token_urlsafe(32)}).status_code, 401)
        response = self.internal({"action": "exchange", "code": code, "verifier": self.verifier})
        self.assertEqual(response.status_code, 200)
        token = response.json()["token"]
        self.assertEqual(self.internal({"action": "exchange", "code": code, "verifier": self.verifier}).status_code, 401)
        result = self.internal({"action": "validate", "token": token})
        self.assertEqual(result.json(), {"id": str(self.user.pk), "name": self.user.email, "role": "user"})
        self.assertNotEqual(SimulatorGrant.objects.get().grant_hash, token)
        Session.objects.all().delete()
        self.assertEqual(self.internal({"action": "validate", "token": token}).status_code, 401)

    def test_machine_endpoint_requires_loopback_and_secret(self):
        self.assertEqual(self.client.post("/internal/simulator/", {}, content_type="application/json", secure=True).status_code, 403)
        self.assertEqual(self.internal({}, REMOTE_ADDR="203.0.113.10").status_code, 403)

    def test_disabled_user_and_password_change_revoke(self):
        token = self.grant()
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.internal({"action": "validate", "token": token}).status_code, 401)
        self.user.is_active = True
        self.user.save()
        self.client.force_login(self.user)
        token = self.grant()
        self.user.set_password("Another!Strong-Password2026")
        self.user.save()
        self.assertEqual(self.internal({"action": "validate", "token": token}).status_code, 401)

    def test_expiration_revoke_and_no_admin_escalation(self):
        self.user.is_superuser = self.user.is_staff = True
        self.user.first_name = self.user.last_name = "x" * 150
        self.user.save()
        token = self.grant()
        identity = self.internal({"action": "validate", "token": token}).json()
        self.assertEqual(identity["role"], "user")
        self.assertEqual(len(identity["name"]), 255)
        self.assertEqual(identity["id"], str(self.user.pk))
        self.assertEqual(self.internal({"action": "revoke", "token": token}).status_code, 200)
        self.assertEqual(self.internal({"action": "validate", "token": token}).status_code, 401)
        code = self.authorize()
        SimulatorGrant.objects.update(code_expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.internal({"action": "exchange", "code": code, "verifier": self.verifier}).status_code, 401)
        token = self.grant()
        SimulatorGrant.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.internal({"action": "validate", "token": token}).status_code, 401)
