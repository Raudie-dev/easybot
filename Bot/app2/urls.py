from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('control/', views.control, name='control'),
    path('panel-control/', views.panel_control, name='panel_control'),
    path('qr-json/', views.qr_json, name='qr_json'),
    path('webhook/', views.whatsapp_webhook, name='whatsapp_webhook'),
    path('send/', views.send_message, name='send_message'),
    path('logout/', views.logout, name='logout'),
    path('configuracion/', views.configuracion, name='configuracion'),
]