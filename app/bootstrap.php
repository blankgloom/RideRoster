<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/viajes.php';
require_once __DIR__ . '/asientos.php';
require_once __DIR__ . '/flotas.php';
require_once __DIR__ . '/migracion.php';

asegurar_base_de_datos();
aplicar_migraciones();
