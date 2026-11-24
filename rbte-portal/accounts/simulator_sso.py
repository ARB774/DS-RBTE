"""Single-service authorization codes and online, revocable session grants."""
import hashlib
import json
import re
import secrets
from datetime import timedelta
from importlib import import_module
from pathlib import Path
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .limits import consume
from .models import SimulatorGrant

TOKEN = re.compile(r"^[A-Za-z0-9_-]{43}$")
CALLBACK = "https://simulator.rbte.pro/auth/callback"


def digest(value):
    return hashlib.sha256(value.encode("ascii")).hexdigest()


def bridge_key():
    if settings.TESTING:
        return "isolated-sso-test-key-" * 3
    return Path("/etc/rbte-portal/simulator-sso.key").read_text().strip()


@login_required
@require_GET
def authorize(request):
    state = request.GET.get("state", "")
    challenge = request.GET.get("code_challenge", "")
    if not TOKEN.fullmatch(state) or not re.fullmatch(r"[a-f0-9]{64}", challenge):
        return JsonResponse({"error": "invalid_request"}, status=400)
    if not consume("simulator-login", str(request.user.pk), 30, 600):
        return JsonResponse({"error": "rate_limited"}, status=429)
    now = timezone.now()
    SimulatorGrant.objects.filter(expires_at__lte=now).delete()
    code = secrets.token_urlsafe(32)
    SimulatorGrant.objects.create(
        code_hash=digest(code), challenge=challenge,
        session_key=request.session.session_key,
        code_expires_at=now + timedelta(seconds=90),
        expires_at=min(request.session.get_expiry_date(), now + timedelta(hours=8)),
    )
    response = HttpResponseRedirect(CALLBACK + "?" + urlencode({"code": code, "state": state}))
    response["Referrer-Policy"] = "no-referrer"
    return response


def session_user(grant):
    # Django checks both account activation and the session's password hash.
    class SessionRequest:
        session = import_module(settings.SESSION_ENGINE).SessionStore(grant.session_key)
    return get_user(SessionRequest())


@csrf_exempt  # Machine-only: loopback AND a separate 256-bit bridge credential.
@require_POST
def internal(request):
    if request.META.get("REMOTE_ADDR") not in ("127.0.0.1", "::1"):
        return JsonResponse({"error": "forbidden"}, status=403)
    try:
        key = bridge_key()
    except OSError:
        return JsonResponse({"error": "unavailable"}, status=503)
    if len(key) < 32 or not secrets.compare_digest(
        request.headers.get("Authorization", ""), "Bearer " + key
    ):
        return JsonResponse({"error": "forbidden"}, status=403)
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_request"}, status=400)
    now = timezone.now()
    if data.get("action") == "exchange":
        code, verifier = data.get("code", ""), data.get("verifier", "")
        if not isinstance(code, str) or not isinstance(verifier, str) or not TOKEN.fullmatch(code) or not TOKEN.fullmatch(verifier):
            return JsonResponse({"error": "invalid_code"}, status=401)
        with transaction.atomic():
            grant = SimulatorGrant.objects.select_for_update().filter(
                code_hash=digest(code), grant_hash__isnull=True,
                code_expires_at__gt=now, expires_at__gt=now,
            ).first()
            if grant is None or not secrets.compare_digest(grant.challenge, digest(verifier)):
                return JsonResponse({"error": "invalid_code"}, status=401)
            if not session_user(grant).is_authenticated:
                return JsonResponse({"error": "session_expired"}, status=401)
            token = secrets.token_urlsafe(32)
            grant.grant_hash = digest(token)
            grant.save(update_fields=["grant_hash"])
        return JsonResponse({"token": token})
    token = data.get("token", "")
    if not isinstance(token, str) or not TOKEN.fullmatch(token):
        return JsonResponse({"error": "invalid_session"}, status=401)
    grant = SimulatorGrant.objects.filter(grant_hash=digest(token), expires_at__gt=now).first()
    if grant is None:
        return JsonResponse({"error": "invalid_session"}, status=401)
    if data.get("action") == "revoke":
        grant.delete()
        return JsonResponse({"ok": True})
    if data.get("action") != "validate":
        return JsonResponse({"error": "invalid_request"}, status=400)
    user = session_user(grant)
    if not user.is_authenticated:
        return JsonResponse({"error": "session_expired"}, status=401)
    # Portal staff/superuser privileges do not imply access to others' simulations.
    return JsonResponse({"id": str(user.pk), "name": (user.get_full_name() or user.email)[:255], "role": "user"})
