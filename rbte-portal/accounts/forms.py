from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm, UserChangeForm
from .models import User, AccessRequest


class LoginForm(AuthenticationForm):
    username = forms.EmailField(label="Email", max_length=254, widget=forms.EmailInput(attrs={"autocomplete": "username", "placeholder": "you@company.ru", "autofocus": True}))
    password = forms.CharField(label="Пароль", strip=False, widget=forms.PasswordInput(attrs={"autocomplete": "current-password", "placeholder": "Введите пароль"}))

    def clean_username(self):
        return self.cleaned_data["username"].strip().lower()


class AccessRequestForm(forms.ModelForm):
    class Meta:
        model = AccessRequest
        fields = ("name", "email", "organization")

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()

    def validate_unique(self):
        # Handle existing requests in the view, inside the same transaction as creation.
        pass


class ResetRequestForm(forms.Form):
    email = forms.EmailField(label="Email", max_length=254, widget=forms.EmailInput(attrs={"autocomplete": "email"}))

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()


class AdminCreateUserForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "first_name", "last_name")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Пользователь с таким email уже существует.")
        return email


class AdminChangeUserForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"
