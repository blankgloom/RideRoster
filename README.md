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
* Indicadores de gestión: estudiantes inscritos, cupos disponibles, dinero recaudado y personal a bordo.
* **Historial de viajes** con el detalle de cada salida realizada y de los próximos viajes programados.
* Botón **Gestionar viaje**: permite ajustar el día, la hora de salida, la hora estimada de regreso, la capacidad máxima del bus (55 asientos por defecto), registrar y retirar estudiantes, y anotar los pagos recaudados.
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
* **Plano interactivo** con la distribución 2+2 del autobús: butacas libres, ocupadas y seleccionadas, más los dos asientos reservados al docente y al comando de salvamento.
* **Reubicación exacta** por clic (seleccionar persona y destino) o por arrastrar y soltar: la persona queda en el asiento que se eligió, sin corrimientos hacia el final del bus.
* **Cerrar huecos**: completa los asientos vacíos intermedios y vuelve a llenar el bus de forma continua (1, 2, 3…).
* **Generador de listado** que aplica las preferencias:
  * Quien declara un compañero de viaje queda sentado junto a él (asiento 1: estudiante, asiento 2: amigo, asiento 3: padre o tutor).
  * Sin preferencia declarada, el padre o tutor se sienta junto a su hijo.
* **Listado de abordaje** numerado de forma continua para el pase de lista, con el asiento físico de cada persona y botón **Exportar PDF**.
* La reubicación se guarda identificando a la persona (estudiante o acompañante), por lo que sigue funcionando aunque el listado se regenere en otra pestaña.

### Listado en PDF
`listado.php` genera el documento imprimible del recorrido. Por superstición **no imprime los números 13 ni 18**: la persona que ocupaba la posición 13 pasa a figurar con el número 14 y las siguientes se desplazan de forma correlativa. Nadie se elimina del listado.

### Administración
* Catálogo de **paseos**: nombre, destino, costo por persona, profesor a cargo y personal de comandos de salvamento.
* **Personal de salvamento** reutilizable entre paseos, con alta y baja desde la misma vista.
* **Programación de viajes** a partir de un paseo, indicando día, horarios y capacidad del bus. Los viajes programados aparecen de inmediato en la pestaña Inicio.
* **Parámetros globales**: capacidad predeterminada del autobús, asientos reservados al personal y orden de las listas de pasajeros.
* **Flotas y salidas**: los buses que ejecutan el mismo paseo en la misma fecha y hora se agrupan para redistribuir pasajeros entre ellos.

---

## Parámetros Globales

| Parámetro | Valor por defecto | Descripción |
| --- | --- | --- |
| `capacidad_bus` | 55 | Asientos totales del autobús, incluyendo al profesor y al comando de salvamento. |
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
php bin/rideroster ayuda      # Lista de comandos
php bin/rideroster instalar   # Crea la base, aplica el esquema y carga la demostración
php bin/rideroster migrar     # Actualiza el esquema sin borrar información
php bin/rideroster estado     # Conexión y resumen de la base de datos
```

---

## Desarrollo y control de versiones

* **Rama de trabajo:** `main`. Cada versión publicada lleva su etiqueta (`v0.5.1`) y su
  entrada en el [CHANGELOG](CHANGELOG.md).
* **Publicar una versión:**

  ```bash
  git add -A
  git commit -m "feat: resumen de los cambios"
  git tag -a v0.5.2 -m "RideRoster v0.5.2"
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
├── index.php            # Interfaz del sistema (pestañas Inicio y Administración)
├── listado.php          # Listado de abordaje imprimible (PDF)
├── bin/rideroster       # Herramienta de terminal: instalar, migrar, estado
├── api/index.php        # API JSON (paseos, viajes, pasajeros, pagos, personal, asientos, salidas)
├── app/                 # Configuración, conexión, consultas y lógica de negocio
├── assets/css/app.css   # Hoja de estilos del sistema
├── assets/css/listado.css # Estilos del documento imprimible
├── assets/js/app.js     # Lógica de la interfaz
└── database/schema.sql  # Esquema de la base de datos
```

---

## Estado del Proyecto

La versión **0.5.1** marca el salto del prototipo a un sistema en operación:

* Los dos módulos principales, **Inicio** y **Administración**, funcionan de punta a punta sobre MySQL con persistencia real.
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
