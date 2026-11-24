from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username if username is not None else kwargs.get("email")
        if isinstance(email, str):
            email = email.strip().lower()
        return super().authenticate(request, username=email, password=password)
