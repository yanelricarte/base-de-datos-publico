/* Controles de lectura de las páginas de clase: tamaño de texto, tema e ir arriba.
   El estado se guarda por navegador. */
(function () {
  "use strict";
  var K = "bd-lectura";
  var estado = { dark: null, big: false };
  try { estado = Object.assign(estado, JSON.parse(localStorage.getItem(K) || "{}")); } catch (e) {}

  function guardar() { try { localStorage.setItem(K, JSON.stringify(estado)); } catch (e) {} }

  var barra = document.createElement("div");
  barra.className = "barra-lectura";
  barra.innerHTML =
    '<button type="button" id="tamano" title="Tamaño del texto">A+</button>' +
    '<button type="button" id="tema" title="Tema claro u oscuro">Oscuro</button>' +
    '<a href="#" id="arriba" title="Volver arriba" aria-label="Volver arriba">↑</a>';
  document.body.appendChild(barra);

  var bTam = barra.querySelector("#tamano");
  var bTema = barra.querySelector("#tema");
  var aArriba = barra.querySelector("#arriba");

  function aplicar() {
    document.body.classList.toggle("grande", estado.big);
    bTam.textContent = estado.big ? "A−" : "A+";
    var oscuroSistema = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var oscuro = estado.dark === null ? oscuroSistema : estado.dark;
    document.body.classList.toggle("oscuro", oscuro);
    document.body.classList.toggle("claro", !oscuro);
    bTema.textContent = oscuro ? "Claro" : "Oscuro";
  }

  bTam.addEventListener("click", function () { estado.big = !estado.big; guardar(); aplicar(); });
  bTema.addEventListener("click", function () {
    var oscuroSistema = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var actual = estado.dark === null ? oscuroSistema : estado.dark;
    estado.dark = !actual; guardar(); aplicar();
  });
  aArriba.addEventListener("click", function (ev) {
    ev.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function verArriba() { aArriba.classList.toggle("visible", window.scrollY > 500); }
  window.addEventListener("scroll", verArriba, { passive: true });

  aplicar(); verArriba();

  /* el apartado activo se marca en el índice mientras se lee */
  var enlaces = Array.prototype.slice.call(document.querySelectorAll(".indice a[href^='#']"));
  var destinos = enlaces.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function activo() {
    var y = window.scrollY + 120, i, ultimo = -1;
    for (i = 0; i < destinos.length; i++) { if (destinos[i] && destinos[i].offsetTop <= y) ultimo = i; }
    enlaces.forEach(function (a, n) { a.classList.toggle("activo", n === ultimo); });
  }
  if (enlaces.length) { window.addEventListener("scroll", activo, { passive: true }); activo(); }

  /* Las tablas de texto se apilan en pantallas angostas: cada celda lleva el
     encabezado de su columna, tomado del thead. La hoja de cálculo no se apila,
     porque la repetición se ve leyendo la columna hacia abajo; ahí se avisa que
     se desliza. */
  Array.prototype.forEach.call(document.querySelectorAll(".tabla-wrap table:not(.hoja)"), function (t) {
    var jefes = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) {
      return th.textContent.trim();
    });
    if (!jefes.length) return;
    t.classList.add("apilable");
    Array.prototype.forEach.call(t.querySelectorAll("tbody tr"), function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (jefes[i]) td.setAttribute("data-l", jefes[i]);
      });
    });
  });

  /* Movimiento suave al leer: cada apartado aparece cuando entra en pantalla.
     La clase "js" en el body es la que habilita el estado inicial oculto, para que
     sin JavaScript (o al imprimir) el texto se vea igual. */
  var mueve = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (mueve && "IntersectionObserver" in window) {
    document.body.classList.add("js");
    var piezas = Array.prototype.slice.call(
      document.querySelectorAll("main > section, .idea, figure.er, .check")
    );
    piezas.forEach(function (el) { el.classList.add("revela"); });
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });
    piezas.forEach(function (el) { obs.observe(el); });
    /* red de seguridad: si algo queda sin observar, a los 3 segundos se muestra igual */
    setTimeout(function () {
      piezas.forEach(function (el) { el.classList.add("visible"); });
    }, 3000);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".hoja-wrap"), function (w) {
    function avisar() { w.classList.toggle("desliza", w.scrollWidth > w.clientWidth + 2); }
    avisar();
    window.addEventListener("resize", avisar);
    w.addEventListener("scroll", function () {
      w.classList.toggle("al-final", w.scrollLeft + w.clientWidth >= w.scrollWidth - 2);
    }, { passive: true });
  });
})();
