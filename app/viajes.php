<?php

declare(strict_types=1);

const CAPACIDAD_BUS_PREDETERMINADA = 55;
const ASIENTOS_PERSONAL_PREDETERMINADOS = 2;

function asientos_personal(): int
{
    return parametro_int('asientos_personal', ASIENTOS_PERSONAL_PREDETERMINADOS);
}

function capacidad_predeterminada(): int
{
    return parametro_int('capacidad_bus', CAPACIDAD_BUS_PREDETERMINADA);
}

function formato_dinero(float $valor): string
{
    return '$' . number_format($valor, 2, '.', ',');
}

/**
 * Consulta base de los viajes con sus métricas de ocupación.
 */
function consulta_viajes(): string
{
    return 'SELECT v.id, v.paseo_id, v.fecha, v.hora_salida, v.hora_retorno, v.capacidad_bus, v.estado, v.notas,
                   p.nombre AS paseo_nombre, p.destino, p.costo_persona, p.profesor_encargado,
                   (SELECT COUNT(*) FROM pasajeros ps WHERE ps.viaje_id = v.id) AS pasajeros,
                   (SELECT COUNT(*) FROM pasajeros ps WHERE ps.viaje_id = v.id AND ps.encargado IS NOT NULL AND CHAR_LENGTH(ps.encargado) > 0) AS acompanantes,
                   (SELECT COUNT(*) FROM pagos pg WHERE pg.viaje_id = v.id) AS movimientos,
                   (SELECT COALESCE(SUM(monto), 0) FROM pagos pg WHERE pg.viaje_id = v.id) AS recaudado,
                   (SELECT COUNT(*) FROM paseo_personal pp WHERE pp.paseo_id = v.paseo_id) AS equipo_salvamento
            FROM viajes v
            INNER JOIN paseos p ON p.id = v.paseo_id';
}

function viajes_con_metricas(): array
{
    $sql = consulta_viajes() . ' ORDER BY v.fecha DESC, v.hora_salida DESC, v.id DESC';

    $viajes = db()->query($sql)->fetchAll();

    return array_map('normalizar_viaje', $viajes);
}

function normalizar_viaje(array $fila): array
{
    $reservado = asientos_personal();
    $capacidad = (int) $fila['capacidad_bus'];
    $pasajeros = (int) $fila['pasajeros'];
    $acompanantes = (int) ($fila['acompanantes'] ?? 0);
    $personas = $pasajeros + $acompanantes;
    $ocupados = $personas + $reservado;
    $cupos = max(0, $capacidad - $ocupados);
    $costo = (float) $fila['costo_persona'];
    $recaudado = (float) $fila['recaudado'];
    $esperado = $personas * $costo;

    return [
        'id'                => (int) $fila['id'],
        'paseo_id'          => (int) $fila['paseo_id'],
        'nombre'            => $fila['paseo_nombre'],
        'destino'           => $fila['destino'],
        'costo_persona'     => $costo,
        'profesor_encargado' => $fila['profesor_encargado'],
        'fecha'             => $fila['fecha'],
        'hora_salida'       => substr((string) $fila['hora_salida'], 0, 5),
        'hora_retorno'      => $fila['hora_retorno'] ? substr((string) $fila['hora_retorno'], 0, 5) : null,
        'capacidad_bus'     => $capacidad,
        'asientos_personal' => $reservado,
        'cupos_disponibles' => $cupos,
        'pasajeros'         => $pasajeros,
        'acompanantes'      => $acompanantes,
        'personas'          => $personas,
        'ocupados'          => $ocupados,
        'recaudado'         => $recaudado,
        'esperado'          => $esperado,
        'pendiente'         => max(0.0, round($esperado - $recaudado, 2)),
        'movimientos'       => (int) $fila['movimientos'],
        'personal'          => 1 + (int) $fila['equipo_salvamento'],
        'estado'            => $fila['estado'],
        'notas'             => $fila['notas'],
        'ocupacion'         => $capacidad > 0 ? min(100, (int) round(($ocupados / $capacidad) * 100)) : 0,
    ];
}

function pasajeros_ordenados(int $viajeId, float $costoPersona = 0.0): array
{
    $columnaAmigo = columna_existe('pasajeros', 'amigo_codigo') ? 'ps.amigo_codigo' : 'NULL AS amigo_codigo';

    $sql = 'SELECT ps.id, ps.nombre, ps.codigo, ps.encargado, ' . $columnaAmigo . ', ps.creado_en,
                   (SELECT COALESCE(SUM(monto), 0) FROM pagos pg WHERE pg.pasajero_id = ps.id) AS pagado,
                   (SELECT COUNT(*) FROM pasajeros o WHERE o.viaje_id = ps.viaje_id AND o.codigo = ps.codigo) AS repeticiones
            FROM pasajeros ps
            WHERE ps.viaje_id = :viaje
            ORDER BY ps.id ASC';

    $sentencia = db()->prepare($sql);
    $sentencia->execute([':viaje' => $viajeId]);

    $lista = $sentencia->fetchAll();

    foreach ($lista as $indice => &$pasajero) {
        $pasajero['id'] = (int) $pasajero['id'];
        $pasajero['orden'] = $indice + 1;
        $pasajero['pagado'] = (float) $pasajero['pagado'];
        $pasajero['duplicado'] = (int) $pasajero['repeticiones'] > 1;
        $pasajero['costo'] = round($costoPersona * ($pasajero['encargado'] !== null && $pasajero['encargado'] !== '' ? 2 : 1), 2);
        $pasajero['pendiente'] = max(0.0, round($pasajero['costo'] - $pasajero['pagado'], 2));
        $pasajero['amigo_codigo'] = $pasajero['amigo_codigo'] ? normalizar_codigo((string) $pasajero['amigo_codigo']) : null;
    }

    return $lista;
}

function pagos_de_viaje(int $viajeId): array
{
    $sql = 'SELECT pg.id, pg.pasajero_id, pg.monto, pg.metodo, pg.fecha, pg.nota, ps.nombre AS pasajero_nombre
            FROM pagos pg
            LEFT JOIN pasajeros ps ON ps.id = pg.pasajero_id
            WHERE pg.viaje_id = :viaje
            ORDER BY pg.id DESC';

    $sentencia = db()->prepare($sql);
    $sentencia->execute([':viaje' => $viajeId]);

    $pagos = $sentencia->fetchAll();

    foreach ($pagos as &$pago) {
        $pago['id'] = (int) $pago['id'];
        $pago['monto'] = (float) $pago['monto'];
    }

    return $pagos;
}

function equipo_salvamento_de_paseo(int $paseoId): array
{
    $sql = 'SELECT ps.id, ps.nombre, ps.puesto
            FROM personal_salvamento ps
            INNER JOIN paseo_personal pp ON pp.personal_id = ps.id
            WHERE pp.paseo_id = :paseo
            ORDER BY ps.nombre ASC';

    $sentencia = db()->prepare($sql);
    $sentencia->execute([':paseo' => $paseoId]);

    return $sentencia->fetchAll();
}

function detalle_viaje(int $viajeId): ?array
{
    $sql = consulta_viajes() . ' WHERE v.id = :id';

    $sentencia = db()->prepare($sql);
    $sentencia->execute([':id' => $viajeId]);
    $fila = $sentencia->fetch();

    if ($fila === false) {
        return null;
    }

    $viaje = normalizar_viaje($fila);
    $viaje['pasajeros_lista'] = pasajeros_ordenados($viajeId, (float) $fila['costo_persona']);
    $viaje['pagos'] = pagos_de_viaje($viajeId);
    $viaje['equipo_salvamento'] = equipo_salvamento_de_paseo((int) $fila['paseo_id']);

    $salida = salida_de_viaje($viajeId);
    $viaje['salida'] = $salida;
    $viaje['buses'] = $salida !== null ? resumen_de_salida($salida) : [];
    $viaje['bus_numero'] = 0;

    foreach ($viaje['buses'] as $bus) {
        if ((int) $bus['id'] === $viajeId) {
            $viaje['bus_numero'] = (int) $bus['numero'];
            break;
        }
    }

    return $viaje;
}

function viajes_ordenados_por_fecha(): array
{
    $viajes = viajes_con_metricas();

    usort($viajes, static function (array $a, array $b): int {
        $clave = static fn (array $v): string => $v['fecha'] . ' ' . $v['hora_salida'];
        $comparacion = $clave($a) <=> $clave($b);

        if ($comparacion !== 0) {
            return $comparacion;
        }

        // En una misma salida el bus más antiguo es el que encabeza la lista.
        return $a['id'] <=> $b['id'];
    });

    return $viajes;
}

function viaje_actual(array $viajes): ?array
{
    $hoy = date('Y-m-d');

    // Prioridad: primero lo de hoy y después lo más próximo. En cada tramo manda
    // el que sigue vivo y, si todos están finalizados, se conserva el primero
    // para poder generar el listado de esa salida.
    $tramos = [
        static fn (array $v): bool => $v['fecha'] === $hoy,
        static fn (array $v): bool => $v['fecha'] > $hoy,
    ];

    foreach ($tramos as $criterio) {
        $candidatos = array_values(array_filter($viajes, $criterio));

        if ($candidatos === []) {
            continue;
        }

        $vivos = array_values(array_filter(
            $candidatos,
            static fn (array $v): bool => $v['estado'] !== 'finalizado'
        ));

        return $vivos !== [] ? $vivos[0] : $candidatos[0];
    }

    $en_curso = array_values(array_filter(
        $viajes,
        static fn (array $v): bool => $v['estado'] === 'en_curso'
    ));

    if ($en_curso !== []) {
        return $en_curso[0];
    }

    return $viajes === [] ? null : $viajes[0];
}

function historial_de_viajes(array $viajes): array
{
    $hoy = date('Y-m-d');

    return array_values(array_filter(
        $viajes,
        static fn (array $v): bool => $v['estado'] === 'finalizado' || $v['fecha'] < $hoy
    ));
}
