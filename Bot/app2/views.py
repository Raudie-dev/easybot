from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import requests
from .models import User_admin, ConfigBot, WhatsAppSession
from .models import User_admin, ConfigBot, WhatsAppSession, WhatsAppMessage
from .crud import crear_prueba, obtener_pruebas, eliminar_prueba



def login(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre', '').strip()
        password = request.POST.get('password', '')

        try:
            user = User_admin.objects.get(nombre=nombre)
            if user.bloqueado:
                messages.error(request, 'Usuario bloqueado')
            elif user.password == password or check_password(password, user.password):
                request.session['user_admin_id'] = user.id
                return redirect('control')
            else:
                messages.error(request, 'Contraseña incorrecta')
            return render(request, 'login.html')
        except User_admin.DoesNotExist:
            messages.error(request, 'Usuario no encontrado')
            return render(request, 'login.html')

    return render(request, 'login.html')


def control(request):
    user_id = request.session.get('user_admin_id')
    if not user_id:
        messages.error(request, 'Debe iniciar sesión primero')
        return redirect('login')
    try:
        user = User_admin.objects.get(id=user_id)
    except User_admin.DoesNotExist:
        messages.error(request, 'Usuario no encontrado')
        return redirect('login')
    import os
    gateway = getattr(settings, 'WHATSAPP_GATEWAY_URL', 'http://127.0.0.1:3000')
    qr = None

    # Si se solicita generar un nuevo QR
    if request.method == 'POST' and request.POST.get('generate_qr'):
        auth_info_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '..', 'whatsapp-gateway', 'auth_info')
        if os.path.exists(auth_info_path):
            import shutil
            shutil.rmtree(auth_info_path)
        messages.info(request, 'Se ha solicitado la generación de un nuevo QR. Espere unos segundos y recargue si no aparece.')

    try:
        resp = requests.get(f"{gateway}/qr", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            qr = data.get('qr')
    except Exception as e:
        qr = None

    return render(request, 'control.html', {'qr': qr})


def configuracion(request):
    from .models import ConfigBot
    config = ConfigBot.objects.first()
    saved = False
    qr = None
    # Obtener QR para mostrar en la configuración
    from django.conf import settings
    import requests
    gateway = getattr(settings, 'WHATSAPP_GATEWAY_URL', 'http://127.0.0.1:3000')
    try:
        resp = requests.get(f"{gateway}/qr", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            qr = data.get('qr')
    except Exception:
        qr = None

    if request.method == 'POST':
        nombre = request.POST.get('nombre', '').strip()
        mensaje_bienvenida = request.POST.get('mensaje_bienvenida', '').strip()
        instrucciones_ia = request.POST.get('instrucciones_ia', '').strip()
        api_key = request.POST.get('api_key', '').strip()
        if not config:
            config = ConfigBot.objects.create(
                nombre=nombre,
                mensaje_bienvenida=mensaje_bienvenida,
                instrucciones_ia=instrucciones_ia,
                api_key=api_key
            )
        else:
            config.nombre = nombre
            config.mensaje_bienvenida = mensaje_bienvenida
            config.instrucciones_ia = instrucciones_ia
            config.api_key = api_key
            config.save()
        saved = True
    return render(request, 'configuracion.html', {'config': config, 'saved': saved, 'qr': qr})

def panel_control(request):
    """Vista protegida que obtiene el QR desde el servicio Node.js y lo pasa al template.

    También guarda el último string del QR en `WhatsAppSession` para permitir polling desde el frontend.
    """
    gateway = getattr(settings, 'WHATSAPP_GATEWAY_URL', 'http://127.0.0.1:3000')
    qr = None
    try:
        resp = requests.get(f"{gateway}/qr", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            qr = data.get('qr')
    except Exception as e:
        # No interrumpe la vista; mostramos mensaje en template
        messages.warning(request, f'No se pudo obtener QR desde el gateway: {e}')

    # Guardar o actualizar la sesión
    try:
        session, _ = WhatsAppSession.objects.get_or_create(id=1)
        session.qr_string = qr
        session.save()
    except Exception:
        # no bloquear la vista por fallos de BD
        pass

    return render(request, 'panel.html', {'qr': qr})

def qr_json(request):
    """Devuelve el último QR almacenado como JSON (útil para polling desde el frontend)."""
    try:
        session = WhatsAppSession.objects.order_by('-updated_at').first()
        qr = session.qr_string if session else None
        return JsonResponse({'qr': qr})
    except Exception as e:
        return JsonResponse({'qr': None, 'error': str(e)})

@csrf_exempt
def whatsapp_webhook(request):
    """Webhook que recibe mensajes desde el servicio Node.js.

    Espera un POST JSON con: remoteJid, pushName, messageText
    Retorna JSON con la respuesta que Node.js deberá reenviar al usuario.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest('Only POST allowed')

    try:
        payload = request.body
        data = request.json if False else None
    except Exception:
        data = None

    # prefer json parsing via request.POST or request.body
    try:
        data = request.headers.get('Content-Type', '').startswith('application/json') and request.json if hasattr(request, 'json') else None
    except Exception:
        data = None

    # fallback: use Django's json parsing
    import json
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return HttpResponseBadRequest('Invalid JSON')

    remoteJid = data.get('remoteJid')
    pushName = data.get('pushName')
    messageText = data.get('messageText', '')

    # Guardar mensaje entrante en la base de datos para revisión desde el panel
    try:
        WhatsAppMessage.objects.create(remote_jid=remoteJid or '', push_name=pushName or '', message_text=messageText or '')
    except Exception:
        # no bloquear el webhook por fallos de persistencia
        pass

    # Obtener contexto desde ConfigBot (si existe)
    config = ConfigBot.objects.first()
    instrucciones = config.instrucciones_ia if config else ''
    bienvenida = config.mensaje_bienvenida if config else 'Hola'
    api_key = config.api_key if config else ''

    # Siempre responder usando DeepSeek API
    reply = 'Gracias por tu mensaje. En breve te respondemos.'
    if api_key and instrucciones:
        try:
            deepseek_url = 'https://api.deepseek.com/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            }
            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": instrucciones},
                    {"role": "user", "content": messageText or ''}
                ]
            }
            resp = requests.post(deepseek_url, json=payload, headers=headers, timeout=15)
            # Log para depuración
            print("[DeepSeek] status:", resp.status_code)
            print("[DeepSeek] response:", resp.text)
            if resp.status_code == 200:
                data = resp.json()
                if 'choices' in data and data['choices'] and 'message' in data['choices'][0]:
                    reply = data['choices'][0]['message']['content'].strip()
                else:
                    reply = '[DeepSeek error] Respuesta inesperada: ' + str(data)
            else:
                reply = f"[DeepSeek error {resp.status_code}] {resp.text}"
        except Exception as e:
            import traceback
            print('[DeepSeek Exception]', traceback.format_exc())
            reply = f"[Error DeepSeek] {e}"

    # Formato de respuesta que Node.js espera reenviar
    response = {
        'remoteJid': remoteJid,
        'reply': reply,
    }

    return JsonResponse(response)

def send_message(request):
    """Recibe número y mensaje desde el panel y reenvía al gateway Node (/send).

    Soporta POST desde formulario tradicional o AJAX. Retorna JSON si es AJAX,
    o redirige de vuelta al panel con mensajes flash.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest('Only POST allowed')

    number = request.POST.get('number')
    message = request.POST.get('message')
    from_url = request.META.get('HTTP_REFERER', '')
    is_config = 'configuracion' in from_url

    if not number or not message:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': False, 'error': 'Faltan campos number o message'}, status=400)
        messages.error(request, 'Faltan campos: número y mensaje')
        if is_config:
            return redirect('configuracion')
        return redirect('panel_control')

    gateway = getattr(settings, 'WHATSAPP_GATEWAY_URL', 'http://127.0.0.1:3000')
    try:
        resp = requests.post(f"{gateway}/send", json={'number': number, 'message': message}, timeout=8)
        resp.raise_for_status()
    except Exception as e:
        err = str(e)
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': False, 'error': err}, status=500)
        messages.error(request, f'Error enviando mensaje: {err}')
        if is_config:
            return redirect('configuracion')
        return redirect('panel_control')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'ok': True})

    messages.success(request, 'Mensaje enviado correctamente')
    if is_config:
        return redirect('configuracion')
    return redirect('panel_control')

def logout(request):
    request.session.flush()
    messages.info(request, 'Sesión cerrada')
    return redirect('login') 