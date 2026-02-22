from django.db import models

class Prueba(models.Model):
    nombre = models.CharField(max_length=200)
    fecha = models.DateField()
    socio = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre
    
class User(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=128)
    bloqueado = models.BooleanField(default=False)
    email = models.EmailField(max_length=150, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.nombre
    
class ConfigBot(models.Model):
    """Configuración del bot WhatsApp y contexto de negocio/IA."""
    nombre = models.CharField(max_length=150, help_text='Nombre identificador del bot')
    owner = models.OneToOneField('User', null=True, blank=True, on_delete=models.CASCADE, related_name='config')
    mensaje_bienvenida = models.CharField(max_length=500, blank=True, help_text='Mensaje de bienvenida al usuario')
    instrucciones_ia = models.TextField(blank=True, help_text='Prompt o instrucciones para la IA / lógica de negocio')
    api_key = models.CharField(max_length=100, blank=True, null=True, help_text='API Key de DeepSeek')

    def __str__(self):
        return self.nombre


class WhatsAppSession(models.Model):
    """Almacena el último QR recibido (string) y marca de tiempo."""
    qr_string = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"WhatsAppSession (updated: {self.updated_at})"


class WhatsAppMessage(models.Model):
    """Registra mensajes entrantes desde WhatsApp y su estado de respuesta."""
    remote_jid = models.CharField(max_length=200)
    push_name = models.CharField(max_length=200, blank=True, null=True)
    message_text = models.TextField(blank=True, null=True)
    received_at = models.DateTimeField(auto_now_add=True)

    replied = models.BooleanField(default=False)
    reply_text = models.TextField(blank=True, null=True)
    replied_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Msg from {self.remote_jid} at {self.received_at}"