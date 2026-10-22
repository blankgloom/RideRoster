<?php

declare(strict_types=1);

function env_value(string $clave, string $alterno): string
{
    $valor = getenv($clave);

    return ($valor === false || $valor === '') ? $alterno : $valor;
}

function app_config(): array
{
    static $config = null;

    if ($config === null) {
        $config = [
            'db' => [
                'host'   => env_value('DB_HOST', '127.0.0.1'),
                'port'   => env_value('DB_PORT', '3306'),
                'name'   => env_value('DB_NAME', 'rideroster'),
                'user'   => env_value('DB_USER', 'root'),
                'pass'   => env_value('DB_PASS', ''),
                'socket' => env_value('DB_SOCKET', ''),
            ],
        ];
    }

    return $config;
}
