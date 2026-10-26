# Changelog

Todas las novedades de RideRoster se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado se basa en [Semantic Versioning](https://semver.org/lang/es/).

## [0.5.1] - 2026-10-25

Primera versión operativa del sistema: los módulos de **Inicio**, **Administración** y
**Estadísticas** dejan de ser un esqueleto y funcionan de punta a punta sobre MySQL.

### Añadido

#### Módulo Inicio
- **Viaje actual** con fecha, hora de salida, hora estimada de regreso, capacidad del
  autobús y barra de ocupación en vivo.
- **Indicadores de gestión**: estudiantes inscritos, cupos disponibles, dinero recaudado
  y personal a bordo (docentes y comandos de salvamento).
- **Historial de viajes** con el detalle de cada salida ya realizada y de los próximos
  viajes programados.
- **Botón "Gestionar viaje"** con un panel completo para ajustar el viaje:
  - día, hora de salida, hora estimada de regreso, capacidad máxima del bus, notas y estado;
  - alta, edición y retiro de estudiantes;
  - registro y anulación de pagos, con detalle por estudiante.
- **Alerta de código repetido**: al capturar un código ya usado en el viaje, el sistema lo
  bloquea y muestra en claro el nombre y el encargado del registro anterior, con las
  opciones *Registrar de todos modos* y *Cambiar el código*. Los duplicados quedan
  marcados como distintivo en la lista de pasajeros.
- **Formato de código de estudiante** `[Año][Sección][Número de lista]`, por ejemplo `2B03`,
  con validación en vivo en el formulario y validación en el servidor.
- **Contador de salida** en la cabecera: muestra cuánto falta para la salida del viaje
  actual, se enciende en las últimas 24 horas, cambia a aviso urgente en la última hora y
  avisa cuando la hora de salida ya pasó. Se oculta cuando el viaje está finalizado y, en
  pantallas estrechas, la fecha del día cede su espacio para no desbordar la cabecera.
- **Botón "Marcar viaje como finalizado"** debajo de la barra de ocupación: cierra el viaje
  desde la tarjeta del Inicio con la misma lógica que el modal del viaje y, en el mismo
  lugar, deja aparecer el botón **Generar listado**.

#### Módulo Administración
- **Paseos**: catálogo de destinos con nombre, destino, costo por persona, profesor a cargo,
  descripción y personal de comandos de salvamento.
- **Personal de salvamento** reutilizable entre paseos, con alta y baja desde la misma vista.
- **Programación de viajes** a partir de un paseo: día, horarios, capacidad y notas.
  Los viajes programados aparecen de inmediato en la pestaña Inicio.
- **Parámetros globales** editables: capacidad predeterminada del autobús (55), asientos
  reservados al personal (2) y orden de las listas de pasajeros (orden de inscripción).
- **Borrado con doble confirmación**: un paseo que ya tiene viajes programados se puede
  eliminar; la segunda confirmación indica cuántos viajes, estudiantes y pagos se borrarán
  en cascada. Lo mismo aplica al eliminar un viaje que ya tiene estudiantes o pagos.

#### Módulos Alumnos y Profesores
- **Dos pestañas nuevas en la cabecera**, junto a Inicio y Administración, para gestionar
  el padrón sin tocar los viajes.
- **Padrón agrupado por sección**: la lista muestra nombre, código, teléfono, encargado,
  pago y situación de cada alumno, encabezada por el grupo (1A, 1AG, 2B…) con el número de
  alumnos de cada sección.
- **Filtros en el navegador**: búsqueda por nombre, código o encargado más selectores de
  año y de sección. El padrón se descarga una sola vez al abrir la pestaña y el resto de
  los cambios de filtro son inmediatos.
- **Alta, edición y borrado de alumnos** con validación de código repetido y de encargado
  incompleto. Un alumno que ya participó en un viaje no se puede borrar: el API responde
  con un error que recomienda marcarlo como inactivo.
- **Gestión de secciones** desde la misma vista: nombre, año, especialidad y número de
  alumnos inscritos, con alta, edición y borrado. Una sección con alumnos no se puede
  eliminar y el año se deriva de la primera cifra del nombre si no se indica.
- **Catálogo de profesores** con los diez campos del instituto, buscador, alta, edición y
  borrado. Un profesor con paseos asignados no se puede eliminar: se marca inactivo.
- **Selector de profesor en el paseo**: el formulario de Administración cambia el texto
  libre por un menú con los profesores activos del catálogo; si no se elige uno, el
  servidor rechaza el guardado con el mismo aviso de antes.

#### Módulo Estadísticas
- **Tasa de ocupación por autobús**: cada salida realizada muestra sus buses con la
  capacidad utilizada, los asientos ocupados y los que quedan libres.
- **Filtro por período** con tres rangos: mensual (mes en curso), trimestral (trimestre en
  curso) y anual (año en curso), con el rango de fechas visible.
- **Total de salidas realizadas** en el período, junto con el número de autobuses usados.
- **Estudiantes beneficiados**: conteo único por **código** de los alumnos que participaron
  en al menos una salida; quien viaja varias veces cuenta una sola vez.
- **Promedio de asistencia**: participación de la población estudiantil registrada, es decir,
  cuántos códigos del padrón viajan en promedio en cada salida.
- **Resumen general y volumen**: salidas, autobuses, beneficiados, participaciones, tamaño
  del padrón y promedio de estudiantes por salida.
- Las salidas con fecha pasada que aún no se marcaron como finalizadas se señalan como
  **Sin finalizar**.
- Los números decimales del API se envían con su representación más corta.

#### Asignación de asientos
- **Plano interactivo del autobús** con distribución 2+2, al estilo mapa de sala de cine:
  butacas libres, ocupadas y seleccionadas, más los dos asientos reservados al docente y
  al comando de salvamento.
- **Reubicación exacta**: se selecciona una persona y el asiento de destino, o se arrastra
  hasta la butaca. La persona queda **exactamente** en el asiento elegido; si el destino
  estaba ocupado, quien estaba ahí se desplaza un asiento hacia atrás y nadie se pierde.
- **Cerrar huecos**: completa los asientos vacíos intermedios y deja el bus lleno de forma
  continua (1, 2, 3…).
- **Generador de listado** que aplica las preferencias de compañía:
  - quien declara un compañero de viaje queda sentado junto a él (asiento 1: estudiante,
    asiento 2: amigo, asiento 3: padre o tutor);
  - sin preferencia declarada, el padre o tutor se sienta junto a su hijo;
  - los grupos con amistad tienen prioridad sobre el resto.
- **Listado de abordaje** con numeración continua y el asiento físico de cada persona.
- **Exportación a PDF** (`listado.php`) con cabecera institucional, datos del viaje, tabla
  de pasajeros y columna de firma.
- **Regla de numeración del PDF**: por superstición el documento **no imprime los números
  13 ni 18**. La persona que ocupaba la posición 13 pasa a figurar con el número 14 y las
  siguientes se desplazan de forma correlativa. No se elimina a ninguna persona.
- El **listado de abordaje genera el plano de asientos** si todavía no existe, para que la
  hoja no salga vacía aunque el bus esté lleno.
- Si el viaje no tiene estudiantes inscritos, la hoja lo indica con un aviso en lugar de
  mostrar una tabla vacía.

#### Listado de la salida
- **Botón "Generar listado"** cuando el viaje está finalizado: abre el detalle de **todos
  los buses** de la salida, no solo del bus actual.
- **Orden por estado de pago**: primero los estudiantes con pago completo, luego los pagos
  parciales y al final los pendientes; la numeración continúa de bus en bus.
- Cada fila muestra el **asiento** de la persona, el costo, lo pagado, lo pendiente y una
  etiqueta con el estado del pago.
- **Subtotales por bus** y **totales de la salida** de recaudado y pendiente.
- **Exportar PDF** de cada bus desde el mismo detalle.

#### Flotas y salidas
- Agrupación de los viajes que ejecutan el mismo paseo en la misma fecha y hora.
- **Redistribución de pasajeros** entre los buses de una salida, con reparto automático.
- Creación de **buses adicionales** para una misma salida.
- **Control de desborde**: al inscribir a un estudiante en un bus lleno, el sistema responde
  con el detalle de la ocupación (ocupados, capacidad, cupos y buses de la salida) y ofrece
  dos salidas: **Crear un segundo bus**, que abre un bus hermano y registra ahí al
  estudiante, o **Distribuir pasajeros sobrantes** entre los buses existentes. El API admite
  la marca `desborde=auto` para crear el bus sin pasar por el modal.

#### Interfaz del alta de estudiantes y del cambio de asientos
- **Acceso directo al alta**: el boton *Agregar estudiante* de la lista de pasajeros abre el
  gestor del viaje con el cursor ya en el campo de nombre, y el formulario de alta queda
  primero dentro del modal, antes que los datos del viaje.
- El foco vuelve al campo de nombre despues de registrar un estudiante, para encadenar
  altas sin volver a buscar el formulario.
- **Barra de instrucciones contextual** en el plano de asientos: explica como mover y,
  al seleccionar a alguien, indica su nombre, su codigo y como cancelar.
- Los asientos libres se resaltan con una marca de "+" cuando hay una persona seleccionada,
  y el destino se marca al pasar el cursor por encima.
- **Deshacer**: devuelve la distribucion de asientos anterior al ultimo movimiento.
- **Esc** cancela la seleccion sin cerrar la ventana.
- Estado vacio propio cuando el bus todavia no tiene estudiantes, con acceso al alta.
- Versionado de los archivos de estilos y JavaScript para que el navegador no sirva
  versiones antiguas en cache tras una actualizacion.

#### Costos y cobros
- El **encargado cuenta como persona que paga**: el costo del estudiante con acompañante es
  el doble del costo por persona del paseo.
- El encargado **ocupa asiento**, por lo que reduce los cupos disponibles del bus.
- Se muestran el **costo total esperado**, el **recaudado** y el **por cobrar** del viaje.
- Botón **Cobrar lo pendiente**: registra de una sola vez los cobros faltantes de todos los
  estudiantes, respetando pagos parciales ya realizados.
- **Cobro en un paso desde el listado de pasajeros**: el ícono de cobro de cada fila abre el
  formulario con el estudiante ya seleccionado y el monto pendiente cargado.
- Botón **Cobrar pendientes** en la lista de pasajeros del inicio, con confirmación previa y
  resumen del total registrado; repetirlo no duplica cobros.
- Bloqueo de altas cuando la capacidad baja por debajo de los pasajeros ya inscritos; si el
  bus se llena, además se ofrecen las opciones de crear otro bus o de redistribuir a los
  pasajeros sobrantes.

#### Base de datos y operación
- **Auto-migración**: el sistema compara la versión del esquema con la de la base de datos
  en cada arranque y aplica lo que falte, sin borrar información.
- **Auto-instalación**: si la base de datos no existe, el sistema la crea junto con el
  esquema completo en el primer arranque.
- **Padrón de alumnos, secciones y profesores** (esquema v5): tablas nuevas `alumnos`
  (código, nombre, teléfono, encargado y estado de pago), `secciones` (nombre único, año y
  especialidad), `encargados` (nombre y teléfono, deduplicados por nombre) y `profesores`
  (los diez campos del instituto, sin filtros ni modificaciones). Cada alumno queda en su
  sección mediante `alumnos.seccion_id`. El padrón sigue **fuera de los viajes**: cada
  salida seguirá recibiendo a sus pasajeros de forma individual.
- **Enlaces nuevos**: `pasajeros.alumno_id` para agregar un alumno a un viaje por su
  código, y `paseos.profesor_id` para elegir el profesor como opción y no como texto
  libre. Las dos columnas conviven con las actuales, sin romper nada; el nombre de
  `paseos.profesor_encargado` se sigue guardando y ahora el API lo completa con el nombre
  completo del registro elegido.
- **Estado de pago del padrón**: todos los alumnos migrados quedan al **100% (pagado)**.
  No existen planes de cuotas ni la opción "por pagos"; el pago total se materializa en la
  tabla `pagos` cuando el alumno entra a un viaje.
- **Migración del instituto** `bin/rideroster migrar-instituto` (opciones
  `--archivo=<ruta>`, `--simular` y `--limpiar`): carga el volcado phpMyAdmin del
  Instituto Nacional de Apopa en una base temporal de solo lectura y traslada sus
  profesores, secciones, encargados y alumnos. Reglas: el encargado que ya existe se
  reutiliza y se autocompleta ("viaja con encargado"), el que no existe se crea y se
  vincula, y el que está declarado sin datos completos y sin registro previo **bloquea ese
  alumno** y queda en el informe de errores. La migración es idempotente y se revierte con
  `--simular`.
- **Recursos nuevos en el API**: `r=alumnos` (padrón completo con sus secciones y un
  resumen), `r=secciones` y `r=profesores`, cada uno con sus acciones de crear, actualizar
  y eliminar.
- **Herramienta de línea de comandos** `bin/rideroster` con los comandos `instalar`,
  `migrar`, `migrar-instituto`, `estado` y `ayuda`.
- **Semilla de demostración** con 5 paseos, 7 viajes, 199 estudiantes, sus acompañantes,
  pagos y el personal de salvamento.

### Cambiado
- La compactación de asientos pasa de ser automática a ser explícita con el botón
  **Cerrar huecos**, para que la reubicación manual respete siempre el asiento elegido.
- La reubicación identifica a la persona (estudiante o acompañante) y no la fila interna,
  por lo que sigue funcionando aunque el listado se regenere en otra pestaña.
- El listado de abordaje muestra la numeración continua del recorrido y, por separado, el
  asiento físico de cada persona.
- El listado en PDF incluye una columna con el asiento físico.
- El **viaje actual** prioriza el viaje de hoy y, si no hay, el más próximo; cuando ya no
  quedan viajes vigentes conserva uno finalizado para poder generar su listado.
- La instalación deja de exponerse en el navegador y pasa a ejecutarse desde la terminal.
- El campo **profesor a cargo** del paseo pasa de texto libre a un selector con el catálogo
  de profesores. Un paseo guardado a mano conserva su nombre hasta que se vincule a un
  registro del catálogo.
- La cabecera pasa de tres a cinco pestañas: junto a Inicio, Administración y
  Estadísticas aparecen **Alumnos** y **Profesores**, que se cargan solo cuando se abren.

### Corregido
- La reubicación devolvía un error cuando el listado se había regenerado en otra pestaña,
  porque enviaba el identificador interno de la fila en lugar de la persona.
- La reubicación a un asiento situado al final del bus se recortaba al último asiento
  ocupado en lugar de respetar el destino.
- El costo de los acompañantes no se sumaba al total esperado del viaje.
- Los códigos con formato anterior se convertían automáticamente al formato vigente,
  conservando las repeticiones intencionales.
- La aplicación ya no se rompe cuando la base de datos está desactualizada: migra sola y
  avisa con un mensaje claro.
- La aplicación ya no se rompe con la base de datos vacía: sin viajes registrados, la vista
  de Inicio mostraba el aviso "No se pudo cargar la información" en lugar de su estado
  vacío, al intentar leer el viaje que no existe para pintar los botones de la lista de
  pasajeros.
- Desde Administración se volvía a Inicio sin respuesta cuando la base estaba vacía, porque
  el error anterior impedía repintar el contenido; ahora la lista de pasajeros muestra el
  mensaje **Sin viaje activo** y sus botones solo aparecen cuando hay un viaje seleccionado.

### Eliminado
- `install.php`, el instalador web: se sustituye por `bin/rideroster` para no exponer una
  ruta que crea bases de datos dentro del sitio.

## [0.4.0] - 2026-10-19
- Estructura base del proyecto, sistema de diseño y documentación inicial.

## [0.3.0] - 2026-10-12
- Prototipo de la interfaz de la colecturía.

## [0.2.0] - 2026-10-05
- Configuración del repositorio y licencia del proyecto.

## [0.1.0] - 2026-09-28
- Primer commit del proyecto.

[0.5.1]: https://github.com/blankgloom/RideRoster/releases/tag/v0.5.1
[0.4.0]: https://github.com/blankgloom/RideRoster/releases/tag/v0.4.0
[0.3.0]: https://github.com/blankgloom/RideRoster/releases/tag/v0.3.0
[0.2.0]: https://github.com/blankgloom/RideRoster/releases/tag/v0.2.0
[0.1.0]: https://github.com/blankgloom/RideRoster/releases/tag/v0.1.0
