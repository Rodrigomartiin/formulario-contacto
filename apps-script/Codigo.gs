/**
 * Recibe el formulario de contacto (diseños A y B), lo comprueba, lo guarda en la hoja
 * y avisa por email. Se pega en: Hoja de cálculo > Extensiones > Apps Script.
 *
 * Protecciones (todas en el servidor, que es donde un bot no puede saltárselas):
 *  1. Campo trampa invisible ("empresa"): si viene relleno es un bot.
 *  2. Pase firmado: la página pide un pase al abrirse (doGet). Sin un pase válido,
 *     firmado con un secreto que solo conoce este script, no se acepta el envío.
 *     Cada pase vale una sola vez y caduca a las 2 horas.
 *  3. Tiempo mínimo: si se envía menos de 3 s después de abrir la página, es un bot.
 *  4. Validación estricta: solo se aceptan las opciones exactas del formulario,
 *     nombres con letras, teléfonos válidos, textos con tamaño máximo y consentimiento.
 *  5. Límites de ritmo: máximo de envíos cada 10 minutos en total y por teléfono.
 *     (Google no da la IP de quien envía, por eso el límite no es por IP.)
 *  6. Hoja y email a prueba de inyecciones: se neutralizan fórmulas y HTML.
 *
 * A los bots descubiertos (1 y 3) se les responde "ok" para que no sepan que han fallado,
 * pero no se guarda nada.
 */

const AJUSTES = {
  hoja: 'Contactos',
  minSegundos: 3,
  maxHorasPase: 2,
  maxEnviosCada10Min: 20,
  maxPorTelefono6h: 2,
  maxBytes: 4000
};

const MOTIVOS = ['Mejora de rendimiento', 'Preparación para un evento específico', 'Pérdida de masa grasa', 'Aumento de masa muscular', 'Ajuste de peso para categoría', 'Gestión de molestias digestivas', 'Otro / No estoy seguro'];
const ORIGENES = ['Instagram', 'Recomendación de un amigo', 'Publicidad', 'Otro'];
const PREFERENCIAS = ['WhatsApp', 'Llamada'];
const DISENOS = ['a', 'b'];
const ESTADOS = ['Pendiente', 'Contactado', 'Cliente', 'Sin respuesta'];

/** Ejecutar UNA vez a mano (botón Ejecutar) antes de publicar. */
function configurar() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRETO')) {
    props.setProperty('SECRETO', Utilities.getUuid() + Utilities.getUuid());
  }
  if (!props.getProperty('EMAIL_AVISOS')) {
    props.setProperty('EMAIL_AVISOS', Session.getEffectiveUser().getEmail());
  }
  prepararHoja_();
  Logger.log('Listo. Los avisos llegarán a: ' + props.getProperty('EMAIL_AVISOS'));
}

/** Prueba completa sin la página: guarda una fila "PRUEBA" y envía el email. */
function probarEnvio() {
  const pase = crearPase_();
  pase.ts -= 5000; // simula 5 s rellenando
  pase.sig = firmar_(pase.ts + '.' + pase.nonce);
  const r = doPost({ postData: { contents: JSON.stringify({
    diseno: 'a', nombre: 'Prueba Formulario', telefono: '612345678', preferencia: 'WhatsApp',
    motivo: 'Pérdida de masa grasa', origen: 'Instagram', origenOtro: '', consentimiento: true,
    empresa: '', token: pase
  }) } });
  Logger.log(r.getContent());
}

// ---------- Puntos de entrada ----------

function doGet(e) {
  if (e && e.parameter && e.parameter.accion === 'token') return json_(crearPase_());
  return json_({ ok: true });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > AJUSTES.maxBytes) return json_({ ok: false, codigo: 'datos' });
    let d;
    try { d = JSON.parse(raw); } catch (err) { return json_({ ok: false, codigo: 'datos' }); }
    if (!d || typeof d !== 'object') return json_({ ok: false, codigo: 'datos' });

    if (d.empresa) return json_({ ok: true });                 // 1. campo trampa

    const fallo = comprobarPase_(d.token);                      // 2 y 3. pase y tiempo
    if (fallo === 'rapido') return json_({ ok: true });
    if (fallo) return json_({ ok: false, codigo: fallo });

    const datos = validar_(d);                                  // 4. datos
    if (!datos) return json_({ ok: false, codigo: 'datos' });

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ ok: false, codigo: 'saturado' });
    try {
      const cache = CacheService.getScriptCache();
      const clavePase = 'pase_' + d.token.sig;
      if (cache.get(clavePase)) return json_({ ok: false, codigo: 'token' });  // pase ya usado

      const total = Number(cache.get('total') || 0);             // 5. ritmo
      if (total >= AJUSTES.maxEnviosCada10Min) return json_({ ok: false, codigo: 'saturado' });
      const claveTel = 'tel_' + datos.telefono;
      const porTel = Number(cache.get(claveTel) || 0);
      if (porTel >= AJUSTES.maxPorTelefono6h) return json_({ ok: false, codigo: 'repetido' });

      guardar_(datos);
      cache.put(clavePase, '1', AJUSTES.maxHorasPase * 3600 + 60);
      cache.put('total', String(total + 1), 600);
      cache.put(claveTel, String(porTel + 1), 21600);
    } finally {
      lock.releaseLock();
    }

    avisar_(datos);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, codigo: 'red' });
  }
}

// ---------- Pase firmado ----------

function crearPase_() {
  const ts = Date.now();
  const nonce = Utilities.getUuid();
  return { ts: ts, nonce: nonce, sig: firmar_(ts + '.' + nonce) };
}

function firmar_(texto) {
  const secreto = PropertiesService.getScriptProperties().getProperty('SECRETO');
  if (!secreto) throw new Error('Falta ejecutar configurar()');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, secreto));
}

function comprobarPase_(p) {
  if (!p || typeof p.ts !== 'number' || typeof p.nonce !== 'string' || typeof p.sig !== 'string') return 'token';
  if (!mismoTexto_(firmar_(p.ts + '.' + p.nonce), p.sig)) return 'token';
  const segundos = (Date.now() - p.ts) / 1000;
  if (segundos < AJUSTES.minSegundos) return 'rapido';
  if (segundos > AJUSTES.maxHorasPase * 3600) return 'caducado';
  return '';
}

/** Comparación en tiempo constante, para no dar pistas sobre la firma. */
function mismoTexto_(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- Validación ----------

function limpiar_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizarTel_(v) {
  const s = String(v == null ? '' : v).replace(/[\s\-().]/g, '');
  let m = s.match(/^(?:\+34|0034)?([6789]\d{8})$/);
  if (m) return '+34' + m[1];
  m = s.match(/^(?:\+|00)(\d{8,15})$/);
  return m ? '+' + m[1] : '';
}

function validar_(d) {
  const nombre = limpiar_(d.nombre, 80);
  if (!/^[\p{L}][\p{L}\s'.\-]{1,79}$/u.test(nombre)) return null;
  const telefono = normalizarTel_(d.telefono);
  if (!telefono) return null;
  if (PREFERENCIAS.indexOf(d.preferencia) < 0) return null;
  if (MOTIVOS.indexOf(d.motivo) < 0) return null;
  if (ORIGENES.indexOf(d.origen) < 0) return null;
  if (d.consentimiento !== true) return null;
  return {
    fecha: new Date(),
    nombre: nombre,
    telefono: telefono,
    preferencia: d.preferencia,
    motivo: d.motivo,
    origen: d.origen === 'Otro' && d.origenOtro ? 'Otro: ' + limpiar_(d.origenOtro, 60) : d.origen,
    diseno: DISENOS.indexOf(d.diseno) >= 0 ? d.diseno.toUpperCase() : ''
  };
}

// ---------- Hoja ----------

function prepararHoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(AJUSTES.hoja);
  if (hoja) return hoja;
  hoja = libro.insertSheet(AJUSTES.hoja);
  hoja.appendRow(['Fecha', 'Nombre', 'Teléfono', 'Prefiere', 'Motivo', 'Origen', 'Consentimiento', 'Diseño', 'Estado']);
  hoja.setFrozenRows(1);
  hoja.getRange('A1:I1').setFontWeight('bold');
  hoja.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
  hoja.getRange('C:C').setNumberFormat('@');
  hoja.getRange('I2:I').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build());
  return hoja;
}

/** Un texto que empieza por = + - @ se convertiría en fórmula: se guarda como texto. */
function seguroHoja_(v) {
  return typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function guardar_(d) {
  const hoja = prepararHoja_();
  hoja.appendRow([d.fecha, d.nombre, d.telefono, d.preferencia, d.motivo, d.origen,
    'Sí · ' + Utilities.formatDate(d.fecha, 'Europe/Madrid', 'dd/MM/yyyy HH:mm'), d.diseno, 'Pendiente'].map(seguroHoja_));
}

// ---------- Email ----------

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function avisar_(d) {
  const email = PropertiesService.getScriptProperties().getProperty('EMAIL_AVISOS');
  if (!email || MailApp.getRemainingDailyQuota() < 1) return;
  const nombreCorto = d.nombre.split(' ')[0];
  const wa = 'https://wa.me/' + d.telefono.replace('+', '') + '?text=' +
    encodeURIComponent('Hola ' + nombreCorto + ', te escribo por la solicitud que has dejado en mi web.');
  const filas = [
    ['Nombre', d.nombre], ['Teléfono', d.telefono], ['Prefiere', d.preferencia], ['Motivo', d.motivo],
    ['Te conoció por', d.origen], ['Consentimiento', 'Aceptado · ' + Utilities.formatDate(d.fecha, 'Europe/Madrid', 'dd/MM/yyyy HH:mm')],
    ['Diseño', d.diseno]
  ];
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#17201B">' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    filas.map(function (f) { return '<tr><td style="color:#56635B">' + esc_(f[0]) + '</td><td><b>' + esc_(f[1]) + '</b></td></tr>'; }).join('') +
    '</table><p>' +
    '<a href="' + esc_(wa) + '" style="background:#1E6A4E;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir WhatsApp</a> ' +
    '&nbsp;<a href="tel:' + esc_(d.telefono) + '">Llamar</a> ' +
    '&nbsp;<a href="' + esc_(SpreadsheetApp.getActiveSpreadsheet().getUrl()) + '">Ver la hoja</a>' +
    '</p></div>';
  const texto = filas.map(function (f) { return f[0] + ': ' + f[1]; }).join('\n') + '\n\nWhatsApp: ' + wa;
  MailApp.sendEmail({
    to: email,
    subject: 'Nuevo contacto: ' + d.nombre + ' · ' + d.motivo,
    body: texto,
    htmlBody: html,
    name: 'Formulario web'
  });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
