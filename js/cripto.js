/* Cifrado del material que se abre con el código de la clase.
   ============================================================
   Reemplaza al esquema anterior —XOR con el código y el centinela «OK::»
   adelante—, que tenía un problema conocido: el centinela es texto plano
   conocido, así que hacer XOR entre él y el principio del cifrado devuelve
   los primeros caracteres del código sin adivinar nada.

   Acá el código no cifra directamente. Pasa por PBKDF2 con HMAC-SHA-256,
   una sal aleatoria y muchas iteraciones, y de ahí salen dos claves: una
   para el flujo que cifra y otra para la etiqueta que verifica. Consecuencias:

   - conocer el texto en claro no revela nada del código;
   - probar un código cuesta las iteraciones completas, así que la fuerza
     bruta se vuelve lenta;
   - la verificación es una etiqueta HMAC sobre el cifrado, de modo que no
     hace falta ningún texto conocido adentro del mensaje.

   Todo en JavaScript, sin dependencias y sin Web Crypto, para que funcione
   igual abierto desde un pendrive con file:// y sin internet.

   El generador que produce los paquetes está en el repo docente. */
var Cripto = (function () {
  "use strict";

  /* ---------- SHA-256 ---------- */

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256(bytes) {
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var largo = bytes.length;
    var conRelleno = new Uint8Array((((largo + 8) >> 6) + 1) << 6);
    conRelleno.set(bytes);
    conRelleno[largo] = 0x80;
    var bits = largo * 8;
    var n = conRelleno.length;
    conRelleno[n - 4] = (bits >>> 24) & 0xff;
    conRelleno[n - 3] = (bits >>> 16) & 0xff;
    conRelleno[n - 2] = (bits >>> 8) & 0xff;
    conRelleno[n - 1] = bits & 0xff;

    var w = new Int32Array(64);
    for (var b = 0; b < n; b += 64) {
      var i;
      for (i = 0; i < 16; i++) {
        w[i] = (conRelleno[b + i * 4] << 24) | (conRelleno[b + i * 4 + 1] << 16) |
               (conRelleno[b + i * 4 + 2] << 8) | conRelleno[b + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & bb) ^ (a & c) ^ (bb & c);
        var t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    var salida = new Uint8Array(32);
    for (var j = 0; j < 8; j++) {
      salida[j * 4] = (h[j] >>> 24) & 0xff;
      salida[j * 4 + 1] = (h[j] >>> 16) & 0xff;
      salida[j * 4 + 2] = (h[j] >>> 8) & 0xff;
      salida[j * 4 + 3] = h[j] & 0xff;
    }
    return salida;
  }

  /* ---------- HMAC-SHA-256 ---------- */

  function hmac(clave, mensaje) {
    var k = clave.length > 64 ? sha256(clave) : clave;
    var interna = new Uint8Array(64), externa = new Uint8Array(64);
    interna.set(k); externa.set(k);
    var i;
    for (i = 0; i < 64; i++) { interna[i] ^= 0x36; externa[i] ^= 0x5c; }
    var uno = new Uint8Array(64 + mensaje.length);
    uno.set(interna); uno.set(mensaje, 64);
    var dentro = sha256(uno);
    var dos = new Uint8Array(96);
    dos.set(externa); dos.set(dentro, 64);
    return sha256(dos);
  }

  /* ---------- PBKDF2-HMAC-SHA-256 ---------- */

  function pbkdf2(clave, sal, iteraciones, largo) {
    var salida = new Uint8Array(largo), hechos = 0, bloque = 1;
    while (hechos < largo) {
      var entrada = new Uint8Array(sal.length + 4);
      entrada.set(sal);
      entrada[sal.length] = (bloque >>> 24) & 0xff;
      entrada[sal.length + 1] = (bloque >>> 16) & 0xff;
      entrada[sal.length + 2] = (bloque >>> 8) & 0xff;
      entrada[sal.length + 3] = bloque & 0xff;
      var u = hmac(clave, entrada), acumulado = u.slice();
      for (var i = 1; i < iteraciones; i++) {
        u = hmac(clave, u);
        for (var j = 0; j < 32; j++) acumulado[j] ^= u[j];
      }
      var cuanto = Math.min(32, largo - hechos);
      salida.set(acumulado.subarray(0, cuanto), hechos);
      hechos += cuanto;
      bloque++;
    }
    return salida;
  }

  /* ---------- utilidades ---------- */

  function textoABytes(t) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(t);
    var utf = unescape(encodeURIComponent(t)), b = new Uint8Array(utf.length);
    for (var i = 0; i < utf.length; i++) b[i] = utf.charCodeAt(i);
    return b;
  }

  function bytesATexto(b) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8", { fatal: true }).decode(b);
    var s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return decodeURIComponent(escape(s));
  }

  function b64aBytes(s) {
    var bin = typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary");
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }

  function bytesAb64(b) {
    var s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64");
  }

  /* El código se compara sin distinguir mayúsculas ni tildes ni espacios,
     para que quien lo teclea no pelee con el teclado. */
  function normalizar(codigo) {
    return String(codigo).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");
  }

  function iguales(a, b) {
    if (a.length !== b.length) return false;
    var dif = 0;
    for (var i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
    return dif === 0;
  }

  /* ---------- lo que usa la página ---------- */

  /* Del código salen 64 bytes: los primeros 32 alimentan el flujo que cifra,
     los otros 32 firman. Se hace una sola vez por página. */
  function derivar(codigo, salB64, iteraciones) {
    return pbkdf2(textoABytes(normalizar(codigo)), b64aBytes(salB64), iteraciones, 64);
  }

  function flujo(semilla, nonce, largo) {
    var salida = new Uint8Array(largo), hechos = 0, contador = 0;
    while (hechos < largo) {
      var entrada = new Uint8Array(nonce.length + 4);
      entrada.set(nonce);
      entrada[nonce.length] = (contador >>> 24) & 0xff;
      entrada[nonce.length + 1] = (contador >>> 16) & 0xff;
      entrada[nonce.length + 2] = (contador >>> 8) & 0xff;
      entrada[nonce.length + 3] = contador & 0xff;
      var bloque = hmac(semilla, entrada);
      var cuanto = Math.min(32, largo - hechos);
      salida.set(bloque.subarray(0, cuanto), hechos);
      hechos += cuanto;
      contador++;
    }
    return salida;
  }

  /* Devuelve el texto, o null si el código no corresponde. La comprobación
     es la etiqueta: sin texto conocido adentro del mensaje. */
  function abrir(derivada, item) {
    var datos = b64aBytes(item.d), nonce = b64aBytes(item.n);
    var semilla = derivada.subarray(0, 32), firma = derivada.subarray(32, 64);
    var porFirmar = new Uint8Array(nonce.length + datos.length);
    porFirmar.set(nonce); porFirmar.set(datos, nonce.length);
    if (!iguales(hmac(firma, porFirmar).subarray(0, 16), b64aBytes(item.t))) return null;
    var claro = new Uint8Array(datos.length), mascara = flujo(semilla, nonce, datos.length);
    for (var i = 0; i < datos.length; i++) claro[i] = datos[i] ^ mascara[i];
    try { return bytesATexto(claro); } catch (e) { return null; }
  }

  /* cerrar() lo usa el generador del repo docente, no la página */
  function cerrar(derivada, texto, nonce) {
    var claro = textoABytes(texto);
    var semilla = derivada.subarray(0, 32), firma = derivada.subarray(32, 64);
    var mascara = flujo(semilla, nonce, claro.length), datos = new Uint8Array(claro.length);
    for (var i = 0; i < claro.length; i++) datos[i] = claro[i] ^ mascara[i];
    var porFirmar = new Uint8Array(nonce.length + datos.length);
    porFirmar.set(nonce); porFirmar.set(datos, nonce.length);
    return { n: bytesAb64(nonce), d: bytesAb64(datos), t: bytesAb64(hmac(firma, porFirmar).subarray(0, 16)) };
  }

  return {
    derivar: derivar, abrir: abrir, cerrar: cerrar,
    normalizar: normalizar, sha256: sha256, hmac: hmac, pbkdf2: pbkdf2,
    textoABytes: textoABytes, b64aBytes: b64aBytes, bytesAb64: bytesAb64
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Cripto;
