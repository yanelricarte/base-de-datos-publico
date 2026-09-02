/* Ejercitación de la clase 2: preguntas de opción con devolución, ejercicios de
   consulta corregidos contra el resultado esperado, y una consola libre sobre la
   base del sitio. Todo se resuelve en la página, sin gestor y sin internet.

   El resultado esperado de cada ejercicio no está escrito a mano: se calcula
   ejecutando la consulta resuelta con el mismo motor, así nunca queda desfasado
   de los datos. */
(function () {
  "use strict";
  if (typeof MiniSQL === "undefined" || typeof DATOS_SITIO === "undefined") return;

  var base = MiniSQL.crear(DATOS_SITIO);
  var INTENTOS = 3;   /* la respuesta se muestra recién después de tres intentos */
  var LLAVE = "bd-clase2-consultas";
  var guardado = {};
  try { guardado = JSON.parse(localStorage.getItem(LLAVE) || "{}"); } catch (e) {}
  function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(guardado)); } catch (e) {} }

  var LLAVE_CODIGO = "bd-clase2-codigo";
  var codigo = null;
  try { codigo = localStorage.getItem(LLAVE_CODIGO); } catch (e) {}
  var alDestrabar = [];

  /* ---------- utilidades ---------- */

  function normalizar(c) {
    return String(c).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
  }

  /* Las consultas resueltas viajan cifradas (XOR con el código de la clase, en
     base64, con el centinela «OK::» adelante). Si el código no es el correcto,
     el texto que sale no empieza con el centinela y se descarta. */
  function descifrar(b64, cod) {
    var clave = normalizar(cod || "");
    if (!clave) return null;
    var bin;
    try { bin = atob(b64); } catch (e) { return null; }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ clave.charCodeAt(i % clave.length);
    var txt;
    try { txt = new TextDecoder("utf-8").decode(bytes); }
    catch (e) {
      txt = "";
      for (var j = 0; j < bytes.length; j++) txt += String.fromCharCode(bytes[j]);
      try { txt = decodeURIComponent(escape(txt)); } catch (e2) {}
    }
    return txt.indexOf("OK::") === 0 ? txt.slice(4) : null;
  }

  function hayCodigo() { return !!codigo; }

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function muestra(v) {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return Math.round(v * 10000) / 10000 + "";
    return String(v);
  }

  function clave(fila) {
    return fila.map(function (v) {
      if (v === null || v === undefined) return "\u0000";
      if (typeof v === "number") return String(Math.round(v * 10000) / 10000);
      return String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    }).join("\u0001");
  }

  function tablaResultado(res, tope) {
    var wrap = el("div", "tabla-res-wrap");
    var t = el("table", "tabla-res");
    var thead = el("thead"), tr = el("tr");
    res.columnas.forEach(function (c) { tr.appendChild(el("th", null, c)); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el("tbody");
    res.filas.slice(0, tope || 40).forEach(function (f) {
      var fila = el("tr");
      f.forEach(function (v) {
        fila.appendChild(el("td", typeof v === "number" ? "num" : (v === null ? "nulo" : null), muestra(v)));
      });
      tb.appendChild(fila);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    var pie = el("p", "pie-res");
    pie.textContent = res.filas.length + (res.filas.length === 1 ? " fila" : " filas") +
      " · " + res.columnas.length + (res.columnas.length === 1 ? " columna" : " columnas") +
      (res.filas.length > (tope || 40) ? " (se muestran las primeras " + (tope || 40) + ")" : "");
    wrap.appendChild(pie);
    return wrap;
  }

  /* ---------- 1 · preguntas de opción ---------- */

  Array.prototype.forEach.call(document.querySelectorAll(".quiz"), function (q) {
    var ok = q.dataset.correcta;
    var etiquetas = Array.prototype.slice.call(q.querySelectorAll("label"));
    var intentos = 0, cerrada = false;
    var aviso = el("p", "intento");
    q.insertBefore(aviso, q.querySelector(".feedback"));

    function limpiar() {
      etiquetas.forEach(function (x) { x.classList.remove("correcta", "incorrecta"); });
      Array.prototype.forEach.call(q.querySelectorAll(".por-que"), function (p) { p.classList.remove("visible"); });
    }

    function revelar(elegida) {
      var buena = etiquetas["abcdefg".indexOf(ok)];
      if (buena) buena.classList.add("correcta");
      var propia = elegida.querySelector(".por-que");
      if (propia) propia.classList.add("visible");
      q.classList.add("respondida");
      cerrada = true;
      aviso.textContent = "";
    }

    etiquetas.forEach(function (l, i) {
      var entrada = l.querySelector("input");
      if (!entrada) return;
      entrada.addEventListener("change", function () {
        if (cerrada) return;
        var letra = "abcdefg"[i];
        limpiar();
        if (letra === ok) {
          l.classList.add("correcta");
          revelar(l);
          return;
        }
        l.classList.add("incorrecta");
        intentos++;
        if (intentos >= INTENTOS) { revelar(l); return; }
        var quedan = INTENTOS - intentos;
        aviso.textContent = "Todavía no. Volvé a leer la pregunta y probá otra vez: " +
          (quedan === 1 ? "queda un intento antes de que aparezca la respuesta." :
            "quedan " + quedan + " intentos antes de que aparezca la respuesta.");
      });
    });
  });

  /* ---------- 2 · armados de columnas ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-armado]"), function (arm) {
    var items = Array.prototype.slice.call(arm.querySelectorAll(".opciones li"));
    var boton = arm.querySelector("button");
    var salida = arm.querySelector(".salida");
    var intentos = 0, cerrado = false;

    function revelar() {
      items.forEach(function (li) {
        var e = li.querySelector("input");
        var va = e.dataset.va === "si";
        li.classList.add(e.checked === va ? "bien" : "mal");
        var pq = li.querySelector(".por-que");
        if (pq) pq.classList.add("visible");
      });
      cerrado = true;
      boton.disabled = true;
    }

    boton.addEventListener("click", function () {
      if (cerrado) return;
      salida.innerHTML = "";
      items.forEach(function (li) { li.classList.remove("bien", "mal"); });
      var sobran = 0, faltan = 0;
      items.forEach(function (li) {
        var e = li.querySelector("input"), va = e.dataset.va === "si";
        if (e.checked && !va) sobran++;
        if (!e.checked && va) faltan++;
      });
      if (!sobran && !faltan) {
        revelar();
        var ok = el("p", "res-ok");
        ok.innerHTML = "<b>Correcto.</b> Las dos claves foráneas del cruce, y los dos datos que solo existen cuando ese producto entra en ese pedido.";
        salida.appendChild(ok);
        return;
      }
      intentos++;
      if (intentos >= INTENTOS) {
        revelar();
        var rev = el("p", "res-mal");
        rev.innerHTML = "<b>Ahí está la respuesta.</b> En verde las que van, en naranja las que estaban al revés, cada una con su razón.";
        salida.appendChild(rev);
        return;
      }
      var partes = [];
      if (sobran) partes.push(sobran === 1 ? "una columna marcada que no va" : sobran + " columnas marcadas que no van");
      if (faltan) partes.push(faltan === 1 ? "una que falta marcar" : faltan + " que faltan marcar");
      var m = el("p", "intento");
      m.innerHTML = "<b>Todavía no:</b> hay " + partes.join(" y ") + ". La pregunta que decide es de quién es el dato: " +
        "si describe al producto o al pedido, ya tiene su tabla; si existe recién cuando los dos se encuentran, va acá. " +
        (INTENTOS - intentos === 1 ? "Queda un intento antes de que aparezca la respuesta." :
          "Quedan " + (INTENTOS - intentos) + " intentos antes de que aparezca la respuesta.");
      salida.appendChild(m);
    });
  });

  /* ---------- 3 · ejercicios de consulta ---------- */

  var ejercicios = Array.prototype.slice.call(document.querySelectorAll(".ejercicio"));
  var resueltos = {};

  function diagnostico(esp, res, ordenImporta, sql) {
    var conJoin = /join/i.test(sql || "");
    if (res.columnas.length !== esp.columnas.length) {
      return { ok: false, texto: "La consulta corre, pero devuelve " + res.columnas.length +
        (res.columnas.length === 1 ? " columna" : " columnas") + " y la respuesta necesita " + esp.columnas.length +
        ". Lo que se pide mirar va entre SELECT y FROM." };
    }
    var ce = esp.filas.map(clave), cr = res.filas.map(clave);
    var sobran = 0, copia = ce.slice();
    cr.forEach(function (k) {
      var p = copia.indexOf(k);
      if (p >= 0) copia.splice(p, 1); else sobran++;
    });
    var faltan = copia.length;
    if (!faltan && !sobran) {
      var mismoOrden = ce.every(function (k, i) { return k === cr[i]; });
      if (mismoOrden || !ordenImporta) return { ok: true, texto: "Correcto." };
      return { ok: false, texto: "Las filas son exactamente las que van, pero salen en otro orden. Eso lo decide ORDER BY: revisá por qué columna ordenás y si va ASC o DESC." };
    }
    if (!faltan && sobran) {
      return { ok: false, texto: "Están todas las filas que se piden y aparecen " + sobran + " de más (devolvés " +
        res.filas.length + " y van " + esp.filas.length + "). Falta filtrar: revisá la condición del WHERE, o el LIMIT si lo que se pedía era una sola fila." };
    }
    if (faltan && !sobran) {
      return { ok: false, texto: "Todo lo que devolvés corresponde, pero faltan " + faltan +
        (faltan === 1 ? " fila" : " filas") + " de las " + esp.filas.length + ". La condición del WHERE dejó afuera filas que sí entran." +
        (conJoin ? " Con JOIN también pasa cuando una fila se queda sin pareja del otro lado: ahí entra LEFT JOIN." : "") };
    }
    return { ok: false, texto: "Devolvés " + res.filas.length + (res.filas.length === 1 ? " fila" : " filas") +
      " y se esperan " + esp.filas.length + ": coinciden " + (esp.filas.length - faltan) + ", faltan " + faltan +
      " y sobran " + sobran + "." + (conJoin ? " Suele ser la condición del ON, que tiene que igualar la clave foránea con la clave primaria a la que apunta." : " Revisá la condición del WHERE y las columnas que pedís.") };
  }

  function progreso() {
    var barras = document.querySelectorAll("[data-progreso]");
    if (!barras.length) return;
    var hechos = Object.keys(resueltos).filter(function (k) { return resueltos[k]; }).length;
    Array.prototype.forEach.call(barras, function (b) {
      b.textContent = "Resueltos " + hechos + " de " + ejercicios.length;
      b.classList.toggle("completo", hechos === ejercicios.length);
    });
  }

  ejercicios.forEach(function (ej, n) {
    var id = ej.id || ("ej" + (n + 1));
    ej.id = id;
    var dato = (typeof SOLUCIONES_CLASE2 !== "undefined") ? SOLUCIONES_CLASE2[id] : null;
    var preSol = ej.querySelector(".solucion");
    if (!dato && !preSol) return;
    var pistas = Array.prototype.slice.call(ej.querySelectorAll(".pistas li"));
    var cajaPistas = ej.querySelector(".pistas");
    if (cajaPistas) cajaPistas.hidden = true;
    var notaOk = ej.querySelector(".nota-ok");
    if (notaOk) notaOk.hidden = true;
    var ordenImporta = ej.dataset.orden !== "no";

    var esperado = null, errorEsperado = null;
    if (dato) esperado = dato.esperado;
    else {
      try { esperado = base.consultar(preSol.textContent.trim()); }
      catch (e) { errorEsperado = e.mensaje || String(e); }
    }
    if (preSol) preSol.hidden = true;

    var caja = el("div", "sql-caja");
    var ta = el("textarea", "sql-editor");
    ta.rows = 3;
    ta.spellcheck = false;
    ta.setAttribute("aria-label", "Escribí acá tu consulta");
    ta.placeholder = "SELECT ...";
    ta.value = guardado[id] || "";
    var botones = el("div", "sql-botones");
    var bRun = el("button", "b-run", "Ejecutar");
    var bPista = el("button", "b-pista", "Pista");
    var bEsp = el("button", "b-esperado", "Ver el resultado esperado");
    var bSol = el("button", "b-sol", "Ver la consulta resuelta");
    var intentos = 0;
    bSol.title = "Necesita el código de la clase";
    [bRun, bPista, bEsp, bSol].forEach(function (b) { b.type = "button"; });
    botones.appendChild(bRun);
    if (pistas.length) botones.appendChild(bPista);
    botones.appendChild(bEsp);
    botones.appendChild(bSol);
    var salida = el("div", "sql-salida");
    salida.setAttribute("role", "status");
    caja.appendChild(ta); caja.appendChild(botones); caja.appendChild(salida);
    var ancla = cajaPistas || preSol;
    if (ancla) ancla.parentNode.insertBefore(caja, ancla);
    else ej.appendChild(caja);

    function contarIntento() { intentos++; }

    /* la consulta resuelta se arma en el momento, con el código puesto */
    var cajaSol = null;
    function mostrarSolucion() {
      var sql = dato ? descifrar(dato.cifrado, codigo) : (preSol ? preSol.textContent.trim() : null);
      if (!sql) return false;
      if (!cajaSol) {
        cajaSol = el("pre", "solucion");
        caja.appendChild(cajaSol);
      }
      cajaSol.textContent = sql;
      cajaSol.hidden = false;
      bSol.textContent = "Ocultar la consulta resuelta";
      return true;
    }
    alDestrabar.push(function () { bSol.title = ""; });

    var pistaN = 0;
    function mostrarPista() {
      if (pistaN >= pistas.length) return;
      var p = el("p", "pista");
      p.innerHTML = "<b>Pista " + (pistaN + 1) + ".</b> " + pistas[pistaN].innerHTML;
      salida.appendChild(p);
      pistaN++;
      if (pistaN >= pistas.length) bPista.disabled = true;
    }

    function ejecutar() {
      salida.innerHTML = "";
      guardado[id] = ta.value; guardar();
      var res;
      try { res = base.consultar(ta.value); }
      catch (e) {
        var m = el("p", "res-mal");
        m.innerHTML = "<b>La consulta no llega a ejecutarse.</b> " + (e.mensaje || String(e));
        salida.appendChild(m);
        ej.classList.remove("resuelto");
        resueltos[id] = false;
        contarIntento();
        progreso();
        return;
      }
      salida.appendChild(tablaResultado(res));
      if (errorEsperado) return;
      var d = diagnostico(esperado, res, ordenImporta, ta.value);
      var aviso = el("p", d.ok ? "res-ok" : "res-mal");
      aviso.innerHTML = (d.ok ? "<b>Correcto.</b> " : "<b>Todavía no.</b> ") +
        (d.ok ? (notaOk ? notaOk.innerHTML : "") : d.texto);
      salida.appendChild(aviso);
      ej.classList.toggle("resuelto", d.ok);
      resueltos[id] = d.ok;
      if (!d.ok) contarIntento();
      progreso();
    }

    bRun.addEventListener("click", ejecutar);
    ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); ejecutar(); }
    });
    ta.addEventListener("input", function () { guardado[id] = ta.value; guardar(); });
    bPista.addEventListener("click", mostrarPista);
    bEsp.addEventListener("click", function () {
      salida.innerHTML = "";
      if (errorEsperado) { salida.appendChild(el("p", "res-mal", "No pude calcular el resultado esperado: " + errorEsperado)); return; }
      salida.appendChild(el("p", "et-esperado", "Esto es lo que tiene que devolver la consulta:"));
      salida.appendChild(tablaResultado(esperado));
    });
    bSol.addEventListener("click", function () {
      if (cajaSol && !cajaSol.hidden) {
        cajaSol.hidden = true;
        bSol.textContent = "Ver la consulta resuelta";
        return;
      }
      if (!hayCodigo() || !mostrarSolucion()) {
        salida.innerHTML = "";
        var m = el("p", "res-mal");
        m.innerHTML = "<b>La consulta resuelta se destraba con el código de la clase.</b> " +
          "Está arriba de los ejercicios" + (intentos >= INTENTOS ? ", y ya llevás " + intentos + " intentos: pedilo." : ".");
        salida.appendChild(m);
        var cand = document.querySelector("[data-codigo] input");
        if (cand) cand.focus();
      }
    });
  });
  progreso();

  /* ---------- 4 · el código de la clase ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-codigo]"), function (zona) {
    var texto = el("p", "candado-t");
    texto.innerHTML = "<b>Las consultas resueltas están cerradas con el código de la clase.</b> " +
      "Los ejercicios se corrigen igual sin él: lo que pide el código es ver la consulta escrita.";
    var fila = el("div", "candado-fila");
    var entrada = el("input", "candado-input");
    entrada.type = "text";
    entrada.placeholder = "código de la clase";
    entrada.setAttribute("aria-label", "Código de la clase");
    var boton = el("button", "b-run", "Destrabar");
    boton.type = "button";
    var estado = el("span", "candado-estado");
    fila.appendChild(entrada); fila.appendChild(boton); fila.appendChild(estado);
    zona.appendChild(texto); zona.appendChild(fila);

    function prueba(cod) {
      var ids = (typeof SOLUCIONES_CLASE2 !== "undefined") ? Object.keys(SOLUCIONES_CLASE2) : [];
      if (!ids.length) return true;
      return descifrar(SOLUCIONES_CLASE2[ids[0]].cifrado, cod) !== null;
    }

    function destrabado() {
      zona.classList.add("abierto");
      estado.textContent = "Destrabado";
      entrada.value = "";
      entrada.disabled = true;
      boton.disabled = true;
      alDestrabar.forEach(function (f) { f(); });
    }

    boton.addEventListener("click", function () {
      var cod = entrada.value.trim();
      if (!cod) return;
      if (prueba(cod)) {
        codigo = cod;
        try { localStorage.setItem(LLAVE_CODIGO, cod); } catch (e) {}
        destrabado();
      } else {
        estado.textContent = "Ese código no abre";
        zona.classList.add("cerrado");
      }
    });
    entrada.addEventListener("keydown", function (e) { if (e.key === "Enter") boton.click(); });

    if (codigo && prueba(codigo)) destrabado();
    else if (codigo) { codigo = null; try { localStorage.removeItem(LLAVE_CODIGO); } catch (e) {} }
  });

  /* ---------- 5 · descargar lo trabajado ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-exportar]"), function (b) {
    b.addEventListener("click", function () {
      var lineas = ["-- Consultas resueltas en clase · Base de Datos · 7.º TECIP",
        "-- Base del sitio de la consigna · " + new Date().toLocaleDateString("es-AR"), ""];
      ejercicios.forEach(function (ej, n) {
        var enun = ej.querySelector(".enunciado");
        var ta = ej.querySelector(".sql-editor");
        lineas.push("-- " + (n + 1) + ") " + (enun ? enun.textContent.trim().replace(/\s+/g, " ") : ej.id));
        lineas.push((ta && ta.value.trim()) ? ta.value.trim().replace(/;?\s*$/, ";") : "-- (sin resolver)");
        lineas.push("");
      });
      var blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mis-consultas.sql";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  });

  /* ---------- 6 · consola libre ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-consola]"), function (zona) {
    var ta = el("textarea", "sql-editor");
    ta.rows = 4; ta.spellcheck = false;
    ta.setAttribute("aria-label", "Consulta libre");
    ta.value = guardado.__consola || "SELECT * FROM producto;";
    var botones = el("div", "sql-botones");
    var bRun = el("button", "b-run", "Ejecutar");
    bRun.type = "button";
    botones.appendChild(bRun);
    base.tablas.forEach(function (t) {
      var b = el("button", "b-tabla", t);
      b.type = "button";
      b.title = "Ver la tabla " + t + " entera";
      b.addEventListener("click", function () { ta.value = "SELECT * FROM " + t + ";"; correr(); });
      botones.appendChild(b);
    });
    var salida = el("div", "sql-salida");
    salida.setAttribute("role", "status");
    zona.appendChild(ta); zona.appendChild(botones); zona.appendChild(salida);

    function correr() {
      salida.innerHTML = "";
      guardado.__consola = ta.value; guardar();
      try { salida.appendChild(tablaResultado(base.consultar(ta.value), 60)); }
      catch (e) {
        var m = el("p", "res-mal");
        m.innerHTML = "<b>No se pudo ejecutar.</b> " + (e.mensaje || String(e));
        salida.appendChild(m);
      }
    }
    bRun.addEventListener("click", correr);
    ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); correr(); }
    });
  });

  /* ---------- 7 · el esquema de la base, a la vista ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-esquema]"), function (zona) {
    base.tablas.forEach(function (t) {
      var d = el("div", "tabla-esq");
      d.appendChild(el("b", null, t));
      d.appendChild(el("span", null, base.columnasDe(t).join(" · ")));
      zona.appendChild(d);
    });
  });
})();
