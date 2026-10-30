<p align="center">
  <img src="assets/img/RideRoster_Logo.png" alt="Logo de RideRoster" width="220">
</p>

# RideRoster

> **Sistema de gestión de viajes escolares** para la colecturía institucional.

---

## Visión General

**RideRoster** es un sistema web diseñado para optimizar y centralizar la administración de viajes escolares. Permite llevar un control detallado de las listas de estudiantes, asignaciones de autobuses y gestión de horarios, facilitando el trabajo operativo y logístico de la colecturía del **Instituto Nacional de Apopa**.

### Objetivos del Proyecto
* **Organización centralizada:** Gestionar nóminas de estudiantes de forma rápida y segura.
* **Control de flota:** Asignar estudiantes y cupos por autobús para evitar sobrecupos.
* **Sincronización de horarios:** Mantener un registro claro de los horarios y rutas autorizados por colecturía.

---

## Puesta en marcha

## Despliegue Principal con XAMPP

El método de despliegue principal para RideRoster se realiza a través de XAMPP, el cual integra Apache, MariaDB y PHP.

### 1. Instalación de XAMPP (Windows)

1. **Descarga XAMPP**: Visita el sitio web oficial de Apache Friends y descarga la versión de XAMPP con PHP 8.1 o superior.
2. **Ejecuta el instalador**: Sigue los pasos del asistente de instalación. Se recomienda dejar la ruta predeterminada (`C:\xampp`).
3. **Copia el proyecto**: Al finalizar la instalación, coloca la carpeta completa del proyecto `RideRoster` dentro del directorio `C:\xampp\htdocs\`, de modo que la ruta quede como `C:\xampp\htdocs\RideRoster`.
4. **Inicia los servicios**: Abre el "XAMPP Control Panel" y haz clic en **"Start"** en los módulos de **Apache** y **MySQL**.
5. **Configuración de autoarranque (Opcional)**:
   * En el panel de control de XAMPP, haz clic en el botón **"Config"** junto a Apache y MySQL y selecciona **"Service"** para instalarlos como servicios del sistema.
   * También puedes abrir "Servicios" en Windows, buscar `Apache2.4` y `MySQL`, cambiar su tipo de inicio a **Automático** e iniciarlos.
6. **Instalación de la base de datos**
   * Para esto, se debe tener una copia de la DB, que el desarrollador le dará, abrir `https://localhost/phpmyadmin/`. en el navegador, ir a SQL, usar el comando  ```bash CREATE DATABASE rideroster;```, y por último darle click a 'importar' y poner el archivo .sql que el desarrollador proporcione.
7. **Acceso al sistema**: Abre tu navegador web e ingresa a `http://localhost/RideRoster/index.php`. 

### 1. Instalación del sistema (Linux), método secundario

```bash
# 1. Crear la base de datos y cargar los datos de demostración
php bin/rideroster instalar

# 2. Levantar el sistema
php -S localhost:8080 -t .        # o usa Apache de XAMPP
```

Entra en <http://localhost:8080>. Con XAMPP, copia la carpeta en `htdocs` y entra en
<http://localhost/RideRoster/>.

El sistema **crea y actualiza solo el esquema** de la base de datos, así que nunca se
queda desactualizado. La guía completa está en **[INSTALACION.md](INSTALACION.md)**.

---

## Módulos del Sistema

### Inicio
* Resumen del **viaje actual**: fecha, hora de salida, hora estimada de regreso, capacidad del autobús y ocupación en vivo.
* **Temporizador de salida** en la esquina superior derecha de la cabecera: arranca **un día antes** de la salida, marca en rojo la última hora y, una vez pasada la salida, indica cuánto tiempo hace que el bus salió. Se oculta cuando el viaje está finalizado.
* Indicadores de gestión: estudiantes inscritos, cupos disponibles, dinero recaudado y personal a bordo.
* **Historial de viajes** con el detalle de cada salida realizada y de los próximos viajes programados.
* Botón **Gestionar viaje**: permite ajustar el día, la hora de salida, la hora estimada de regreso, la capacidad máxima del bus (55 asientos por defecto), registrar y retirar estudiantes, y anotar los pagos recaudados.
* Botón **Cerrar boletos**, ubicado debajo de la barra de ocupación. Al pulsarlo ya no se pueden inscribir más estudiantes y, en el mismo lugar, aparecen **Ver listado de estudiantes** y **Finalizar viaje ahora**. Mientras los boletos siguen abiertos, el listado también se consulta con **Ver listado**, junto a **Gestionar viaje**.
* Una vez cerrados los boletos, el viaje se finaliza automáticamente al pasar la **hora estimada de regreso**; si la salida termina antes de lo previsto, se puede finalizar con **Finalizar viaje ahora**.
* Al agregar un estudiante solo se requieren **nombre, código y el nombre del encargado** (cuando viaja acompañado). Si el código ya existe en el viaje, el sistema muestra la alerta **Código repetido** con el nombre y el encargado del registro anterior, y permite registrarlo de todos modos o corregirlo.

### Costo de los acompañantes
Cuando un estudiante viaja con encargado, el encargado se contabiliza como una persona más:

* **Costo:** suma un *costo por persona* al total esperado del viaje (el estudiante con encargado debe el doble).
* **Asiento:** ocupa un asiento en el autobús, por lo que reduce los cupos disponibles.
* **Cobro:** el sistema muestra el costo total de cada fila (estudiante + encargado), lo que falta por pagar de cada uno y el botón **Cobrar lo pendiente**, que registra de una sola vez los cobros faltantes.

### Formato de código de estudiante
El código sigue la estructura `[Año][Sección][Número de lista]`, con el número de lista a dos dígitos:

| Ejemplo | Año | Sección | Número de lista |
| --- | --- | --- | --- |
| `2B03` | Segundo año | Sección B | 03 |
| `3A07` | Tercer año | Sección A | 07 |

El formato se valida en el formulario (con aviso en vivo) y en el servidor antes de registrar al estudiante.

### Asignación de asientos
* **Plano interactivo** con la distribución 2+2 del autobús: butacas libres, ocupadas y seleccionadas, más los dos asientos reservados al docente y al personal de asistencia.
* **Reubicación exacta** por clic (seleccionar persona y destino) o por arrastrar y soltar: la persona queda en el asiento que se eligió, sin corrimientos hacia el final del bus.
* **Cerrar huecos**: completa los asientos vacíos intermedios y vuelve a llenar el bus de forma continua (1, 2, 3…).
* **Generador de listado** que aplica las preferencias:
  * Quien declara un compañero de viaje queda sentado junto a él (asiento 1: estudiante, asiento 2: amigo, asiento 3: padre o tutor).
  * Sin preferencia declarada, el padre o tutor se sienta junto a su hijo.
* **Listado de abordaje** numerado de forma continua para el pase de lista, con el asiento físico de cada persona y botón **Exportar PDF**.
* La reubicación se guarda identificando a la persona (estudiante o acompañante), por lo que sigue funcionando aunque el listado se regenere en otra pestaña.

### Listado en PDF
`listado.php` genera el documento imprimible del recorrido. Por superstición **no imprime los números 13 ni 18**: la persona que ocupaba la posición 13 pasa a figurar con el número 14 y las siguientes se desplazan de forma correlativa. Nadie se elimina del listado.

### Listado de la salida
Después de marcar el viaje como finalizado, el botón **Generar listado** abre el listado de **toda la salida**, con estos criterios:

* **Un bloque por bus**, con su hora, su ocupación y su subtotal; si la salida tiene varios buses, cada uno queda con su propio bloque.
* **Numeración continua** de bus en bus: el último número de un bus sigue en el primero del siguiente.
* **Orden por pago**: primero quienes ya cubren el 100%, después los pagos parciales y al final los pendientes; dentro de cada grupo se conserva el orden de inscripción.
* Por estudiante se muestra **nombre, código, asiento asignado, encargado, costo, pagado, pendiente** y su estado de pago (*Pagado*, *Parcial* o *Pendiente*).
* **Totales** por bus y de la salida completa (recaudado y pendiente), más un botón **Exportar PDF** por bus que reutiliza `listado.php`.

### Alumnos
* **Padrón del instituto** con los alumnos migrados: nombre, código, teléfono, encargado y situación.
* **Agrupación por sección**: cada grupo (1A, 1AG, 2B…) encabeza su bloque con el número de alumnos inscritos, y el orden del listado sigue el del nombre de la sección.
* **Filtros**: búsqueda por nombre, código o encargado, más selectores de año y de sección; se cargan una sola vez al abrir la pestaña y responden al instante.
* **Alta, edición y borrado** de alumnos con validación de código repetido. Un alumno que ya participó en un viaje no se puede borrar: se le pide marcarlo como inactivo para conservar su historial.
* **Encargado**: si el nombre ya existe en la base de datos se reutiliza y se autocompleta; si no, se crea y se vincula. Un encargado declarado con un solo nombre y sin registro previo no se guarda.
* **Secciones**: tarjeta con cada sección, su año, su especialidad y sus alumnos, con alta, edición y borrado. No se puede eliminar una sección que todavía tiene alumnos.
* **El pago no se gestiona en el padrón**: el alumno se agrega al viaje en el momento en
  que paga y el control queda en la tabla `pagos` del viaje. Por eso esta vista no muestra
  ningún estado de pago ni planes de cuotas; el padrón solo dice quién es cada alumno.

### Profesores
* **Catálogo docente** del instituto con los diez campos originales: código, nombres, apellidos, sexo, fecha de nacimiento, cargo o especialidad, permiso de salida, alergias, fecha de registro y situación.
* **Búsqueda, alta, edición y borrado** desde la pestaña; un profesor con paseos asignados no se puede eliminar, se marca inactivo.
* **De aquí se elige el profesor de cada paseo**: el formulario de Administración ofrece un menú con los profesores activos en lugar de texto libre.

### Administración
* Catálogo de **paseos**: nombre, destino, costo por persona, profesor a cargo elegido del catálogo de profesores y personal de asistencia.
* **Personal de Asistencia** reutilizable entre paseos, con alta y baja desde la misma vista.
* **Programación de viajes** a partir de un paseo, indicando día, horarios y capacidad del bus. Los viajes programados aparecen de inmediato en la pestaña Inicio.
* **Parámetros globales**: capacidad predeterminada del autobús, asientos reservados al personal y orden de las listas de pasajeros.
* **Flotas y salidas**: los buses que ejecutan el mismo paseo en la misma fecha y hora se agrupan para redistribuir pasajeros entre ellos.
* **Borrado con doble confirmación**: un paseo con viajes programados se puede eliminar; la segunda confirmación detalla los viajes, estudiantes y pagos que se borrarán en cascada. Igual al borrar un viaje con estudiantes o pagos.

### Estadísticas
* **Tasa de ocupación por autobús**: cada salida realizada muestra cada uno de sus buses con la capacidad utilizada (por ejemplo, *Autobús 1 al 100 %* y *Autobús 2 al 80 %*), los asientos ocupados y los libres.
* **Filtro por período**: mensual (mes en curso), trimestral (trimestre en curso) y anual (año en curso), con el rango exacto de fechas a la vista.
* **Total de salidas realizadas** en el período y número de autobuses utilizados.
* **Estudiantes beneficiados**: conteo único por **código** de los alumnos que participaron en al menos una salida. Quien viaja en varias salidas cuenta una sola vez.
* **Promedio de asistencia**: nivel de participación de la población estudiantil registrada, es decir, cuántos de los códigos del padrón viajan en promedio en cada salida.
* **Resumen general y volumen**: salidas, autobuses, beneficiados, participaciones, tamaño del padrón y promedio de estudiantes por salida.
* Las salidas cuya fecha ya pasó pero que no se marcaron como finalizadas se señalan con la etiqueta **Sin finalizar**, para cerrarlas desde Inicio.

---

## Parámetros Globales

| Parámetro | Valor por defecto | Descripción |
| --- | --- | --- |
| `capacidad_bus` | 55 | Asientos totales del autobús, incluyendo al profesor y al personal de asistencia. |
| `asientos_personal` | 2 | Asientos que se descuentan de la capacidad para los estudiantes. |
| `orden_pasajeros` | inscripción | Los pasajeros siempre se listan en el orden en que se van agregando. |

---

## Tecnologías Utilizadas

* **Backend:** PHP 8 (PDO / MySQL)
* **Servidor Local / Base de Datos:** XAMPP (Apache & MySQL/MariaDB)
* **Frontend:** HTML5, CSS3, JavaScript (sin frameworks ni proceso de compilación)
* **Control de Versiones:** Git & GitHub

---

## Herramienta de línea de comandos

```bash
php bin/rideroster ayuda             # Lista de comandos
php bin/rideroster instalar          # Crea la base, aplica el esquema y carga la demostración
php bin/rideroster migrar            # Actualiza el esquema sin borrar información
php bin/rideroster migrar-instituto  # Migra el padrón de alumnos, secciones y profesores del instituto
php bin/rideroster estado            # Conexión y resumen de la base de datos
```

`migrar-instituto` lee el volcado phpMyAdmin de `database/` y carga el padrón completo en
las tablas `alumnos`, `secciones`, `encargados` y `profesores`. Acepta `--archivo=<ruta>` para indicar
otro volcado, `--simular` para ver el informe sin guardar nada y `--limpiar` para volver a
empezar. Los alumnos cuyo encargado está declarado sin datos completos y sin registro
previo no se agregan: aparecen en el informe con su código y el motivo.

---

## Desarrollo y control de versiones

* **Rama de trabajo:** `main`. Cada versión publicada lleva su etiqueta (`v1.0.0`) y su
  entrada en el [CHANGELOG](CHANGELOG.md).
* **Publicar una versión:**

  ```bash
  git add -A
  git commit -m "feat: resumen de los cambios"
  git tag -a v1.0.0 -m "RideRoster v1.0.0"
  git push origin main --follow-tags
  ```

* **Credenciales de GitHub:** el helper de credenciales queda en caché de memoria, así que
  basta con autenticarse una vez por sesión de trabajo. La forma más segura es con un
  *Personal Access Token* de alcance `repo`:

  ```bash
  # En GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens
  git push origin main --follow-tags
  # Usuario: blankgloom
  # Contraseña: el token (no la contraseña de la cuenta)
  ```

* **Antes de publicar:** `php bin/rideroster estado` para confirmar la conexión, y una
  revisión de que el sistema carga sin errores en el navegador.

---

## Estructura del Proyecto

```
RideRoster/
├── index.php            # Interfaz del sistema (pestañas Inicio, Alumnos, Profesores, Administración y Estadísticas)
├── listado.php          # Listado de abordaje imprimible (PDF)
├── bin/rideroster       # Herramienta de terminal: instalar, migrar, migrar-instituto, estado
├── api/index.php        # API JSON (paseos, viajes, pasajeros, pagos, personal, asientos, salidas, alumnos, secciones, profesores)
├── app/                 # Configuración, conexión, padrón, consultas, migraciones y lógica de negocio
├── assets/css/app.css   # Hoja de estilos del sistema
├── assets/css/listado.css # Estilos del documento imprimible
├── assets/js/app.js     # Lógica de la interfaz
└── database/schema.sql  # Esquema de la base de datos
```

---

## Estado del Proyecto

La versión **1.0.0** marca el sistema completo y estable en operación:

* Los cinco módulos, **Inicio**, **Alumnos**, **Profesores**, **Administración** y **Estadísticas**, funcionan de punta a punta sobre MySQL con persistencia real.
* El control de pasajeros, horarios, capacidad, cobros y acompañantes quedan centralizados y auditables en un solo lugar.
* La **asignación de asientos** interactiva y el **listado de abordaje** imprimible cubren la logística de embarque y el pase de lista en el evento.
* El sistema se **auto-instala y se auto-migra**: no requiere pasos manuales para preparar o actualizar la base de datos.
* La verificación en navegador cubre escritorio, tableta y móvil, y la interfaz respeta el sistema de diseño definido en [DESIGN.md](DESIGN.md).

El trabajo siguiente que se contempla es la generación de reportes de ingresos por paseo y la exportación de los listados en lote para varios viajes.

---

## Documentación

| Documento | Contenido |
| --- | --- |
| [INSTALACION.md](INSTALACION.md) | Guía de instalación, configuración y puesta en marcha |
| [CHANGELOG.md](CHANGELOG.md) | Registro de versiones y novedades |
| [DESIGN.md](DESIGN.md) | Sistema de diseño: paleta, tipografía, componentes y sombras |

---

## Licencia y Propiedad

Copyright (c) 2026 Jefferson Steven Aragón Juárez e Instituto Nacional de Apopa.  
Todos los derechos reservados. Proyecto de uso y propiedad exclusiva.
