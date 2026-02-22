from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('estado/', views.estado, name='estado'),
    path('qr-json/', views.qr_json, name='qr_json'),
    path('webhook/', views.whatsapp_webhook, name='whatsapp_webhook'),
    path('send/', views.send_message, name='send_message'),
    path('logout/', views.logout, name='logout'),
    path('configuracion/', views.configuracion, name='configuracion'),
]