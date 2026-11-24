from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .forms import AdminCreateUserForm, AdminChangeUserForm
from .models import User, Service, AccessRequest, MailJob


@admin.register(User)
class PortalUserAdmin(UserAdmin):
    add_form = AdminCreateUserForm
    form = AdminChangeUserForm
    list_display = ("email", "first_name", "last_name", "is_active", "is_staff", "pilot_enabled")
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name")
    fieldsets = ((None, {"fields": ("email", "password")}),
                 ("Профиль", {"fields": ("first_name", "last_name")}),
                 ("Доступ", {"fields": ("is_active", "pilot_enabled", "is_staff", "is_superuser", "groups", "user_permissions")}),
                 ("История", {"fields": ("last_login", "date_joined")}))
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "first_name", "last_name", "password1", "password2", "pilot_enabled")}),)
    readonly_fields = ("last_login", "date_joined")

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "url", "enabled", "order")
    list_editable = ("enabled", "order")


@admin.register(AccessRequest)
class RequestAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "organization", "created_at", "processed")
    list_filter = ("processed",)
    readonly_fields = ("email", "name", "organization", "created_at")
    search_fields = ("email", "name")

    def has_add_permission(self, request):
        return False


@admin.register(MailJob)
class MailAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "created_at", "attempts", "sent_at", "failed")
    list_filter = ("kind", "failed")
    exclude = ("password_snapshot",)
    readonly_fields = ("kind", "user", "access_request", "created_at", "next_attempt", "attempts", "sent_at", "failed")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
