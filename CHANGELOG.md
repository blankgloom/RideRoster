# Changelog

Todas las novedades de RideRoster se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado se basa en [Semantic Versioning](https://semver.org/lang/es/).

## [0.5.1] - 2026-10-22

Primera versión operativa del sistema: los módulos de **Inicio** y **Administración**
dejan de ser un esqueleto y funcionan de punta a punta sobre MySQL.

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

#### Módulo Administración
- **Paseos**: catálogo de destinos con nombre, destino, costo por persona, profesor a cargo,
  descripción y personal de comandos de salvamento.
- **Personal de salvamento** reutilizable entre paseos, con alta y baja desde la misma vista.
- **Programación de viajes** a partir de un paseo: día, horarios, capacidad y notas.
  Los viajes programados aparecen de inmediato en la pestaña Inicio.
- **Parámetros globales** editables: capacidad predeterminada del autobús (55), asientos
  reservados al personal (2) y orden de las listas de pasajeros (orden de inscripción).

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

#### Flotas y salidas
- Agrupación de los viajes que ejecutan el mismo paseo en la misma fecha y hora.
- **Redistribución de pasajeros** entre los buses de una salida, con reparto automático.
- Creación de **buses adicionales** para una misma salida.

#### Costos y cobros
- El **encargado cuenta como persona que paga**: el costo del estudiante con acompañante es
  el doble del costo por persona del paseo.
- El encargado **ocupa asiento**, por lo que reduce los cupos disponibles del bus.
- Se muestran el **costo total esperado**, el **recaudado** y el **por cobrar** del viaje.
- Botón **Cobrar lo pendiente**: registra de una sola vez los cobros faltantes de todos los
  estudiantes, respetando pagos parciales ya realizados.
- Bloqueo de altas cuando el bus se llena o cuando la capacidad baja por debajo de los
  pasajeros ya inscritos.

#### Base de datos y operación
- **Auto-migración**: el sistema compara la versión del esquema con la de la base de datos
  en cada arranque y aplica lo que falte, sin borrar información.
- **Auto-instalación**: si la base de datos no existe, el sistema la crea junto con el
  esquema completo en el primer arranque.
- **Herramienta de línea de comandos** `bin/rideroster` con los comandos `instalar`,
  `migrar`, `estado` y `ayuda`.
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
- La instalación deja de exponerse en el navegador y pasa a ejecutarse desde la terminal.

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
