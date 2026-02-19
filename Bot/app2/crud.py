from app1.models import Prueba

def crear_prueba(nombre, fecha, socio=True):
    return Prueba.objects.create(nombre=nombre, fecha=fecha, socio=socio)

def obtener_pruebas():
    return Prueba.objects.all()

def eliminar_prueba(prueba_id):
    Prueba.objects.filter(id=prueba_id).delete()

def actualizar_prueba(prueba_id, nombre=None, fecha=None, socio=None):
    prueba = Prueba.objects.get(id=prueba_id)
    if nombre is not None:
        prueba.nombre = nombre
    if fecha is not None:
        prueba.fecha = fecha
    if socio is not None:
        prueba.socio = socio
    prueba.save()
    return prueba