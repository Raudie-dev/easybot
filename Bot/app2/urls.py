from django.urls import path
from . import views

urlpatterns = [
    path('login_admin/', views.login_admin, name='login_admin'),
]