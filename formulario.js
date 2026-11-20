// Formulario de contacto: diseños A y B (el C usa su propia copia en c/).
//
// CONFIG.endpoint: URL del script de Google (termina en /exec). Mientras esté vacía,
// la página funciona en modo demo y NO envía datos a ningún sitio.
(function () {
  "use strict";
  var CONFIG = { endpoint: "", timeoutMs: 15000 };

  var MOTIVOS = ["Mejora de rendimiento", "Preparación para un evento específico", "Pérdida de masa grasa", "Aumento de masa muscular", "Ajuste de peso para categoría", "Gestión de molestias digestivas", "Otro / No estoy seguro"];
  var ORIGEN = ["Instagram", "Recomendación de un amigo", "Publicidad", "Otro"];
  var PREFS = ["WhatsApp", "Llamada"];

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  // Mismas reglas que el servidor: móvil/fijo español de 9 cifras (con o sin +34/0034) o internacional con prefijo.
  var telOk = function (v) { var d = String(v).replace(/[\s\-().]/g, ""); return /^(\+34|0034)?[6789]\d{8}$/.test(d) || /^(\+|00)\d{8,15}$/.test(d); };
  var nombreOk = function (v) { return /^[\p{L}][\p{L}\s'.\-]{1,79}$/u.test(v); };
  var check = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  var consentTxt = 'He leído la <a href="#" data-privacidad>política de privacidad</a> y acepto que uses mis datos, incluido el motivo de consulta, solo para contactarme.';
  // Campo trampa: invisible para personas, los bots lo rellenan. Nombre realista a propósito.
  var trampa = function (p) { return '<div class="hp" aria-hidden="true"><label for="' + p + '-empresa">Empresa</label><input type="text" id="' + p + '-empresa" name="empresa" tabindex="-1" autocomplete="off"></div>'; };
  var toTop = function (s) { s.scrollTop = 0; if (s.getBoundingClientRect().top < 0) window.scrollTo(0, 0); };

  var MENSAJES = {
    datos: "Hay algún dato que no cuadra. Revísalo y vuelve a enviarlo.",
    repetido: "Ya tengo una solicitud con este teléfono. Te contactaré pronto.",
    saturado: "Ahora mismo no puedo recibir más solicitudes. Inténtalo en unos minutos.",
    red: "No se ha podido enviar. Revisa tu conexión y vuelve a pulsar Enviar."
  };

  // ---------- Envío ----------
  var tokenPromise = null;
  function pedirJSON(url, opts) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CONFIG.timeoutMs) : null;
    var o = { redirect: "follow", credentials: "omit", cache: "no-store" };
    if (ctrl) o.signal = ctrl.signal;
    for (var k in opts || {}) o[k] = opts[k];
    return fetch(url, o).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  // El servidor entrega un "pase" firmado al abrir la página; sin él, no acepta envíos.
  function pedirToken() {
    if (!CONFIG.endpoint) return Promise.resolve(null);
    if (!tokenPromise) {
      tokenPromise = pedirJSON(CONFIG.endpoint + "?accion=token").catch(function (e) { tokenPromise = null; throw e; });
    }
    return tokenPromise;
  }
  function enviar(datos, reintento) {
    if (!CONFIG.endpoint) return new Promise(function (r) { setTimeout(function () { r({ ok: true, demo: true }); }, 600); });
    return pedirToken().then(function (token) {
      datos.token = token;
      return pedirJSON(CONFIG.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datos) });
    }).then(function (res) {
      tokenPromise = null; // cada pase sirve una sola vez
      if (!res.ok && (res.codigo === "token" || res.codigo === "caducado") && !reintento) return enviar(datos, true);
      return res;
    }, function () { tokenPromise = null; return { ok: false, codigo: "red" }; });
  }
  function conBoton(btn, estadoEl, datos, alTerminar, alFallar) {
    if (btn.disabled) return;
    var texto = btn.textContent;
    btn.disabled = true; btn.textContent = "Enviando…"; estadoEl.textContent = "";
    enviar(datos).then(function (res) {
      btn.disabled = false; btn.textContent = texto;
      if (res && res.ok) return alTerminar();
      estadoEl.textContent = MENSAJES[res && res.codigo] || MENSAJES.red;
      if (alFallar) alFallar();
    });
  }

  // ---------- A: una sola página ----------
  function chips(p, name, list) {
    return '<div class="chips">' + list.map(function (t, i) {
      return '<label class="chip"><input type="radio" name="' + p + '-' + name + '" id="' + p + '-' + name + '-' + i + '" value="' + esc(t) + '"' + (name === "origen" && i === 0 ? " checked" : "") + '><span>' + esc(t) + '</span></label>';
    }).join("") + '</div>';
  }
  function setupA(s) {
    var p = "a";
    s.innerHTML = '<div class="mk va">' +
      '<div class="top"><div class="brand"><span class="logo">ND</span>Nutrición deportiva</div><h4>Cuéntame tu objetivo</h4></div>' +
      '<form id="a-form" novalidate>' +
      '<div><label class="lb" for="a-nombre">Nombre completo</label><input type="text" id="a-nombre" autocomplete="name" maxlength="80" placeholder="Nombre y apellidos"><div class="err" id="a-e-nombre" aria-live="polite"></div></div>' +
      '<div><label class="lb" for="a-tel">Teléfono</label><div class="telrow"><span class="pre">+34</span><input type="tel" id="a-tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="612 345 678"></div><div class="err" id="a-e-tel" aria-live="polite"></div>' +
      '<fieldset class="mt"><legend>¿Cómo prefieres que te contacte?<span class="new">Nuevo</span></legend>' + chips(p, "pref", PREFS) + '<div class="err" id="a-e-pref" aria-live="polite"></div></fieldset></div>' +
      '<div><fieldset><legend>¿Qué quieres conseguir?</legend>' + chips(p, "motivo", MOTIVOS) + '<div class="err" id="a-e-motivo" aria-live="polite"></div></fieldset></div>' +
      '<div><fieldset><legend>¿Cómo me has conocido?</legend>' + chips(p, "origen", ORIGEN) + '<input type="text" class="other-in" id="a-otro" maxlength="60" placeholder="Cuéntame dónde" aria-label="Dónde me has conocido" hidden><div class="note">Instagram viene marcado porque has llegado desde el enlace de la bio.</div></fieldset></div>' +
      trampa(p) +
      '<div><label class="consent"><input type="checkbox" id="a-ok"><span>' + consentTxt + '</span></label><div class="err" id="a-e-ok" aria-live="polite"></div></div>' +
      '<button class="btn" type="submit" id="a-btn">Enviar solicitud</button>' +
      '<div class="err estado" id="a-estado" role="alert"></div>' +
      '<p class="fine">Responsable: [tu nombre]. Puedes pedir que borre tus datos cuando quieras.</p>' +
      '</form>' +
      '<div class="done" id="a-done" hidden><div class="tick">' + check + '</div><h4 id="a-done-t"></h4><p id="a-done-p"></p></div></div>';

    var f = document.getElementById("a-form");
    var val = function (n) { var el = f.querySelector('input[name="a-' + n + '"]:checked'); return el ? el.value : ""; };
    f.addEventListener("change", function (e) {
      if (e.target.name === "a-origen") { var o = document.getElementById("a-otro"); o.hidden = e.target.value !== "Otro"; if (!o.hidden) o.focus(); }
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = document.getElementById("a-nombre").value.trim().replace(/\s+/g, " ");
      var tel = document.getElementById("a-tel").value.trim();
      var errs = {
        nombre: !nombreOk(nombre) ? "Escribe tu nombre y apellido (solo letras)." : "",
        tel: !tel ? "Necesito un teléfono para contactarte." : (!telOk(tel) ? "Revisa el número: 9 cifras, empieza por 6, 7, 8 o 9." : ""),
        pref: val("pref") ? "" : "Elige WhatsApp o llamada.",
        motivo: val("motivo") ? "" : "Elige el motivo que más se acerque.",
        ok: document.getElementById("a-ok").checked ? "" : "Para enviar necesito que aceptes la política de privacidad."
      };
      var first = null;
      Object.keys(errs).forEach(function (k) { var el = document.getElementById("a-e-" + k); el.textContent = errs[k]; if (errs[k] && !first) first = el; });
      if (first) { first.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      var datos = {
        diseno: "a", nombre: nombre, telefono: tel, preferencia: val("pref"), motivo: val("motivo"),
        origen: val("origen"), origenOtro: document.getElementById("a-otro").value.trim(),
        consentimiento: true, empresa: document.getElementById("a-empresa").value
      };
      conBoton(document.getElementById("a-btn"), document.getElementById("a-estado"), datos, function () {
        f.hidden = true; s.querySelector(".top").hidden = true;
        document.getElementById("a-done").hidden = false;
        document.getElementById("a-done-t").textContent = "¡Recibido, " + nombre.split(" ")[0] + "!";
        document.getElementById("a-done-p").textContent = (datos.preferencia === "WhatsApp" ? "Te escribo por WhatsApp" : "Te llamo") + " en 24-48 h para hablar de: " + datos.motivo.toLowerCase() + ".";
        toTop(s);
      });
    });
  }

  // ---------- B: una pregunta por pantalla ----------
  var ICONS = {
    "Mejora de rendimiento": '<path d="M4 17l5-5 4 4 7-8"/><path d="M15 8h5v5"/>',
    "Preparación para un evento específico": '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    "Pérdida de masa grasa": '<path d="M12 4v14M6 12l6 6 6-6"/>',
    "Aumento de masa muscular": '<path d="M12 20V6M6 12l6-6 6 6"/>',
    "Ajuste de peso para categoría": '<path d="M5 20h14M7 20l2-12h6l2 12"/><circle cx="12" cy="6" r="2"/>',
    "Gestión de molestias digestivas": '<path d="M12 21c4-3 7-6 7-10a7 7 0 10-14 0c0 4 3 7 7 10z"/>',
    "Otro / No estoy seguro": '<circle cx="12" cy="12" r="8"/><path d="M10 10a2 2 0 113 1.7c-.7.4-1 .8-1 1.6M12 16.5v.5"/>',
    "Instagram": '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/>',
    "Recomendación de un amigo": '<circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 7a3 3 0 010 6M21 19c0-2-1.5-4-4-4.6"/>',
    "Publicidad": '<path d="M4 10v4h3l6 4V6L7 10H4zM17 9a4 4 0 010 6"/>',
    "Otro": '<path d="M5 12h14M12 5v14"/>',
    "WhatsApp": '<path d="M4 20l1.5-4A8 8 0 1112 20a8 8 0 01-4-1z"/>',
    "Llamada": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/>'
  };
  var ico = function (t) { return '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[t] || "") + '</svg></span>'; };
  var BSTEPS = 5;
  var B, BS;

  function setupB(s) {
    BS = s;
    B = { i: 0, d: { origen: "Instagram" } };
    s.innerHTML = '<div class="mk vb"><div class="bar"><div class="brand"><span class="logo">ND</span>Nutrición deportiva</div><div class="barrow"><button class="back" id="b-back" type="button">← Atrás</button><span id="b-count" aria-live="polite"></span></div><div class="track"><div class="fill" id="b-fill"></div></div></div><div class="steps" id="b-steps"></div>' + trampa("b") + '</div>';
    document.getElementById("b-back").addEventListener("click", function () { if (B.i > 0) { B.i--; renderB(); } });
    renderB();
  }
  function cardList(key, list) {
    return '<div class="cards">' + list.map(function (t, i) { return '<button type="button" class="card" id="b-' + key + '-' + i + '" data-k="' + key + '" data-v="' + esc(t) + '" aria-pressed="' + (B.d[key] === t) + '">' + ico(t) + '<span>' + esc(t) + '</span></button>'; }).join("") + '</div>';
  }
  function renderB() {
    var st = document.getElementById("b-steps"), i = B.i, h = "";
    document.getElementById("b-back").disabled = i === 0 || i >= BSTEPS;
    document.getElementById("b-count").textContent = i < BSTEPS ? "Paso " + (i + 1) + " de " + BSTEPS : "Enviado";
    document.getElementById("b-fill").style.width = (Math.min(i, BSTEPS) / BSTEPS * 100) + "%";
    if (i === 0) h = '<h4>¿Qué quieres conseguir?</h4><p class="hint">Elige la que más se acerque. Luego lo hablamos con calma.</p>' + cardList("motivo", MOTIVOS);
    if (i === 1) h = '<h4><label for="b-nombre">¿Cómo te llamas?</label></h4><input type="text" id="b-nombre" autocomplete="name" maxlength="80" placeholder="Nombre y apellidos" value="' + esc(B.d.nombre || "") + '"><div class="err" id="b-err" aria-live="polite"></div><button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 2) h = '<h4><label for="b-tel">¿Dónde te contacto, ' + esc((B.d.nombre || "").split(" ")[0]) + '?</label></h4><input type="tel" id="b-tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="612 345 678" value="' + esc(B.d.tel || "") + '"><p class="hint">¿Cómo lo prefieres?</p><div class="seg">' + PREFS.map(function (t, k) { return '<button type="button" class="card" id="b-pref-' + k + '" data-pref="' + t + '" aria-pressed="' + (B.d.pref === t) + '">' + ico(t) + '<span>' + t + '</span></button>'; }).join("") + '</div><div class="err" id="b-err" aria-live="polite"></div><button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 3) h = '<h4>¿Cómo me has conocido?</h4><p class="hint">Instagram viene marcado porque llegas desde la bio.</p>' + cardList("origen", ORIGEN) + '<button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 4) h = '<h4>Revisa y envía</h4><dl class="sum"><dt>Nombre</dt><dd>' + esc(B.d.nombre) + '</dd><dt>Teléfono</dt><dd>' + esc(B.d.tel) + '</dd><dt>Contacto</dt><dd>' + esc(B.d.pref) + '</dd><dt>Objetivo</dt><dd>' + esc(B.d.motivo) + '</dd><dt>Origen</dt><dd>' + esc(B.d.origen) + '</dd></dl><label class="consent"><input type="checkbox" id="b-ok"><span>' + consentTxt + '</span></label><div class="err" id="b-err" role="alert"></div><button class="btn" type="button" id="b-next">Enviar</button>';
    if (i === 5) h = '<div class="done"><div class="tick">' + check + '</div><h4>¡Recibido, ' + esc(B.d.nombre.split(" ")[0]) + '!</h4><p class="hint">' + (B.d.pref === "WhatsApp" ? "Te escribo por WhatsApp" : "Te llamo") + ' en 24-48 h. Mientras, puedes seguir viendo mis consejos en Instagram.</p></div>';
    st.innerHTML = '<div class="step">' + h + '</div>';
    toTop(BS);
    st.querySelectorAll(".card[data-k]").forEach(function (b) {
      b.addEventListener("click", function () {
        B.d[b.dataset.k] = b.dataset.v;
        if (b.dataset.k === "motivo") { B.i++; renderB(); }
        else st.querySelectorAll(".card[data-k]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      });
    });
    st.querySelectorAll(".card[data-pref]").forEach(function (b) {
      b.addEventListener("click", function () { B.d.pref = b.dataset.pref; st.querySelectorAll(".card[data-pref]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); });
    });
    var nx = document.getElementById("b-next"), er = document.getElementById("b-err");
    if (nx) nx.addEventListener("click", function () {
      if (i === 1) { var v = document.getElementById("b-nombre").value.trim().replace(/\s+/g, " "); if (!nombreOk(v)) { er.textContent = "Escribe tu nombre y apellido (solo letras)."; return; } B.d.nombre = v; }
      if (i === 2) { var t = document.getElementById("b-tel").value.trim(); B.d.tel = t; if (!telOk(t)) { er.textContent = "Revisa el número: 9 cifras, empieza por 6, 7, 8 o 9."; return; } if (!B.d.pref) { er.textContent = "Elige WhatsApp o llamada."; return; } }
      if (i === 4) {
        if (!document.getElementById("b-ok").checked) { er.textContent = "Para enviar necesito que aceptes la política de privacidad."; return; }
        var datos = {
          diseno: "b", nombre: B.d.nombre, telefono: B.d.tel, preferencia: B.d.pref, motivo: B.d.motivo,
          origen: B.d.origen, origenOtro: "", consentimiento: true, empresa: document.getElementById("b-empresa").value
        };
        document.getElementById("b-back").disabled = true;
        conBoton(nx, er, datos, function () { B.i++; renderB(); }, function () { document.getElementById("b-back").disabled = false; });
        return;
      }
      B.i++; renderB();
    });
    var inp = st.querySelector("input[type=text],input[type=tel]");
    if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && nx) { e.preventDefault(); nx.click(); } });
  }

  // ---------- Arranque ----------
  function start() {
    document.querySelectorAll(".screen[data-variant]").forEach(function (s) {
      if (s.dataset.variant === "a") setupA(s);
      if (s.dataset.variant === "b") setupB(s);
    });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-restart],[data-privacidad]") : null;
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute("data-restart")) start();
  });
  start();
  pedirToken().catch(function () { /* se reintenta al enviar */ });
})();
