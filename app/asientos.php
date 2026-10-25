<?php

declare(strict_types=1);

const ROL_ESTUDIANTE = 'estudiante';
const ROL_TUTOR = 'tutor';
const NUMEROS_SALTADOS_PDF = [13, 18];

function formato_codigo_valido(string $codigo): bool
{
    return (bool) preg_match('/^\d{1,2}[A-Za-z]\d{2}$/', trim($codigo));
}

function normalizar_codigo(string $codigo): string
{
    return strtoupper(trim($codigo));
}

function filas_de_asientos(int $viajeId): array
{
    try {
        $sql = 'SELECT a.id, a.numero, a.rol, a.pasajero_id, p.nombre, p.codigo, p.encargado, p.amigo_codigo
                FROM asientos a
                INNER JOIN pasajeros p ON p.id = a.pasajero_id
                WHERE a.viaje_id = :viaje
                ORDER BY a.numero ASC';

        $sentencia = db()->prepare($sql);
        $sentencia->execute([':viaje' => $viajeId]);

        return $sentencia->fetchAll();
    } catch (PDOException $excepcion) {
        return [];
    }
}

function mapa_asientos(int $viajeId): ?array
{
    $detalle = detalle_viaje($viajeId);

    if ($detalle === null) {
        return null;
    }

    $lugares = max(0, $detalle['capacidad_bus'] - $detalle['asientos_personal']);
    $ocupantes = array_map('construir_ocupante', filas_de_asientos($viajeId));

    return [
        'viaje_id'          => $viajeId,
        'lugares'           => $lugares,
        'capacidad_bus'     => $detalle['capacidad_bus'],
        'asientos_personal' => $detalle['asientos_personal'],
        'ocupantes'         => $ocupantes,
    ];
}

function construir_ocupante(array $fila): array
{
    $esTutor = $fila['rol'] === ROL_TUTOR;

    return [
        'asiento_id'   => (int) $fila['id'],
        'numero'       => (int) $fila['numero'],
        'tipo'         => $esTutor ? ROL_TUTOR : ROL_ESTUDIANTE,
        'pasajero_id'  => (int) $fila['pasajero_id'],
        'nombre'       => $esTutor ? (string) $fila['encargado'] : (string) $fila['nombre'],
        'codigo'       => $esTutor ? null : normalizar_codigo((string) $fila['codigo']),
        'encargado'    => $esTutor ? null : ($fila['encargado'] ?: null),
        'amigo_codigo' => $fila['amigo_codigo'] ? normalizar_codigo((string) $fila['amigo_codigo']) : null,
        'acompanado_de' => $esTutor ? (string) $fila['nombre'] : null,
    ];
}

function guardar_asientos(int $viajeId, array $orden): void
{
    db()->prepare('DELETE FROM asientos WHERE viaje_id = :viaje')->execute([':viaje' => $viajeId]);

    if ($orden === []) {
        return;
    }

    $sentencia = db()->prepare('INSERT INTO asientos (viaje_id, pasajero_id, rol, numero)
                                 VALUES (:viaje, :pasajero, :rol, :numero)');

    foreach ($orden as $posicion => $ocupante) {
        $sentencia->execute([
            ':viaje'    => $viajeId,
            ':pasajero' => $ocupante['pasajero_id'],
            ':rol'      => $ocupante['rol'] ?? $ocupante['tipo'],
            ':numero'   => $ocupante['numero'] ?? ($posicion + 1),
        ]);
    }
}

function lugares_del_viaje(int $viajeId): int
{
    $detalle = detalle_viaje($viajeId);

    if ($detalle === null) {
        return 0;
    }

    return max(0, $detalle['capacidad_bus'] - $detalle['asientos_personal']);
}

function construir_slots(int $viajeId, int $lugares, int $pasajeroId, string $rol): array
{
    $slots = array_fill(1, $lugares, null);
    $mover = null;
    $tutor = null;

    foreach (filas_de_asientos($viajeId) as $fila) {
        $esMovido = (int) $fila['pasajero_id'] === $pasajeroId && $fila['rol'] === $rol;
        $esTutor = $rol === ROL_ESTUDIANTE
            && $fila['rol'] === ROL_TUTOR
            && (int) $fila['pasajero_id'] === $pasajeroId;

        if ($esMovido) {
            $mover = $fila;
            continue;
        }

        if ($esTutor) {
            $tutor = $fila;
            continue;
        }

        $numero = (int) $fila['numero'];

        if ($numero >= 1 && $numero <= $lugares) {
            $slots[$numero] = $fila;
        }
    }

    return [$slots, $mover, $tutor];
}

function grupos_de_aboarding(array $pasajeros): array
{
    $porCodigo = [];

    foreach ($pasajeros as $pasajero) {
        $porCodigo[normalizar_codigo($pasajero['codigo'])] = $pasajero;
    }

    $grupos = [];
    $usados = [];

    foreach ($pasajeros as $indice => $pasajero) {
        if (isset($usados[$pasajero['id']])) {
            continue;
        }

        $usados[$pasajero['id']] = true;
        $miembros = [$pasajero['id']];
        $prioritario = false;
        $amigo = null;

        $codigoAmigo = $pasajero['amigo_codigo'] ? normalizar_codigo((string) $pasajero['amigo_codigo']) : '';

        if ($codigoAmigo !== '' && isset($porCodigo[$codigoAmigo])) {
            $candidato = $porCodigo[$codigoAmigo];

            if (!isset($usados[$candidato['id']])) {
                $usados[$candidato['id']] = true;
                $miembros[] = $candidato['id'];
                $prioritario = true;
                $amigo = $candidato;
            }
        }

        $grupos[] = [
            'miembros'     => $miembros,
            'prioritario'  => $prioritario,
            'indice'       => $indice,
            'amigo'        => $amigo,
            'pasajeros'    => $pasajeros,
        ];
    }

    usort($grupos, static function (array $a, array $b): int {
        if ($a['prioritario'] !== $b['prioritario']) {
            return $a['prioritario'] ? -1 : 1;
        }

        return $a['indice'] <=> $b['indice'];
    });

    return $grupos;
}

function ordenar_por_prioridad(int $viajeId): array
{
    $detalle = detalle_viaje($viajeId);

    if ($detalle === null) {
        return [];
    }

    $pasajeros = $detalle['pasajeros_lista'];
    $porId = [];

    foreach ($pasajeros as $pasajero) {
        $porId[$pasajero['id']] = $pasajero;
    }

    $orden = [];

    foreach (grupos_de_aboarding($pasajeros) as $grupo) {
        foreach ($grupo['miembros'] as $id) {
            $orden[] = ['tipo' => ROL_ESTUDIANTE, 'pasajero_id' => $id];
        }

        foreach ($grupo['miembros'] as $id) {
            $pasajero = $porId[$id] ?? null;

            if ($pasajero !== null && !empty($pasajero['encargado'])) {
                $orden[] = ['tipo' => ROL_TUTOR, 'pasajero_id' => $id];
            }
        }
    }

    return $orden;
}

function generar_asientos(int $viajeId): void
{
    guardar_asientos($viajeId, ordenar_por_prioridad($viajeId));
}

function compactar_asientos(int $viajeId): void
{
    $filas = filas_de_asientos($viajeId);
    $orden = [];

    foreach ($filas as $fila) {
        $orden[] = [
            'tipo'       => $fila['rol'],
            'pasajero_id' => (int) $fila['pasajero_id'],
            'numero'     => count($orden) + 1,
        ];
    }

    guardar_asientos($viajeId, $orden);
}

function mover_ocupante(int $viajeId, int $pasajeroId, string $rol, int $destino): bool
{
    $lugares = lugares_del_viaje($viajeId);

    if ($lugares <= 0) {
        return false;
    }

    $destino = max(1, min($destino, $lugares));
    [$slots, $movido, $acompanante] = construir_slots($viajeId, $lugares, $pasajeroId, $rol);

    if ($movido === null) {
        return false;
    }

    if ($acompanante !== null) {
        $numeroTutor = (int) $acompanante['numero'];

        if ($numeroTutor >= 1 && $numeroTutor <= $lugares) {
            $slots[$numeroTutor] = null;
        }
    }

    if ($slots[$destino] !== null) {
        $hueco = null;

        for ($i = $destino; $i <= $lugares; $i++) {
            if ($slots[$i] === null) {
                $hueco = $i;
                break;
            }
        }

        if ($hueco === null) {
            return false;
        }

        for ($i = $hueco; $i > $destino; $i--) {
            $slots[$i] = $slots[$i - 1];
            $slots[$i - 1] = null;
        }
    }

    $slots[$destino] = $movido;

    if ($acompanante !== null) {
        $colocado = false;

        for ($i = $destino + 1; $i <= $lugares; $i++) {
            if ($slots[$i] === null) {
                $slots[$i] = $acompanante;
                $colocado = true;
                break;
            }
        }

        if (!$colocado) {
            for ($i = $destino - 1; $i >= 1; $i--) {
                if ($slots[$i] === null) {
                    $slots[$i] = $acompanante;
                    $colocado = true;
                    break;
                }
            }
        }
    }

    $orden = [];

    for ($i = 1; $i <= $lugares; $i++) {
        if ($slots[$i] !== null) {
            $orden[] = [
                'tipo'       => $slots[$i]['rol'],
                'pasajero_id' => (int) $slots[$i]['pasajero_id'],
                'numero'     => $i,
            ];
        }
    }

    guardar_asientos($viajeId, $orden);

    return true;
}

function incorporar_pasajero(int $viajeId, int $pasajeroId): void
{
    $lugares = lugares_del_viaje($viajeId);

    if ($lugares <= 0) {
        return;
    }

    $pasajero = db()->prepare('SELECT id, nombre, codigo, encargado, amigo_codigo FROM pasajeros WHERE id = :id');
    $pasajero->execute([':id' => $pasajeroId]);
    $datos = $pasajero->fetch();

    if ($datos === false) {
        return;
    }

    [$slots] = construir_slots($viajeId, $lugares, -1, ROL_ESTUDIANTE);

    $nuevo = ['tipo' => ROL_ESTUDIANTE, 'pasajero_id' => $pasajeroId];
    $tutor = !empty($datos['encargado'])
        ? ['tipo' => ROL_TUTOR, 'pasajero_id' => $pasajeroId]
        : null;

    $posicion = null;
    $codigoAmigo = !empty($datos['amigo_codigo']) ? normalizar_codigo((string) $datos['amigo_codigo']) : '';

    if ($codigoAmigo !== '') {
        foreach ($slots as $numero => $ocupante) {
            if ($ocupante !== null && $ocupante['rol'] === ROL_ESTUDIANTE
                && normalizar_codigo((string) $ocupante['codigo']) === $codigoAmigo) {
                $posicion = max(1, $numero);
                break;
            }
        }
    }

    if ($posicion === null) {
        for ($i = 1; $i <= $lugares; $i++) {
            if ($slots[$i] === null) {
                $posicion = $i;
                break;
            }
        }
    }

    if ($posicion === null) {
        $posicion = $lugares;
    }

    if ($slots[$posicion] !== null) {
        $hueco = null;

        for ($i = $posicion; $i <= $lugares; $i++) {
            if ($slots[$i] === null) {
                $hueco = $i;
                break;
            }
        }

        if ($hueco === null) {
            return;
        }

        for ($i = $hueco; $i > $posicion; $i--) {
            $slots[$i] = $slots[$i - 1];
            $slots[$i - 1] = null;
        }
    }

    $slots[$posicion] = $nuevo + ['numero' => $posicion, 'codigo' => $datos['codigo'], 'encargado' => $datos['encargado'], 'amigo_codigo' => null];

    if ($tutor !== null) {
        for ($i = $posicion + 1; $i <= $lugares; $i++) {
            if ($slots[$i] === null) {
                $slots[$i] = $tutor + ['numero' => $i, 'codigo' => $datos['codigo'], 'encargado' => $datos['encargado'], 'amigo_codigo' => null];
                break;
            }
        }
    }

    $orden = [];

    for ($i = 1; $i <= $lugares; $i++) {
        if ($slots[$i] !== null) {
            $orden[] = [
                'tipo'       => $slots[$i]['rol'] ?? $slots[$i]['tipo'],
                'pasajero_id' => (int) $slots[$i]['pasajero_id'],
                'numero'     => $i,
            ];
        }
    }

    guardar_asientos($viajeId, $orden);
}

function restaurar_asientos(int $viajeId, array $orden): void
{
    $lugares = lugares_del_viaje($viajeId);
    $validos = [];

    foreach ($orden as $ocupante) {
        $numero = (int) ($ocupante['numero'] ?? 0);

        if ($numero < 1 || $numero > $lugares) {
            continue;
        }

        $validos[$numero] = [
            'tipo'       => $ocupante['rol'] ?? $ocupante['tipo'],
            'pasajero_id' => (int) $ocupante['pasajero_id'],
            'numero'     => $numero,
        ];
    }

    ksort($validos);

    guardar_asientos($viajeId, array_values($validos));
}

function listado_aboarding(int $viajeId, bool $formatoPdf = false): array
{
    $ocupantes = array_map('construir_ocupante', filas_de_asientos($viajeId));
    $listado = [];
    $numeroImpreso = 0;

    foreach ($ocupantes as $indice => $ocupante) {
        $orden = $indice + 1;
        $impreso = $orden;

        if ($formatoPdf) {
            do {
                $numeroImpreso++;
            } while (in_array($numeroImpreso, NUMEROS_SALTADOS_PDF, true));

            $impreso = $numeroImpreso;
        }

        $listado[] = [
            'orden'         => $orden,
            'asiento'       => $ocupante['numero'],
            'numero_impreso' => $impreso,
            'tipo'          => $ocupante['tipo'],
            'nombre'        => $ocupante['nombre'],
            'codigo'        => $ocupante['codigo'],
            'encargado'     => $ocupante['encargado'],
            'acompanado_de' => $ocupante['acompanado_de'],
        ];
    }

    return $listado;
}
