<?php

declare(strict_types=1);

require_once __DIR__ . '/app/bootstrap.php';

$baseDeDatosLista = true;
$detalleEstado = '';

try {
    db()->query('SELECT valor FROM parametros LIMIT 1');
} catch (Throwable $excepcion) {
    $baseDeDatosLista = false;
    $detalleEstado = $excepcion->getMessage();
}

$versionCss = filemtime(__DIR__ . '/assets/css/app.css');
$versionJs = filemtime(__DIR__ . '/assets/js/app.js');

?><!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RideRoster · Colecturía INA</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= $versionCss ?>">
</head>
<body>
    <header class="cabecera">
        <div class="cabecera-interior">
            <div class="marca">
                <span class="marca-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="12" rx="2.5"></rect>
                        <path d="M3 11h18"></path>
                        <path d="M7 16v2.5M17 16v2.5"></path>
                        <circle cx="7.5" cy="13" r="1"></circle>
                        <circle cx="16.5" cy="13" r="1"></circle>
                    </svg>
                </span>
                <span class="marca-texto">
                    <strong>RideRoster</strong>
                    <small>Colecturía · Instituto Nacional de Apopa</small>
                </span>
            </div>

            <nav class="pestanas" id="pestanas" aria-label="Secciones del sistema">
                <button type="button" class="pestana activa" data-vista="inicio" aria-selected="true">Inicio</button>
                <button type="button" class="pestana" data-vista="alumnos" aria-selected="false">Alumnos</button>
                <button type="button" class="pestana" data-vista="profesores" aria-selected="false">Profesores</button>
                <button type="button" class="pestana" data-vista="administracion" aria-selected="false">Administración</button>
                <button type="button" class="pestana" data-vista="estadisticas" aria-selected="false">Estadísticas</button>
            </nav>

            <div class="cabecera-lateral">
                <span class="etiqueta-sistema" id="estado-sistema">
                    <span class="punto-estado"></span>
                    <span id="estado-sistema-texto">Colecturía activa</span>
                </span>
                <span class="fecha-hoy" id="fecha-hoy"></span>
                <span class="temporizador" id="temporizador" hidden>
                    <span class="temporizador-etiqueta" id="temporizador-etiqueta">Faltan</span>
                    <strong class="temporizador-valor" id="temporizador-valor">--:--:--</strong>
                </span>
            </div>
        </div>
    </header>

    <main class="contenido" id="contenido">
        <?php if (!$baseDeDatosLista): ?>
            <section class="tarjeta estado-sin-base">
                <h1 class="titulo-seccion">El sistema aún no está preparado</h1>
                <p class="texto-apagado">No fue posible conectar con la base de datos de RideRoster. Comprueba que MySQL esté encendido y que la base exista.</p>
                <div class="alerta alerta-error">
                    <strong>Detalle de la conexión</strong>
                    <span><?= htmlspecialchars($detalleEstado) ?></span>
                </div>
                <p class="texto-apagado">Desde la carpeta del proyecto ejecuta <strong>php bin/rideroster instalar</strong> para crear la base de datos y aplicar el esquema. Si ya tienes información registrada, ese comando <strong>no borra nada</strong>: solo completa lo que falta.</p>
            </section>
        <?php else: ?>
            <div class="cargando" id="cargando">
                <span class="cargando-barra"></span>
                <p>Cargando la información de la colecturía</p>
            </div>
        <?php endif; ?>
    </main>

    <footer class="pie">
        <div class="pie-interior">
            <p>RideRoster · Sistema de gestión de viajes escolares</p>
            <p>Colecturía del Instituto Nacional de Apopa</p>
        </div>
    </footer>

    <div class="capa-modal" id="capa-modal" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
            <header class="modal-cabecera">
                <div>
                    <p class="modal-sobretitulo" id="modal-sobretitulo"></p>
                    <h2 class="modal-titulo" id="modal-titulo"></h2>
                </div>
                <button type="button" class="boton-icono" id="modal-cerrar" aria-label="Cerrar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                        <path d="M6 6l12 12M18 6L6 18"></path>
                    </svg>
                </button>
            </header>
            <div class="modal-cuerpo" id="modal-cuerpo"></div>
            <footer class="modal-pie" id="modal-pie"></footer>
        </div>
    </div>

    <div class="avisos" id="avisos" aria-live="polite"></div>

    <script src="assets/js/app.js?v=<?= $versionJs ?>"></script>
</body>
</html>
