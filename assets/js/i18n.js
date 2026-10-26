/**
 * Idiomas de RideRoster: español / inglés.
 *
 * El servidor siempre entrega la interfaz en español y este módulo traduce lo
 * que se muestra. El recorrido de traducción es sencillo y decide solo:
 *
 *   - se guarda el texto original en español de cada nodo y de cada atributo;
 *   - si el idioma es inglés se escribe la traducción del diccionario;
 *   - si vuelve a español se restaura el original.
 *
 * Un MutationObserver se encarga de los textos que la aplicación agrega después
 * (paneles, modales y avisos se vuelven a pintar todo el tiempo). Como una
 * traducción que no cambia no genera una mutación nueva, el recorrido termina
 * siempre: no hay bucles.
 *
 * La elección se guarda en localStorage y se aplica también en las demás
 * ventanas de la misma aplicación (listado de abordaje).
 */
(function () {
    'use strict';

    var CLAVE_IDIOMA = 'rideroster_idioma';
    var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
    var TITULOS = {
        es: 'RideRoster · Colecturía INA',
        en: 'RideRoster · INA Transport Office'
    };

    /**
     * Diccionario español -> inglés.
     *
     * Las claves son los textos tal como aparecen en pantalla (sin espacios de
     * relleno). Una clave terminada en * significa que el texto continúa: se
     * traduce lo que empieza así y se conserva lo que sigue (códigos, montos y
     * nombres, que no llevan traducción).
     */
    var DICCIONARIO = {
        ': solo completa lo que falta.': ': it only fills in what is missing.',
        'Acomodar en otro bus de la salida': 'Seat in another bus of the departure',
        'Acompañante': 'Companion',
        'Acompañantes': 'Companions',
        'Acompañante de*': 'Companion of',
        'Actividades previstas para el paseo': 'Planned activities for the outing',
        'Activo': 'Active',
        'Actualiza el catálogo e intenta de nuevo.': 'Update the catalog and try again.',
        'Actualiza el padrón e intenta de nuevo.': 'Update the registry and try again.',
        'Actualiza la lista e intenta de nuevo.': 'Update the list and try again.',
        'Actualizando la información de la colecturía': 'Updating the transport office information',
        'Administración': 'Administration',
        'Agrega a los primeros estudiantes desde el botón Gestionar viaje.':
            'Add the first students from the Manage trip button.',
        'Agrega al primer estudiante del viaje.': 'Add the first student of the trip.',
        'Agregar': 'Add',
        'Agregar nombre del personal': 'Add staff name',
        'Ajusta la búsqueda o agrega un profesor nuevo.':
            'Adjust the search or add a new teacher.',
        'Ajusta la búsqueda o los filtros de sección.':
            'Adjust the search or the section filters.',
        'Alergias': 'Allergies',
        'Alumno': 'Student',
        'Alumno eliminado': 'Student deleted',
        'Alumno no encontrado': 'Student not found',
        'Alumnos': 'Students',
        'Ampliar este bus': 'Expand this bus',
        'Anular pago': 'Void payment',
        'Apellidos': 'Last names',
        'Asientos compactados': 'Seats compacted',
        'Asientos de personal': 'Staff seats',
        'Asientos totales, incluyendo al profesor y al comando de salvamento.':
            'Total seats, including the teacher and the safety team.',
        'Asignación de asientos': 'Seat assignment',
        'Aumenta la capacidad del bus actual para que la persona quepa.':
            'Increase the current bus capacity so the person fits.',
        'Autobús': 'Bus',
        'Año': 'Year',
        'Año escolar': 'School year',
        'Aún no hay personal registrado.': 'No staff registered yet.',
        'Boletos cerrados': 'Tickets closed',
        'Bus': 'Bus',
        'Bus adicional creado': 'Additional bus created',
        'Bus ampliado': 'Bus expanded',
        'Buscar paseo': 'Search outing',
        'Buscar por nombre, cargo o código': 'Search by name, role or code',
        'Buscar por nombre, código o cargo': 'Search by name, code or role',
        'Buscar por nombre, código o encargado': 'Search by name, code or guardian',
        'Buses de esta salida': 'Buses of this departure',
        'Calculando las estadísticas del período': 'Calculating statistics for the period',
        'Cambiar el código': 'Change the code',
        'Cancelar': 'Cancel',
        'Capacidad del autobús': 'Bus capacity',
        'Capacidad del bus nuevo': 'New bus capacity',
        'Capacidad máxima del bus': 'Maximum bus capacity',
        'Capacidad utilizada en cada salida del período':
            'Capacity used on each departure of the period',
        'Cargando el catálogo de profesores': 'Loading the teacher catalog',
        'Cargando el padrón de alumnos': 'Loading the student registry',
        'Cargando la información de la colecturía':
            'Loading the transport office information',
        'Cargo o especialidad': 'Role or specialty',
        'Catálogo de profesores': 'Teacher catalog',
        'Catálogo de destinos disponibles para la colecturía':
            'Destinations available to the transport office',
        'Catálogo docente': 'Teacher catalog',
        'Cerrar': 'Close',
        'Cerrar huecos': 'Close gaps',
        'Cobrar lo pendiente': 'Collect what is pending',
        'Colecturía activa': 'Transport office active',
        'Colecturía del Instituto Nacional de Apopa':
            'Transport office of Instituto Nacional de Apopa',
        'cobro completo:*': 'fully collected:',
        'Compañeros de viaje': 'Travel companions',
        'Con el código basta: el nombre se completa con el padrón.':
            'The code is enough: the name is filled in from the registry.',
        'Concedido': 'Granted',
        'Costo': 'Cost',
        'Costo esperado': 'Expected cost',
        'Costo por persona': 'Cost per person',
        'Costo total esperado': 'Total expected cost',
        'Crea el primer paseo para poder programar viajes.':
            'Create the first outing to schedule trips.',
        'Crea la primera sección para agrupar el padrón.':
            'Create the first section to group the registry.',
        'Crea un paseo antes de programar un viaje.':
            'Create an outing before scheduling a trip.',
        'Crear bus y acomodar': 'Create bus and seat',
        'Cupos agotados': 'No seats left',
        'Cupos disponibles': 'Available seats',
        'Código': 'Code',
        'Código del estudiante': 'Student code',
        'Código no válido': 'Invalid code',
        'Código repetido': 'Duplicate code',
        'Código válido:*': 'Valid code:',
        'Datos del paseo': 'Outing details',
        'Datos del viaje': 'Trip details',
        'Denegado': 'Denied',
        'Descripción': 'Description',
        'Desde la carpeta del proyecto ejecuta': 'From the project folder run',
        'Deshace el último cambio de asiento': 'Undoes the last seat change',
        'Destino': 'Destination',
        'Detalle': 'Details',
        'Detalle de la conexión': 'Connection details',
        'Dirección o punto de encuentro': 'Address or meeting point',
        'Docente': 'Teacher',
        'Día del viaje': 'Trip day',
        'Editar alumno': 'Edit student',
        'Editar paseo': 'Edit outing',
        'Editar profesor': 'Edit teacher',
        'Editar sección': 'Edit section',
        'Efectivo': 'Cash',
        'Ej. 2B': 'e.g. 2B',
        'Ej. Desarrollo de Software': 'e.g. Software Development',
        'Ej. P032': 'e.g. P032',
        'Ej. Paseo a Antiguo Cuscatlán': 'e.g. Trip to Antiguo Cuscatlán',
        'El bus de destino recalcula sus cupos al instante.':
            'The destination bus recalculates its seats instantly.',
        'El bus está lleno': 'The bus is full',
        'El encargado ocupa un asiento y suma el costo por persona del paseo.':
            'The guardian takes a seat and adds the per-person cost of the outing.',
        'El estudiante se quitó de la lista del viaje.':
            'The student was removed from the trip list.',
        'El estudiante quedó en el bus de destino.':
            'The student ended up in the destination bus.',
        'El estudiante quedó en el bus nuevo.': 'The student ended up in the new bus.',
        'El estudiante se agregó al viaje.': 'The student was added to the trip.',
        'El monto se sumó al recaudado del viaje.':
            'The amount was added to the collected total of the trip.',
        'El movimiento se eliminó del registro.': 'The movement was removed from the record.',
        'El pago se registra a nombre del viaje.':
            'The payment is registered under the trip.',
        'El pasajero se añadió a la lista del viaje.':
            'The passenger was added to the trip list.',
        'El paseo se retiró del catálogo.': 'The outing was removed from the catalog.',
        'El paseo y sus viajes se retiraron del sistema.':
            'The outing and its trips were removed from the system.',
        'El profesor salió del catálogo.': 'The teacher left the catalog.',
        'El registro se retiró de la lista.': 'The record was removed from the list.',
        'El sistema aún no está preparado': 'The system is not ready yet',
        'El viaje quedó como finalizado.': 'The trip is now finished.',
        'El viaje quedó como programado.': 'The trip is now scheduled.',
        'El viaje se retiró del sistema.': 'The trip was removed from the system.',
        'El viaje ya aparece en la pestaña Inicio.': 'The trip now appears on the Home tab.',
        'Elige otro código para sentarlos juntos.':
            'Choose another code so they can sit together.',
        'Elige un bus': 'Choose a bus',
        'Elige un docente de la lista': 'Choose a teacher from the list',
        'Eliminar': 'Delete',
        'Eliminar alumno del padrón': 'Remove student from the registry',
        'Eliminar del padrón': 'Remove from the registry',
        'Eliminar paseo': 'Delete outing',
        'Eliminar paseo y sus viajes': 'Delete outing and its trips',
        'Eliminar profesor': 'Delete teacher',
        'Eliminar sección': 'Delete section',
        'Eliminar todo': 'Delete all',
        'Eliminar viaje': 'Delete trip',
        'Eliminar viaje con datos': 'Delete trip with data',
        'En curso': 'In progress',
        'Encargado': 'Guardian',
        'Encargado o tutor': 'Guardian or tutor',
        'Ese código ya está asignado a otro estudiante en este viaje:*':
            'That code is already assigned to another student on this trip:',
        'Ese código no está en el padrón: falta el nombre del estudiante.':
            'That code is not in the registry: the student name is missing.',
        'Ese es el propio estudiante': 'That is the student themselves',
        'Ese parámetro no se puede modificar desde aquí.':
            'That setting cannot be changed from here.',
        'Especialidad': 'Specialty',
        'Esta acción no se puede deshacer': 'This action cannot be undone',
        'Estado': 'Status',
        'Estado actualizado': 'Status updated',
        'Estado del viaje actualizado.': 'Trip status updated.',
        'Estadísticas': 'Statistics',
        'Este bus todavía no tiene estudiantes': 'This bus has no students yet',
        'Este bus todavía no tiene estudiantes asignados.':
            'This bus has no assigned students yet.',
        'Este bus ya está lleno': 'This bus is already full',
        'Este estudiante ya tiene cubierto su costo de*':
            'This student has already covered their cost up to',
        'Este viaje todavía no tiene estudiantes inscritos.':
            'This trip has no enrolled students yet.',
        'Estudiante': 'Student',
        'Estudiante agregado': 'Student added',
        'Estudiante reasignado': 'Student reassigned',
        'Estudiantes': 'Students',
        'Estudiantes beneficiados': 'Students served',
        'Estudiantes inscritos': 'enrolled students',
        'estudiantes inscritos': 'enrolled students',
        'Estudiantes pasajeros': 'Student passengers',
        'Escribe el nombre: ese código no está en el padrón.':
            'Type the name: that code is not in the registry.',
        'Escribe el nombre del personal de salvamento.':
            'Type the name of the safety staff member.',
        'Escribe un código: 2B07': 'Type a code: 2B07',
        'Exportar PDF': 'Export to PDF',
        'Falta el nombre': 'Name required',
        'Faltan': 'Time left',
        'Fecha': 'Date',
        'Fecha de nacimiento': 'Birth date',
        'Fecha de registro': 'Registration date',
        'Filtrar por año': 'Filter by year',
        'Filtrar por sección': 'Filter by section',
        'Finalizada': 'Finished',
        'Finalizado': 'Finished',
        'Finalizar viaje ahora': 'Finish trip now',
        'Firma': 'Signature',
        'Generar listado': 'Generate list',
        'Gestionar': 'Manage',
        'Gestionar viaje': 'Manage trip',
        'Guardar': 'Save',
        'Guardar cambios': 'Save changes',
        'Historial de viajes': 'Trip history',
        'Hombre (M)': 'Male (M)',
        'Hora de regreso': 'Return time',
        'Hora de salida': 'Departure time',
        'Hora estimada de regreso': 'Estimated return time',
        'Horario': 'Schedule',
        'Horario, capacidad y estado del autobús':
            'Schedule, capacity and status of the bus',
        'Imprimir o guardar en PDF': 'Print or save as PDF',
        'Inactivo': 'Inactive',
        'Indicaciones especiales del viaje': 'Special trip instructions',
        'Indicaciones para la colecturía': 'Instructions for the transport office',
        'Indica el bus de destino.': 'Enter the destination bus.',
        'Indica la fecha y la hora de salida del viaje.':
            "Enter the trip's departure date and time.",
        'Indica la persona que se va a mover y el asiento de destino.':
            'Enter the person to move and the destination seat.',
        'Indica si el profesor es hombre (M) o mujer (F).':
            'Enter whether the teacher is male (M) or female (F).',
        'Inicio': 'Home',
        'Instituto Nacional de Apopa · Colecturía':
            'Instituto Nacional de Apopa · Transport Office',
        'Ir a Administración': 'Go to Administration',
        'La capacidad debe dejar al menos un asiento para pasajeros.':
            'The capacity must leave at least one seat for passengers.',
        'La capacidad no puede ser menor a los pasajeros ya inscritos más los asientos de personal.':
            'The capacity cannot be lower than the enrolled passengers plus the staff seats.',
        'La fecha de nacimiento debe tener el formato AAAA-MM-DD.':
            'The birth date must use the YYYY-MM-DD format.',
        'La fecha de registro debe tener el formato AAAA-MM-DD.':
            'The registration date must use the YYYY-MM-DD format.',
        'La sección quedó registrada.': 'The section was registered.',
        'La sección no existe.': 'The section does not exist.',
        'La sección salió del catálogo.': 'The section left the catalog.',
        'La sección seleccionada ya no existe.': 'The selected section no longer exists.',
        'La sección solo se puede eliminar cuando no tiene alumnos inscritos.':
            'A section can only be deleted when it has no enrolled students.',
        'La salida solicitada no existe.': 'The requested departure does not exist.',
        'Las listas se muestran según se va agregando cada estudiante.':
            'Lists are shown in the order students are added.',
        'Libre': 'Free',
        'Lista de pasajeros': 'Passenger list',
        'Listado generado': 'List generated',
        'Listado generado con las preferencias de cada estudiante.':
            "List generated with each student's preferences.",
        'Listado de abordaje ·*': 'Boarding list ·',
        'Los asientos vacíos intermedios se rellenaron.':
            'The empty seats in between were filled.',
        'Los boletos de este viaje ya están cerrados: no se pueden inscribir más estudiantes.':
            'The tickets for this trip are closed: no more students can be enrolled.',
        'Los boletos del bus de destino ya están cerrados: no se pueden inscribir más estudiantes.':
            'The tickets for the destination bus are closed: no more students can be enrolled.',
        'Los boletos quedaron cerrados: ya no se pueden inscribir más estudiantes.':
            'The tickets are closed: no more students can be enrolled.',
        'Los cambios quedaron guardados.': 'The changes were saved.',
        'Los compañeros de viaje quedaron sentados juntos.':
            'The travel companions are seated together.',
        'Los datos del alumno quedaron guardados.': 'The student data was saved.',
        'Los datos del profesor quedaron guardados.': 'The teacher data was saved.',
        'Los datos del viaje quedaron guardados.': 'The trip data was saved.',
        'Los demás buses de la salida no tienen cupos libres.':
            'The other buses of the departure have no free seats.',
        'Los viajes finalizados quedan registrados aquí.':
            'Finished trips are kept here.',
        'Los viajes se muestran en la pestaña Inicio': 'Trips show up on the Home tab',
        'Marca al menos un estudiante para cambiarlo de bus.':
            'Select at least one student to move them to another bus.',
        'Monto': 'Amount',
        'Mover a otro bus': 'Move to another bus',
        'Mover los seleccionados al bus': 'Move the selected ones to the bus',
        'Mover seleccionados': 'Move selected',
        'Moviendo a': 'Moving to',
        'Movimiento deshecho': 'Movement undone',
        'Mujer (F)': 'Female (F)',
        'Método': 'Method',
        'Nacimiento': 'Birth',
        'Ningún docente coincide con la búsqueda.': 'No teacher matches the search.',
        'No fue posible conectar con la base de datos de RideRoster. Comprueba que MySQL esté encendido y que la base exista.':
            'Could not connect to the RideRoster database. Check that MySQL is on and that the database exists.',
        'No hay cobros pendientes en este viaje.':
            'There are no pending charges on this trip.',
        'No hay una distribución anterior para restaurar.':
            'There is no previous layout to restore.',
        'No hay paseos disponibles': 'No outings available',
        'No hay viajes registrados': 'No trips registered',
        'No se pudieron calcular las estadísticas': 'Statistics could not be calculated',
        'No se pudieron cerrar los boletos': 'The tickets could not be closed',
        'No se pudieron registrar': 'Nothing could be registered',
        'No se pudo abrir el viaje': 'The trip could not be opened',
        'No se pudo abrir la redistribución': 'The redistribution could not be opened',
        'No se pudo actualizar': 'Could not be updated',
        'No se pudo agregar': 'Could not be added',
        'No se pudo ampliar el bus': 'The bus could not be expanded',
        'No se pudo anular': 'Could not be voided',
        'No se pudo cambiar el estado': 'The status could not be changed',
        'No se pudo cargar el catálogo de profesores':
            'The teacher catalog could not be loaded',
        'No se pudo cargar el padrón': 'The student registry could not be loaded',
        'No se pudo cargar la información': 'The information could not be loaded',
        'No se pudo compactar': 'Could not be compacted',
        'No se pudo crear el bus': 'The bus could not be created',
        'No se pudo deshacer': 'Could not be undone',
        'No se pudo eliminar': 'Could not be deleted',
        'No se pudo generar': 'Could not be generated',
        'No se pudo generar el listado': 'The list could not be generated',
        'No se pudo guardar': 'Could not be saved',
        'No se pudo mover': 'Could not be moved',
        'No se pudo programar': 'Could not be scheduled',
        'No se pudo reasignar': 'Could not be reassigned',
        'No se pudo registrar': 'Could not be registered',
        'No se pudo repartir': 'Could not be distributed',
        'No se pudo retirar': 'Could not be removed',
        'No se registraron estudiantes en este viaje.':
            'No students were registered on this trip.',
        'Nombre': 'Name',
        'Nombre completo': 'Full name',
        'Nombre completo del encargado': "Guardian's full name",
        'Nombre del encargado': "Guardian's name",
        'Nombre del estudiante': 'Student name',
        'Nombre del nuevo personal': 'New staff name',
        'Nombre del paseo': 'Outing name',
        'Nombres': 'First names',
        'Nombres y apellidos': 'First and last names',
        'Notas': 'Notes',
        'Notas para la colecturía': 'Notes for the transport office',
        'Nueva sección': 'New section',
        'Nuevo alumno': 'New student',
        'Nuevo paseo': 'New outing',
        'Nuevo profesor': 'New teacher',
        'Nuevo viaje': 'New trip',
        'O amplíalo hasta': 'Or expand it to',
        'Ocupación': 'Occupancy',
        'Ocupación del autobús': 'Bus occupancy',
        'Ocupación promedio': 'Average occupancy',
        'Ocupación por autobús': 'Occupancy per bus',
        'Opcional': 'Optional',
        'Orden': 'Order',
        'Orden de abordaje': 'Boarding order',
        'Orden de inscripción': 'Registration order',
        'Orden de los pasajeros': 'Passenger order',
        'Ordenan el padrón por año y grupo': 'Sorts the registry by year and group',
        'Otro': 'Other',
        'Ocurrió un error inesperado.': 'An unexpected error occurred.',
        'Padrón': 'Registry',
        'Pagado': 'Paid',
        'Pago': 'Payment',
        'Pago anulado': 'Payment voided',
        'Pago anulado.': 'Payment voided.',
        'Pago general': 'General payment',
        'Pago general del viaje': 'General payment for the trip',
        'Pago registrado': 'Payment registered',
        'Pago registrado.': 'Payment recorded.',
        'Pagos': 'Payments',
        'Parcial': 'Partial',
        'Participación estudiantil': 'Student participation',
        'Parámetro actualizado': 'Setting updated',
        'Parámetro actualizado.': 'Setting updated.',
        'Parámetros globales': 'Global settings',
        'Pasajero actualizado.': 'Passenger updated.',
        'Pasajero retirado': 'Passenger removed',
        'Pasajero retirado del viaje.': 'Passenger removed from the trip.',
        'Pasajeros': 'Passengers',
        'Paseo': 'Outing',
        'Paseo actualizado': 'Outing updated',
        'Paseo actualizado.': 'Outing updated.',
        'Paseo creado': 'Outing created',
        'Paseo creado.': 'Outing created.',
        'Paseo eliminado': 'Outing deleted',
        'Paseos': 'Outings',
        'Pendiente': 'Pending',
        'Permiso': 'Permission',
        'Permiso de salida': 'Exit permission',
        'Personal a bordo': 'Staff on board',
        'Personal de comandos de salvamento': 'Water rescue command staff',
        'Personal de salvamento': 'Safety staff',
        'Personal del viaje': 'Trip staff',
        'Personal eliminado': 'Staff removed',
        'Personal eliminado.': 'Staff removed.',
        'Personal registrado.': 'Staff registered.',
        'Personas que pagan': 'People paying',
        'personas en total': 'people in total',
        'Período de las estadísticas': 'Statistics period',
        'Por cobrar': 'To collect',
        'Profesor': 'Teacher',
        'Profesor a cargo': 'Teacher in charge',
        'Profesor de cada paseo': 'Teacher for each outing',
        'Profesor encargado': 'Supervising teacher',
        'Profesor eliminado': 'Teacher deleted',
        'Profesor guardado': 'Teacher saved',
        'Profesor no encontrado': 'Teacher not found',
        'Profesor actualizado.': 'Teacher updated.',
        'Profesor registrado.': 'Teacher registered.',
        'Profesores': 'Teachers',
        'Promedio de asistencia': 'Average attendance',
        'Programa un viaje desde un paseo para que aparezca en Inicio.':
            'Schedule a trip from an outing so it appears on Home.',
        'Programado': 'Scheduled',
        'Programar viaje': 'Schedule trip',
        'Próximos viajes': 'Upcoming trips',
        'Quitar': 'Remove',
        'Reabrir viaje': 'Reopen trip',
        'Recaudado': 'Collected',
        'Recibo o nota del pago': 'Payment receipt or note',
        'Redistribuir': 'Redistribute',
        'Redistribuir pasajeros': 'Redistribute passengers',
        'Referencia': 'Reference',
        'Registra el pago de todos los que aun deben':
            'Record the payment of everyone who still owes',
        'Registrar de todos modos': 'Register anyway',
        'Registrar pago': 'Record payment',
        'Regreso': 'Return',
        'Reintentar': 'Try again',
        'Rellena los asientos vacíos intermedios': 'Fill in the empty seats in between',
        'Repartir automáticamente': 'Distribute automatically',
        'Resumen': 'Summary',
        'Resumen del padrón': 'Registry summary',
        'Resumen general': 'General summary',
        'Retirar del viaje': 'Remove from the trip',
        'Retorno estimado': 'Estimated return',
        'RideRoster · Colecturía INA': 'RideRoster · INA Transport Office',
        'RideRoster · Sistema de gestión de viajes escolares':
            'RideRoster · School trip management system',
        'Salida': 'Departure',
        'Salidas realizadas': 'Departures completed',
        'Salvamento': 'Safety',
        'Se busca por nombre, cargo o código en el catálogo de docentes.':
            'Search by name, role or code in the teacher catalog.',
        'Se borrará el viaje. Si ya tiene estudiantes o pagos, se pedirá una segunda confirmación.':
            'The trip will be deleted. If it already has students or payments, a second confirmation will be asked.',
        'Se descuentan de la capacidad para los estudiantes.':
            'They are deducted from the student capacity.',
        'Se escribe solo si el código no está en el padrón':
            'Only needed if the code is not in the registry',
        'Se muestran en el orden en que fueron inscritos':
            'Shown in the order they were registered',
        'Se registraron los cobros pendientes.': 'The pending charges were recorded.',
        'Se registró con el código repetido.':
            'It was registered even though the code was already in use.',
        'Se restauró la distribución anterior.': 'The previous layout was restored.',
        'Secciones': 'Sections',
        'Secciones del sistema': 'System sections',
        'Secciones del instituto': 'Sections of the school',
        'Sección': 'Section',
        'Sección actualizada.': 'Section updated.',
        'Sección creada': 'Section created',
        'Sección creada.': 'Section created.',
        'Sección eliminada': 'Section deleted',
        'Sección eliminada.': 'Section deleted.',
        'Sección guardada': 'Section saved',
        'Sección no encontrada': 'Section not found',
        'Selecciona al menos un pasajero para mover.':
            'Select at least one passenger to move.',
        'Selecciona el bus de destino.': 'Select the destination bus.',
        'Selecciona el bus donde quieres acomodar a la persona.':
            'Select the bus where you want to seat the person.',
        'Selecciona el paseo que se va a realizar.':
            'Select the outing that will take place.',
        'Selecciona estudiantes': 'Select students',
        'Selecciona un bus': 'Select a bus',
        'Sexo': 'Gender',
        'Si dejas el año vacío se toma de la primera cifra del nombre.':
            'If you leave the year empty, it is taken from the first digit of the name.',
        'Sin alumnos que coincidan': 'No matching students',
        'Sin asignar': 'Unassigned',
        'Sin cargo registrado': 'No role registered',
        'Sin comandos de salvamento asignados': 'No safety command assigned',
        'Sin encargado': 'No guardian',
        'Sin especialidad': 'No specialty',
        'Sin estudiantes': 'No students',
        'Sin estudiantes en este bus.': 'No students on this bus.',
        'Sin fecha': 'No date',
        'Sin finalizar': 'Not finished',
        'Sin listado generado': 'No list generated',
        'Sin pagos registrados.': 'No payments recorded.',
        'Sin paseos': 'No outings',
        'Sin profesores que coincidan': 'No matching teachers',
        'Sin salidas realizadas en el período': 'No departures completed in the period',
        'Sin secciones': 'No sections',
        'Sin sección': 'No section',
        'Sin teléfono': 'No phone',
        'Sin viaje activo': 'No active trip',
        'Sin viajes programados': 'No trips scheduled',
        'Situación': 'Situation',
        'Subtotal recaudado': 'Collected subtotal',
        'Teléfono': 'Phone',
        'Teléfono del encargado': "Guardian's phone",
        'Todas las secciones': 'All sections',
        'Todavía no hay historial': 'No history yet',
        'Todavía no hay personal registrado. Puedes escribir los nombres abajo.':
            'No staff registered yet. You can type the names below.',
        'Todavía no hay estudiantes en este viaje.':
            'There are no students on this trip yet.',
        'Todos los años': 'All years',
        'Total pendiente': 'Total pending',
        'Total recaudado': 'Total collected',
        'Transferencia': 'Transfer',
        'Trimestral': 'Quarterly',
        'Un estudiante puede declarar como máximo 10 compañeros de viaje.':
            'A student can declare at most 10 travel companions.',
        'Ubicación actualizada': 'Seat updated',
        'Ubicación actualizada.': 'Seat updated.',
        'Usa el formato 2B03: año, sección y número de lista.':
            'Use the format 2B03: year, section and list number.',
        'Valor por defecto del sistema, puedes ajustarlo para este viaje.':
            'The system default value; you can adjust it for this trip.',
        'Ver detalle': 'View details',
        'Ver listado': 'View list',
        'Ver listado de estudiantes': 'View student list',
        'Viaja con encargado': 'Travels with a guardian',
        'viaja con encargado': 'travels with a guardian',
        'viajan con encargado': 'travel with a guardian',
        'Viaje': 'Trip',
        'Viaje activo': 'Active trip',
        'Viaje actual': 'Current trip',
        'Viaje actualizado': 'Trip updated',
        'Viaje actualizado.': 'Trip updated.',
        'Viaje eliminado': 'Trip deleted',
        'Viaje eliminado.': 'Trip deleted.',
        'Viaje programado': 'Trip scheduled',
        'Viaje programado correctamente.': 'Trip scheduled correctly.',
        'Viajes programados': 'Scheduled trips',
        'Viajes programados con fecha posterior a hoy':
            'Trips scheduled for a future date',
        'Viajes que ya se realizaron o cuya fecha pasó':
            'Trips already held or whose date has passed',
        'Volver al sistema': 'Back to the system',
        'Volante': 'Driver',
        'Volumen de la operación en el período': 'Volume of operations in the period',
        'Ya hay un alumno registrado con el código*':
            'A student is already registered with the code',
        'Ya hay un profesor registrado con el código*':
            'A teacher is already registered with the code',
        'Ya no se pueden inscribir más estudiantes. El listado quedó disponible.':
            'No more students can be enrolled. The list is now available.',
        'Acción no disponible para alumnos.': 'Action not available for students.',
        'Acción no disponible para asientos.': 'Action not available for seats.',
        'Acción no disponible para pagos.': 'Action not available for payments.',
        'Acción no disponible para parámetros.': 'Action not available for settings.',
        'Acción no disponible para pasajeros.': 'Action not available for passengers.',
        'Acción no disponible para paseos.': 'Action not available for outings.',
        'Acción no disponible para personal.': 'Action not available for staff.',
        'Acción no disponible para profesores.': 'Action not available for teachers.',
        'Acción no disponible para salidas.': 'Action not available for departures.',
        'Acción no disponible para secciones.': 'Action not available for sections.',
        'Acción no disponible para viajes.': 'Action not available for trips.',
        'Alumno actualizado.': 'Student updated.',
        'Alumno eliminado del padrón.': 'Student removed from the registry.',
        'Alumno registrado en el padrón.': 'Student registered in the registry.',
        'Asientos compactados sin espacios intermedios.':
            'Seats compacted with no empty gaps in between.',
        'El alumno no existe.': 'The student does not exist.',
        'El bus de destino no existe.': 'The destination bus does not exist.',
        'El bus de destino tampoco tiene asientos disponibles.':
            'The destination bus has no seats available either.',
        'El código del estudiante es obligatorio.': 'The student code is required.',
        'El código no cumple el formato requerido.':
            'The code does not match the required format.',
        'El código y el nombre del alumno son obligatorios.':
            'The student code and name are required.',
        'El código, los nombres, los apellidos y el cargo del profesor son obligatorios.':
            'The code, first names, last names and role of the teacher are required.',
        'El estado indicado no es válido.': 'The provided status is not valid.',
        'El monto del pago debe ser mayor que cero.':
            'The payment amount must be greater than zero.',
        'El nombre de la sección es obligatorio.': 'The section name is required.',
        'El nombre del personal es obligatorio.': 'The staff name is required.',
        'El nombre, el destino y el profesor a cargo son obligatorios.':
            'The name, destination and teacher in charge are required.',
        'El pago no existe.': 'The payment does not exist.',
        'El pasajero no existe.': 'The passenger does not exist.',
        'El paseo no existe.': 'The outing does not exist.',
        'El profesor no existe.': 'The teacher does not exist.',
        'El profesor seleccionado ya no existe en el catálogo.':
            'The selected teacher is no longer in the catalog.',
        'El recurso solicitado no existe.': 'The requested resource does not exist.',
        'El valor debe ser un número entero mayor que cero.':
            'The value must be a whole number greater than zero.',
        'El viaje de origen no existe.': 'The origin trip does not exist.',
        'El viaje del pago no fue indicado.': 'The trip for the payment was not provided.',
        'El viaje del pasajero no fue indicado.':
            'The trip for the passenger was not provided.',
        'El viaje solicitado no existe.': 'The requested trip does not exist.',
        'asientos disponibles': 'available seats',
        'asientos utilizados': 'seats used',
        'docentes y comandos de salvamento': 'teachers and safety command staff',
        'el bus vuelve a quedar lleno de forma continua.':
            'the bus becomes full again over and over.',
        'estudiantes por salida': 'students per departure',
        'incluye encargado': 'includes guardian',
        'no borra nada': 'deletes nothing',
        'ocupación': 'occupancy',
        'para cancelar.': 'to cancel.',
        'desde la carpeta del proyecto: no borra los datos que ya tengas.':
            'from the project folder: it does not delete the data you already have.',
        'para crear la base de datos y aplicar el esquema. Si ya tienes información registrada, ese comando':
            'to create the database and apply the schema. If you already have information registered, that command',
        'sin autobuses en el período': 'no buses in the period',
        'sin códigos registrados': 'no codes registered',
        'sin encargado asignado': 'no guardian assigned',
        'inscritos · ordenados según se agregaron':
            'enrolled · listed in the order they were added',
        'Salida hace': 'Departed'
    };

    var prefijos = Object.keys(DICCIONARIO).filter(function (clave) {
        return clave.charAt(clave.length - 1) === '*';
    }).map(function (clave) {
        return clave.slice(0, -1);
    });

    var originalesTexto = new WeakMap();
    var originalesAtributos = new WeakMap();
    var idioma = leerIdioma();

    function leerIdioma() {
        try {
            return window.localStorage.getItem(CLAVE_IDIOMA) === 'en' ? 'en' : 'es';
        } catch (error) {
            return 'es';
        }
    }

    function guardarIdioma(nuevo) {
        try {
            window.localStorage.setItem(CLAVE_IDIOMA, nuevo);
        } catch (error) {
            // Sin almacenamiento disponible se queda solo en esta ventana.
        }
    }

    /** Igual que la aplicación pero sin los espacios de relleno. */
    function normalizar(texto) {
        return String(texto === null || texto === undefined ? '' : texto)
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Devuelve la traducción al inglés o null cuando no corresponde traducir.
     */
    function traducir(texto) {
        var cuerpo = normalizar(texto);

        if (cuerpo === '') {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(DICCIONARIO, cuerpo)) {
            return DICCIONARIO[cuerpo];
        }

        // Textos que siguen con un número: "1 viaja con encargado".
        var numerico = cuerpo.match(/^(\d[\d.,$%]*\s+)(.+)$/);

        if (numerico && Object.prototype.hasOwnProperty.call(DICCIONARIO, numerico[2])) {
            return numerico[1] + DICCIONARIO[numerico[2]];
        }

        // Claves marcadas con *: el resto se conserva tal cual (códigos, montos).
        for (var i = 0; i < prefijos.length; i++) {
            var base = prefijos[i];

            if (cuerpo.length > base.length && cuerpo.indexOf(base) === 0
                && cuerpo.charAt(base.length) === ' ') {
                return DICCIONARIO[base + '*'] + cuerpo.slice(base.length);
            }
        }

        return null;
    }

    function sinFormato(actual, original) {
        if (normalizar(original) === normalizar(actual)) {
            return true;
        }

        var traducido = traducir(original);

        return traducido !== null && normalizar(traducido) === normalizar(actual);
    }

    function aplicarTexto(nodo) {
        if (!nodo || nodo.nodeType !== 3) {
            return;
        }

        var actual = nodo.data;

        if (normalizar(actual) === '') {
            return;
        }

        var padre = nodo.parentElement;

        if (padre && /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(padre.tagName)) {
            return;
        }

        var original = originalesTexto.get(nodo);

        if (original === undefined || !sinFormato(actual, original)) {
            // Es un texto nuevo de la aplicación: queda registrado en español.
            original = actual;
            originalesTexto.set(nodo, original);
        }

        var deseado = original;

        if (idioma === 'en') {
            var traduccion = traducir(original);

            if (traduccion !== null) {
                var izquierda = (actual.match(/^\s*/) || [''])[0];
                var derecha = (actual.match(/\s*$/) || [''])[0];
                deseado = izquierda + traduccion + derecha;
            }
        }

        if (nodo.data !== deseado) {
            nodo.data = deseado;
        }
    }

    function aplicarAtributo(elemento, atributo) {
        var actual = elemento.getAttribute(atributo);

        if (actual === null || normalizar(actual) === '') {
            return;
        }

        var guardados = originalesAtributos.get(elemento) || {};
        var original = guardados[atributo];

        if (original === undefined || !sinFormato(actual, original)) {
            original = actual;
            guardados[atributo] = original;
            originalesAtributos.set(elemento, guardados);
        }

        var deseado = original;

        if (idioma === 'en') {
            var traduccion = traducir(original);

            if (traduccion !== null) {
                deseado = traduccion;
            }
        }

        if (actual !== deseado) {
            elemento.setAttribute(atributo, deseado);
        }
    }

    function recorrer(nodo) {
        if (!nodo) {
            return;
        }

        if (nodo.nodeType === 3) {
            aplicarTexto(nodo);
            return;
        }

        if (nodo.nodeType !== 1) {
            return;
        }

        if (/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(nodo.tagName)) {
            return;
        }

        ATRIBUTOS.forEach(function (atributo) {
            aplicarAtributo(nodo, atributo);
        });

        var hijos = Array.prototype.slice.call(nodo.childNodes);
        hijos.forEach(recorrer);
    }

    function pintarInterruptor() {
        var botones = Array.prototype.slice.call(document.querySelectorAll('[data-idioma]'));

        botones.forEach(function (boton) {
            var activo = boton.getAttribute('data-idioma') === idioma;
            boton.classList.toggle('activo', activo);
            boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
    }

    function cambiarIdioma(nuevo) {
        if (nuevo !== 'es' && nuevo !== 'en') {
            return;
        }

        if (nuevo === idioma) {
            return;
        }

        idioma = nuevo;
        guardarIdioma(idioma);

        recorrer(document.body);
        pintarInterruptor();

        document.documentElement.lang = idioma;
        document.title = TITULOS[idioma];

        document.dispatchEvent(new CustomEvent('cambio-idioma', { detail: { idioma: idioma } }));
    }

    function iniciar() {
        document.documentElement.lang = idioma;
        document.title = TITULOS[idioma];
        pintarInterruptor();
        recorrer(document.body);

        document.addEventListener('click', function (evento) {
            var boton = evento.target && evento.target.closest
                ? evento.target.closest('[data-idioma]')
                : null;

            if (boton) {
                cambiarIdioma(boton.getAttribute('data-idioma'));
            }
        });

        if (window.MutationObserver && document.body) {
            var observador = new MutationObserver(function (mutaciones) {
                mutaciones.forEach(function (mutacion) {
                    if (mutacion.type === 'characterData') {
                        aplicarTexto(mutacion.target);
                        return;
                    }

                    if (mutacion.type === 'attributes') {
                        aplicarAtributo(mutacion.target, mutacion.attributeName);
                        return;
                    }

                    if (mutacion.type === 'childList') {
                        Array.prototype.slice.call(mutacion.addedNodes).forEach(recorrer);
                    }
                });
            });

            observador.observe(document.body, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: ATRIBUTOS
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
