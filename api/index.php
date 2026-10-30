<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

/** Códigos de compañeros de viaje que puede declarar un estudiante. */
const MAX_COMPANEROS = 10;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function responder(array $cuerpo, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function responder_ok(mixed $datos = null, array $extra = []): void
{
    responder(array_merge(['ok' => true, 'datos' => $datos], $extra));
}

function responder_error(string $codigo, string $mensaje, int $estado = 400, array $detalles = []): void
{
    responder([
        'ok'    => false,
        'error' => [
            'codigo'   => $codigo,
            'mensaje'  => $mensaje,
            'detalles' => $detalles,
        ],
    ], $estado);
}

function cuerpo_entrante(): array
{
    $crudo = file_get_contents('php://input');

    if ($crudo !== false && $crudo !== '') {
        $decodificado = json_decode($crudo, true);

        if (is_array($decodificado)) {
            return $decodificado;
        }
    }

    return $_POST;
}

function texto(array $datos, string $clave, string $alterno = ''): string
{
    $valor = trim((string) ($datos[$clave] ?? $alterno));

    return $valor;
}

function numero(array $datos, string $clave, float $alterno = 0.0): float
{
    $valor = $datos[$clave] ?? null;

    if ($valor === null || $valor === '') {
        return $alterno;
    }

    return (float) $valor;
}

function lista_de_nombres(array $datos, string $clave): array
{
    $valores = $datos[$clave] ?? [];

    if (!is_array($valores)) {
        return [];
    }

    $nombres = [];

    foreach ($valores as $valor) {
        $nombre = trim((string) $valor);

        if ($nombre !== '') {
            $nombres[] = $nombre;
        }
    }

    return array_values(array_unique($nombres));
}

function lista_de_ids(mixed $valores): array
{
    if (!is_array($valores)) {
        return [];
    }

    $ids = [];

    foreach ($valores as $valor) {
        $id = (int) $valor;

        if ($id > 0) {
            $ids[] = $id;
        }
    }

    return array_values(array_unique($ids));
}

/**
 * Códigos de compañeros de viaje enviados por el cliente: limpios, sin repetidos
 * y en el orden en que se escribieron.
 *
 * @return string[]
 */
function lista_de_codigos(mixed $valores): array
{
    if (!is_array($valores)) {
        return [];
    }

    $codigos = [];

    foreach ($valores as $valor) {
        if (is_array($valor)) {
            $valor = $valor['codigo'] ?? '';
        }

        $codigo = normalizar_codigo((string) $valor);
        if ($codigo === '' || in_array($codigo, $codigos, true)) {
            continue;
        }

        $codigos[] = $codigo;
    }

    return $codigos;
}

/**
 * Códigos de compañeros validados: cada uno con su formato y sin repetir al
 * propio estudiante.
 *
 * @return string[]
 */
function companeros_validados(mixed $valores, string $codigoPropio): array
{
    $codigos = lista_de_codigos($valores);
    $propio = normalizar_codigo($codigoPropio);
    $validos = [];

    foreach ($codigos as $codigo) {
        if ($codigo === $propio) {
            continue;
        }

        if (!formato_codigo_valido($codigo)) {
            responder_error(
                'codigo_invalido',
                'El compañero ' . $codigo . ' no tiene un código válido.',
                422,
                ['formato' => 'Año (2 dígitos), sección (letra) y número de lista (2 dígitos). Ejemplo: 2B03']
            );
        }

        $validos[] = $codigo;
    }

    if (count($validos) > MAX_COMPANEROS) {
        responder_error(
            'companeros_excesivos',
            'Un estudiante puede declarar como máximo ' . MAX_COMPANEROS . ' compañeros de viaje.',
            422,
            ['limite' => MAX_COMPANEROS]
        );
    }

    return $validos;
}

/**
 * Detalle del error decupos: estado del bus y buses de la salida con espacio.
 */
function detalle_sin_cupos(array $detalle, int $personas): array
{
    $buses = [];

    foreach ($detalle['buses'] ?? [] as $bus) {
        if ((int) $bus['cupos_disponibles'] < $personas) {
            continue;
        }

        $buses[] = [
            'id'                => (int) $bus['id'],
            'numero'            => (int) $bus['numero'],
            'fecha'             => $bus['fecha'],
            'hora_salida'       => $bus['hora_salida'],
            'ocupados'          => (int) $bus['ocupados'],
            'capacidad_bus'     => (int) $bus['capacidad_bus'],
            'cupos_disponibles' => (int) $bus['cupos_disponibles'],
        ];
    }

    return [
        'ocupados'         => (int) $detalle['ocupados'],
        'capacidad'        => (int) $detalle['capacidad_bus'],
        'cupos'            => (int) $detalle['cupos_disponibles'],
        'requiere'         => $personas,
        'buses'            => $buses,
        'puede_crear_bus'  => true,
    ];
}

function asignar_equipo(int $paseoId, array $nombres, array $ids): void
{
    db()->prepare('DELETE FROM paseo_personal WHERE paseo_id = :paseo')->execute([':paseo' => $paseoId]);

    $personalIds = [];

    foreach ($ids as $id) {
        $personalIds[] = (int) $id;
    }

    foreach ($nombres as $nombre) {
        $existe = db()->prepare('SELECT id FROM personal_asistencia WHERE nombre = :nombre LIMIT 1');
        $existe->execute([':nombre' => $nombre]);
        $fila = $existe->fetch();

        if ($fila !== false) {
            $personalIds[] = (int) $fila['id'];
            continue;
        }

        $nuevo = db()->prepare('INSERT INTO personal_asistencia (nombre) VALUES (:nombre)');
        $nuevo->execute([':nombre' => $nombre]);
        $personalIds[] = (int) db()->lastInsertId();
    }

    $personalIds = array_values(array_unique($personalIds));

    if ($personalIds === []) {
        return;
    }

    $insercion = db()->prepare('INSERT IGNORE INTO paseo_personal (paseo_id, personal_id) VALUES (:paseo, :personal)');

    foreach ($personalIds as $personalId) {
        $insercion->execute([':paseo' => $paseoId, ':personal' => $personalId]);
    }
}

function listar_paseos(): array
{
    $paseos = db()->query('SELECT id, nombre, destino, costo_persona, profesor_encargado, profesor_id, descripcion, activo
                           FROM paseos ORDER BY activo DESC, nombre ASC')->fetchAll();

    foreach ($paseos as &$paseo) {
        $paseo['id'] = (int) $paseo['id'];
        $paseo['costo_persona'] = (float) $paseo['costo_persona'];
        $paseo['activo'] = (int) $paseo['activo'];
        $paseo['profesor_id'] = $paseo['profesor_id'] !== null ? (int) $paseo['profesor_id'] : null;
        $paseo['equipo_asistencia'] = equipo_asistencia_de_paseo($paseo['id']);
    }

    return $paseos;
}

function listar_personal(): array
{
    $personal = db()->query('SELECT id, nombre, puesto FROM personal_asistencia ORDER BY nombre ASC')->fetchAll();

    foreach ($personal as &$persona) {
        $persona['id'] = (int) $persona['id'];
    }

    return $personal;
}

/**
 * Lee y valida los datos de un alumno del padrón.
 *
 * El pago no se toca aquí: el padrón solo registra quién es cada alumno y el
 * control del dinero vive en la tabla `pagos`, viaje por viaje.
 *
 * @return array{codigo: string, nombre: string, seccion_id: ?int, telefono: ?string,
 *                encargado_id: ?int, activo: int}
 */
function datos_de_alumno(array $datos, int $ignorar = 0): array
{
    $codigo = texto($datos, 'codigo');
    $nombre = texto($datos, 'nombre');

    if ($codigo === '' || $nombre === '') {
        responder_error('datos_incompletos', 'El código y el nombre del alumno son obligatorios.');
    }

    $seccionId = (int) ($datos['seccion_id'] ?? 0);

    if ($seccionId > 0) {
        $existe = db()->prepare('SELECT id FROM secciones WHERE id = :id');
        $existe->execute([':id' => $seccionId]);

        if ($existe->fetch() === false) {
            responder_error('seccion_inexistente', 'La sección seleccionada ya no existe.', 409);
        }
    } else {
        $seccionId = null;
    }

    $repetido = db()->prepare('SELECT id FROM alumnos WHERE codigo = :codigo');
    $repetido->execute([':codigo' => $codigo]);
    $existente = $repetido->fetch();

    if ($existente !== false && (int) $existente['id'] !== $ignorar) {
        responder_error(
            'codigo_repetido',
            'Ya hay un alumno registrado con el código ' . $codigo . '.',
            409,
            ['codigo' => $codigo, 'alumno_id' => (int) $existente['id']]
        );
    }

    // Se resuelve al final: si algo más falla no queda un encargado huérfano.
    $encargado = resolver_encargado(texto($datos, 'encargado'), texto($datos, 'telefono_encargado'));

    if ($encargado['estado'] === 'incompleto') {
        responder_error(
            'encargado_incompleto',
            'Viaja con encargado pero "' . $encargado['nombre'] . '" no tiene apellido y no existe un registro '
            . 'previo en la base de datos. Escribe el nombre completo o deja el campo vacío.',
            409,
            ['encargado' => $encargado['nombre']]
        );
    }

    $telefono = texto($datos, 'telefono');

    return [
        'codigo'       => $codigo,
        'nombre'       => $nombre,
        'seccion_id'   => $seccionId,
        'telefono'     => $telefono !== '' ? $telefono : null,
        'encargado_id' => $encargado['id'],
        'activo'       => filter_var($datos['activo'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
    ];
}

/**
 * Lee y valida los datos de un profesor del catálogo.
 *
 * @return array{codigo: string, nombres: string, apellidos: string, sexo: string,
 *                fecha_nacimiento: ?string, especialidad_cargo: string, permiso: string,
 *                alergias: ?string, activo: int, fecha_registro: ?string}
 */
function datos_de_profesor(array $datos, int $ignorar = 0): array
{
    $codigo   = texto($datos, 'codigo');
    $nombres  = texto($datos, 'nombres');
    $apellidos = texto($datos, 'apellidos');
    $cargo    = texto($datos, 'especialidad_cargo');

    if ($codigo === '' || $nombres === '' || $apellidos === '' || $cargo === '') {
        responder_error('datos_incompletos', 'El código, los nombres, los apellidos y el cargo del profesor son obligatorios.');
    }

    $repetido = db()->prepare('SELECT id FROM profesores WHERE codigo = :codigo');
    $repetido->execute([':codigo' => $codigo]);
    $existente = $repetido->fetch();

    if ($existente !== false && (int) $existente['id'] !== $ignorar) {
        responder_error(
            'codigo_repetido',
            'Ya hay un profesor registrado con el código ' . $codigo . '.',
            409,
            ['codigo' => $codigo, 'profesor_id' => (int) $existente['id']]
        );
    }

    $sexo = texto($datos, 'sexo');

    if (!in_array($sexo, ['M', 'F'], true)) {
        responder_error('datos_incompletos', 'Indica si el profesor es hombre (M) o mujer (F).');
    }

    $permiso = texto($datos, 'permiso', 'Concedido');

    if (!in_array($permiso, ['Concedido', 'Denegado'], true)) {
        $permiso = 'Concedido';
    }

    $fechaNacimiento = texto($datos, 'fecha_nacimiento');
    $fechaRegistro   = texto($datos, 'fecha_registro');

    // La fecha cero del origen no es una fecha: se guarda vacía.
    if ($fechaNacimiento === '0000-00-00') {
        $fechaNacimiento = '';
    }

    if ($fechaNacimiento !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaNacimiento) !== 1) {
        responder_error('fecha_invalida', 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.');
    }

    if ($fechaRegistro !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaRegistro) !== 1) {
        responder_error('fecha_invalida', 'La fecha de registro debe tener el formato AAAA-MM-DD.');
    }

    return [
        'codigo'             => $codigo,
        'nombres'            => $nombres,
        'apellidos'          => $apellidos,
        'sexo'               => $sexo,
        'fecha_nacimiento'   => $fechaNacimiento !== '' ? $fechaNacimiento : null,
        'especialidad_cargo' => $cargo,
        'permiso'            => $permiso,
        'alergias'           => texto($datos, 'alergias') !== '' ? texto($datos, 'alergias') : null,
        'activo'             => filter_var($datos['activo'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        'fecha_registro'     => $fechaRegistro !== '' ? $fechaRegistro : null,
    ];
}

/**
 * Profesor de un paseo: si llega el id se toma el registro del catálogo y su
 * nombre completo; si no, se respeta el texto escrito a mano.
 *
 * @return array{id: int|null, nombre: string}
 */
function profesor_del_paseo(array $datos): array
{
    $profesorId = (int) ($datos['profesor_id'] ?? 0);

    if ($profesorId <= 0) {
        return ['id' => null, 'nombre' => texto($datos, 'profesor_encargado')];
    }

    $sentencia = db()->prepare("SELECT CONCAT_WS(' ', nombres, apellidos) AS nombre FROM profesores WHERE id = :id");
    $sentencia->execute([':id' => $profesorId]);
    $nombre = $sentencia->fetchColumn();

    if ($nombre === false) {
        responder_error('profesor_inexistente', 'El profesor seleccionado ya no existe en el catálogo.', 409);
    }

    return ['id' => $profesorId, 'nombre' => (string) $nombre];
}

try {
    $recurso   = $_GET['r'] ?? '';
    $accion    = $_GET['action'] ?? '';
    $id        = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $datos     = cuerpo_entrante();
    $metodo    = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // Cierra los viajes cuyo regreso estimado ya pasó y tenían los boletos cerrados.
    finalizar_viajes_vencidos();

    switch ($recurso) {
        case 'panel':
            $viajes = etiquetar_buses(viajes_ordenados_por_fecha());
            $actual = viaje_actual($viajes);

            responder_ok([
                'parametros' => [
                    'capacidad_bus'        => capacidad_predeterminada(),
                    'asientos_personal'    => asientos_personal(),
                    'orden_pasajeros'      => 'inscripcion',
                ],
                'viaje_actual'   => $actual,
                'viaje_detalle'  => $actual ? detalle_viaje($actual['id']) : null,
                'mapa_asientos'  => $actual ? mapa_asientos($actual['id']) : null,
                'programados'    => array_values(array_filter(
                    $viajes,
                    static fn (array $v): bool => $v['estado'] !== 'finalizado' && $v['fecha'] >= date('Y-m-d')
                )),
                'historial'      => historial_de_viajes($viajes),
                'paseos'         => listar_paseos(),
                'personal'       => listar_personal(),
            ]);
            break;

        case 'estadisticas':
            responder_ok(estadisticas_de_periodo((string) ($_GET['periodo'] ?? 'anual')));
            break;

        case 'viajes':
            if ($metodo === 'GET' && $id > 0) {
                $detalle = detalle_viaje($id);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                responder_ok($detalle);
            }

            if ($metodo === 'GET') {
                responder_ok(viajes_ordenados_por_fecha());
            }

            if ($metodo === 'POST' && $accion === '') {
                $paseoId = (int) ($datos['paseo_id'] ?? 0);
                $fecha   = texto($datos, 'fecha');
                $salida  = texto($datos, 'hora_salida');
                $retorno = texto($datos, 'hora_retorno');
                $capacidad = (int) numero($datos, 'capacidad_bus', capacidad_predeterminada());

                if ($paseoId <= 0) {
                    responder_error('paseo_requerido', 'Selecciona el paseo que se va a realizar.');
                }

                if ($fecha === '' || $salida === '') {
                    responder_error('datos_incompletos', 'Indica la fecha y la hora de salida del viaje.');
                }

                if ($capacidad < asientos_personal() + 1) {
                    responder_error('capacidad_invalida', 'La capacidad debe dejar al menos un asiento para pasajeros.');
                }

                $sentencia = db()->prepare('INSERT INTO viajes (paseo_id, fecha, hora_salida, hora_retorno, capacidad_bus, estado, notas)
                                            VALUES (:paseo, :fecha, :salida, :retorno, :capacidad, :estado, :notas)');
                $sentencia->execute([
                    ':paseo'     => $paseoId,
                    ':fecha'     => $fecha,
                    ':salida'    => $salida . ':00',
                    ':retorno'   => $retorno !== '' ? $retorno . ':00' : null,
                    ':capacidad' => $capacidad,
                    ':estado'    => 'programado',
                    ':notas'     => texto($datos, 'notas') !== '' ? texto($datos, 'notas') : null,
                ]);

                $viajeId = (int) db()->lastInsertId();
                responder_ok(detalle_viaje($viajeId), ['mensaje' => 'Viaje programado correctamente.']);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $detalle = detalle_viaje($id);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $fecha     = texto($datos, 'fecha', $detalle['fecha']);
                $salida    = texto($datos, 'hora_salida', $detalle['hora_salida']);
                $retorno   = texto($datos, 'hora_retorno', (string) $detalle['hora_retorno']);
                $capacidad = (int) numero($datos, 'capacidad_bus', $detalle['capacidad_bus']);

                if ($capacidad < $detalle['ocupados']) {
                    responder_error(
                        'capacidad_invalida',
                        'La capacidad no puede ser menor a los pasajeros ya inscritos más los asientos de personal.'
                    );
                }

                $sentencia = db()->prepare('UPDATE viajes
                                            SET fecha = :fecha, hora_salida = :salida, hora_retorno = :retorno,
                                                capacidad_bus = :capacidad, notas = :notas
                                            WHERE id = :id');
                $sentencia->execute([
                    ':fecha'     => $fecha,
                    ':salida'    => $salida . ':00',
                    ':retorno'   => $retorno !== '' ? $retorno . ':00' : null,
                    ':capacidad' => $capacidad,
                    ':notas'     => texto($datos, 'notas') !== '' ? texto($datos, 'notas') : null,
                    ':id'        => $id,
                ]);

                responder_ok(detalle_viaje($id), ['mensaje' => 'Viaje actualizado.']);
            }

            if ($metodo === 'POST' && $accion === 'cerrar_boletos') {
                $detalle = detalle_viaje($id);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                if (!$detalle['boletos_cerrados']) {
                    cerrar_boletos_de_salida($id);
                }

                responder_ok(detalle_viaje($id), [
                    'mensaje' => 'Los boletos quedaron cerrados: ya no se pueden inscribir más estudiantes.',
                ]);
            }

            if ($metodo === 'POST' && $accion === 'estado') {
                $estado = texto($datos, 'estado', 'programado');
                $permitidos = ['programado', 'en_curso', 'finalizado'];

                if (!in_array($estado, $permitidos, true)) {
                    responder_error('estado_invalido', 'El estado indicado no es válido.');
                }

                $sentencia = db()->prepare('UPDATE viajes SET estado = :estado WHERE id = :id');
                $sentencia->execute([':estado' => $estado, ':id' => $id]);

                responder_ok(detalle_viaje($id), ['mensaje' => 'Estado del viaje actualizado.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $detalle = detalle_viaje($id);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $pasajeros = (int) $detalle['pasajeros'];
                $pagos = count($detalle['pagos']);
                $forzar = filter_var($datos['forzar'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if (($pasajeros > 0 || $pagos > 0) && !$forzar) {
                    responder_error(
                        'viaje_con_datos',
                        'El viaje tiene ' . $pasajeros . ($pasajeros === 1 ? ' estudiante' : ' estudiantes') .
                        ' y ' . $pagos . ($pagos === 1 ? ' pago' : ' pagos') . '.',
                        409,
                        [
                            'pasajeros' => $pasajeros,
                            'pagos'     => $pagos,
                        ]
                    );
                }

                $sentencia = db()->prepare('DELETE FROM viajes WHERE id = :id');
                $sentencia->execute([':id' => $id]);

                responder_ok(null, ['mensaje' => 'Viaje eliminado.']);
            }

            if ($metodo === 'POST' && $accion === 'crear_bus') {
                $origenId = (int) ($datos['viaje_id'] ?? $id);
                $origen = detalle_viaje($origenId);

                if ($origen === null) {
                    responder_error('no_encontrado', 'El viaje de origen no existe.', 404);
                }

                $opciones = [];

                if ((int) ($datos['capacidad_bus'] ?? 0) > 0) {
                    $opciones['capacidad_bus'] = (int) $datos['capacidad_bus'];
                }

                if (texto($datos, 'fecha') !== '') {
                    $opciones['fecha'] = texto($datos, 'fecha');
                }

                if (texto($datos, 'hora_salida') !== '') {
                    $opciones['hora_salida'] = texto($datos, 'hora_salida');
                }

                if (array_key_exists('hora_retorno', $datos)) {
                    $opciones['hora_retorno'] = texto($datos, 'hora_retorno');
                }

                if (array_key_exists('notas', $datos)) {
                    $opciones['notas'] = texto($datos, 'notas');
                }

                $nuevoId = crear_bus_hermano($origenId, $opciones);
                $movidos = [];
                $sinCupo = [];

                foreach (lista_de_ids($datos['pasajeros'] ?? []) as $pasajeroId) {
                    $estado = mover_pasajero_a_bus($pasajeroId, $nuevoId, !empty($datos['forzar']));

                    if ($estado === 'movido') {
                        $movidos[] = $pasajeroId;
                        continue;
                    }

                    if ($estado === 'sin_cupo') {
                        $sinCupo[] = $pasajeroId;
                    }
                }

                $nuevo = detalle_viaje($nuevoId);
                $mensaje = 'Se creó el bus ' . $nuevo['bus_numero'] . ' con los parámetros del bus original.';

                if ($movidos !== []) {
                    $mensaje .= ' ' . count($movidos) . ' pasajero(s) cambiaron a ese bus.';
                }

                if ($sinCupo !== []) {
                    $mensaje .= ' ' . count($sinCupo) . ' pasajero(s) no cupo(n) y siguen en su bus.';
                }

                responder_ok([
                    'viaje'    => $nuevo,
                    'buses'    => $nuevo['buses'],
                    'movidos'  => $movidos,
                    'sin_cupo' => $sinCupo,
                ], ['mensaje' => $mensaje]);
            }

            if ($metodo === 'POST' && $accion === 'rebalancear') {
                $origenId = (int) ($datos['viaje_id'] ?? $id);
                $salida = salida_de_viaje($origenId);

                if ($salida === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $resultado = repartir_pasajeros_de_salida($salida);

                if ($resultado['movidos'] === 0 && $resultado['creados'] === 0) {
                    $mensaje = 'Los estudiantes ya estaban bien repartidos entre los ' . count($resultado['buses']) . ' buses de la salida.';
                } else {
                    $mensaje = $resultado['movidos'] . ' pasajero(s) reubicados entre los buses de la salida.';

                    if ($resultado['creados'] > 0) {
                        $mensaje .= ' Se creó ' . $resultado['creados'] . ' bus adicional.';
                    }
                }

                responder_ok([
                    'buses'   => $resultado['buses'],
                    'movidos' => $resultado['movidos'],
                    'creados' => $resultado['creados'],
                ], ['mensaje' => $mensaje]);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para viajes.');
            break;

        case 'salidas':
            if ($metodo === 'GET') {
                $viajeId = (int) ($_GET['viaje_id'] ?? $id);

                if ($viajeId <= 0) {
                    $actual = viaje_actual(viajes_ordenados_por_fecha());
                    $viajeId = $actual !== null ? (int) $actual['id'] : 0;
                }

                $salida = salida_de_viaje($viajeId);

                if ($salida === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $detalle = detalle_salida($salida);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'La salida solicitada no existe.', 404);
                }

                responder_ok($detalle);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para salidas.');
            break;

        case 'pasajeros':
            if ($metodo === 'POST' && $accion === '') {
                $viajeId   = (int) ($datos['viaje_id'] ?? 0);
                $nombre    = texto($datos, 'nombre');
                $codigo    = texto($datos, 'codigo');
                $encargado = texto($datos, 'encargado');
                $forzar    = !empty($datos['forzar']);
                $desborde  = texto($datos, 'desborde', '');
                $viajeDestino = (int) ($datos['viaje_destino'] ?? 0);

                if ($viajeId <= 0) {
                    responder_error('viaje_requerido', 'El viaje del pasajero no fue indicado.');
                }

                if ($codigo === '') {
                    responder_error('datos_incompletos', 'El código del estudiante es obligatorio.');
                }

                if (!formato_codigo_valido($codigo)) {
                    responder_error(
                        'codigo_invalido',
                        'El código no cumple el formato requerido.',
                        422,
                        ['formato' => 'Año (2 dígitos), sección (letra) y número de lista (2 dígitos). Ejemplo: 2B03']
                    );
                }

                // Solo con el código basta: el nombre lo resuelve el padrón del instituto.
                $alumno = alumno_por_codigo($codigo);

                if ($alumno !== null && $nombre === '') {
                    $nombre = (string) $alumno['nombre'];
                }

                if ($nombre === '') {
                    responder_error(
                        'datos_incompletos',
                        'Ese código no está en el padrón: falta el nombre del estudiante.',
                        422,
                        ['codigo' => normalizar_codigo($codigo)]
                    );
                }

                $companeros = companeros_validados($datos['companeros'] ?? [], $codigo);
                $alumnoId = $alumno !== null ? (int) $alumno['id'] : null;

                $detalle = detalle_viaje($viajeId);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                if (!empty($detalle['boletos_cerrados'])) {
                    responder_error(
                        'boletos_cerrados',
                        'Los boletos de este viaje ya están cerrados: no se pueden inscribir más estudiantes.',
                        409
                    );
                }

                $personas = $encargado !== '' ? 2 : 1;
                $busNuevo = false;
                $destino = null;

                if ($viajeDestino > 0 && $viajeDestino !== $viajeId) {
                    $destino = detalle_viaje($viajeDestino);

                    if ($destino === null) {
                        responder_error('no_encontrado', 'El bus de destino no existe.', 404);
                    }

                    if (!empty($destino['boletos_cerrados'])) {
                        responder_error(
                            'boletos_cerrados',
                            'Los boletos del bus de destino ya están cerrados: no se pueden inscribir más estudiantes.',
                            409
                        );
                    }

                    if (!$forzar && $destino['ocupados'] + $personas > $destino['capacidad_bus']) {
                        responder_error(
                            'sin_cupos',
                            'El bus de destino tampoco tiene asientos disponibles.',
                            409,
                            detalle_sin_cupos($destino, $personas)
                        );
                    }
                } elseif (!$forzar && $detalle['ocupados'] + $personas > $detalle['capacidad_bus']) {
                    if ($desborde !== 'auto') {
                        responder_error(
                            'sin_cupos',
                            'No hay asientos disponibles en este viaje. Crea un bus adicional o reparte a los pasajeros.',
                            409,
                            detalle_sin_cupos($detalle, $personas)
                        );
                    }

                    $busNuevo = true;
                }

                $viajeInscripcion = $destino !== null ? (int) $destino['id'] : $viajeId;

                $coincidencias = db()->prepare('SELECT id, nombre, codigo, encargado FROM pasajeros
                                                WHERE viaje_id = :viaje AND codigo = :codigo ORDER BY id ASC');
                $coincidencias->execute([':viaje' => $viajeInscripcion, ':codigo' => $codigo]);
                $repetidos = $coincidencias->fetchAll();

                if ($repetidos !== [] && !$forzar) {
                    responder_error(
                        'codigo_repetido',
                        'Código repetido',
                        409,
                        ['coincidencias' => $repetidos]
                    );
                }

                if ($busNuevo) {
                    $viajeInscripcion = crear_bus_hermano($viajeId);
                }

                $sentencia = db()->prepare('INSERT INTO pasajeros (viaje_id, nombre, codigo, encargado, alumno_id)
                                            VALUES (:viaje, :nombre, :codigo, :encargado, :alumno)');
                $sentencia->execute([
                    ':viaje'     => $viajeInscripcion,
                    ':nombre'    => $nombre,
                    ':codigo'    => normalizar_codigo($codigo),
                    ':encargado' => $encargado !== '' ? $encargado : null,
                    ':alumno'    => $alumnoId,
                ]);

                $pasajeroId = (int) db()->lastInsertId();

                if ($companeros !== []) {
                    guardar_companeros($pasajeroId, $companeros);
                }

                // Pago automático: al agregar el alumno se marca como pagado por el
                // costo completo (estudiante y, si aplica, su encargado).
                $costoPersona = (float) ($detalle['costo_persona'] ?? 0);
                $personas = $encargado !== '' ? 2 : 1;
                foreach ($companeros as $comp) {
                    $personas += is_array($comp) && !empty($comp['con_encargado']) ? 2 : 1;
                }
                $montoPago = round($costoPersona * $personas, 2);

                if ($montoPago > 0) {
                    db()->prepare('INSERT INTO pagos (viaje_id, pasajero_id, monto, metodo, fecha, nota)
                                    VALUES (:viaje, :pasajero, :monto, :metodo, :fecha, :nota)')
                        ->execute([
                            ':viaje'    => $viajeInscripcion,
                            ':pasajero' => $pasajeroId,
                            ':monto'    => $montoPago,
                            ':metodo'   => 'efectivo',
                            ':fecha'    => date('Y-m-d'),
                            ':nota'     => 'Pago automático al agregar al viaje',
                        ]);
                }

                incorporar_pasajero($viajeInscripcion, $pasajeroId);

                $inscripcion = detalle_viaje($viajeInscripcion);
                $mensaje = 'Estudiante agregado al viaje.';

                if ($busNuevo) {
                    $mensaje = 'El bus estaba lleno: se creó el bus ' . $inscripcion['bus_numero']
                        . ' y el estudiante se agregó ahí.';
                } elseif ($destino !== null) {
                    $mensaje = 'Estudiante agregado al bus ' . $inscripcion['bus_numero'] . '.';
                }

                responder_ok($inscripcion, [
                    'mensaje'     => $mensaje,
                    'pasajero_id' => $pasajeroId,
                    'bus_nuevo'   => $busNuevo,
                    'buses'       => $inscripcion['buses'],
                ]);
            }

            if ($metodo === 'POST' && $accion === 'mover') {
                $destinoId = (int) ($datos['viaje_destino'] ?? 0);
                $forzar    = !empty($datos['forzar']);
                $ids       = lista_de_ids($datos['pasajeros'] ?? []);

                if ((int) ($datos['pasajero_id'] ?? 0) > 0) {
                    $ids[] = (int) $datos['pasajero_id'];
                    $ids = array_values(array_unique($ids));
                }

                if ($destinoId <= 0) {
                    responder_error('datos_incompletos', 'Indica el bus de destino.');
                }

                if ($ids === []) {
                    responder_error('datos_incompletos', 'Selecciona al menos un pasajero para mover.');
                }

                $destino = detalle_viaje($destinoId);

                if ($destino === null) {
                    responder_error('no_encontrado', 'El bus de destino no existe.', 404);
                }

                $movidos = [];
                $sinCupo = [];
                $sinMover = [];
                $origenes = [];

                foreach ($ids as $pasajeroId) {
                    $registro = db()->prepare('SELECT viaje_id FROM pasajeros WHERE id = :id');
                    $registro->execute([':id' => $pasajeroId]);
                    $fila = $registro->fetch();

                    if ($fila === false) {
                        continue;
                    }

                    $origenes[(int) $fila['viaje_id']] = true;
                    $estado = mover_pasajero_a_bus($pasajeroId, $destinoId, $forzar);

                    if ($estado === 'movido') {
                        $movidos[] = $pasajeroId;
                        continue;
                    }

                    if ($estado === 'sin_cupo') {
                        $sinCupo[] = $pasajeroId;
                        continue;
                    }

                    $sinMover[] = $pasajeroId;
                }

                $viajes = [];

                foreach (array_keys($origenes) as $viajeId) {
                    $viajes[$viajeId] = detalle_viaje((int) $viajeId);
                }

                $viajes[$destinoId] = detalle_viaje($destinoId);

                $mensaje = count($movidos) . ' pasajero(s) movidos al bus ' . $destino['bus_numero'] . '.';

                if ($sinCupo !== []) {
                    $mensaje .= ' ' . count($sinCupo) . ' no cupo(n) en el bus de destino.';
                }

                if ($sinMover !== []) {
                    $mensaje .= ' ' . count($sinMover) . ' ya estaba(n) en ese bus.';
                }

                responder_ok([
                    'viaje'    => detalle_viaje($destinoId),
                    'viajes'   => $viajes,
                    'movidos'  => $movidos,
                    'sin_cupo' => $sinCupo,
                    'sin_mover' => $sinMover,
                    'buses'    => $destino['buses'],
                ], ['mensaje' => $mensaje]);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $fila = db()->prepare('SELECT viaje_id, encargado FROM pasajeros WHERE id = :id');
                $fila->execute([':id' => $id]);
                $registro = $fila->fetch();

                if ($registro === false) {
                    responder_error('no_encontrado', 'El pasajero no existe.', 404);
                }

                $detalle = detalle_viaje((int) $registro['viaje_id']);
                $encargadoNuevo = texto($datos, 'encargado');
                $codigoNuevo = texto($datos, 'codigo');
                $teniaEncargado = $registro['encargado'] !== null && $registro['encargado'] !== '';

                if (!formato_codigo_valido($codigoNuevo)) {
                    responder_error(
                        'codigo_invalido',
                        'El código no cumple el formato requerido.',
                        422,
                        ['formato' => 'Año (2 dígitos), sección (letra) y número de lista (2 dígitos). Ejemplo: 2B03']
                    );
                }

                // El nombre puede quedarse vacío: el padrón lo resuelve con el código.
                $alumno = alumno_por_codigo($codigoNuevo);
                $nombreNuevo = texto($datos, 'nombre');

                if ($alumno !== null && $nombreNuevo === '') {
                    $nombreNuevo = (string) $alumno['nombre'];
                }

                if ($nombreNuevo === '') {
                    responder_error(
                        'datos_incompletos',
                        'Ese código no está en el padrón: falta el nombre del estudiante.',
                        422,
                        ['codigo' => normalizar_codigo($codigoNuevo)]
                    );
                }

                $companeros = companeros_validados($datos['companeros'] ?? [], $codigoNuevo);

                $desborde = texto($datos, 'desborde', '');
                $viajeActual = (int) $registro['viaje_id'];
                $viajeDestino = $viajeActual;

                if ($detalle !== null && $encargadoNuevo !== '' && !$teniaEncargado
                    && $detalle['ocupados'] + 1 > $detalle['capacidad_bus']) {
                    if ($desborde !== 'auto') {
                        responder_error(
                            'sin_cupos',
                            'No hay asientos disponibles para agregar al encargado de este estudiante. Crea un bus adicional para la salida.',
                            409,
                            detalle_sin_cupos($detalle, 1)
                        );
                    }

                    $viajeDestino = crear_bus_hermano($viajeActual);
                }

                $sentencia = db()->prepare('UPDATE pasajeros
                                            SET nombre = :nombre, codigo = :codigo, encargado = :encargado, alumno_id = :alumno
                                            WHERE id = :id');
                $sentencia->execute([
                    ':nombre'    => $nombreNuevo,
                    ':codigo'    => normalizar_codigo($codigoNuevo),
                    ':encargado' => $encargadoNuevo !== '' ? $encargadoNuevo : null,
                    ':alumno'    => $alumno !== null ? (int) $alumno['id'] : null,
                    ':id'        => $id,
                ]);

                guardar_companeros($id, $companeros);

                if ($viajeDestino !== $viajeActual) {
                    trasladar_pasajero($id, $viajeDestino);
                }

                $actualizado = detalle_viaje($viajeDestino);

                responder_ok($actualizado, [
                    'mensaje' => 'Pasajero actualizado.',
                    'buses'   => $actualizado['buses'],
                ]);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $fila = db()->prepare('SELECT viaje_id FROM pasajeros WHERE id = :id');
                $fila->execute([':id' => $id]);
                $registro = $fila->fetch();

                if ($registro === false) {
                    responder_error('no_encontrado', 'El pasajero no existe.', 404);
                }

                db()->prepare('DELETE FROM pagos WHERE pasajero_id = :id')->execute([':id' => $id]);
                db()->prepare('DELETE FROM pasajeros WHERE id = :id')->execute([':id' => $id]);
                compactar_asientos((int) $registro['viaje_id']);

                responder_ok(detalle_viaje((int) $registro['viaje_id']), ['mensaje' => 'Pasajero retirado del viaje.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para pasajeros.');
            break;

        case 'pagos':
            if ($metodo === 'POST' && $accion === '') {
                $viajeId    = (int) ($datos['viaje_id'] ?? 0);
                $pasajeroId = (int) ($datos['pasajero_id'] ?? 0);
                $monto      = numero($datos, 'monto');
                $metodoPago = texto($datos, 'metodo', 'efectivo');
                $nota       = texto($datos, 'nota');

                if ($viajeId <= 0) {
                    responder_error('viaje_requerido', 'El viaje del pago no fue indicado.');
                }

                if ($monto <= 0) {
                    responder_error('monto_invalido', 'El monto del pago debe ser mayor que cero.');
                }

                $permitidos = ['efectivo', 'transferencia', 'otro'];

                if (!in_array($metodoPago, $permitidos, true)) {
                    $metodoPago = 'efectivo';
                }

                $sentencia = db()->prepare('INSERT INTO pagos (viaje_id, pasajero_id, monto, metodo, fecha, nota)
                                            VALUES (:viaje, :pasajero, :monto, :metodo, :fecha, :nota)');
                $sentencia->execute([
                    ':viaje'    => $viajeId,
                    ':pasajero' => $pasajeroId > 0 ? $pasajeroId : null,
                    ':monto'    => $monto,
                    ':metodo'   => $metodoPago,
                    ':fecha'    => date('Y-m-d'),
                    ':nota'     => $nota !== '' ? $nota : null,
                ]);

                responder_ok(detalle_viaje($viajeId), ['mensaje' => 'Pago registrado.']);
            }

            if ($metodo === 'POST' && $accion === 'cobrar_pendientes') {
                $viajeId = (int) ($datos['viaje_id'] ?? $id);
                $detalle = detalle_viaje($viajeId);

                if ($detalle === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $sentencia = db()->prepare('INSERT INTO pagos (viaje_id, pasajero_id, monto, metodo, fecha, nota)
                                            VALUES (:viaje, :pasajero, :monto, :metodo, :fecha, :nota)');
                $registrados = 0;
                $total = 0.0;

                foreach ($detalle['pasajeros_lista'] as $pasajero) {
                    if ($pasajero['pendiente'] <= 0) {
                        continue;
                    }

                    $sentencia->execute([
                        ':viaje'    => $viajeId,
                        ':pasajero' => $pasajero['id'],
                        ':monto'    => $pasajero['pendiente'],
                        ':metodo'   => 'efectivo',
                        ':fecha'    => date('Y-m-d'),
                        ':nota'     => $pasajero['encargado'] !== null && $pasajero['encargado'] !== ''
                            ? 'Cobro de ' . $pasajero['nombre'] . ' y su encargado'
                            : 'Cobro de ' . $pasajero['nombre'],
                    ]);

                    $registrados++;
                    $total += $pasajero['pendiente'];
                }

                if ($registrados === 0) {
                    responder_ok($detalle, ['mensaje' => 'No hay cobros pendientes en este viaje.']);
                }

                responder_ok(detalle_viaje($viajeId), [
                    'mensaje' => $registrados . ' cobros registrados por ' . formato_dinero($total) . '.',
                ]);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $fila = db()->prepare('SELECT viaje_id FROM pagos WHERE id = :id');
                $fila->execute([':id' => $id]);
                $registro = $fila->fetch();

                if ($registro === false) {
                    responder_error('no_encontrado', 'El pago no existe.', 404);
                }

                db()->prepare('DELETE FROM pagos WHERE id = :id')->execute([':id' => $id]);

                responder_ok(detalle_viaje((int) $registro['viaje_id']), ['mensaje' => 'Pago anulado.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para pagos.');
            break;

        case 'asientos':
            if ($metodo === 'GET') {
                $viajeId = (int) ($_GET['viaje_id'] ?? 0);

                if ($viajeId <= 0) {
                    $actual = viaje_actual(viajes_ordenados_por_fecha());
                    $viajeId = $actual !== null ? (int) $actual['id'] : 0;
                }

                $mapa = mapa_asientos($viajeId);

                if ($mapa === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                responder_ok($mapa);
            }

            if ($metodo === 'POST' && $accion === 'generar') {
                $viajeId = (int) ($datos['viaje_id'] ?? id);
                $mapa = mapa_asientos($viajeId);

                if ($mapa === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                if ($mapa['ocupantes'] === [] && $detalle['pasajeros'] > 0) {
                    responder_error('sin_pasajeros', 'Todavía no hay estudiantes en este viaje.');
                }

                generar_asientos($viajeId);

                responder_ok([
                    'mapa'   => mapa_asientos($viajeId),
                    'viaje'  => detalle_viaje($viajeId),
                ], ['mensaje' => 'Listado generado con las preferencias de cada estudiante.']);
            }

            if ($metodo === 'POST' && $accion === 'compactar') {
                $viajeId = (int) ($datos['viaje_id'] ?? $id);
                $mapa = mapa_asientos($viajeId);

                if ($mapa === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                compactar_asientos($viajeId);

                responder_ok([
                    'mapa'  => mapa_asientos($viajeId),
                    'viaje' => detalle_viaje($viajeId),
                ], ['mensaje' => 'Asientos compactados sin espacios intermedios.']);
            }

            if ($metodo === 'POST' && $accion === 'mover') {
                $viajeId = (int) ($datos['viaje_id'] ?? $id);
                $pasajeroId = (int) ($datos['pasajero_id'] ?? 0);
                $rol = texto($datos, 'rol', ROL_ESTUDIANTE);
                $destino = (int) ($datos['destino'] ?? 0);
                $mapa = mapa_asientos($viajeId);

                if ($mapa === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                if ($pasajeroId <= 0 || $destino <= 0) {
                    responder_error('datos_incompletos', 'Indica la persona que se va a mover y el asiento de destino.');
                }

                if (!in_array($rol, [ROL_ESTUDIANTE, ROL_TUTOR], true)) {
                    $rol = ROL_ESTUDIANTE;
                }

                if (!mover_ocupante($viajeId, $pasajeroId, $rol, $destino)) {
                    responder_error(
                        'asiento_invalido',
                        'Esa persona ya no está sentada en este viaje. Actualiza la página para ver el listado vigente.',
                        409
                    );
                }

                responder_ok([
                    'mapa'  => mapa_asientos($viajeId),
                    'viaje' => detalle_viaje($viajeId),
                ], ['mensaje' => 'Ubicación actualizada.']);
            }

            if ($metodo === 'POST' && $accion === 'restaurar') {
                $viajeId = (int) ($datos['viaje_id'] ?? $id);
                $mapa = mapa_asientos($viajeId);

                if ($mapa === null) {
                    responder_error('no_encontrado', 'El viaje solicitado no existe.', 404);
                }

                $anterior = $datos['asientos'] ?? [];

                if (!is_array($anterior) || $anterior === []) {
                    responder_error('datos_incompletos', 'No hay una distribución anterior para restaurar.');
                }

                $orden = [];

                foreach ($anterior as $fila) {
                    $rol = isset($fila['rol']) ? (string) $fila['rol'] : ROL_ESTUDIANTE;

                    if (!in_array($rol, [ROL_ESTUDIANTE, ROL_TUTOR], true)) {
                        $rol = ROL_ESTUDIANTE;
                    }

                    $orden[] = [
                        'tipo'       => $rol,
                        'pasajero_id' => (int) ($fila['pasajero_id'] ?? 0),
                        'numero'     => (int) ($fila['numero'] ?? 0),
                    ];
                }

                restaurar_asientos($viajeId, $orden);

                responder_ok([
                    'mapa'  => mapa_asientos($viajeId),
                    'viaje' => detalle_viaje($viajeId),
                ], ['mensaje' => 'Distribución anterior restaurada.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para asientos.');
            break;

        case 'paseos':
            if ($metodo === 'GET') {
                responder_ok(listar_paseos());
            }

            if ($metodo === 'POST' && $accion === '') {
                $nombre   = texto($datos, 'nombre');
                $destino  = texto($datos, 'destino');
                $profesor = profesor_del_paseo($datos);
                $costo    = numero($datos, 'costo_persona');

                if ($nombre === '' || $destino === '' || $profesor['nombre'] === '') {
                    responder_error('datos_incompletos', 'El nombre, el destino y el profesor a cargo son obligatorios.');
                }

                $sentencia = db()->prepare('INSERT INTO paseos (nombre, destino, costo_persona, profesor_encargado, profesor_id, descripcion)
                                            VALUES (:nombre, :destino, :costo, :profesor, :profesor_id, :descripcion)');
                $sentencia->execute([
                    ':nombre'      => $nombre,
                    ':destino'     => $destino,
                    ':costo'       => $costo,
                    ':profesor'    => $profesor['nombre'],
                    ':profesor_id' => $profesor['id'],
                    ':descripcion' => texto($datos, 'descripcion') !== '' ? texto($datos, 'descripcion') : null,
                ]);

                $paseoId = (int) db()->lastInsertId();
                asignar_equipo($paseoId, lista_de_nombres($datos, 'personal'), $datos['personal_ids'] ?? []);

                responder_ok(listar_paseos(), ['mensaje' => 'Paseo creado.', 'paseo_id' => $paseoId]);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $existe = db()->prepare('SELECT id FROM paseos WHERE id = :id');
                $existe->execute([':id' => $id]);

                if ($existe->fetch() === false) {
                    responder_error('no_encontrado', 'El paseo no existe.', 404);
                }

                $profesor = profesor_del_paseo($datos);

                if ($profesor['nombre'] === '') {
                    responder_error('datos_incompletos', 'El nombre, el destino y el profesor a cargo son obligatorios.');
                }

                $sentencia = db()->prepare('UPDATE paseos
                                            SET nombre = :nombre, destino = :destino, costo_persona = :costo,
                                                profesor_encargado = :profesor, profesor_id = :profesor_id,
                                                descripcion = :descripcion
                                            WHERE id = :id');
                $sentencia->execute([
                    ':nombre'      => texto($datos, 'nombre'),
                    ':destino'     => texto($datos, 'destino'),
                    ':costo'       => numero($datos, 'costo_persona'),
                    ':profesor'    => $profesor['nombre'],
                    ':profesor_id' => $profesor['id'],
                    ':descripcion' => texto($datos, 'descripcion') !== '' ? texto($datos, 'descripcion') : null,
                    ':id'          => $id,
                ]);

                asignar_equipo($id, lista_de_nombres($datos, 'personal'), $datos['personal_ids'] ?? []);

                responder_ok(listar_paseos(), ['mensaje' => 'Paseo actualizado.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $enUso = db()->prepare('SELECT COUNT(*) FROM viajes WHERE paseo_id = :paseo');
                $enUso->execute([':paseo' => $id]);
                $cantidad = (int) $enUso->fetchColumn();

                $forzar = filter_var($datos['forzar'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if ($cantidad > 0 && !$forzar) {
                    $detalle = db()->prepare(
                        'SELECT
                            (SELECT COUNT(*) FROM pasajeros ps
                                INNER JOIN viajes v ON v.id = ps.viaje_id
                             WHERE v.paseo_id = :paseo_pasajeros) AS pasajeros,
                            (SELECT COUNT(*) FROM pagos pg
                                INNER JOIN viajes v ON v.id = pg.viaje_id
                             WHERE v.paseo_id = :paseo_pagos) AS pagos'
                    );
                    $detalle->execute([':paseo_pasajeros' => $id, ':paseo_pagos' => $id]);
                    $resumen = $detalle->fetch() ?: ['pasajeros' => 0, 'pagos' => 0];

                    responder_error(
                        'paseo_en_uso',
                        'El paseo tiene ' . $cantidad . ($cantidad === 1 ? ' viaje programado' : ' viajes programados') . '.',
                        409,
                        [
                            'viajes'    => $cantidad,
                            'pasajeros' => (int) $resumen['pasajeros'],
                            'pagos'     => (int) $resumen['pagos'],
                        ]
                    );
                }

                $pdo = db();
                $pdo->beginTransaction();

                try {
                    // Los pasajeros, asientos y pagos se van en cascada con cada viaje.
                    $pdo->prepare('DELETE FROM viajes WHERE paseo_id = :paseo')->execute([':paseo' => $id]);
                    $pdo->prepare('DELETE FROM paseo_personal WHERE paseo_id = :paseo')->execute([':paseo' => $id]);
                    $pdo->prepare('DELETE FROM paseos WHERE id = :id')->execute([':id' => $id]);
                    $pdo->commit();
                } catch (Throwable $excepcion) {
                    $pdo->rollBack();
                    throw $excepcion;
                }

                responder_ok(listar_paseos(), [
                    'mensaje' => $cantidad > 0
                        ? 'Paseo eliminado junto con ' . $cantidad . ($cantidad === 1 ? ' viaje' : ' viajes') . '.'
                        : 'Paseo eliminado.',
                    'viajes_eliminados' => $cantidad,
                ]);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para paseos.');
            break;

        case 'personal':
            if ($metodo === 'GET') {
                responder_ok(listar_personal());
            }

            if ($metodo === 'POST' && $accion === '') {
                $nombre  = texto($datos, 'nombre');
                $puesto  = texto($datos, 'puesto');

                if ($nombre === '') {
                    responder_error('datos_incompletos', 'El nombre del personal es obligatorio.');
                }

                $sentencia = db()->prepare('INSERT INTO personal_asistencia (nombre, puesto) VALUES (:nombre, :puesto)');
                $sentencia->execute([
                    ':nombre' => $nombre,
                    ':puesto' => $puesto !== '' ? $puesto : null,
                ]);

                responder_ok(listar_personal(), ['mensaje' => 'Personal registrado.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                db()->prepare('DELETE FROM paseo_personal WHERE personal_id = :id')->execute([':id' => $id]);
                db()->prepare('DELETE FROM personal_asistencia WHERE id = :id')->execute([':id' => $id]);

                responder_ok(listar_personal(), ['mensaje' => 'Personal eliminado.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para personal.');
            break;

        case 'profesores':
            if ($metodo === 'GET') {
                responder_ok(listar_profesores(texto($_GET, 'q')));
            }

            if ($metodo === 'POST' && $accion === '') {
                $profesor = datos_de_profesor($datos);

                $sentencia = db()->prepare(
                    'INSERT INTO profesores (codigo, nombres, apellidos, sexo, fecha_nacimiento,
                                             especialidad_cargo, permiso, alergias, activo, fecha_registro)
                     VALUES (:codigo, :nombres, :apellidos, :sexo, :fecha_nacimiento,
                             :especialidad_cargo, :permiso, :alergias, :activo,
                             COALESCE(:fecha_registro, CURRENT_TIMESTAMP))'
                );
                $sentencia->execute($profesor);

                responder_ok(listar_profesores(), ['mensaje' => 'Profesor registrado.']);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $existe = db()->prepare('SELECT id, fecha_registro FROM profesores WHERE id = :id');
                $existe->execute([':id' => $id]);
                $registro = $existe->fetch();

                if ($registro === false) {
                    responder_error('no_encontrado', 'El profesor no existe.', 404);
                }

                $profesor = datos_de_profesor($datos, $id);

                if ($profesor['fecha_registro'] === null) {
                    $profesor['fecha_registro'] = $registro['fecha_registro'];
                }

                $sentencia = db()->prepare(
                    'UPDATE profesores
                     SET codigo = :codigo, nombres = :nombres, apellidos = :apellidos, sexo = :sexo,
                         fecha_nacimiento = :fecha_nacimiento, especialidad_cargo = :especialidad_cargo,
                         permiso = :permiso, alergias = :alergias, activo = :activo,
                         fecha_registro = :fecha_registro
                     WHERE id = :id'
                );
                $profesor['id'] = $id;
                $sentencia->execute($profesor);

                responder_ok(listar_profesores(), ['mensaje' => 'Profesor actualizado.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $enUso = db()->prepare('SELECT COUNT(*) FROM paseos WHERE profesor_id = :id');
                $enUso->execute([':id' => $id]);
                $cantidad = (int) $enUso->fetchColumn();

                if ($cantidad > 0) {
                    responder_error(
                        'profesor_en_uso',
                        'El profesor tiene ' . $cantidad . ($cantidad === 1 ? ' paseo asignado' : ' paseos asignados')
                        . '. Márcalo como inactivo en lugar de eliminarlo.',
                        409,
                        ['paseos' => $cantidad]
                    );
                }

                db()->prepare('DELETE FROM profesores WHERE id = :id')->execute([':id' => $id]);

                responder_ok(listar_profesores(), ['mensaje' => 'Profesor eliminado.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para profesores.');
            break;

        case 'secciones':
            // El listado solo, que es barato; las modificaciones devuelven el
            // padrón completo, que es lo que necesita la vista para repintarse.
            if ($metodo === 'GET') {
                responder_ok(listar_secciones());
            }

            if ($metodo === 'POST' && $accion === '') {
                $nombre = texto($datos, 'nombre');

                if ($nombre === '') {
                    responder_error('datos_incompletos', 'El nombre de la sección es obligatorio.');
                }

                if (seccion_por_nombre($nombre) !== null) {
                    responder_error('seccion_repetida', 'Ya existe la sección ' . $nombre . '.', 409, ['nombre' => $nombre]);
                }

                $anio = (int) ($datos['anio'] ?? 0);

                if ($anio < 1 || $anio > 9) {
                    $anio = anio_de_seccion($nombre);
                }

                $sentencia = db()->prepare('INSERT INTO secciones (nombre, anio, especialidad)
                                            VALUES (:nombre, :anio, :especialidad)');
                $sentencia->execute([
                    ':nombre'       => $nombre,
                    ':anio'         => $anio,
                    ':especialidad' => texto($datos, 'especialidad') !== '' ? texto($datos, 'especialidad') : null,
                ]);

                $creada = seccion_por_nombre($nombre);

                responder_ok(datos_padron(), ['mensaje' => 'Sección creada.', 'seccion_id' => $creada['id'] ?? null]);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $existe = db()->prepare('SELECT id, anio FROM secciones WHERE id = :id');
                $existe->execute([':id' => $id]);
                $seccion = $existe->fetch();

                if ($seccion === false) {
                    responder_error('no_encontrado', 'La sección no existe.', 404);
                }

                $nombre = texto($datos, 'nombre');

                if ($nombre === '') {
                    responder_error('datos_incompletos', 'El nombre de la sección es obligatorio.');
                }

                $repetida = seccion_por_nombre($nombre);

                if ($repetida !== null && $repetida['id'] !== $id) {
                    responder_error('seccion_repetida', 'Ya existe la sección ' . $nombre . '.', 409, ['nombre' => $nombre]);
                }

                $anio = (int) ($datos['anio'] ?? 0);

                if ($anio < 1 || $anio > 9) {
                    $anio = anio_de_seccion($nombre);
                }

                db()->prepare('UPDATE secciones
                               SET nombre = :nombre, anio = :anio, especialidad = :especialidad
                               WHERE id = :id')->execute([
                    ':nombre'       => $nombre,
                    ':anio'         => $anio,
                    ':especialidad' => texto($datos, 'especialidad') !== '' ? texto($datos, 'especialidad') : null,
                    ':id'           => $id,
                ]);

                responder_ok(datos_padron(), ['mensaje' => 'Sección actualizada.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $existe = db()->prepare('SELECT id FROM secciones WHERE id = :id');
                $existe->execute([':id' => $id]);

                if ($existe->fetch() === false) {
                    responder_error('no_encontrado', 'La sección no existe.', 404);
                }

                $enUso = db()->prepare('SELECT COUNT(*) FROM alumnos WHERE seccion_id = :id');
                $enUso->execute([':id' => $id]);
                $cantidad = (int) $enUso->fetchColumn();

                if ($cantidad > 0) {
                    responder_error(
                        'seccion_en_uso',
                        'La sección tiene ' . $cantidad . ($cantidad === 1 ? ' alumno inscrito' : ' alumnos inscritos')
                        . '. Mueve a los alumnos antes de eliminarla.',
                        409,
                        ['alumnos' => $cantidad]
                    );
                }

                db()->prepare('DELETE FROM secciones WHERE id = :id')->execute([':id' => $id]);

                responder_ok(datos_padron(), ['mensaje' => 'Sección eliminada.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para secciones.');
            break;

        case 'alumnos':
            if ($metodo === 'GET') {
                responder_ok(datos_padron([
                    'q'          => texto($_GET, 'q'),
                    'seccion_id' => texto($_GET, 'seccion_id'),
                    'anio'       => texto($_GET, 'anio'),
                    'limite'     => texto($_GET, 'limite'),
                ]));
            }

            if ($metodo === 'POST' && $accion === '') {
                $alumno = datos_de_alumno($datos);

                $sentencia = db()->prepare(
                    'INSERT INTO alumnos (codigo, nombre, seccion_id, telefono, encargado_id, activo)
                     VALUES (:codigo, :nombre, :seccion_id, :telefono, :encargado_id, :activo)'
                );
                $sentencia->execute($alumno);

                responder_ok(datos_padron(), [
                    'mensaje'   => 'Alumno registrado en el padrón.',
                    'alumno_id' => (int) db()->lastInsertId(),
                ]);
            }

            if ($metodo === 'POST' && $accion === 'actualizar') {
                $existe = db()->prepare('SELECT id FROM alumnos WHERE id = :id');
                $existe->execute([':id' => $id]);

                if ($existe->fetch() === false) {
                    responder_error('no_encontrado', 'El alumno no existe.', 404);
                }

                $alumno = datos_de_alumno($datos, $id);
                $alumno['id'] = $id;

                db()->prepare(
                    'UPDATE alumnos
                     SET codigo = :codigo, nombre = :nombre, seccion_id = :seccion_id,
                         telefono = :telefono, encargado_id = :encargado_id, activo = :activo
                     WHERE id = :id'
                )->execute($alumno);

                responder_ok(datos_padron(), ['mensaje' => 'Alumno actualizado.']);
            }

            if ($metodo === 'POST' && $accion === 'eliminar') {
                $existe = db()->prepare('SELECT id FROM alumnos WHERE id = :id');
                $existe->execute([':id' => $id]);

                if ($existe->fetch() === false) {
                    responder_error('no_encontrado', 'El alumno no existe.', 404);
                }

                $enViajes = db()->prepare('SELECT COUNT(*) FROM pasajeros WHERE alumno_id = :id');
                $enViajes->execute([':id' => $id]);
                $cantidad = (int) $enViajes->fetchColumn();

                if ($cantidad > 0) {
                    responder_error(
                        'alumno_en_viaje',
                        'El alumno ya participó en ' . $cantidad . ($cantidad === 1 ? ' viaje' : ' viajes')
                        . '. Su historial sigue ligado al padrón: márcalo como inactivo en lugar de eliminarlo.',
                        409,
                        ['viajes' => $cantidad]
                    );
                }

                db()->prepare('DELETE FROM alumnos WHERE id = :id')->execute([':id' => $id]);

                responder_ok(datos_padron(), ['mensaje' => 'Alumno eliminado del padrón.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para alumnos.');
            break;

        case 'parametros':
            if ($metodo === 'GET') {
                responder_ok(parametros());
            }

            if ($metodo === 'POST' && $accion === '') {
                $clave = texto($datos, 'clave');
                $valor = texto($datos, 'valor');
                $permitidos = ['capacidad_bus', 'asientos_personal'];

                if (!in_array($clave, $permitidos, true)) {
                    responder_error('parametro_invalido', 'Ese parámetro no se puede modificar desde aquí.');
                }

                if (!is_numeric($valor) || (int) $valor < 1) {
                    responder_error('valor_invalido', 'El valor debe ser un número entero mayor que cero.');
                }

                $sentencia = db()->prepare('INSERT INTO parametros (clave, valor) VALUES (:clave, :valor)
                                            ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
                $sentencia->execute([':clave' => $clave, ':valor' => (string) (int) $valor]);
                refrescar_parametros();

                responder_ok(parametros(), ['mensaje' => 'Parámetro actualizado.']);
            }

            responder_error('ruta_desconocida', 'Acción no disponible para parámetros.');
            break;

        default:
            responder_error('recurso_desconocido', 'El recurso solicitado no existe.', 404);
    }
} catch (PDOException $excepcion) {
    responder_error('error_base_datos', 'No fue posible completar la operación en la base de datos. Ejecuta "php bin/rideroster migrar" para actualizar el esquema sin perder tus datos.', 500, [
        'detalle' => $excepcion->getMessage(),
    ]);
} catch (Throwable $excepcion) {
    responder_error('error_servidor', $excepcion->getMessage(), 500);
}
