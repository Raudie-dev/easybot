from django.contrib import admin
from django.urls import path, include
from app2 import views as app2_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('app1.urls')),
    path('app2/', include('app2.urls')),
    # Endpoint público para que el gateway Node envíe los webhooks
    path('api/whatsapp/webhook/', app2_views.whatsapp_webhook, name='api_whatsapp_webhook'),
]