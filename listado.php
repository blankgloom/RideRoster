<?php
declare(strict_types=1);

require_once __DIR__ . '/app/bootstrap.php';

$viajeId = (int) ($_GET['viaje'] ?? 0);
$todos = isset($_GET['todos']);

$viaje = detalle_viaje($viajeId);

if ($viaje === null) {
    http_response_code(404);
    exit('El viaje solicitado no existe.');
}

if ($todos) {
    $salida = salida_de_viaje($viajeId);
    $buses = $salida !== null ? buses_de_salida($salida) : [$viaje];
} else {
    $buses = [$viaje];
}

foreach ($buses as $bus) {
    if ((int) $bus['pasajeros'] > 0 && filas_de_asientos((int) $bus['id']) === []) {
        generar_asientos((int) $bus['id']);
    }
}

?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Listado de abordaje · <?= htmlspecialchars($viaje['nombre']) ?></title>
    <link rel="icon" type="image/png" href="assets/img/favicon.png?v=<?= filemtime(__DIR__ . '/assets/img/favicon.png') ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= filemtime(__DIR__ . '/assets/css/app.css') ?>">
    <link rel="stylesheet" href="assets/css/listado.css?v=<?= filemtime(__DIR__ . '/assets/css/listado.css') ?>">
</head>
<body class="pagina-listado">
<?php foreach ($buses as $bus):
    $listado = listado_aboarding((int) $bus['id'], true);
    $total = count($listado);
    $estudiantes = count(array_filter($listado, static fn (array $fila): bool => $fila['tipo'] === ROL_ESTUDIANTE));
    $tutores = $total - $estudiantes;
?>
    <div class="hoja">
        <header class="hoja-cabecera">
            <div class="hoja-institucion">
                <span class="hoja-marca">RideRoster</span>
                <span class="hoja-lugar">Instituto Nacional de Apopa · Colecturía</span>
            </div>
            <div class="hoja-titulo">
                <h1>Listado de abordaje</h1>
                <p><?= htmlspecialchars($bus['nombre']) ?> · <?= htmlspecialchars($bus['destino']) ?></p>
            </div>
        </header>

        <dl class="hoja-datos">
            <div><dt>Fecha</dt><dd><?= htmlspecialchars(date('d/m/Y', strtotime($bus['fecha']))) ?></dd></div>
            <div><dt>Salida</dt><dd class="numero"><?= htmlspecialchars($bus['hora_salida']) ?></dd></div>
            <div><dt>Regreso</dt><dd class="numero"><?= htmlspecialchars($bus['hora_retorno'] ?: 'Por definir') ?></dd></div>
            <div><dt>Autobús</dt><dd class="numero"><?= (int) $bus['capacidad_bus'] ?> asientos</dd></div>
            <div><dt>Profesor a cargo</dt><dd><?= htmlspecialchars($bus['profesor_encargado']) ?></dd></div>
            <div><dt>Costo por persona</dt><dd class="numero">$<?= number_format((float) $bus['costo_persona'], 2) ?></dd></div>
        </dl>

        <table class="hoja-tabla">
            <thead>
                <tr>
                    <th class="numero">No.</th>
                    <th>Nombre del estudiante</th>
                    <th class="numero">Código</th>
                    <th>Encargado o tutor</th>
                    <th class="numero">Asiento</th>
                    <th>Firma</th>
                </tr>
            </thead>
            <tbody>
                <?php if ($listado === []): ?>
                    <tr>
                        <td colspan="6" class="hoja-vacio">Este viaje todavía no tiene estudiantes inscritos.</td>
                    </tr>
                <?php endif; ?>
                <?php foreach ($listado as $fila): ?>
                    <tr>
                        <td class="numero celda-numero"><?= (int) $fila['numero_impreso'] ?></td>
                        <td>
                            <span class="hoja-nombre"><?= htmlspecialchars($fila['nombre']) ?></span>
                            <?php if ($fila['tipo'] === ROL_TUTOR): ?>
                                <span class="hoja-tutor">Acompañante de <?= htmlspecialchars((string) $fila['acompanado_de']) ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="numero"><?= htmlspecialchars((string) ($fila['codigo'] ?? '—')) ?></td>
                        <td><?= htmlspecialchars((string) ($fila['encargado'] ?? '—')) ?></td>
                        <td class="numero"><?= (int) $fila['asiento'] ?></td>
                        <td class="celda-firma"></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <footer class="hoja-pie">
            <p><?= $estudiantes ?> estudiantes y <?= $tutores ?> acompañantes · <?= $total ?> personas en total</p>
            <p>Elaborado por la colecturía del Instituto Nacional de Apopa</p>
        </footer>
    </div>
<?php endforeach; ?>

    <div class="hoja-acciones">
        <button type="button" class="boton boton-primario" onclick="window.print()">Imprimir o guardar en PDF</button>
        <a class="boton boton-borde" href="index.php">Volver al sistema</a>
    </div>
</body>
</html>