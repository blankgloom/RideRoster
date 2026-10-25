<?php

declare(strict_types=1);

/**
 * Estadísticas de la colecturía.
 *
 * Todos los números se calculan sobre salidas ya realizadas: las que están
 * finalizadas o cuya fecha ya pasó. Una salida agrupa a todos los buses
 * (viajes) que ejecutan el mismo paseo en la misma fecha y hora.
 *
 * Los estudiantes se identifican por su código: un alumno que viaja en tres
 * salidas cuenta como una sola persona beneficiada, pero como tres
 * participaciones.
 */

const PERIODOS_ESTADISTICA = [
    'mensual'    => 'Mensual',
    'trimestral' => 'Trimestral',
    'anual'      => 'Anual',
];

/**
 * Rango de fechas del período elegido, cerrado a hoy.
 *
 * @return array{periodo: string, nombre: string, desde: string, hasta: string}
 */
function rango_estadistico(string $periodo): array
{
    if (!isset(PERIODOS_ESTADISTICA[$periodo])) {
        $periodo = 'anual';
    }

    $hoy = date('Y-m-d');
    $anio = (int) date('Y');
    $mes = (int) date('n');

    switch ($periodo) {
        case 'mensual':
            $desde = sprintf('%04d-%02d-01', $anio, $mes);
            break;

        case 'trimestral':
            $inicioTrimestre = intdiv($mes - 1, 3) * 3 + 1;
            $desde = sprintf('%04d-%02d-01', $anio, $inicioTrimestre);
            break;

        default:
            $desde = sprintf('%04d-01-01', $anio);
            break;
    }

    return [
        'periodo' => $periodo,
        'nombre'  => PERIODOS_ESTADISTICA[$periodo],
        'desde'   => $desde,
        'hasta'   => $hoy,
    ];
}

/**
 * Una salida cuenta como realizada cuando se cerró o su fecha ya pasó.
 */
function salida_realizada(array $viaje, string $hoy): bool
{
    return $viaje['estado'] === 'finalizado' || $viaje['fecha'] < $hoy;
}

/**
 * Códigos de estudiante distintos que viajaron en un conjunto de buses.
 *
 * @param array<int, int|string> $ids
 */
function codigos_de_viajes(array $ids): int
{
    $ids = array_values(array_unique(array_map('intval', $ids)));

    if ($ids === []) {
        return 0;
    }

    $marcas = implode(', ', array_fill(0, count($ids), '?'));
    $sentencia = db()->prepare(
        'SELECT COUNT(DISTINCT UPPER(TRIM(codigo))) FROM pasajeros WHERE viaje_id IN (' . $marcas . ')'
    );
    $sentencia->execute($ids);

    return (int) $sentencia->fetchColumn();
}

/**
 * Población estudiantil registrada: todos los códigos que alguna vez se
 * inscribieron, hayan viajado o no.
 */
function poblacion_estudiantil(): int
{
    return (int) db()->query('SELECT COUNT(DISTINCT UPPER(TRIM(codigo))) FROM pasajeros')->fetchColumn();
}

/**
 * Estadísticas completas del período.
 *
 * @return array<string, mixed>
 */
function estadisticas_de_periodo(string $periodo): array
{
    $rango = rango_estadistico($periodo);
    $hoy = date('Y-m-d');
    $viajes = etiquetar_buses(viajes_ordenados_por_fecha());
    $salidas = [];

    foreach ($viajes as $viaje) {
        if ($viaje['fecha'] < $rango['desde'] || $viaje['fecha'] > $rango['hasta']) {
            continue;
        }

        if (!salida_realizada($viaje, $hoy)) {
            continue;
        }

        $clave = clave_salida((int) $viaje['paseo_id'], (string) $viaje['fecha'], (string) $viaje['hora_salida']);

        if (!isset($salidas[$clave])) {
            $salidas[$clave] = [
                'clave'            => $clave,
                'nombre'           => $viaje['nombre'],
                'destino'          => $viaje['destino'],
                'fecha'            => $viaje['fecha'],
                'hora_salida'      => $viaje['hora_salida'],
                'hora_retorno'     => $viaje['hora_retorno'],
                'buses'            => [],
                'estudiantes'      => 0,
                'ocupados'         => 0,
                'capacidad'        => 0,
                'personas'         => 0,
                'estado'           => 'finalizado',
                'cierre_pendiente' => false,
            ];
        }

        $salidas[$clave]['buses'][] = [
            'id'           => (int) $viaje['id'],
            'numero'       => (int) $viaje['bus_numero'],
            'estado'       => $viaje['estado'],
            'ocupados'     => (int) $viaje['ocupados'],
            'capacidad'    => (int) $viaje['capacidad_bus'],
            'pasajeros'    => (int) $viaje['pasajeros'],
            'acompanantes' => (int) $viaje['acompanantes'],
            'personas'     => (int) $viaje['personas'],
            'ocupacion'    => (int) $viaje['ocupacion'],
        ];

        $salidas[$clave]['ocupados']  += (int) $viaje['ocupados'];
        $salidas[$clave]['capacidad'] += (int) $viaje['capacidad_bus'];
        $salidas[$clave]['personas']  += (int) $viaje['personas'];

        if ($viaje['estado'] === 'en_curso') {
            $salidas[$clave]['estado'] = 'en_curso';
        } elseif ($viaje['estado'] !== 'finalizado') {
            $salidas[$clave]['cierre_pendiente'] = true;
        }
    }

    $poblacion = poblacion_estudiantil();
    $idsRealizados = [];

    $totales = [
        'salidas'         => 0,
        'buses'           => 0,
        'beneficiados'    => 0,
        'participaciones' => 0,
        'poblacion'       => $poblacion,
        'capacidad'       => 0,
        'ocupados'        => 0,
    ];

    foreach ($salidas as &$salida) {
        $ids = array_map(static fn (array $bus): int => (int) $bus['id'], $salida['buses']);

        $salida['estudiantes'] = codigos_de_viajes($ids);
        $salida['ocupacion'] = $salida['capacidad'] > 0
            ? (int) round(($salida['ocupados'] / $salida['capacidad']) * 100)
            : 0;
        $salida['asistencia'] = $poblacion > 0
            ? round(($salida['estudiantes'] / $poblacion) * 100, 1)
            : 0.0;

        if ($salida['cierre_pendiente'] && $salida['estado'] !== 'en_curso') {
            $salida['estado'] = 'sin_cerrar';
        }

        $totales['salidas']++;
        $totales['buses'] += count($salida['buses']);
        $totales['participaciones'] += $salida['estudiantes'];
        $totales['capacidad'] += $salida['capacidad'];
        $totales['ocupados'] += $salida['ocupados'];
        $idsRealizados = array_merge($idsRealizados, $ids);
    }
    unset($salida);

    $totales['beneficiados'] = codigos_de_viajes($idsRealizados);
    $totales['promedio_estudiantes'] = $totales['salidas'] > 0
        ? round($totales['participaciones'] / $totales['salidas'], 1)
        : 0.0;
    $totales['asistencia'] = $poblacion > 0
        ? round(($totales['promedio_estudiantes'] / $poblacion) * 100, 1)
        : 0.0;
    $totales['ocupacion'] = $totales['capacidad'] > 0
        ? round(($totales['ocupados'] / $totales['capacidad']) * 100, 1)
        : 0.0;

    return [
        'rango'   => $rango,
        'resumen' => $totales,
        'salidas' => array_values(array_reverse($salidas)),
    ];
}
