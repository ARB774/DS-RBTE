from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path
from accounts import views
from accounts import simulator_sso, pilot_sso

urlpatterns = [
    path("sso/pilot/", pilot_sso.authorize),
    path("internal/pilot/", pilot_sso.internal),
    path("sso/simulator/", simulator_sso.authorize),
    path("internal/simulator/", simulator_sso.internal),
    path("", views.PortalLogin.as_view(), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("services/", views.services, name="services"),
    path("register/", views.register, name="register"),
    path("register/done/", views.request_done, name="request_done"),
    path("forgot-password/", views.forgot_password, name="password_reset"),
    path("forgot-password/done/", auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("password/", auth_views.PasswordChangeView.as_view(), name="password_change"),
    path("password/done/", auth_views.PasswordChangeDoneView.as_view(), name="password_change_done"),
    path("health/", views.health, name="health"),
    path("admin/", admin.site.urls),
]
admin.site.site_header = "RBTE · Управление порталом"
admin.site.site_title = "Администратор RBTE"
admin.site.index_title = "Пользователи, заявки и сервисы"
