# Formulario de contacto: tres diseños

Tres propuestas de diseño para un formulario de contacto de nutrición deportiva que sustituye a un Google Form enlazado desde Instagram.

- `a/`: **Consulta clara**. Una sola página, sobria.
- `b/`: **Paso a paso**. Una pregunta por pantalla, con barra de progreso.
- `c/`: **Pista**. Estética deportiva. Versión cerrada, con sus propios archivos (`c/formulario.js`, `c/estilos.css`).

La portada (`index.html`) muestra los tres a la vez para compararlos.

## Estado
A y B están **conectados**: cada envío se guarda en la hoja de Google Sheets y llega por email. El C es solo una demo y no envía nada.

## Seguridad (A y B)
- HTTPS obligatorio (GitHub Pages con «Enforce HTTPS» y HSTS).
- Política de seguridad de contenidos: la página solo puede cargar sus propios archivos, las fuentes de Google y hablar con el script de Google.
- Antibots sin captcha (los captcha fallan a menudo en el navegador interno de Instagram): campo trampa, pase firmado de un solo uso, tiempo mínimo, validación estricta y límites de ritmo, todo comprobado en el servidor.

El servidor es un Google Apps Script: código y pasos para activarlo en [`apps-script/`](apps-script/LEEME.md).
