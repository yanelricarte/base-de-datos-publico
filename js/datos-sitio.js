/* Los datos del sitio de la consigna, cargados en el navegador para practicar.
   Son las mismas tablas del script sitio-olimpiada.sql: lo que se consulta acá
   devuelve exactamente lo mismo que en phpMyAdmin.

   Dos ausencias son a propósito y se usan en los ejercicios: el rubro «Baño» y la
   marca «Nova» existen sin productos cargados, y una usuaria está registrada sin
   haber hecho ningún pedido. */
var DATOS_SITIO = {
  rubro: {
    columnas: ["id_rubro", "nombre"],
    filas: [
      [1, "Limpieza de pisos"],
      [2, "Cocina"],
      [3, "Ropa"],
      [4, "Vidrios"],
      [5, "Baño"]
    ]
  },
  marca: {
    columnas: ["id_marca", "nombre"],
    filas: [
      [1, "Brillex"],
      [2, "Espuma"],
      [3, "Genérica"],
      [4, "Nova"]
    ]
  },
  proveedor: {
    columnas: ["id_proveedor", "nombre", "contacto"],
    filas: [
      [1, "Distribuidora Sur", "ventas@dsur.com.ar"],
      [2, "Mayorista Norte", "pedidos@norte.com.ar"]
    ]
  },
  producto: {
    columnas: ["id_producto", "nombre", "descripcion", "precio", "stock", "id_rubro", "id_marca", "id_proveedor"],
    filas: [
      [1, "Lavandina 1 L", "Lavandina común en botella de 1 litro", 900, 40, 1, 1, 1],
      [2, "Detergente 750 ml", "Detergente concentrado para vajilla", 1200, 25, 2, 1, 1],
      [3, "Jabón en polvo 800 g", "Jabón en polvo para ropa blanca y de color", 2100, 18, 3, 2, 2],
      [4, "Lavandina 5 L", "Bidón de lavandina de 5 litros", 3200, 12, 1, 1, 1],
      [5, "Desodorante de piso", "Desodorante de piso con perfume floral", 1500, 30, 1, 1, 1],
      [6, "Esponja doble faz", "Esponja con lado abrasivo", 450, 60, 2, 2, 2],
      [7, "Trapo de piso", "Trapo de algodón para piso", 700, 22, 1, 3, 2],
      [8, "Limpiavidrios 500 ml", "Limpiavidrios con gatillo", 1100, 15, 4, 1, 1],
      [9, "Cera para pisos 1 L", "Cera autobrillante para pisos", 2600, 9, 1, 1, 1],
      [10, "Rejilla multiuso", "Rejilla de algodón para cocina", 380, 50, 2, 3, 2],
      [11, "Suavizante 900 ml", "Suavizante para ropa, aroma lavanda", 1800, 19, 3, 2, 2],
      [12, "Balde reforzado 12 L", "Balde plástico con manija de metal", 2400, 8, 1, 3, 2]
    ]
  },
  usuario: {
    columnas: ["id_usuario", "usuario", "email", "fecha_alta"],
    filas: [
      [1, "mrojas", "mrojas@correo.com", "2026-03-11"],
      [2, "lgomez", "lgomez@correo.com", "2026-04-02"],
      [3, "administracion", "admin@empresa.com.ar", "2026-02-20"],
      [4, "tcabral", "tcabral@correo.com", "2026-08-15"]
    ]
  },
  pedido: {
    columnas: ["id_pedido", "fecha", "id_usuario"],
    filas: [
      [1, "2026-08-03", 1],
      [2, "2026-08-07", 2],
      [3, "2026-08-19", 1],
      [4, "2026-08-24", 3],
      [5, "2026-08-28", 2]
    ]
  },
  detalle: {
    columnas: ["id_pedido", "id_producto", "cantidad", "precio_unitario"],
    filas: [
      [1, 1, 3, 900],
      [1, 6, 2, 450],
      [2, 4, 1, 3200],
      [2, 2, 2, 1200],
      [2, 10, 4, 380],
      [3, 1, 6, 900],
      [3, 9, 1, 2600],
      [4, 3, 2, 2100],
      [4, 11, 2, 1800],
      [4, 5, 1, 1500],
      [5, 8, 2, 1100],
      [5, 1, 1, 950]
    ]
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = DATOS_SITIO;
