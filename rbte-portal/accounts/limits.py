import hashlib
import hmac
import time
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import RateBucket


def consume(scope, identity, limit, seconds):
    """Shared, atomic SQLite counter. Store HMAC identifiers, not email/IP values."""
    window = int(time.time()) // seconds
    key = hmac.new(settings.SECRET_KEY.encode(), f"{scope}:{window}:{identity}".encode(), hashlib.sha256).hexdigest()
    with transaction.atomic():
        bucket, _ = RateBucket.objects.get_or_create(key=key, defaults={"expires": timezone.now() + timedelta(seconds=seconds)})
        if bucket.count >= limit:
            return False
        bucket.count += 1
        bucket.save(update_fields=["count"])
    return True


def consume_cooldown(scope, identity, seconds):
    """A rolling cooldown, unaffected by wall-clock hour boundaries."""
    key = hmac.new(settings.SECRET_KEY.encode(), f"cooldown:{scope}:{identity}".encode(), hashlib.sha256).hexdigest()
    with transaction.atomic():
        now = timezone.now()
        bucket = RateBucket.objects.filter(key=key).first()
        if bucket and bucket.expires > now:
            return False
        RateBucket.objects.update_or_create(key=key, defaults={"count": 1, "expires": now + timedelta(seconds=seconds)})
    return True
