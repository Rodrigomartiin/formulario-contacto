// Demo de los tres diseños del formulario. No envía datos a ningún sitio.
(function () {
  const MOTIVOS = ["Mejora de rendimiento", "Preparación para un evento específico", "Pérdida de masa grasa", "Aumento de masa muscular", "Ajuste de peso para categoría", "Gestión de molestias digestivas", "Otro / No estoy seguro"];
  const ORIGEN = ["Instagram", "Recomendación de un amigo", "Publicidad", "Otro"];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const telOk = v => { const d = v.replace(/[\s\-().]/g, ""); return /^(\+34)?[6789]\d{8}$/.test(d) || /^\+\d{8,15}$/.test(d); };
  const check = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  const privacy = '<a href="#" onclick="return false">política de privacidad</a>';
  const consentTxt = 'He leído la ' + privacy + ' y acepto que uses mis datos, incluido el motivo de consulta, solo para contactarme.';
  const toTop = s => { s.scrollTop = 0; if (s.getBoundingClientRect().top < 0) window.scrollTo(0, 0); };

  function chips(p, name, list, cls) {
    return '<div class="chips ' + (cls || "") + '">' + list.map((t, i) =>
      '<label class="chip"><input type="radio" name="' + p + '-' + name + '" id="' + p + '-' + name + '-' + i + '" value="' + esc(t) + '"' + (name === "origen" && i === 0 ? " checked" : "") + '><span>' + esc(t) + '</span></label>').join("") + '</div>';
  }

  // A y C: una sola página, misma estructura con estilos distintos
  function single(p) {
    const c = p === "c";
    const wrapF = (n, inner) => c ? '<div class="blk"><span class="num">' + n + '</span><div>' + inner + '</div></div>' : '<div>' + inner + '</div>';
    const head = c
      ? '<div class="hero"><div class="kick">Nutrición deportiva</div><h4>Vamos a por tu objetivo</h4><p>4 preguntas. Te contesto en 24-48 h.</p></div>'
      : '<div class="top"><div class="brand"><span class="logo">ND</span>Nutrición deportiva</div><h4>Cuéntame tu objetivo</h4><p>Son 4 preguntas. Te contesto en 24-48 h por WhatsApp o llamada.</p></div>';
    return '<div class="mk v' + p + '">' + head +
      '<form id="' + p + '-form" novalidate>' +
      wrapF("01", '<label class="lb" for="' + p + '-nombre">Nombre completo</label><input type="text" id="' + p + '-nombre" autocomplete="name" placeholder="Nombre y apellidos"><div class="err" id="' + p + '-e-nombre"></div>') +
      wrapF("02", '<label class="lb" for="' + p + '-tel">Teléfono</label><div class="telrow"><span class="pre">+34</span><input type="tel" id="' + p + '-tel" inputmode="tel" autocomplete="tel-national" placeholder="612 345 678"></div><div class="err" id="' + p + '-e-tel"></div>' +
        '<fieldset style="margin-top:14px"><legend>¿Cómo prefieres que te contacte?<span class="new">Nuevo</span></legend>' + chips(p, "pref", ["WhatsApp", "Llamada"]) + '<div class="err" id="' + p + '-e-pref"></div></fieldset>') +
      wrapF("03", '<fieldset><legend>¿Qué quieres conseguir?</legend>' + chips(p, "motivo", MOTIVOS, c ? "rows" : "") + '<div class="err" id="' + p + '-e-motivo"></div></fieldset>') +
      wrapF("04", '<fieldset><legend>¿Cómo me has conocido?</legend>' + chips(p, "origen", ORIGEN) + '<input type="text" class="other-in" id="' + p + '-otro" placeholder="Cuéntame dónde" hidden><div class="note">Instagram viene marcado porque has llegado desde el enlace de la bio.</div></fieldset>') +
      '<div class="hp" aria-hidden="true"><label for="' + p + '-web">No rellenar</label><input type="text" id="' + p + '-web" tabindex="-1" autocomplete="off"></div>' +
      '<div><label class="consent"><input type="checkbox" id="' + p + '-ok"><span>' + consentTxt + '</span></label><div class="err" id="' + p + '-e-ok"></div></div>' +
      '<button class="btn" type="submit">' + (c ? "Enviar →" : "Enviar solicitud") + '</button>' +
      '<p class="fine">Responsable: [tu nombre]. Puedes pedir que borre tus datos cuando quieras.</p>' +
      '</form>' +
      '<div class="done" id="' + p + '-done" hidden><div class="tick">' + check + '</div><h4 id="' + p + '-done-t"></h4><p id="' + p + '-done-p"></p></div></div>';
  }

  function setupSingle(p, s) {
    s.innerHTML = single(p);
    const f = document.getElementById(p + "-form");
    const val = n => { const el = f.querySelector('input[name="' + p + '-' + n + '"]:checked'); return el ? el.value : ""; };
    f.addEventListener("change", e => {
      if (e.target.name === p + "-origen") { const o = document.getElementById(p + "-otro"); o.hidden = e.target.value !== "Otro"; if (!o.hidden) o.focus(); }
    });
    f.addEventListener("submit", e => {
      e.preventDefault();
      const nombre = document.getElementById(p + "-nombre").value.trim();
      const tel = document.getElementById(p + "-tel").value.trim();
      const errs = {
        nombre: nombre.length < 3 ? "Escribe tu nombre y apellido." : "",
        tel: !tel ? "Necesito un teléfono para contactarte." : (!telOk(tel) ? "Revisa el número: 9 cifras, empieza por 6, 7, 8 o 9." : ""),
        pref: val("pref") ? "" : "Elige WhatsApp o llamada.",
        motivo: val("motivo") ? "" : "Elige el motivo que más se acerque.",
        ok: document.getElementById(p + "-ok").checked ? "" : "Para enviar necesito que aceptes la política de privacidad."
      };
      let first = null;
      Object.keys(errs).forEach(k => { const el = document.getElementById(p + "-e-" + k); el.textContent = errs[k]; if (errs[k] && !first) first = el; });
      if (first) { first.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      if (document.getElementById(p + "-web").value) return; // campo trampa: bot
      f.hidden = true;
      const top = s.querySelector(".top,.hero"); if (top) top.hidden = true;
      document.getElementById(p + "-done").hidden = false;
      document.getElementById(p + "-done-t").textContent = "¡Recibido, " + nombre.split(" ")[0] + "!";
      document.getElementById(p + "-done-p").textContent = (val("pref") === "WhatsApp" ? "Te escribo por WhatsApp" : "Te llamo") + " en 24-48 h para hablar de: " + val("motivo").toLowerCase() + ".";
      toTop(s);
    });
  }

  // B: una pregunta por pantalla
  const ICONS = {
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
  const ico = t => '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[t] || "") + '</svg></span>';
  const BSTEPS = 5;
  let B, BS;

  function setupB(s) {
    BS = s;
    B = { i: 0, d: { origen: "Instagram" } };
    s.innerHTML = '<div class="mk vb"><div class="bar"><div class="brand"><span class="logo">ND</span>Nutrición deportiva</div><div class="barrow"><button class="back" id="b-back" type="button">← Atrás</button><span id="b-count"></span></div><div class="track"><div class="fill" id="b-fill"></div></div></div><div class="steps" id="b-steps"></div></div>';
    document.getElementById("b-back").addEventListener("click", () => { if (B.i > 0) { B.i--; renderB(); } });
    renderB();
  }
  function cardList(key, list) {
    return '<div class="cards">' + list.map((t, i) => '<button type="button" class="card" id="b-' + key + '-' + i + '" data-k="' + key + '" data-v="' + esc(t) + '" aria-pressed="' + (B.d[key] === t) + '">' + ico(t) + '<span>' + esc(t) + '</span></button>').join("") + '</div>';
  }
  function renderB() {
    const st = document.getElementById("b-steps"), i = B.i;
    document.getElementById("b-back").disabled = i === 0 || i >= BSTEPS;
    document.getElementById("b-count").textContent = i < BSTEPS ? "Paso " + (i + 1) + " de " + BSTEPS : "Enviado";
    document.getElementById("b-fill").style.width = (Math.min(i, BSTEPS) / BSTEPS * 100) + "%";
    let h = "";
    if (i === 0) h = '<h4>¿Qué quieres conseguir?</h4><p class="hint">Elige la que más se acerque. Luego lo hablamos con calma.</p>' + cardList("motivo", MOTIVOS);
    if (i === 1) h = '<h4>¿Cómo te llamas?</h4><input type="text" id="b-nombre" autocomplete="name" placeholder="Nombre y apellidos" value="' + esc(B.d.nombre || "") + '"><div class="err" id="b-err"></div><button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 2) h = '<h4>¿Dónde te contacto, ' + esc((B.d.nombre || "").split(" ")[0]) + '?</h4><input type="tel" id="b-tel" inputmode="tel" autocomplete="tel" placeholder="612 345 678" value="' + esc(B.d.tel || "") + '"><p class="hint">¿Cómo lo prefieres?</p><div class="seg">' + ["WhatsApp", "Llamada"].map((t, k) => '<button type="button" class="card" id="b-pref-' + k + '" data-pref="' + t + '" aria-pressed="' + (B.d.pref === t) + '">' + ico(t) + '<span>' + t + '</span></button>').join("") + '</div><div class="err" id="b-err"></div><button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 3) h = '<h4>¿Cómo me has conocido?</h4><p class="hint">Instagram viene marcado porque llegas desde la bio.</p>' + cardList("origen", ORIGEN) + '<button class="btn" type="button" id="b-next">Continuar</button>';
    if (i === 4) h = '<h4>Revisa y envía</h4><dl class="sum"><dt>Nombre</dt><dd>' + esc(B.d.nombre) + '</dd><dt>Teléfono</dt><dd>' + esc(B.d.tel) + '</dd><dt>Contacto</dt><dd>' + esc(B.d.pref) + '</dd><dt>Objetivo</dt><dd>' + esc(B.d.motivo) + '</dd><dt>Origen</dt><dd>' + esc(B.d.origen) + '</dd></dl><label class="consent"><input type="checkbox" id="b-ok"><span>' + consentTxt + '</span></label><div class="err" id="b-err"></div><button class="btn" type="button" id="b-next">Enviar</button>';
    if (i === 5) h = '<div class="done"><div class="tick">' + check + '</div><h4>¡Recibido, ' + esc(B.d.nombre.split(" ")[0]) + '!</h4><p class="hint">' + (B.d.pref === "WhatsApp" ? "Te escribo por WhatsApp" : "Te llamo") + ' en 24-48 h. Mientras, puedes seguir viendo mis consejos en Instagram.</p></div>';
    st.innerHTML = '<div class="step">' + h + '</div>';
    toTop(BS);
    st.querySelectorAll(".card[data-k]").forEach(b => b.addEventListener("click", () => {
      B.d[b.dataset.k] = b.dataset.v;
      if (b.dataset.k === "motivo") { B.i++; renderB(); }
      else st.querySelectorAll(".card[data-k]").forEach(x => x.setAttribute("aria-pressed", x === b));
    }));
    st.querySelectorAll(".card[data-pref]").forEach(b => b.addEventListener("click", () => {
      B.d.pref = b.dataset.pref;
      st.querySelectorAll(".card[data-pref]").forEach(x => x.setAttribute("aria-pressed", x === b));
    }));
    const nx = document.getElementById("b-next"), er = document.getElementById("b-err");
    if (nx) nx.addEventListener("click", () => {
      if (i === 1) { const v = document.getElementById("b-nombre").value.trim(); if (v.length < 3) { er.textContent = "Escribe tu nombre y apellido."; return; } B.d.nombre = v; }
      if (i === 2) { const v = document.getElementById("b-tel").value.trim(); B.d.tel = v; if (!telOk(v)) { er.textContent = "Revisa el número: 9 cifras, empieza por 6, 7, 8 o 9."; return; } if (!B.d.pref) { er.textContent = "Elige WhatsApp o llamada."; return; } }
      if (i === 4 && !document.getElementById("b-ok").checked) { er.textContent = "Para enviar necesito que aceptes la política de privacidad."; return; }
      B.i++; renderB();
    });
    const inp = st.querySelector("input[type=text],input[type=tel]");
    if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter" && nx) { e.preventDefault(); nx.click(); } });
  }

  // Arranque: cada página tiene <div class="screen" data-variant="a|b|c">
  function start() {
    document.querySelectorAll(".screen[data-variant]").forEach(s => {
      const v = s.dataset.variant;
      v === "b" ? setupB(s) : setupSingle(v, s);
    });
  }
  document.querySelectorAll("[data-restart]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); start(); }));
  start();
})();
