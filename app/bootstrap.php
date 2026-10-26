<?php

declare(strict_types=1);

// Los números que viajan en JSON deben usar la representación más corta
// (26.7 y no 26.699999999999999), igual que el valor predeterminado de PHP.
ini_set('serialize_precision', '-1');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/viajes.php';
require_once __DIR__ . '/asientos.php';
require_once __DIR__ . '/flotas.php';
require_once __DIR__ . '/estadisticas.php';
require_once __DIR__ . '/padron.php';
require_once __DIR__ . '/migracion.php';

asegurar_base_de_datos();
aplicar_migraciones();
