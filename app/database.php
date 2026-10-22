<?php

declare(strict_types=1);

function sockets_conocidos(): array
{
    $sockets = [getenv('DB_SOCKET') ?: ''];

    if (getenv('DB_SOCKET') === false) {
        $sockets[] = '/opt/lampp/var/mysql/mysql.sock';
        $sockets[] = '/var/run/mysqld/mysqld.sock';
        $sockets[] = '/tmp/mysql.sock';
    }

    return array_values(array_unique(array_filter($sockets)));
}

function abrir_pdo(string $dsn, array $cfg): PDO
{
    return new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = app_config()['db'];
    $errores = [];

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'], $cfg['name']);

    try {
        $pdo = abrir_pdo($dsn, $cfg);
    } catch (PDOException $excepcion) {
        $errores[] = $excepcion->getMessage();
        $pdo = null;

        foreach (sockets_conocidos() as $socket) {
            if (!is_readable($socket)) {
                continue;
            }

            try {
                $pdo = abrir_pdo(sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, $cfg['name']), $cfg);
                break;
            } catch (PDOException $excepcionSocket) {
                $errores[] = $excepcionSocket->getMessage();
            }
        }
    }

    if (!$pdo instanceof PDO) {
        throw new PDOException(implode(' · ', array_unique($errores)));
    }

    return $pdo;
}

function db_servidor(): PDO
{
    $cfg = app_config()['db'];
    $errores = [];

    try {
        return abrir_pdo(sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $cfg['host'], $cfg['port']), $cfg);
    } catch (PDOException $excepcion) {
        $errores[] = $excepcion->getMessage();
    }

    foreach (sockets_conocidos() as $socket) {
        if (!is_readable($socket)) {
            continue;
        }

        try {
            return abrir_pdo(sprintf('mysql:unix_socket=%s;charset=utf8mb4', $socket), $cfg);
        } catch (PDOException $excepcionSocket) {
            $errores[] = $excepcionSocket->getMessage();
        }
    }

    throw new PDOException(implode(' · ', array_unique($errores)));
}

function asegurar_base_de_datos(): void
{
    $cfg = app_config()['db'];

    try {
        $servidor = db_servidor();
        $servidor->exec(sprintf(
            'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            str_replace('`', '', $cfg['name'])
        ));
    } catch (Throwable $excepcion) {
        // Sin permisos de creacion el sistema sigue funcionando si la base ya existe
    }
}

function parametros(): array
{
    global $parametros_cache;

    if (!is_array($parametros_cache)) {
        $parametros_cache = [];

        foreach (db()->query('SELECT clave, valor FROM parametros')->fetchAll() as $fila) {
            $parametros_cache[$fila['clave']] = $fila['valor'];
        }
    }

    return $parametros_cache;
}

function refrescar_parametros(): void
{
    global $parametros_cache;

    $parametros_cache = null;
}

function parametro(string $clave, mixed $alterno = null): mixed
{
    $valores = parametros();

    return $valores[$clave] ?? $alterno;
}

function parametro_int(string $clave, int $alterno = 0): int
{
    $valor = parametro($clave, null);

    return $valor === null ? $alterno : (int) $valor;
}
