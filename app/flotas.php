<?php

declare(strict_types=1);

/**
 * Gestión de la salida y de los buses que la cubren.
 *
 * Una "salida" agrupa a todos los buses que ejecutan el mismo paseo en la
 * misma fecha y hora de salida. Cada bus es un viaje del sistema, así que un
 * paseo con mucha demanda se resuelve con varios viajes hermanos.
 *
 * Cuando un bus se llena, el sistema puede:
 *   · crear un bus adicional que hereda los parámetros base del bus original,
 *   · mover pasajeros entre los buses de la salida,
 *   · repartir automáticamente a todos los pasajeros de la salida.
 */

/**
 * Identificador de la salida a la que pertenece un viaje.
 */
function clave_salida(int $paseoId, string $fecha, string $horaSalida): string
{
    return $paseoId . '|' . $fecha . '|' . substr($horaSalida, 0, 5);
}

/**
 * Etiqueta cada viaje con su número de bus dentro de la salida.
 *
 * @param array<int, array<string, mixed>> $viajes
 * @return array<int, array<string, mixed>>
 */
function etiquetar_buses(array $viajes): array
{
    $totales = [];

    foreach ($viajes as $viaje) {
        $clave = clave_salida(
            (int) ($viaje['paseo_id'] ?? 0),
            (string) ($viaje['fecha'] ?? ''),
            (string) ($viaje['hora_salida'] ?? '')
        );

        $totales[$clave] = ($totales[$clave] ?? 0) + 1;
    }

    $contadores = [];
    $etiquetas = [];

    foreach ($viajes as $viaje) {
        $clave = clave_salida(
            (int) ($viaje['paseo_id'] ?? 0),
            (string) ($viaje['fecha'] ?? ''),
            (string) ($viaje['hora_salida'] ?? '')
        );

        $contadores[$clave] = ($contadores[$clave] ?? 0) + 1;
        $viaje['bus_numero'] = $contadores[$clave];
        $viaje['bus_total'] = $totales[$clave];
        $etiquetas[] = $viaje;
    }

    return $etiquetas;
}

/**
 * Datos de la salida a la que pertenece un viaje.
 */
function salida_de_viaje(int $viajeId): ?array
{
    $sentencia = db()->prepare('SELECT id, paseo_id, fecha, hora_salida, hora_retorno, capacidad_bus
                                 FROM viajes WHERE id = :id');
    $sentencia->execute([':id' => $viajeId]);
    $fila = $sentencia->fetch();

    if ($fila === false) {
        return null;
    }

    return [
        'viaje_id'       => (int) $fila['id'],
        'paseo_id'       => (int) $fila['paseo_id'],
        'fecha'          => (string) $fila['fecha'],
        'hora_salida'    => substr((string) $fila['hora_salida'], 0, 5),
        'hora_retorno'   => $fila['hora_retorno'] ? substr((string) $fila['hora_retorno'], 0, 5) : null,
        'capacidad_bus'  => (int) $fila['capacidad_bus'],
        'clave'          => clave_salida((int) $fila['paseo_id'], (string) $fila['fecha'], (string) $fila['hora_salida']),
    ];
}

/**
 * Viajes (buses) que pertenecen a una misma salida, ordenados por creación.
 *
 * @return array<int, array<string, mixed>>
 */
function buses_de_salida(array $salida): array
{
    $sql = consulta_viajes() . ' WHERE v.paseo_id = :paseo AND v.fecha = :fecha
             AND TIME_FORMAT(v.hora_salida, "%H:%i") = :salida ORDER BY v.id ASC';

    $sentencia = db()->prepare($sql);
    $sentencia->execute([
        ':paseo' => (int) $salida['paseo_id'],
        ':fecha' => (string) $salida['fecha'],
        ':salida' => substr((string) $salida['hora_salida'], 0, 5),
    ]);

    return array_map('normalizar_viaje', $sentencia->fetchAll());
}

/**
 * Resumen ligero de los buses de una salida, con su número y sus cupos.
 *
 * @return array<int, array<string, mixed>>
 */
function resumen_de_salida(array $salida): array
{
    $buses = buses_de_salida($salida);
    $resumen = [];

    foreach ($buses as $indice => $bus) {
        $resumen[] = [
            'id'                 => $bus['id'],
            'numero'             => $indice + 1,
            'nombre'             => $bus['nombre'],
            'destino'            => $bus['destino'],
            'fecha'              => $bus['fecha'],
            'hora_salida'        => $bus['hora_salida'],
            'hora_retorno'       => $bus['hora_retorno'],
            'estado'             => $bus['estado'],
            'capacidad_bus'      => $bus['capacidad_bus'],
            'asientos_personal'  => $bus['asientos_personal'],
            'ocupados'           => $bus['ocupados'],
            'cupos_disponibles'  => $bus['cupos_disponibles'],
            'pasajeros'          => $bus['pasajeros'],
            'acompanantes'       => $bus['acompanantes'],
            'personas'           => $bus['personas'],
            'ocupacion'          => $bus['ocupacion'],
        ];
    }

    return $resumen;
}

/**
 * Mapa de butaca asignada por estudiante en un bus: pasajero_id => número de asiento.
 *
 * Solo el asiento del estudiante (no el del acompañante).
 *
 * @return array<int, int>
 */
function asientos_de_bus(int $viajeId): array
{
    try {
        $sentencia = db()->prepare(
            'SELECT pasajero_id, numero
             FROM asientos
             WHERE viaje_id = :viaje AND rol = :rol'
        );
        $sentencia->execute([':viaje' => $viajeId, ':rol' => ROL_ESTUDIANTE]);

        $mapa = [];

        foreach ($sentencia->fetchAll() as $fila) {
            $mapa[(int) $fila['pasajero_id']] = (int) $fila['numero'];
        }

        return $mapa;
    } catch (PDOException $excepcion) {
        return [];
    }
}

/**
 * Detalle completo de la salida: buses con su lista de pasajeros.
 *
 * @return array<string, mixed>|null
 */
function detalle_salida(array $salida): ?array
{
    $buses = buses_de_salida($salida);

    if ($buses === []) {
        return null;
    }

    $detalleBuses = [];

    foreach ($buses as $indice => $bus) {
        $lista = [];
        $asientosPorPasajero = asientos_de_bus((int) $bus['id']);

        foreach (pasajeros_ordenados($bus['id'], (float) $bus['costo_persona']) as $pasajero) {
            $lista[] = [
                'id'        => (int) $pasajero['id'],
                'nombre'    => (string) $pasajero['nombre'],
                'codigo'    => (string) $pasajero['codigo'],
                'encargado' => $pasajero['encargado'],
                'amigo_codigo' => $pasajero['amigo_codigo'],
                'personas'  => personas_de_pasajero($pasajero),
                'asiento'   => $asientosPorPasajero[(int) $pasajero['id']] ?? null,
                'costo'     => (float) $pasajero['costo'],
                'pagado'    => (float) $pasajero['pagado'],
                'pendiente' => (float) $pasajero['pendiente'],
            ];
        }

        $detalleBuses[] = [
            'id'                 => $bus['id'],
            'numero'             => $indice + 1,
            'nombre'             => $bus['nombre'],
            'destino'            => $bus['destino'],
            'fecha'              => $bus['fecha'],
            'hora_salida'        => $bus['hora_salida'],
            'hora_retorno'       => $bus['hora_retorno'],
            'estado'             => $bus['estado'],
            'capacidad_bus'      => $bus['capacidad_bus'],
            'asientos_personal'  => $bus['asientos_personal'],
            'ocupados'           => $bus['ocupados'],
            'cupos_disponibles'  => $bus['cupos_disponibles'],
            'pasajeros'          => $bus['pasajeros'],
            'acompanantes'       => $bus['acompanantes'],
            'personas'           => $bus['personas'],
            'ocupacion'          => $bus['ocupacion'],
            'lista'              => $lista,
        ];
    }

    $referencia = $buses[0];

    return [
        'salida' => [
            'clave'             => $salida['clave'],
            'paseo_id'          => (int) $salida['paseo_id'],
            'nombre'            => $referencia['nombre'],
            'destino'           => $referencia['destino'],
            'profesor_encargado' => $referencia['profesor_encargado'],
            'costo_persona'     => (float) $referencia['costo_persona'],
            'fecha'             => $referencia['fecha'],
            'hora_salida'       => $referencia['hora_salida'],
            'hora_retorno'      => $referencia['hora_retorno'],
            'capacidad_bus'     => (int) $referencia['capacidad_bus'],
            'asientos_personal' => asientos_personal(),
        ],
        'buses' => $detalleBuses,
    ];
}

/**
 * Número de personas que ocupa un pasajero (el estudiante y su encargado).
 */
function personas_de_pasajero(array $pasajero): int
{
    return ($pasajero['encargado'] !== null && $pasajero['encargado'] !== '') ? 2 : 1;
}

/**
 * Crea un bus hermano heredando los parámetros base del viaje de origen.
 *
 * @param array<string, mixed> $opciones Overrides: capacidad_bus, fecha,
 *                                 hora_salida, hora_retorno, notas.
 */
function crear_bus_hermano(int $viajeOrigenId, array $opciones = []): int
{
    $origen = detalle_viaje($viajeOrigenId);

    if ($origen === null) {
        throw new RuntimeException('El viaje de origen no existe.');
    }

    $capacidad = (int) ($opciones['capacidad_bus'] ?? 0);

    if ($capacidad <= 0) {
        $capacidad = (int) $origen['capacidad_bus'];
    }

    $minimo = asientos_personal() + 1;

    if ($capacidad < $minimo) {
        $capacidad = $minimo;
    }

    $fecha = texto_salida($opciones['fecha'] ?? null, $origen['fecha']);
    $salida = texto_salida($opciones['hora_salida'] ?? null, $origen['hora_salida']);
    $retorno = array_key_exists('hora_retorno', $opciones)
        ? texto_salida($opciones['hora_retorno'], null)
        : $origen['hora_retorno'];
    $notas = array_key_exists('notas', $opciones) ? (string) $opciones['notas'] : (string) ($origen['notas'] ?? '');

    $sentencia = db()->prepare('INSERT INTO viajes (paseo_id, fecha, hora_salida, hora_retorno, capacidad_bus, estado, notas)
                                VALUES (:paseo, :fecha, :salida, :retorno, :capacidad, :estado, :notas)');
    $sentencia->execute([
        ':paseo'     => (int) $origen['paseo_id'],
        ':fecha'     => $fecha,
        ':salida'    => $salida . ':00',
        ':retorno'   => $retorno !== null && $retorno !== '' ? $retorno . ':00' : null,
        ':capacidad' => $capacidad,
        ':estado'    => 'programado',
        ':notas'     => $notas !== '' ? $notas : null,
    ]);

    return (int) db()->lastInsertId();
}

/**
 * Normaliza un valor de fecha u hora recibido por la API.
 */
function texto_salida(mixed $valor, ?string $alterno): ?string
{
    $texto = trim((string) ($valor ?? ''));

    if ($texto === '') {
        return $alterno;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $texto) === 1) {
        return $texto;
    }

    if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $texto) === 1) {
        return substr($texto, 0, 5);
    }

    return $alterno;
}

/**
 * Traslada a un pasajero (con su encargado) de un bus a otro.
 *
 * Actualiza el viaje del pasajero, sus asientos, sus pagos y recompacta los
 * asientos del bus de origen.
 */
function trasladar_pasajero(int $pasajeroId, int $viajeDestino): bool
{
    $sentencia = db()->prepare('SELECT id, viaje_id FROM pasajeros WHERE id = :id');
    $sentencia->execute([':id' => $pasajeroId]);
    $registro = $sentencia->fetch();

    if ($registro === false) {
        return false;
    }

    $viajeOrigen = (int) $registro['viaje_id'];

    if ($viajeOrigen === $viajeDestino) {
        return false;
    }

    if (detalle_viaje($viajeDestino) === null) {
        return false;
    }

    db()->prepare('DELETE FROM asientos WHERE pasajero_id = :id')->execute([':id' => $pasajeroId]);
    db()->prepare('UPDATE pasajeros SET viaje_id = :viaje WHERE id = :id')->execute([
        ':viaje' => $viajeDestino,
        ':id'    => $pasajeroId,
    ]);
    db()->prepare('UPDATE pagos SET viaje_id = :viaje WHERE pasajero_id = :id')->execute([
        ':viaje' => $viajeDestino,
        ':id'    => $pasajeroId,
    ]);

    incorporar_pasajero($viajeDestino, $pasajeroId);
    compactar_asientos($viajeOrigen);

    return true;
}

/**
 * Mueve un pasajero a otro bus validando que quepan las personas que ocupa.
 *
 * @return string Estado del movimiento: 'movido', 'ya_esta', 'sin_cupo' o 'no_existe'.
 */
function mover_pasajero_a_bus(int $pasajeroId, int $viajeDestino, bool $forzar = false): string
{
    $sentencia = db()->prepare('SELECT id, viaje_id, encargado FROM pasajeros WHERE id = :id');
    $sentencia->execute([':id' => $pasajeroId]);
    $registro = $sentencia->fetch();

    if ($registro === false) {
        return 'no_existe';
    }

    if ((int) $registro['viaje_id'] === $viajeDestino) {
        return 'ya_esta';
    }

    $destino = detalle_viaje($viajeDestino);

    if ($destino === null) {
        return 'no_existe';
    }

    $personas = personas_de_pasajero($registro);

    if (!$forzar && $destino['ocupados'] + $personas > $destino['capacidad_bus']) {
        return 'sin_cupo';
    }

    return trasladar_pasajero($pasajeroId, $viajeDestino) ? 'movido' : 'no_existe';
}

/**
 * Reparte a los pasajeros de la salida entre todos sus buses.
 *
 * Mantiene juntos a los compañeros de viaje, conserva a cada estudiante en su
 * bus original mientras quepan y crea un bus adicional si la salida se queda
 * sin espacio.
 *
 * @return array<string, mixed> Resumen de la redistribución.
 */
function repartir_pasajeros_de_salida(array $salida): array
{
    $buses = buses_de_salida($salida);

    if ($buses === []) {
        return ['movidos' => 0, 'buses' => [], 'creados' => 0];
    }

    $grupos = grupos_de_pasajeros_de_salida($buses);
    $restantes = [];
    $creados = 0;

    foreach ($buses as $bus) {
        $restantes[$bus['id']] = max(0, (int) $bus['capacidad_bus'] - (int) $bus['asientos_personal']);
    }

    $movidos = 0;

    foreach ($grupos as $grupo) {
        $destino = null;
        $origen = (int) $grupo['viaje_origen'];

        if (isset($restantes[$origen]) && $restantes[$origen] >= $grupo['personas']) {
            $destino = $origen;
        } else {
            foreach ($buses as $bus) {
                if ($restantes[$bus['id']] >= $grupo['personas']) {
                    $destino = (int) $bus['id'];
                    break;
                }
            }
        }

        if ($destino === null) {
            $nuevoId = crear_bus_hermano($origen);
            $nuevo = detalle_viaje($nuevoId);

            if ($nuevo === null) {
                continue;
            }

            $buses[] = $nuevo;
            $restantes[$nuevoId] = max(0, (int) $nuevo['capacidad_bus'] - (int) $nuevo['asientos_personal']);
            $destino = $nuevoId;
            $creados++;
        }

        $restantes[$destino] -= $grupo['personas'];

        foreach ($grupo['pasajeros'] as $pasajero) {
            if ((int) $pasajero['viaje_id'] === $destino) {
                continue;
            }

            if (trasladar_pasajero((int) $pasajero['id'], $destino)) {
                $movidos++;
            }
        }
    }

    foreach ($buses as $bus) {
        compactar_asientos((int) $bus['id']);
    }

    return [
        'movidos'  => $movidos,
        'creados'  => $creados,
        'buses'    => resumen_de_salida($salida),
    ];
}

/**
 * Agrupa a los pasajeros de la salida respetando a los compañeros de viaje.
 *
 * @return array<int, array<string, mixed>>
 */
function grupos_de_pasajeros_de_salida(array $buses): array
{
    $pasajeros = [];

    foreach ($buses as $bus) {
        foreach (pasajeros_ordenados((int) $bus['id']) as $pasajero) {
            $pasajero['viaje_id'] = (int) $bus['id'];
            $pasajeros[] = $pasajero;
        }
    }

    $porCodigo = [];

    foreach ($pasajeros as $pasajero) {
        $porCodigo[normalizar_codigo((string) $pasajero['codigo'])] = $pasajero;
    }

    $usados = [];
    $grupos = [];

    foreach ($pasajeros as $pasajero) {
        if (isset($usados[(int) $pasajero['id']])) {
            continue;
        }

        $usados[(int) $pasajero['id']] = true;
        $miembros = [$pasajero];
        $personas = personas_de_pasajero($pasajero);

        $codigoAmigo = $pasajero['amigo_codigo'] !== null
            ? normalizar_codigo((string) $pasajero['amigo_codigo'])
            : '';

        if ($codigoAmigo !== '' && isset($porCodigo[$codigoAmigo])) {
            $companero = $porCodigo[$codigoAmigo];

            if ((int) $companero['viaje_id'] === (int) $pasajero['viaje_id']
                && !isset($usados[(int) $companero['id']])) {
                $usados[(int) $companero['id']] = true;
                $miembros[] = $companero;
                $personas += personas_de_pasajero($companero);
            }
        }

        $grupos[] = [
            'personas'     => $personas,
            'pasajeros'    => $miembros,
            'viaje_origen' => (int) $pasajero['viaje_id'],
        ];
    }

    return $grupos;
}
