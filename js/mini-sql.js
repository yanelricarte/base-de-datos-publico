/* Motor de consultas para practicar SELECT dentro de la propia página.
   Entiende el subconjunto de SQL que usa la materia —SELECT, WHERE, ORDER BY,
   INNER y LEFT JOIN, GROUP BY, HAVING, funciones de agregación y columnas
   calculadas— sobre tablas cargadas en memoria. Sirve cuando el gestor no está
   disponible; no reemplaza a MySQL: no hay INSERT, UPDATE ni CREATE.

   Uso:  var base = MiniSQL.crear(DATOS_SITIO);
         var r = base.consultar("SELECT nombre FROM producto");   // {columnas, filas}
   Los errores se lanzan como objetos {mensaje: "..."} en castellano. */
var MiniSQL = (function () {
  "use strict";

  var CLAVES = ["select", "distinct", "from", "inner", "left", "right", "outer", "join", "on",
    "where", "group", "by", "having", "order", "asc", "desc", "limit", "offset",
    "and", "or", "not", "like", "in", "is", "null", "between", "as"];

  function error(m) { throw { mensaje: m }; }

  /* ---------------- 1 · De texto a piezas ---------------- */

  function tokenizar(sql) {
    var ts = [], i = 0, n = sql.length;
    var letra = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_]/, alfa = /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_]/;
    while (i < n) {
      var c = sql[i];
      if (/\s/.test(c)) { i++; continue; }
      if ((c === "-" && sql[i + 1] === "-") || c === "#") { while (i < n && sql[i] !== "\n") i++; continue; }
      if (c === "/" && sql[i + 1] === "*") { i += 2; while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++; i += 2; continue; }
      if (c === ";") { i++; continue; }
      if (c === "'" || c === '"') {
        var q = c, s = ""; i++;
        while (i < n) {
          if (sql[i] === q) { if (sql[i + 1] === q) { s += q; i += 2; continue; } i++; break; }
          if (sql[i] === "\\" && i + 1 < n) { s += sql[i + 1]; i += 2; continue; }
          s += sql[i++];
        }
        ts.push({ t: "txt", v: s }); continue;
      }
      if (c === "`") {
        var f = sql.indexOf("`", i + 1);
        if (f < 0) error("Quedó una comilla invertida ` sin cerrar.");
        ts.push({ t: "id", v: sql.slice(i + 1, f) }); i = f + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(sql[i + 1] || ""))) {
        var j = i; while (j < n && /[0-9.]/.test(sql[j])) j++;
        ts.push({ t: "num", v: parseFloat(sql.slice(i, j)) }); i = j; continue;
      }
      if (letra.test(c)) {
        var k = i; while (k < n && alfa.test(sql[k])) k++;
        var p = sql.slice(i, k), b = p.toLowerCase();
        ts.push(CLAVES.indexOf(b) >= 0 ? { t: "clave", v: b } : { t: "id", v: p });
        i = k; continue;
      }
      var dos = sql.substr(i, 2);
      if (dos === ">=" || dos === "<=" || dos === "<>" || dos === "!=") { ts.push({ t: "op", v: dos === "!=" ? "<>" : dos }); i += 2; continue; }
      if ("=<>+-*/(),.".indexOf(c) >= 0) { ts.push({ t: "op", v: c }); i++; continue; }
      error("No entiendo el signo « " + c + " ». Revisá si sobra o si falta una comilla.");
    }
    return ts;
  }

  /* ---------------- 2 · De piezas a estructura ---------------- */

  function Analizador(ts, sql) { this.ts = ts; this.i = 0; this.sql = sql; }

  Analizador.prototype.fin = function () { return this.i >= this.ts.length; };
  Analizador.prototype.ver = function (k) { return this.ts[this.i + (k || 0)] || null; };
  Analizador.prototype.esClave = function (v) { var t = this.ver(); return !!t && t.t === "clave" && t.v === v; };
  Analizador.prototype.esOp = function (v) { var t = this.ver(); return !!t && t.t === "op" && t.v === v; };
  Analizador.prototype.tomar = function () { return this.ts[this.i++]; };
  Analizador.prototype.tragarClave = function (v) { if (this.esClave(v)) { this.i++; return true; } return false; };
  Analizador.prototype.exigirClave = function (v, ayuda) {
    if (!this.tragarClave(v)) error("Esperaba « " + v.toUpperCase() + " » y encontré « " + this.texto(this.ver()) + " »." + (ayuda ? " " + ayuda : ""));
  };
  Analizador.prototype.exigirOp = function (v) {
    if (this.esOp(v)) { this.i++; return; }
    error("Falta « " + v + " ». Encontré « " + this.texto(this.ver()) + " ».");
  };
  Analizador.prototype.texto = function (t) { return t ? (t.t === "txt" ? "'" + t.v + "'" : String(t.v)) : "el final de la consulta"; };
  Analizador.prototype.nombre = function (que) {
    var t = this.ver();
    if (!t || (t.t !== "id" && t.t !== "clave")) error("Esperaba un nombre de " + que + " y encontré « " + this.texto(t) + " ».");
    this.i++; return t.v;
  };

  /* consulta := SELECT ... FROM ... [JOIN] [WHERE] [GROUP BY] [HAVING] [ORDER BY] [LIMIT] */
  Analizador.prototype.consulta = function (anidada) {
    if (!this.esClave("select")) {
      var t = this.ver();
      if (t && t.t === "id" && ["insert", "update", "delete", "create", "drop", "alter"].indexOf(String(t.v).toLowerCase()) >= 0)
        error("Esta página solo ejecuta consultas SELECT. « " + String(t.v).toUpperCase() + " » se prueba en el gestor.");
      error("Toda consulta empieza con SELECT. Encontré « " + this.texto(t) + " ».");
    }
    this.i++;
    var c = { distinto: this.tragarClave("distinct"), columnas: [], desde: null, uniones: [], donde: null, agrupar: null, teniendo: null, ordenar: null, limite: null };

    do { c.columnas.push(this.itemSelect()); } while (this.esOp(",") && ++this.i);

    if (!this.tragarClave("from")) error("Falta la parte FROM: hay que decir de qué tabla salen los datos.");
    c.desde = this.origen();
    while (this.esOp(",")) { this.i++; var o = this.origen(); c.uniones.push({ tipo: "cruz", origen: o, on: null }); }

    while (this.esClave("inner") || this.esClave("left") || this.esClave("right") || this.esClave("join")) {
      var tipo = "inner";
      if (this.tragarClave("inner")) tipo = "inner";
      else if (this.tragarClave("left")) { tipo = "left"; this.tragarClave("outer"); }
      else if (this.tragarClave("right")) error("El motor de esta página no hace RIGHT JOIN. Dando vuelta las tablas, un LEFT JOIN dice lo mismo.");
      this.exigirClave("join", "Después de INNER o LEFT va JOIN.");
      var org = this.origen();
      this.exigirClave("on", "Todo JOIN necesita ON: con qué columnas se unen las dos tablas.");
      c.uniones.push({ tipo: tipo, origen: org, on: this.expresion() });
    }

    if (this.tragarClave("where")) c.donde = this.expresion();
    if (this.tragarClave("group")) {
      this.exigirClave("by", "Se escribe GROUP BY.");
      c.agrupar = []; do { c.agrupar.push(this.expresion()); } while (this.esOp(",") && ++this.i);
    }
    if (this.tragarClave("having")) c.teniendo = this.expresion();
    if (this.tragarClave("order")) {
      this.exigirClave("by", "Se escribe ORDER BY.");
      c.ordenar = [];
      do {
        var e = this.expresion(), dir = "asc";
        if (this.tragarClave("desc")) dir = "desc"; else this.tragarClave("asc");
        c.ordenar.push({ expr: e, dir: dir });
      } while (this.esOp(",") && ++this.i);
    }
    if (this.tragarClave("limit")) {
      var t1 = this.tomar();
      if (!t1 || t1.t !== "num") error("Después de LIMIT va un número.");
      c.limite = t1.v;
      if (this.esOp(",")) { this.i++; var t2 = this.tomar(); c.limite = t2.v; }
      if (this.tragarClave("offset")) this.tomar();
    }
    if (!anidada && !this.fin()) error("Sobra texto al final: « " + this.texto(this.ver()) + " ». Revisá el orden: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY.");
    return c;
  };

  Analizador.prototype.itemSelect = function () {
    var ini = this.i;
    if (this.esOp("*")) { this.i++; return { expr: { k: "todo", tabla: null }, alias: null, txt: "*" }; }
    if (this.ver() && this.ver().t === "id" && this.ver(1) && this.ver(1).t === "op" && this.ver(1).v === "." && this.ver(2) && this.ver(2).t === "op" && this.ver(2).v === "*") {
      var tb = this.tomar().v; this.i += 2;
      return { expr: { k: "todo", tabla: tb }, alias: null, txt: tb + ".*" };
    }
    var e = this.expresion(), alias = null;
    if (this.tragarClave("as")) alias = this.nombre("columna");
    else if (this.ver() && this.ver().t === "id" && !this.esOp(",")) alias = this.tomar().v;
    return { expr: e, alias: alias, txt: this.fuente(ini, this.i) };
  };

  Analizador.prototype.fuente = function (a, b) {
    var p = [];
    for (var k = a; k < b; k++) {
      var t = this.ts[k];
      p.push(t.t === "txt" ? "'" + t.v + "'" : String(t.v));
    }
    return p.join(" ").replace(/ \( /g, "(").replace(/ \)/g, ")").replace(/ , /g, ", ").replace(/ \. /g, ".");
  };

  Analizador.prototype.origen = function () {
    var tabla = this.nombre("tabla"), alias = null;
    if (this.tragarClave("as")) alias = this.nombre("tabla");
    else if (this.ver() && this.ver().t === "id") alias = this.tomar().v;
    return { tabla: tabla, alias: alias || tabla };
  };

  /* expresiones, de menor a mayor precedencia */
  Analizador.prototype.expresion = function () { return this.oExpr(); };
  Analizador.prototype.oExpr = function () {
    var e = this.yExpr();
    while (this.tragarClave("or")) e = { k: "logica", op: "or", a: e, b: this.yExpr() };
    return e;
  };
  Analizador.prototype.yExpr = function () {
    var e = this.noExpr();
    while (this.tragarClave("and")) e = { k: "logica", op: "and", a: e, b: this.noExpr() };
    return e;
  };
  Analizador.prototype.noExpr = function () {
    if (this.tragarClave("not")) return { k: "no", a: this.noExpr() };
    return this.comparacion();
  };
  Analizador.prototype.comparacion = function () {
    var a = this.suma();
    var t = this.ver();
    if (t && t.t === "op" && ["=", "<>", "<", "<=", ">", ">="].indexOf(t.v) >= 0) {
      this.i++; return { k: "comp", op: t.v, a: a, b: this.suma() };
    }
    var negado = false, guardado = this.i;
    if (this.tragarClave("not")) negado = true;
    if (this.tragarClave("like")) { var r = { k: "like", a: a, b: this.suma() }; return negado ? { k: "no", a: r } : r; }
    if (this.tragarClave("in")) {
      this.exigirOp("(");
      var lista = [];
      if (this.esClave("select")) lista.push({ k: "sub", consulta: this.consulta(true) });
      else { do { lista.push(this.expresion()); } while (this.esOp(",") && ++this.i); }
      this.exigirOp(")");
      var r2 = { k: "en", a: a, lista: lista };
      return negado ? { k: "no", a: r2 } : r2;
    }
    if (this.tragarClave("between")) {
      var b1 = this.suma();
      this.exigirClave("and", "BETWEEN necesita dos límites unidos por AND.");
      var b2 = this.suma();
      var r3 = { k: "entre", a: a, b: b1, c: b2 };
      return negado ? { k: "no", a: r3 } : r3;
    }
    if (negado) this.i = guardado;
    if (this.tragarClave("is")) {
      var neg2 = this.tragarClave("not");
      this.exigirClave("null", "Después de IS va NULL.");
      var r4 = { k: "esNulo", a: a };
      return neg2 ? { k: "no", a: r4 } : r4;
    }
    return a;
  };
  Analizador.prototype.suma = function () {
    var e = this.producto();
    while (this.esOp("+") || this.esOp("-")) { var op = this.tomar().v; e = { k: "arit", op: op, a: e, b: this.producto() }; }
    return e;
  };
  Analizador.prototype.producto = function () {
    var e = this.unario();
    while (this.esOp("*") || this.esOp("/")) { var op = this.tomar().v; e = { k: "arit", op: op, a: e, b: this.unario() }; }
    return e;
  };
  Analizador.prototype.unario = function () {
    if (this.esOp("-")) { this.i++; return { k: "arit", op: "-", a: { k: "lit", v: 0 }, b: this.unario() }; }
    if (this.esOp("+")) { this.i++; return this.unario(); }
    return this.primaria();
  };
  Analizador.prototype.primaria = function () {
    var t = this.ver();
    if (!t) error("La consulta termina antes de tiempo: falta algo después de la última palabra.");
    if (t.t === "num") { this.i++; return { k: "lit", v: t.v }; }
    if (t.t === "txt") { this.i++; return { k: "lit", v: t.v }; }
    if (t.t === "clave" && t.v === "null") { this.i++; return { k: "lit", v: null }; }
    if (t.t === "clave" && t.v === "from") error("Entre SELECT y FROM van las columnas que se quieren ver, o un asterisco.");
    if (t.t === "op" && t.v === "(") {
      this.i++;
      if (this.esClave("select")) { var sub = this.consulta(true); this.exigirOp(")"); return { k: "sub", consulta: sub }; }
      var e = this.expresion(); this.exigirOp(")"); return e;
    }
    if (t.t === "id") {
      var nom = this.tomar().v;
      if (this.esOp("(")) {
        this.i++;
        var args = [], distinto = false;
        if (this.tragarClave("distinct")) distinto = true;
        if (this.esOp("*")) { this.i++; args.push({ k: "todo", tabla: null }); }
        else if (!this.esOp(")")) { do { args.push(this.expresion()); } while (this.esOp(",") && ++this.i); }
        this.exigirOp(")");
        return { k: "func", nombre: nom.toLowerCase(), args: args, distinto: distinto };
      }
      if (this.esOp(".")) { this.i++; var col = this.nombre("columna"); return { k: "col", tabla: nom, col: col }; }
      return { k: "col", tabla: null, col: nom };
    }
    error("No esperaba « " + this.texto(t) + " » acá.");
  };

  /* ---------------- 3 · Ejecución ---------------- */

  var AGREGADAS = ["count", "sum", "avg", "min", "max"];

  function sinTildes(s) {
    return String(s).normalize ? String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "") : String(s);
  }
  function plano(v) { return sinTildes(String(v)).toLowerCase(); }

  function comparar(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return null;
    if (typeof a === "number" && typeof b === "number") return a < b ? -1 : (a > b ? 1 : 0);
    if (typeof a === "number" || typeof b === "number") {
      var na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na < nb ? -1 : (na > nb ? 1 : 0);
    }
    var pa = plano(a), pb = plano(b);
    return pa < pb ? -1 : (pa > pb ? 1 : 0);
  }

  function verdad(v) { return v !== null && v !== undefined && v !== false && v !== 0; }

  function crear(datos) {
    var tablas = {};
    Object.keys(datos).forEach(function (nom) {
      var d = datos[nom];
      tablas[nom.toLowerCase()] = {
        nombre: nom,
        columnas: d.columnas.slice(),
        filas: d.filas.map(function (f) {
          var o = {};
          d.columnas.forEach(function (c, i) { o[c] = f[i] === undefined ? null : f[i]; });
          return o;
        })
      };
    });
    var nombres = Object.keys(tablas);

    function tabla(nom) {
      var t = tablas[String(nom).toLowerCase()];
      if (!t) {
        var cerca = nombres.filter(function (n) { return plano(n).indexOf(plano(nom).replace(/s$/, "")) === 0; });
        error("No existe la tabla « " + nom + " »." + (cerca.length ? " ¿Quisiste decir « " + cerca[0] + " »?" : " Las tablas de esta base son: " + nombres.join(", ") + "."));
      }
      return t;
    }

    /* contexto: {filas: {alias: filaObjeto}, grupo: [contextos] | null, salida: {alias: valor}} */
    function campo(fila, col) {
      if (!fila) return undefined;
      if (Object.prototype.hasOwnProperty.call(fila, col)) return col;
      return Object.keys(fila).filter(function (x) { return plano(x) === plano(col); })[0];
    }

    function leerCol(ctx, nodo) {
      var alias, f;
      if (nodo.tabla) {
        alias = Object.keys(ctx.filas).filter(function (a) { return plano(a) === plano(nodo.tabla); })[0];
        if (!alias) error("En la consulta no aparece la tabla « " + nodo.tabla + " ». Las que están son: " + Object.keys(ctx.filas).join(", ") + ".");
        f = ctx.filas[alias];
        var k1 = campo(f, nodo.col);
        if (f && !k1) error("La tabla « " + nodo.tabla + " » no tiene la columna « " + nodo.col + " ». Tiene: " + Object.keys(f).join(", ") + ".");
        return f ? f[k1] : null;
      }
      if (ctx.salida) {
        var etiqueta = Object.keys(ctx.salida).filter(function (x) { return plano(x) === plano(nodo.col); })[0];
        if (etiqueta) return ctx.salida[etiqueta];
      }
      var hallados = [];
      Object.keys(ctx.filas).forEach(function (a) {
        if (campo(ctx.filas[a], nodo.col)) hallados.push(a);
      });
      if (!hallados.length) {
        var todas = [];
        Object.keys(ctx.filas).forEach(function (a) {
          var fila = ctx.filas[a];
          (fila ? Object.keys(fila) : []).forEach(function (c) { if (todas.indexOf(c) < 0) todas.push(c); });
        });
        error("No existe la columna « " + nodo.col + " ». Las columnas disponibles son: " + todas.join(", ") + ".");
      }
      if (hallados.length > 1) error("La columna « " + nodo.col + " » está en más de una tabla (" + hallados.join(" y ") + "). Escribila con la tabla adelante: " + hallados[0] + "." + nodo.col + ".");
      var fi = ctx.filas[hallados[0]];
      return fi ? fi[campo(fi, nodo.col)] : null;
    }

    function evaluar(nodo, ctx) {
      switch (nodo.k) {
        case "lit": return nodo.v;
        case "col": return leerCol(ctx, nodo);
        case "todo": error("El asterisco solo se puede usar como SELECT * o dentro de COUNT(*).");
          break;
        case "arit": {
          var a = evaluar(nodo.a, ctx), b = evaluar(nodo.b, ctx);
          if (a === null || b === null) return null;
          a = parseFloat(a); b = parseFloat(b);
          if (isNaN(a) || isNaN(b)) error("Estoy intentando hacer una cuenta con un texto. La operación « " + nodo.op + " » necesita números.");
          if (nodo.op === "+") return a + b;
          if (nodo.op === "-") return a - b;
          if (nodo.op === "*") return a * b;
          return b === 0 ? null : a / b;
        }
        case "comp": {
          var c = comparar(evaluar(nodo.a, ctx), evaluar(nodo.b, ctx));
          if (c === null) return null;
          switch (nodo.op) {
            case "=": return c === 0;
            case "<>": return c !== 0;
            case "<": return c < 0;
            case "<=": return c <= 0;
            case ">": return c > 0;
            default: return c >= 0;
          }
        }
        case "logica": {
          var va = evaluar(nodo.a, ctx), vb;
          if (nodo.op === "and") { if (va === false) return false; vb = evaluar(nodo.b, ctx); return (va === null || vb === null) ? null : (verdad(va) && verdad(vb)); }
          if (verdad(va)) return true;
          vb = evaluar(nodo.b, ctx);
          return (va === null && !verdad(vb)) ? null : verdad(vb);
        }
        case "no": { var v = evaluar(nodo.a, ctx); return v === null ? null : !verdad(v); }
        case "esNulo": { var x = evaluar(nodo.a, ctx); return x === null || x === undefined; }
        case "like": {
          var s = evaluar(nodo.a, ctx), p = evaluar(nodo.b, ctx);
          if (s === null || p === null) return null;
          var rx = "^" + plano(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, "[\\s\\S]*").replace(/_/g, "[\\s\\S]") + "$";
          return new RegExp(rx).test(plano(s));
        }
        case "en": {
          var val = evaluar(nodo.a, ctx), hay = false, i;
          if (nodo.lista.length === 1 && nodo.lista[0].k === "sub") {
            var res = subconsulta(nodo.lista[0]);
            for (i = 0; i < res.filas.length; i++) { if (comparar(val, res.filas[i][0]) === 0) hay = true; }
            return hay;
          }
          for (i = 0; i < nodo.lista.length; i++) { if (comparar(val, evaluar(nodo.lista[i], ctx)) === 0) hay = true; }
          return hay;
        }
        case "entre": {
          var v1 = comparar(evaluar(nodo.a, ctx), evaluar(nodo.b, ctx));
          var v2 = comparar(evaluar(nodo.a, ctx), evaluar(nodo.c, ctx));
          if (v1 === null || v2 === null) return null;
          return v1 >= 0 && v2 <= 0;
        }
        case "func": return funcion(nodo, ctx);
        case "sub": {
          var res = subconsulta(nodo);
          if (!res.filas.length) return null;
          return res.filas[0][0];
        }
      }
      error("No sé interpretar una parte de la consulta.");
    }

    function funcion(nodo, ctx) {
      var n = nodo.nombre;
      if (AGREGADAS.indexOf(n) >= 0) {
        if (!ctx.grupo) error("« " + n.toUpperCase() + "() » resume varias filas en una. Para usarla, la consulta tiene que agrupar: sin GROUP BY resume toda la tabla, y con GROUP BY resume cada grupo.");
        var vals = [];
        ctx.grupo.forEach(function (c2) {
          if (n === "count" && nodo.args[0] && nodo.args[0].k === "todo") { vals.push(1); return; }
          var v = evaluar(nodo.args[0], c2);
          if (v !== null && v !== undefined) vals.push(v);
        });
        if (nodo.distinto) {
          var vistos = [];
          vals = vals.filter(function (v) { var p = plano(v); if (vistos.indexOf(p) >= 0) return false; vistos.push(p); return true; });
        }
        if (n === "count") return vals.length;
        if (!vals.length) return null;
        var nums = vals.map(function (v) { return parseFloat(v); });
        if (n === "sum" || n === "avg") {
          if (nums.some(isNaN)) error("« " + n.toUpperCase() + "() » necesita una columna de números.");
          var s = nums.reduce(function (a, b) { return a + b; }, 0);
          return n === "sum" ? s : s / nums.length;
        }
        var orden = vals.slice().sort(function (a, b) { return comparar(a, b); });
        return n === "min" ? orden[0] : orden[orden.length - 1];
      }
      var a = nodo.args.map(function (x) { return evaluar(x, ctx); });
      switch (n) {
        case "round": {
          if (a[0] === null) return null;
          var d = a.length > 1 ? a[1] : 0, m = Math.pow(10, d);
          return Math.round(parseFloat(a[0]) * m) / m;
        }
        case "upper": return a[0] === null ? null : String(a[0]).toUpperCase();
        case "lower": return a[0] === null ? null : String(a[0]).toLowerCase();
        case "concat": return a.some(function (x) { return x === null; }) ? null : a.join("");
        case "length": case "char_length": return a[0] === null ? null : String(a[0]).length;
        case "abs": return a[0] === null ? null : Math.abs(parseFloat(a[0]));
        case "ifnull": case "coalesce": {
          for (var i = 0; i < a.length; i++) if (a[i] !== null && a[i] !== undefined) return a[i];
          return null;
        }
        case "now": case "curdate": return new Date().toISOString().slice(0, 10);
      }
      error("No conozco la función « " + n.toUpperCase() + " ». Las que entiende esta página son COUNT, SUM, AVG, MIN, MAX, ROUND, CONCAT, UPPER, LOWER, LENGTH e IFNULL.");
    }

    function subconsulta(nodo) {
      if (!nodo.cache) {
        nodo.cache = ejecutar(nodo.consulta);
        if (nodo.cache.columnas.length > 1) error("Una consulta entre paréntesis tiene que devolver una sola columna.");
      }
      return nodo.cache;
    }

    function tieneAgregada(nodo) {
      if (!nodo || typeof nodo !== "object") return false;
      if (nodo.k === "func" && AGREGADAS.indexOf(nodo.nombre) >= 0) return true;
      return ["a", "b", "c"].some(function (p) { return tieneAgregada(nodo[p]); }) ||
        (nodo.args || []).some(tieneAgregada) || (nodo.lista || []).some(tieneAgregada);
    }

    function columnaSuelta(nodo) {
      if (!nodo || typeof nodo !== "object") return null;
      if (nodo.k === "col") return nodo.col;
      if (nodo.k === "sub") return null;
      if (nodo.k === "func" && AGREGADAS.indexOf(nodo.nombre) >= 0) return null;
      var r = null;
      ["a", "b", "c"].forEach(function (p) { if (!r) r = columnaSuelta(nodo[p]); });
      (nodo.args || []).forEach(function (x) { if (!r) r = columnaSuelta(x); });
      return r;
    }

    function consultar(sql) {
      if (!String(sql).trim()) error("Escribí una consulta.");
      var an = new Analizador(tokenizar(sql), sql);
      return ejecutar(an.consulta());
    }

    function ejecutar(c) {
      /* 1 · producto de tablas según FROM y JOIN */
      var base = tabla(c.desde.tabla);
      var alias = {}; alias[c.desde.alias] = base;
      var filas = base.filas.map(function (f) { var o = {}; o[c.desde.alias] = f; return o; });

      c.uniones.forEach(function (u) {
        var t = tabla(u.origen.tabla);
        if (alias[u.origen.alias]) error("El nombre « " + u.origen.alias + " » se usa dos veces. Ponele un alias distinto a una de las dos tablas.");
        alias[u.origen.alias] = t;
        var nuevas = [];
        filas.forEach(function (fila) {
          var enganchó = false;
          t.filas.forEach(function (f2) {
            var comb = Object.assign({}, fila); comb[u.origen.alias] = f2;
            if (!u.on || verdad(evaluar(u.on, { filas: comb, grupo: null }))) { nuevas.push(comb); enganchó = true; }
          });
          if (!enganchó && u.tipo === "left") {
            var vacio = Object.assign({}, fila), nulo = {};
            t.columnas.forEach(function (col) { nulo[col] = null; });
            vacio[u.origen.alias] = nulo;
            nuevas.push(vacio);
          }
        });
        filas = nuevas;
      });

      /* 2 · WHERE */
      if (c.donde) filas = filas.filter(function (f) { return verdad(evaluar(c.donde, { filas: f, grupo: null })); });

      /* 3 · agrupamiento */
      var ctxs = filas.map(function (f) { return { filas: f, grupo: null }; });
      var agrega = c.columnas.some(function (i) { return tieneAgregada(i.expr); }) || tieneAgregada(c.teniendo) ||
        (c.ordenar || []).some(function (o) { return tieneAgregada(o.expr); });
      if (agrega && !c.agrupar) {
        var suelta = null;
        c.columnas.forEach(function (i) { if (!suelta) suelta = columnaSuelta(i.expr); });
        if (suelta) error("La consulta mezcla la columna « " + suelta + " », que tiene un valor por fila, con una función que resume muchas filas en una. O se pide solo el resumen, o se agrega GROUP BY para decir por cuál columna se agrupa.");
      }
      var grupos;
      if (c.agrupar) {
        var mapa = {}, orden = [];
        ctxs.forEach(function (ctx) {
          var clave = c.agrupar.map(function (e) { return plano(evaluar(e, ctx)); }).join("\u0001");
          if (!mapa[clave]) { mapa[clave] = []; orden.push(clave); }
          mapa[clave].push(ctx);
        });
        grupos = orden.map(function (k) { return { filas: mapa[k][0].filas, grupo: mapa[k] }; });
      } else if (agrega) {
        grupos = [{ filas: ctxs.length ? ctxs[0].filas : {}, grupo: ctxs }];
      } else {
        grupos = ctxs;
      }

      /* 4 · HAVING */
      if (c.teniendo) {
        if (!c.agrupar && !agrega) error("HAVING filtra grupos: se usa junto con GROUP BY. Para filtrar filas sueltas va WHERE.");
        grupos = grupos.filter(function (g) { return verdad(evaluar(c.teniendo, g)); });
      }

      /* 5 · columnas de salida */
      var cols = [], calc = [];
      c.columnas.forEach(function (item) {
        if (item.expr.k === "todo") {
          Object.keys(alias).forEach(function (a) {
            if (item.expr.tabla && plano(a) !== plano(item.expr.tabla)) return;
            alias[a].columnas.forEach(function (col) {
              cols.push(Object.keys(alias).length > 1 ? a + "." + col : col);
              calc.push({ tabla: a, col: col });
            });
          });
          return;
        }
        cols.push(item.alias || item.txt);
        calc.push({ expr: item.expr, alias: item.alias || item.txt });
      });
      if (!cols.length) error("La consulta no pide ninguna columna.");

      var salida = grupos.map(function (g) {
        var vals = calc.map(function (d) {
          return d.expr ? evaluar(d.expr, g) : (g.filas[d.tabla] ? g.filas[d.tabla][d.col] : null);
        });
        var porNombre = {};
        cols.forEach(function (n, i) { porNombre[n] = vals[i]; });
        return { vals: vals, ctx: { filas: g.filas, grupo: g.grupo, salida: porNombre } };
      });

      /* 6 · DISTINCT */
      if (c.distinto) {
        var vistas = [];
        salida = salida.filter(function (r) {
          var k = r.vals.map(plano).join("\u0001");
          if (vistas.indexOf(k) >= 0) return false;
          vistas.push(k); return true;
        });
      }

      /* 7 · ORDER BY */
      if (c.ordenar) {
        salida = salida.map(function (r, i) { return { r: r, i: i }; }).sort(function (x, y) {
          for (var k = 0; k < c.ordenar.length; k++) {
            var o = c.ordenar[k], va, vb;
            if (o.expr.k === "lit" && typeof o.expr.v === "number") { va = x.r.vals[o.expr.v - 1]; vb = y.r.vals[o.expr.v - 1]; }
            else { va = evaluar(o.expr, x.r.ctx); vb = evaluar(o.expr, y.r.ctx); }
            var cmp;
            if (va === null && vb === null) cmp = 0;
            else if (va === null) cmp = -1;
            else if (vb === null) cmp = 1;
            else cmp = comparar(va, vb);
            if (cmp) return o.dir === "desc" ? -cmp : cmp;
          }
          return x.i - y.i;
        }).map(function (p) { return p.r; });
      }

      /* 8 · LIMIT */
      if (c.limite !== null) salida = salida.slice(0, c.limite);

      return { columnas: cols, filas: salida.map(function (r) { return r.vals; }) };
    }

    return {
      consultar: consultar,
      tablas: nombres,
      columnasDe: function (n) { return tabla(n).columnas.slice(); },
      filasDe: function (n) { var t = tabla(n); return t.filas.map(function (f) { return t.columnas.map(function (c) { return f[c]; }); }); }
    };
  }

  return { crear: crear };
})();

if (typeof module !== "undefined" && module.exports) module.exports = MiniSQL;
