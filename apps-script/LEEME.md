# Activar el envío real (diseños A y B)

Mientras `CONFIG.endpoint` esté vacío en `formulario.js`, las páginas son solo una demo y no envían nada.
Para que las respuestas lleguen a tu Gmail y a una hoja de Google Sheets:

## 1. Proteger tu cuenta de Google (una vez)
Activa la **verificación en dos pasos** en tu cuenta de Google. Los contactos quedarán guardados ahí.

## 2. Crear la hoja y el script
1. En Google Drive: **Nuevo → Hojas de cálculo de Google**. Llámala, por ejemplo, `Contactos web`.
2. En la hoja: **Extensiones → Apps Script**.
3. Borra lo que haya en `Código.gs` y pega el contenido de [`Codigo.gs`](Codigo.gs). Guarda (icono del disquete).
4. Arriba, elige la función **`configurar`** y pulsa **Ejecutar**. Google pedirá permisos (hoja y email): acéptalos con tu cuenta.
   Esto crea la pestaña `Contactos`, genera la clave secreta y apunta tu Gmail para los avisos.
5. Elige **`probarEnvio`** y pulsa **Ejecutar**. Debe aparecer una fila «Prueba Formulario» en la hoja y llegarte un email. Después borra esa fila.

## 3. Publicar el script
1. **Implementar → Nueva implementación → Tipo: Aplicación web**.
2. **Ejecutar como:** Yo. **Quién tiene acceso:** Cualquier usuario.
   (Hace falta para que la gente pueda enviar sin cuenta de Google. Nadie puede leer la hoja: el script solo deja añadir filas que pasen todas las comprobaciones.)
3. Copia la **URL de la aplicación web** (termina en `/exec`) y pásamela. Yo la pongo en `formulario.js`.

## Qué protege el script
| Protección | Qué para |
|---|---|
| Campo trampa invisible | Bots que rellenan todos los campos |
| Pase firmado de un solo uso | Bots que envían directamente al script sin abrir la página |
| Tiempo mínimo de 3 s | Bots que rellenan y envían al instante |
| Validación estricta | Datos inventados, textos enormes u opciones que no existen |
| Máx. 20 envíos cada 10 min y 2 por teléfono cada 6 h | Avalanchas de envíos y repeticiones |
| Fórmulas y HTML neutralizados | Que alguien meta una fórmula en tu hoja o un enlace trampa en tu email |

Los límites se cambian en `AJUSTES`, al principio del script.

## Si cambias el script más adelante
**Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva → Implementar.** La URL no cambia.
