<?php

declare(strict_types=1);

function sembrar_datos(PDO $pdo): void
{
    $parametros = [
        ['capacidad_bus', '55', 'Asientos totales del autobús'],
        ['asientos_personal', '2', 'Asientos reservados al profesor y al personal de asistencia'],
        ['orden_pasajeros', 'inscripcion', 'Los pasajeros se listan en el orden en que se registran'],
    ];

    $sentencia = $pdo->prepare('INSERT INTO parametros (clave, valor, descripcion) VALUES (:clave, :valor, :descripcion)
                                ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)');

    foreach ($parametros as $parametro) {
        $sentencia->execute([
            ':clave'       => $parametro[0],
            ':valor'       => $parametro[1],
            ':descripcion' => $parametro[2],
        ]);
    }

    $personal = [
        ['Br. Roberto Renderos', 'Asistencia'],
        ['Br. Milton Majada', 'Asistencia'],
        ['Lic. Milagros Zelaya', 'Enfermería'],
        ['Sr. Elías Coreas', 'Asistencia'],
    ];

    $sentencia = $pdo->prepare('INSERT INTO personal_asistencia (nombre, puesto) VALUES (:nombre, :puesto)');
    $ids = [];

    foreach ($personal as $persona) {
        $sentencia->execute([':nombre' => $persona[0], ':puesto' => $persona[1]]);
        $ids[$persona[0]] = (int) $pdo->lastInsertId();
    }

    $paseos = [
        ['Paseo a Antiguo Cuscatlán', 'Antiguo Cuscatlán, Zona Rosa', '6.00', 'Lic. Elmer Villagrán', 'Recorrido de compras y visita al mercado artesanal.', ['Br. Roberto Renderos']],
        ['Excursión al Lago de Coatepeque', 'Lago de Coatepeque, Metapán', '15.00', 'Lic. Sandra Recinos', 'Visita al mirador y tiempo libre en la ribera.', ['Br. Roberto Renderos', 'Br. Milton Majada']],
        ['Visita a la Universidad Centroamericana', 'UCA, Boulevard Los Próceres', '8.50', 'Lic. Julio César Henríquez', 'Charla de orientación vocacional con estudiantes de bachillerato.', ['Sr. Elías Coreas']],
        ['Excursión a El Imposible', 'El Imposible, San Juan del Obsidiario', '12.00', 'Lic. Miriam Elizabeth Campos', 'Caminata guiada por el bosque nuboso.', ['Br. Milton Majada', 'Lic. Milagros Zelaya']],
        ['Paseo a Santa Ana', 'Volcán de Santa Ana, Chapeltique', '14.00', 'Lic. Elmer Villagrán', 'Visita al crater y a las termas de San Jacinto.', ['Sr. Elías Coreas']],
    ];

    $sentencia = $pdo->prepare('INSERT INTO paseos (nombre, destino, costo_persona, profesor_encargado, descripcion)
                                 VALUES (:nombre, :destino, :costo, :profesor, :descripcion)');
    $idsPaseo = [];

    foreach ($paseos as $indice => $paseo) {
        $sentencia->execute([
            ':nombre'      => $paseo[0],
            ':destino'     => $paseo[1],
            ':costo'       => $paseo[2],
            ':profesor'    => $paseo[3],
            ':descripcion' => $paseo[4],
        ]);

        $paseoId = (int) $pdo->lastInsertId();
        $idsPaseo[$indice] = $paseoId;

        $vinculo = $pdo->prepare('INSERT INTO paseo_personal (paseo_id, personal_id) VALUES (:paseo, :personal)');

        foreach ($paseo[5] as $nombre) {
            $vinculo->execute([':paseo' => $paseoId, ':personal' => $ids[$nombre]]);
        }
    }

    $estudiantes = [
        'Kevin Josué Martínez', 'Karla Abigail Henríquez', 'Luis Alberto Portillo', 'Génesis Nicole Guzmán',
        'Erick Roberto Landaverde', 'Daniela María Zelaya', 'Josué Enrique Mejía', 'Allison Nicole Ramos',
        'Kevin Alexander Batres', 'Fabiola Sofía Canales', 'Jonathan David Corado', 'Keyla Micalela Guerra',
        'Diego Alonso Renderos', 'Megan Sofía Bonilla', 'Bryan Josué Rogelio', 'Leslie Abigail Peña',
        'Edwin Ramón Nolasco', 'Abigail Michelle Fuentes', 'Wilmer Ernesto Santos', 'Kathia Yamileth Abrego',
        'Luis Enrique Cerén', 'Jocelyn Isabel Recinos', 'Bryan Alexander Peña', 'Daniela Elizabeth Cienfuegos',
        'César Augusto Miranda', 'Alexandra Nicole Portillo', 'Iván Josué Munguía', 'Génesis Abigail Ramos',
        'Freddy Ernesto Zelaya', 'Silvia Guadalupe Peña', 'Karla Estefanía Liang', 'Óscar Alejandro Batres',
        'Daniela Sofía Alfaro', 'Bryan Ernesto Quintanilla', 'Génesis Melissa Carneiro', 'Kevin Roberto Sugí',
    ];

    $encargados = [
        'María Elena Hernández', 'José Roberto Villalta', 'Sandra Johana Pérez', 'Carmen Rosa Flores',
        'Óscar Eduardo Renderos', 'Ana Cecilia Méndez', 'Miriam Yolanda Recinos',
    ];

    $sentenciaPasajero = $pdo->prepare('INSERT INTO pasajeros (viaje_id, nombre, codigo, encargado)
                                         VALUES (:viaje, :nombre, :codigo, :encargado)');
    $sentenciaCompanero = $pdo->prepare('INSERT INTO companeros (pasajero_id, codigo)
                                          VALUES (:pasajero, :codigo)');
    $sentenciaPago = $pdo->prepare('INSERT INTO pagos (viaje_id, pasajero_id, monto, metodo, fecha, nota)
                                    VALUES (:viaje, :pasajero, :monto, :metodo, :fecha, :nota)');

    $crearViaje = static function (int $paseoId, string $fecha, string $salida, string $retorno, int $capacidad, string $estado) use ($pdo): int {
        $sentencia = $pdo->prepare('INSERT INTO viajes (paseo_id, fecha, hora_salida, hora_retorno, capacidad_bus, estado)
                                    VALUES (:paseo, :fecha, :salida, :retorno, :capacidad, :estado)');
        $sentencia->execute([
            ':paseo'     => $paseoId,
            ':fecha'     => $fecha,
            ':salida'    => $salida,
            ':retorno'   => $retorno,
            ':capacidad' => $capacidad,
            ':estado'    => $estado,
        ]);

        return (int) $pdo->lastInsertId();
    };

    $poblar = static function (int $viajeId, int $cantidad, string $prefijo, float $costo, string $fechaPago, bool $conDuplicado = false) use ($pdo, $sentenciaPasajero, $sentenciaCompanero, $sentenciaPago, $estudiantes, $encargados): void {
        $total = min($cantidad, count($estudiantes));
        $pasajeros = [];

        for ($i = 0; $i < $total; $i++) {
            $codigo = sprintf('%s%02d', $prefijo, $i + 1);
            $encargado = $i % 3 === 0 ? $encargados[$i % count($encargados)] : null;

            $sentenciaPasajero->execute([
                ':viaje'     => $viajeId,
                ':nombre'    => $estudiantes[$i],
                ':codigo'    => $codigo,
                ':encargado' => $encargado,
            ]);

            $pasajeroId = (int) $pdo->lastInsertId();
            $pasajeros[] = $pasajeroId;

            // De cada cinco estudiantes, el primero viaja con los dos que le siguen.
            if ($i % 5 !== 0) {
                continue;
            }

            foreach ([1, 2] as $paso) {
                if ($i + $paso >= $total) {
                    continue;
                }

                $sentenciaCompanero->execute([
                    ':pasajero' => $pasajeroId,
                    ':codigo'   => sprintf('%s%02d', $prefijo, $i + $paso + 1),
                ]);
            }
        }

        if ($conDuplicado && $pasajeros !== []) {
            $sentenciaPasajero->execute([
                ':viaje'     => $viajeId,
                ':nombre'    => $estudiantes[count($estudiantes) - 1],
                ':codigo'    => sprintf('%s%02d', $prefijo, 1),
                ':encargado' => $encargados[0],
            ]);
        }

        foreach ($pasajeros as $indice => $pasajeroId) {
            if ($indice % 3 === 2) {
                continue;
            }

            $sentenciaPago->execute([
                ':viaje'    => $viajeId,
                ':pasajero' => $pasajeroId,
                ':monto'    => $costo,
                ':metodo'   => $indice % 2 === 0 ? 'efectivo' : 'transferencia',
                ':fecha'    => $fechaPago,
                ':nota'     => null,
            ]);
        }
    };

    $hoy = new DateTimeImmutable('today');

    $viajeActual = $crearViaje($idsPaseo[0], $hoy->modify('+1 day')->format('Y-m-d'), '07:30:00', '14:00:00', 55, 'programado');
    $poblar($viajeActual, 26, '2B', 6.00, $hoy->format('Y-m-d'), true);

    $viajeProgramado = $crearViaje($idsPaseo[2], $hoy->modify('+9 days')->format('Y-m-d'), '08:00:00', '12:30:00', 55, 'programado');
    $poblar($viajeProgramado, 18, '3A', 8.50, $hoy->format('Y-m-d'));

    $historicos = [
        [$idsPaseo[1], '-21 days', '06:00:00', '17:00:00', 40, '3C', 15.00],
        [$idsPaseo[3], '-35 days', '05:30:00', '16:00:00', 32, '2D', 12.00],
        [$idsPaseo[4], '-49 days', '06:30:00', '18:00:00', 28, '1A', 14.00],
        [$idsPaseo[0], '-63 days', '07:30:00', '14:00:00', 45, '2B', 6.00],
        [$idsPaseo[2], '-77 days', '08:00:00', '12:30:00', 22, '3A', 8.50],
    ];

    foreach ($historicos as $historico) {
        $fecha = $hoy->modify($historico[1])->format('Y-m-d');
        $viajeId = $crearViaje($historico[0], $fecha, $historico[2], $historico[3], 55, 'finalizado');
        $poblar($viajeId, $historico[4], $historico[5], $historico[6], $fecha);
    }
}
