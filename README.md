# Base de Datos

Material de estudio de la materia **Base de Datos** (7.º año, Tecnicatura en Informática Personal y Profesional — EEST N.º 3). Cada carpeta es una página web estática, sin frameworks, pensada para consultarse en clase y desde casa.

El cursado 2026 va de agosto a diciembre y se organiza alrededor de un **proyecto**: cada equipo lleva una base de datos desde el modelo en papel hasta la implementación funcional, con tres entregas y una defensa final.

## Clases

| Clase | Tema | Material |
|---|---|---|
| 1 | Los archivos tradicionales y el gestor de bases de datos: los cinco problemas de la planilla única, y qué resuelve separar en tablas | [Teoría](clase-1/clase-01-teoria.html) · [Actividad](clase-1/clase-01-actividad.html) |
| 2 | Relaciones y cardinalidad: uno a muchos, muchos a muchos con tabla intermedia, uno a uno, y las primeras consultas sobre el modelo | [Teoría](clase-2/clase-02-teoria.html) · [Actividad](clase-2/clase-02-actividad.html) · [Script de la base](clase-2/sitio-olimpiada.sql) |

El material de cada encuentro se publica acá a medida que se dicta.

La actividad de la clase 2 incluye veinticuatro ejercicios de consulta que se resuelven en la propia página, con corrección automática: un motor de `SELECT` escrito en JavaScript ejecuta las consultas sobre los mismos datos del script `.sql`. Funciona sin XAMPP y sin conexión.

## Cómo está armado

Sitio estático, sin frameworks ni dependencias. Los estilos y el código están separados por rol,
para reusarlos en las clases que siguen:

| Archivo | Qué contiene |
|---|---|
| `css/base.css` | Colores, tipografía, los dos temas, layout, encabezado, índice, tablas, cajas, impresión |
| `css/componentes.css` | Ancho de lectura, barra de lectura, diagramas, fichas, marcas a mano, resaltador. Se carga después de `base.css` y ajusta sobre ella |
| `css/portada.css` | Solo para `index.html`: tarjetas, listado de clases y recursos |
| `css/practica.css` | Solo donde hay ejercicios: editor de consultas, devolución, consola, candado |
| `js/lectura.js` | Tamaño de texto, tema, índice activo, tablas apilables |
| `js/marcador.js` | El resaltador con el que quien lee marca el texto |
| `js/mini-sql.js` | Motor de `SELECT` que corre en el navegador |
| `js/datos-sitio.js` | Los datos del sitio, los mismos del script `.sql` |
| `js/practica.js` | Ejercicios, corrección, consola y candado |
| `js/soluciones-clase-2.js` | Resultados esperados y consultas cifradas (generado) |

Una clase nueva usa `base.css` y `componentes.css`, y suma `practica.css` solo si lleva ejercicios.

## Herramientas

- **XAMPP** con phpMyAdmin, para trabajar con MySQL.
- **MySQL Workbench** o **dbdiagram.io**, para los diagramas.

## Recursos

- [MariaDB knowledge base](https://mariadb.com/kb/es/)
- [Manual de referencia de MySQL](https://dev.mysql.com/doc/)
- [SQLBolt — lecciones interactivas de SQL](https://sqlbolt.com/)
- [Mode Analytics — SQL tutorial](https://mode.com/sql-tutorial/introduction-to-sql/)
- [Bertone, Thomas y Pasini (2019). *Introducción a las bases de datos*](http://sedici.unlp.edu.ar/handle/10915/86717)
- [Datos abiertos de General Pueyrredón](https://datos.mardelplata.gob.ar/) · [Datos abiertos nacionales](https://datos.gob.ar/)
