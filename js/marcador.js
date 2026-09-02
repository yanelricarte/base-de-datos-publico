/* ============================================================
   Marcar el texto mientras se lee.
   Se selecciona con el dedo o con el mouse y aparece un botón para
   resaltar; al tocar una marca aparece el botón para quitarla. Las
   marcas quedan guardadas en el navegador de quien lee, por página.
   ============================================================ */
(function () {
  "use strict";
  var main = document.querySelector("main");
  if (!main || !window.getSelection) return;

  var LLAVE = "bd-marcas:" + location.pathname.replace(/^.*\/([^/]+\/[^/]+)$/, "$1");
  var FUERA = ".indice, .sql-caja, .sql-salida, .candado, .barra-lectura, .nav-clase, footer, .tabla-res, .armado .acciones";
  var SELECTOR = "p, li, h2, h3, h4, td, th, dd, blockquote, figcaption, summary";

  var bloques = Array.prototype.filter.call(main.querySelectorAll(SELECTOR), function (b) {
    return !b.closest(FUERA) && !b.querySelector(SELECTOR);
  });
  if (!bloques.length) return;
  bloques.forEach(function (b, i) { b.dataset.mk = "b" + i; });

  var marcas = {};
  try { marcas = JSON.parse(localStorage.getItem(LLAVE) || "{}"); } catch (e) {}
  function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(marcas)); } catch (e) {} }

  function nodosTexto(bloque) {
    var lista = [], n, it = document.createTreeWalker(bloque, NodeFilter.SHOW_TEXT, null);
    while ((n = it.nextNode())) lista.push(n);
    return lista;
  }
  function textoDe(bloque) { return nodosTexto(bloque).map(function (n) { return n.nodeValue; }).join(""); }

  function offsetDe(bloque, nodo, desplazamiento) {
    var total = 0, nodos = nodosTexto(bloque);
    for (var i = 0; i < nodos.length; i++) {
      if (nodos[i] === nodo) return total + desplazamiento;
      total += nodos[i].nodeValue.length;
    }
    return total;
  }

  /* deja el bloque sin marcas y vuelve a pintarlas desde el modelo */
  function pintar(bloque) {
    Array.prototype.forEach.call(bloque.querySelectorAll("mark.resaltado"), function (m) {
      var padre = m.parentNode;
      while (m.firstChild) padre.insertBefore(m.firstChild, m);
      padre.removeChild(m);
      padre.normalize();
    });
    var lista = (marcas[bloque.dataset.mk] || []).filter(function (m) { return vigente(bloque, m); })
      .slice().sort(function (a, b) { return a.i - b.i; });
    if (marcas[bloque.dataset.mk] && lista.length !== marcas[bloque.dataset.mk].length) {
      if (lista.length) marcas[bloque.dataset.mk] = lista;
      else delete marcas[bloque.dataset.mk];
      guardar();
    }
    /* de atrás para adelante, así los offsets de las anteriores no se mueven */
    lista.slice().reverse().forEach(function (m) { envolver(bloque, m.i, m.f); });
  }

  function envolver(bloque, ini, fin) {
    var total = 0;
    nodosTexto(bloque).forEach(function (nodo) {
      var a = total, b = total + nodo.nodeValue.length;
      total = b;
      if (b <= ini || a >= fin || !nodo.nodeValue.trim()) return;
      var desde = Math.max(ini - a, 0), hasta = Math.min(fin - a, nodo.nodeValue.length);
      var trozo = nodo;
      if (hasta < trozo.nodeValue.length) trozo.splitText(hasta);
      if (desde > 0) trozo = trozo.splitText(desde);
      var marca = document.createElement("mark");
      marca.className = "resaltado";
      trozo.parentNode.insertBefore(marca, trozo);
      marca.appendChild(trozo);
    });
  }

  function unir(lista, bloque) {
    var orden = lista.slice().sort(function (a, b) { return a.i - b.i; }), salida = [];
    orden.forEach(function (m) {
      var ultimo = salida[salida.length - 1];
      if (ultimo && m.i <= ultimo.f) ultimo.f = Math.max(ultimo.f, m.f);
      else salida.push({ i: m.i, f: m.f });
    });
    var texto = textoDe(bloque);
    salida.forEach(function (m) { m.t = texto.slice(m.i, m.f).slice(0, 40); });
    return salida;
  }

  /* Si el texto de la página cambió, los offsets guardados dejan de señalar lo
     mismo. Antes de pintar se compara con el fragmento anotado: cuando no
     coincide, la marca se descarta en lugar de aparecer sobre otras palabras. */
  function vigente(bloque, m) {
    if (!m.t) return true;
    return textoDe(bloque).slice(m.i, m.f).slice(0, 40) === m.t;
  }

  /* botón flotante */
  var boton = document.createElement("button");
  boton.type = "button";
  boton.className = "marcador-btn";
  boton.hidden = true;
  document.body.appendChild(boton);
  var accion = null;

  function mostrar(rect, texto, fn) {
    boton.textContent = texto;
    boton.hidden = false;
    boton.classList.remove("izquierda", "arriba");
    var ancho = boton.offsetWidth || 90;
    var medio = rect.top + rect.height / 2 + window.scrollY;
    if (rect.right + ancho + 16 <= window.innerWidth) {
      boton.style.left = rect.right + 10 + window.scrollX + "px";
      boton.style.top = medio + "px";
    } else if (rect.left - ancho - 16 >= 0) {
      boton.classList.add("izquierda");
      boton.style.left = rect.left - 10 + window.scrollX + "px";
      boton.style.top = medio + "px";
    } else {
      /* pantalla angosta: no hay costado libre, así que va abajo del renglón */
      boton.classList.add("arriba");
      boton.style.left = rect.left + window.scrollX + "px";
      boton.style.top = rect.bottom + 8 + window.scrollY + "px";
    }
    accion = fn;
  }
  function ocultar() { boton.hidden = true; accion = null; }

  boton.addEventListener("mousedown", function (e) { e.preventDefault(); });
  boton.addEventListener("click", function () { if (accion) { accion(); ocultar(); } });

  function resaltarSeleccion() {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    var rango = sel.getRangeAt(0);
    bloques.forEach(function (bloque) {
      if (!sel.containsNode(bloque, true)) return;
      var propio = document.createRange();
      propio.selectNodeContents(bloque);
      var largo = textoDe(bloque).length;
      var ini = rango.compareBoundaryPoints(Range.START_TO_START, propio) <= 0
        ? 0 : offsetDe(bloque, rango.startContainer, rango.startOffset);
      var fin = rango.compareBoundaryPoints(Range.END_TO_END, propio) >= 0
        ? largo : offsetDe(bloque, rango.endContainer, rango.endOffset);
      if (fin - ini < 2) return;
      marcas[bloque.dataset.mk] = unir((marcas[bloque.dataset.mk] || []).concat([{ i: ini, f: fin }]), bloque);
      pintar(bloque);
    });
    guardar();
    sel.removeAllRanges();
  }

  function alSoltar() {
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return;
      var nodo = sel.getRangeAt(0).commonAncestorContainer;
      var el = nodo.nodeType === 1 ? nodo : nodo.parentNode;
      if (!main.contains(el) || el.closest(FUERA)) return;
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      mostrar(rect, "Resaltar", resaltarSeleccion);
    }, 10);
  }

  document.addEventListener("mouseup", alSoltar);
  document.addEventListener("touchend", alSoltar);

  function quitarMarca(marca) {
    var bloque = marca.closest("[data-mk]");
    if (!bloque) return;
    var inicio = offsetDe(bloque, marca.firstChild, 0);
    marcas[bloque.dataset.mk] = (marcas[bloque.dataset.mk] || []).filter(function (m) {
      return inicio < m.i || inicio >= m.f;
    });
    if (!marcas[bloque.dataset.mk].length) delete marcas[bloque.dataset.mk];
    pintar(bloque);
    guardar();
  }

  document.addEventListener("mousedown", function (e) {
    if (e.target === boton) return;
    var marca = e.target.closest && e.target.closest("mark.resaltado");
    if (!marca) { ocultar(); return; }
    mostrar(marca.getBoundingClientRect(), "Quitar la marca", function () { quitarMarca(marca); });
  });

  /* Doble clic: marca la palabra de una, y sobre una marca la saca. El botón
     queda para las frases, que se seleccionan arrastrando. */
  document.addEventListener("dblclick", function (e) {
    var el = e.target.nodeType === 1 ? e.target : e.target.parentNode;
    if (!el || !main.contains(el) || el.closest(FUERA)) return;
    var marca = el.closest("mark.resaltado");
    if (marca) {
      quitarMarca(marca);
      window.getSelection().removeAllRanges();
      ocultar();
      return;
    }
    resaltarSeleccion();
    ocultar();
  });

  window.addEventListener("scroll", ocultar, { passive: true });

  /* lo marcado en visitas anteriores */
  bloques.forEach(function (bloque) { if (marcas[bloque.dataset.mk]) pintar(bloque); });
})();
