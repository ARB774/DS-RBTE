"""Fail-closed production settings; secrets live outside the release directory."""
import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TESTING = os.environ.get("RBTE_TESTING") == "1"
if TESTING:
    CONFIG = {"secret_key": "isolated-test-key-only-not-for-production-" * 2,
              "admin_email": "admin@example.test", "smtp_host": "localhost",
              "smtp_user": "", "smtp_password": "", "from_email": "portal@example.test"}
else:
    CONFIG = json.loads(Path(os.environ.get("RBTE_CONFIG", "/etc/rbte-portal/config.json")).read_text(encoding="utf-8"))

SECRET_KEY = CONFIG["secret_key"]
if len(SECRET_KEY) < 50:
    raise ValueError("secret_key must have at least 50 characters")
DEBUG = False
ALLOWED_HOSTS = ["rbte.pro"] if not TESTING else ["testserver", "localhost", "127.0.0.1", "rbte.pro"]
CSRF_TRUSTED_ORIGINS = ["https://rbte.pro"]
INSTALLED_APPS = ["django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
                  "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles", "accounts"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "django.contrib.sessions.middleware.SessionMiddleware",
              "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware",
              "django.contrib.auth.middleware.AuthenticationMiddleware", "django.contrib.messages.middleware.MessageMiddleware",
              "django.middleware.clickjacking.XFrameOptionsMiddleware", "accounts.middleware.PortalMiddleware"]
ROOT_URLCONF = "rbte.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": [BASE_DIR / "templates"],
              "APP_DIRS": True, "OPTIONS": {"context_processors": ["django.template.context_processors.request",
                  "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "rbte.wsgi.application"
DATA_DIR = Path(os.environ.get("RBTE_TEST_DATA", str(BASE_DIR / ".test-data"))) if TESTING else Path("/var/lib/rbte-portal")
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": DATA_DIR / "portal.sqlite3",
                          "OPTIONS": {"timeout": 20, "transaction_mode": "IMMEDIATE"}}}
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["accounts.backends.EmailBackend"]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Yekaterinburg"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LOGIN_URL = "/"
LOGIN_REDIRECT_URL = "/services/"
LOGOUT_REDIRECT_URL = "/"
SESSION_COOKIE_NAME = "__Host-rbte_session"
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 8 * 60 * 60
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_COOKIE_NAME = "__Host-rbte_csrf"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_SSL_REDIRECT = not TESTING
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
# Other rbte.pro subdomains are managed separately; don't impose HSTS/preload on them.
SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
DATA_UPLOAD_MAX_MEMORY_SIZE = 32768
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100
PASSWORD_RESET_TIMEOUT = 1800
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend" if TESTING else "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = CONFIG["smtp_host"]
EMAIL_PORT = int(CONFIG.get("smtp_port", 587))
EMAIL_HOST_USER = CONFIG["smtp_user"]
EMAIL_HOST_PASSWORD = CONFIG["smtp_password"]
EMAIL_USE_SSL = CONFIG.get("smtp_security", "starttls") == "ssl"
EMAIL_USE_TLS = not EMAIL_USE_SSL
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = CONFIG["from_email"]
ADMIN_EMAIL = CONFIG["admin_email"]
SERVER_EMAIL = DEFAULT_FROM_EMAIL
# SMTP exceptions are handled by the queue worker; request bodies and tokens are never logged.
LOGGING = {"version": 1, "disable_existing_loggers": False,
           "handlers": {"console": {"class": "logging.StreamHandler"}},
           "root": {"handlers": ["console"], "level": "WARNING"}}
