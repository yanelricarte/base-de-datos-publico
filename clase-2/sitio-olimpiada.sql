-- ---------------------------------------------------------------
-- Base del sitio de la consigna · Base de Datos · 7.º año TECIP
-- Clase 2: relaciones, cardinalidad y primeras consultas.
--
-- Es el modelo dibujado en la clase 1 con dos entidades más, las que
-- aparecen cuando alguien compra: PEDIDO y DETALLE. La relación entre
-- producto y pedido es de muchos a muchos, y DETALLE es la tabla que
-- la resuelve.
--
-- Para cargarla: phpMyAdmin → Importar → elegir este archivo → Continuar.
-- Crea la base sitio_practica; no toca la base del proyecto de cada equipo.
-- ---------------------------------------------------------------

DROP DATABASE IF EXISTS sitio_practica;
CREATE DATABASE sitio_practica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sitio_practica;

-- El motor tiene que ser InnoDB: MyISAM acepta la cláusula FOREIGN KEY
-- y después no la aplica, así que la integridad referencial no existiría.

CREATE TABLE rubro (
  id_rubro INT AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE marca (
  id_marca INT AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE proveedor (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  contacto     VARCHAR(80)
) ENGINE=InnoDB;

CREATE TABLE usuario (
  id_usuario  INT AUTO_INCREMENT PRIMARY KEY,
  usuario     VARCHAR(40) NOT NULL UNIQUE,
  email       VARCHAR(80) NOT NULL,
  fecha_alta  DATE NOT NULL
) ENGINE=InnoDB;

-- Del lado «muchos» de tres relaciones 1:N viven las tres claves foráneas.
CREATE TABLE producto (
  id_producto  INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  descripcion  VARCHAR(160),
  precio       DECIMAL(10,2) NOT NULL,
  stock        INT NOT NULL DEFAULT 0,
  id_rubro     INT NOT NULL,
  id_marca     INT NOT NULL,
  id_proveedor INT NOT NULL,
  FOREIGN KEY (id_rubro)     REFERENCES rubro(id_rubro),
  FOREIGN KEY (id_marca)     REFERENCES marca(id_marca),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
) ENGINE=InnoDB;

CREATE TABLE pedido (
  id_pedido  INT AUTO_INCREMENT PRIMARY KEY,
  fecha      DATE NOT NULL,
  id_usuario INT NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- La tabla intermedia de la relación muchos a muchos entre pedido y producto.
-- Su clave primaria es la de las dos entidades juntas: un mismo producto
-- aparece una sola vez dentro del mismo pedido. Guarda además lo que solo
-- existe en el cruce: la cantidad y el precio del día de la compra.
CREATE TABLE detalle (
  id_pedido       INT NOT NULL,
  id_producto     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_pedido, id_producto),
  FOREIGN KEY (id_pedido)   REFERENCES pedido(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Datos. Son los del listado de la clase 1, sin la fila repetida.
-- El rubro «Baño» y la marca «Nova» quedan sin productos a propósito,
-- y una usuaria queda sin pedidos: se usan en los ejercicios de LEFT JOIN.
-- ---------------------------------------------------------------

INSERT INTO rubro (id_rubro, nombre) VALUES
  (1, 'Limpieza de pisos'), (2, 'Cocina'), (3, 'Ropa'), (4, 'Vidrios'), (5, 'Baño');

INSERT INTO marca (id_marca, nombre) VALUES
  (1, 'Brillex'), (2, 'Espuma'), (3, 'Genérica'), (4, 'Nova');

INSERT INTO proveedor (id_proveedor, nombre, contacto) VALUES
  (1, 'Distribuidora Sur', 'ventas@dsur.com.ar'),
  (2, 'Mayorista Norte', 'pedidos@norte.com.ar');

INSERT INTO usuario (id_usuario, usuario, email, fecha_alta) VALUES
  (1, 'mrojas', 'mrojas@correo.com', '2026-03-11'),
  (2, 'lgomez', 'lgomez@correo.com', '2026-04-02'),
  (3, 'administracion', 'admin@empresa.com.ar', '2026-02-20'),
  (4, 'tcabral', 'tcabral@correo.com', '2026-08-15');

INSERT INTO producto (id_producto, nombre, descripcion, precio, stock, id_rubro, id_marca, id_proveedor) VALUES
  (1,  'Lavandina 1 L',        'Lavandina común en botella de 1 litro',      900.00, 40, 1, 1, 1),
  (2,  'Detergente 750 ml',    'Detergente concentrado para vajilla',       1200.00, 25, 2, 1, 1),
  (3,  'Jabón en polvo 800 g', 'Jabón en polvo para ropa blanca y de color',2100.00, 18, 3, 2, 2),
  (4,  'Lavandina 5 L',        'Bidón de lavandina de 5 litros',            3200.00, 12, 1, 1, 1),
  (5,  'Desodorante de piso',  'Desodorante de piso con perfume floral',    1500.00, 30, 1, 1, 1),
  (6,  'Esponja doble faz',    'Esponja con lado abrasivo',                  450.00, 60, 2, 2, 2),
  (7,  'Trapo de piso',        'Trapo de algodón para piso',                 700.00, 22, 1, 3, 2),
  (8,  'Limpiavidrios 500 ml', 'Limpiavidrios con gatillo',                 1100.00, 15, 4, 1, 1),
  (9,  'Cera para pisos 1 L',  'Cera autobrillante para pisos',             2600.00,  9, 1, 1, 1),
  (10, 'Rejilla multiuso',     'Rejilla de algodón para cocina',             380.00, 50, 2, 3, 2),
  (11, 'Suavizante 900 ml',    'Suavizante para ropa, aroma lavanda',       1800.00, 19, 3, 2, 2),
  (12, 'Balde reforzado 12 L', 'Balde plástico con manija de metal',        2400.00,  8, 1, 3, 2);

INSERT INTO pedido (id_pedido, fecha, id_usuario) VALUES
  (1, '2026-08-03', 1),
  (2, '2026-08-07', 2),
  (3, '2026-08-19', 1),
  (4, '2026-08-24', 3),
  (5, '2026-08-28', 2);

INSERT INTO detalle (id_pedido, id_producto, cantidad, precio_unitario) VALUES
  (1,  1, 3,  900.00),
  (1,  6, 2,  450.00),
  (2,  4, 1, 3200.00),
  (2,  2, 2, 1200.00),
  (2, 10, 4,  380.00),
  (3,  1, 6,  900.00),
  (3,  9, 1, 2600.00),
  (4,  3, 2, 2100.00),
  (4, 11, 2, 1800.00),
  (4,  5, 1, 1500.00),
  (5,  8, 2, 1100.00),
  (5,  1, 1,  950.00);

-- ---------------------------------------------------------------
-- La consulta del listado del sitio, la que el entregable necesita:
-- rubro, descripción, marca y precio, en una sola respuesta.
-- ---------------------------------------------------------------
-- SELECT r.nombre AS rubro, p.descripcion, m.nombre AS marca, p.precio
-- FROM producto p
-- INNER JOIN rubro r ON p.id_rubro = r.id_rubro
-- INNER JOIN marca m ON p.id_marca = m.id_marca
-- ORDER BY r.nombre, p.precio;
