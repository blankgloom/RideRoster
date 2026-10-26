<?php

declare(strict_types=1);

/**
 * Migración del padrón del Instituto Nacional de Apopa hacia RideRoster.
 *
 * El volcado de origen se carga en una base temporal de solo lectura y de ahí
 * se traslada, sin filtros ni interpretaciones, lo que el sistema necesita:
 *
 *   · profesores → tabla profesores, con sus 10 campos tal cual llegan.
 *   · secciones  → tabla secciones, con el año y la especialidad de origen.
 *   · encargados → tabla encargados, deduplicados por nombre.
 *   · alumnos    → tabla alumnos, vinculados a su sección y a su encargado
 *                  cuando viajan con uno, y marcados al 100% pagados.
 *
 * Reglas de negocio:
 *
 *   1. El encargado ya existe en la base de datos → se reutiliza su registro
 *      y se autocompletan los datos disponibles: el alumno queda con la
 *      relación "viaja con encargado".
 *   2. El encargado no existe → se crea en la tabla encargados y se vincula
 *      al alumno.
 *   3. El encargado está declarado pero sin datos completos y no hay registro
 *      previo que lo respalde → el alumno NO se agrega y el motivo queda en el
 *      informe de errores.
 *   4. Todos los alumnos migrados quedan con estado de pago 'pagado' (100%).
 *      No existen planes de cuotas ni la opción "por pagos": el pago total se
 *      materializa en la tabla pagos cuando el alumno entra a un viaje.
 *
 * Las funciones de comparación (colapsar_espacios, clave_nombre y
 * normalizar_telefono) viven en app/padron.php, que comparten la migración y
 * el API del padrón.
 */

/** Base temporal donde se carga el volcado de origen. */
const BD_ORIGEN = 'rideroster_origen';

/** Volcado por defecto, con ruta relativa a la raíz del proyecto. */
const ARCHIVO_ORIGEN_PREDETERMINADO = 'database/instituto_nacional_de_apopa_23_10.sql';

/** Tablas del volcado que interesan a la migración. */
const TABLAS_ORIGEN = ['estudiantes', 'profesores', 'secciones'];

/**
 * Resuelve la ruta del volcado de origen.
 *
 * Acepta la ruta con o sin extensión .sql.
 */
function ruta_origen(?string $ruta): string
{
    $ruta = trim((string) $ruta);

    if ($ruta === '') {
        $ruta = dirname(__DIR__) . '/' . ARCHIVO_ORIGEN_PREDETERMINADO;
    }

    if (is_file($ruta)) {
        return $ruta;
    }

    if (!str_ends_with($ruta, '.sql') && is_file($ruta . '.sql')) {
        return $ruta . '.sql';
    }

    throw new RuntimeException('No se encontró el archivo de origen: ' . $ruta);
}

/**
 * Divide un volcado SQL en sentencias respetando cadenas, acentos y comentarios.
 *
 * Devuelve las sentencias sin el punto y coma final.
 */
function partir_sentencias(string $sql): array
{
    $sentencias = [];
    $actual = '';
    $comilla = null;
    $largo = strlen($sql);

    for ($i = 0; $i < $largo; $i++) {
        $caracter = $sql[$i];

        if ($comilla !== null) {
            $actual .= $caracter;

            if ($caracter === '\\' && $i + 1 < $largo) {
                $actual .= $sql[++$i];
                continue;
            }

            if ($caracter === $comilla) {
                // Comilla repetida dentro de la cadena ('' equivale a ').
                if ($i + 1 < $largo && $sql[$i + 1] === $comilla) {
                    $actual .= $sql[++$i];
                    continue;
                }

                $comilla = null;
            }

            continue;
        }

        // Comentarios de línea: "-- texto" y "# texto".
        if (($caracter === '-' && ($sql[$i + 1] ?? '') === '-' && preg_match('/^--(\s|$)/', substr($sql, $i, 3)) === 1)
            || $caracter === '#') {
            $fin = strpos($sql, "\n", $i);

            if ($fin === false) {
                break;
            }

            $actual .= "\n";
            $i = $fin;
            continue;
        }

        // Comentario de bloque /* ... */
        if ($caracter === '/' && ($sql[$i + 1] ?? '') === '*') {
            $fin = strpos($sql, '*/', $i + 2);

            if ($fin === false) {
                break;
            }

            $i = $fin + 1;
            continue;
        }

        if ($caracter === "'" || $caracter === '"' || $caracter === '`') {
            $comilla = $caracter;
            $actual .= $caracter;
            continue;
        }

        if ($caracter === ';') {
            $sentencias[] = $actual;
            $actual = '';
            continue;
        }

        $actual .= $caracter;
    }

    if (trim($actual) !== '') {
        $sentencias[] = $actual;
    }

    return array_values(array_filter($sentencias, static fn (string $sentencia): bool => trim($sentencia) !== ''));
}

/**
 * Se queda solo con las sentencias que crean, alteran o cargan las tablas pedidas.
 *
 * El volcado trae 30 tablas del instituto; solo interesan estudiantes y
 * profesores, y en su orden original para no romper las claves.
 */
function sentencias_de_tablas(string $sql, array $tablas): array
{
    $filtradas = [];

    foreach (partir_sentencias($sql) as $sentencia) {
        $coincidencia = [];

        if (preg_match('/^\s*(?:CREATE\s+TABLE|INSERT\s+INTO|ALTER\s+TABLE)\s+`([^`]+)`/i', $sentencia, $coincidencia) !== 1) {
            continue;
        }

        if (in_array($coincidencia[1], $tablas, true)) {
            $filtradas[] = $sentencia;
        }
    }

    return $filtradas;
}

/**
 * Conexión PDO a una base de datos concreta del servidor.
 *
 * Prueba primero por TCP y después por los sockets conocidos, igual que el
 * resto de conexiones del sistema.
 */
function abrir_base(string $nombre): PDO
{
    $cfg = app_config()['db'];
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'], $nombre);

    try {
        return abrir_pdo($dsn, $cfg);
    } catch (PDOException $excepcion) {
        foreach (sockets_conocidos() as $socket) {
            if (!is_readable($socket)) {
                continue;
            }

            try {
                return abrir_pdo(sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, $nombre), $cfg);
            } catch (PDOException $excepcionSocket) {
                // Se sigue con el siguiente socket conocido.
            }
        }

        throw $excepcion;
    }
}

/**
 * Carga el volcado de origen en la base temporal y devuelve la conexión.
 */
function abrir_origen(string $archivo): PDO
{
    $sql = file_get_contents($archivo);

    if ($sql === false) {
        throw new RuntimeException('No se pudo leer el archivo de origen: ' . $archivo);
    }

    $sentencias = sentencias_de_tablas($sql, TABLAS_ORIGEN);

    if ($sentencias === []) {
        throw new RuntimeException('El archivo no contiene las tablas esperadas (' . implode(', ', TABLAS_ORIGEN) . ').');
    }

    $servidor = db_servidor();
    $servidor->exec('DROP DATABASE IF EXISTS `' . BD_ORIGEN . '`');
    $servidor->exec(sprintf(
        'CREATE DATABASE `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
        BD_ORIGEN
    ));

    $origen = abrir_base(BD_ORIGEN);

    // El volcado es puro DDL y DML de origen; cada sentencia se aplica sola
    // porque MySQL confirma en silencio cualquier transacción al ejecutar DDL.
    try {
        foreach ($sentencias as $sentencia) {
            $origen->exec($sentencia);
        }
    } catch (Throwable $excepcion) {
        throw new RuntimeException('No se pudo cargar el volcado de origen: ' . $excepcion->getMessage(), 0, $excepcion);
    }

    return $origen;
}

/**
 * Elimina la base temporal de origen.
 */
function cerrar_origen(): void
{
    db_servidor()->exec('DROP DATABASE IF EXISTS `' . BD_ORIGEN . '`');
}

/**
 * Traslada el catálogo de secciones del instituto: nombre, año y especialidad.
 *
 * Las secciones que ya existan (por venir de otra fuente) se completan con los
 * datos de origen y las que falten se crean.
 */
function cargar_secciones(PDO $origen, array &$informe): void
{
    $filas = $origen->query('SELECT nombre, nivel, especialidad, estado FROM secciones ORDER BY nombre')->fetchAll();
    $informe['origen']['secciones'] = count($filas);

    $buscar = db()->prepare('SELECT anio, activo FROM secciones WHERE id = :id');
    $guardar = db()->prepare('UPDATE secciones SET anio = :anio, activo = :activo WHERE id = :id');

    foreach ($filas as $fila) {
        $nombre = colapsar_espacios((string) ($fila['nombre'] ?? ''));
        $especialidad = colapsar_espacios((string) ($fila['especialidad'] ?? ''));

        if ($nombre === '') {
            $informe['secciones']['errores'][] = ['nombre' => '', 'motivo' => 'La sección no trae nombre.'];
            continue;
        }

        $previa = seccion_por_nombre($nombre);

        try {
            $seccionId = asegurar_seccion($nombre, $especialidad !== '' ? $especialidad : null);
        } catch (RuntimeException $excepcion) {
            $informe['secciones']['errores'][] = ['nombre' => $nombre, 'motivo' => $excepcion->getMessage()];
            continue;
        }

        $anio = (int) ($fila['nivel'] ?? 0);
        $anio = $anio > 0 ? $anio : anio_de_seccion($nombre);
        $activo = strtolower((string) ($fila['estado'] ?? '')) === 'inactiva' ? 0 : 1;

        $guardar->execute([':anio' => $anio, ':activo' => $activo, ':id' => $seccionId]);
        $buscar->execute([':id' => $seccionId]);
        $previo = $buscar->fetch();

        if ($previa === null) {
            $informe['secciones']['insertados']++;
            continue;
        }

        if ($previo !== false && ((int) $previo['anio'] !== $anio || (int) $previo['activo'] !== $activo)) {
            $informe['secciones']['actualizados']++;
            continue;
        }

        $informe['secciones']['sin_cambios']++;
    }
}

/**
 * Estado vacío de la migración, para poder acumular varias pasadas.
 */
function informe_vacio(): array
{
    return [
        'origen' => ['archivo' => '', 'profesores' => 0, 'secciones' => 0, 'estudiantes' => 0],
        'profesores' => ['insertados' => 0, 'actualizados' => 0, 'sin_cambios' => 0, 'errores' => []],
        'secciones' => ['insertados' => 0, 'actualizados' => 0, 'sin_cambios' => 0, 'errores' => []],
        'encargados' => ['creados' => 0, 'reutilizados' => 0, 'conflictos' => [], 'errores' => []],
        'alumnos' => [
            'insertados' => 0,
            'actualizados' => 0,
            'sin_cambios' => 0,
            'con_encargado' => 0,
            'sin_encargado' => 0,
            'bloqueados' => 0,
            'pagados' => 0,
            'por_seccion' => [],
            'errores' => [],
        ],
    ];
}

/**
 * Migra los profesores con todos sus atributos, sin filtros ni modificaciones.
 */
function migrar_profesores(PDO $origen, array &$informe): void
{
    $filas = $origen->query(
        'SELECT codigo, nombres, apellidos, sexo, fecha_nacimiento, especialidad_cargo,
                permiso, alergias, fecha_registro, activo
         FROM profesores
         ORDER BY codigo'
    )->fetchAll();

    $informe['origen']['profesores'] = count($filas);

    $sentencia = db()->prepare(
        'INSERT INTO profesores (codigo, nombres, apellidos, sexo, fecha_nacimiento, especialidad_cargo,
                                 permiso, alergias, fecha_registro, activo)
         VALUES (:codigo, :nombres, :apellidos, :sexo, :fecha_nacimiento, :especialidad_cargo,
                 :permiso, :alergias, :fecha_registro, :activo)
         ON DUPLICATE KEY UPDATE
                nombres = VALUES(nombres), apellidos = VALUES(apellidos), sexo = VALUES(sexo),
                fecha_nacimiento = VALUES(fecha_nacimiento), especialidad_cargo = VALUES(especialidad_cargo),
                permiso = VALUES(permiso), alergias = VALUES(alergias),
                fecha_registro = VALUES(fecha_registro), activo = VALUES(activo)'
    );

    foreach ($filas as $fila) {
        $parametros = [
            ':codigo'             => (string) $fila['codigo'],
            ':nombres'            => (string) $fila['nombres'],
            ':apellidos'          => (string) $fila['apellidos'],
            ':sexo'               => (string) $fila['sexo'],
            ':fecha_nacimiento'   => $fila['fecha_nacimiento'],
            ':especialidad_cargo' => (string) $fila['especialidad_cargo'],
            ':permiso'            => (string) $fila['permiso'],
            ':alergias'           => $fila['alergias'] !== null && $fila['alergias'] !== '' ? (string) $fila['alergias'] : null,
            ':fecha_registro'     => $fila['fecha_registro'],
            ':activo'             => (int) $fila['activo'],
        ];

        try {
            $sentencia->execute($parametros);
            contar_fila($informe['profesores'], $sentencia->rowCount());
        } catch (PDOException $excepcion) {
            // El origen guarda fechas de nacimiento como 0000-00-00; si el
            // servidor no las admite se conserva el resto del registro.
            if (!es_fecha_invalida($parametros[':fecha_nacimiento'])) {
                $informe['profesores']['errores'][] = [
                    'codigo' => (string) $fila['codigo'],
                    'motivo' => $excepcion->getMessage(),
                ];
                continue;
            }

            $parametros[':fecha_nacimiento'] = null;

            try {
                $sentencia->execute($parametros);
                contar_fila($informe['profesores'], $sentencia->rowCount());
            } catch (PDOException $excepcionFatal) {
                $informe['profesores']['errores'][] = [
                    'codigo' => (string) $fila['codigo'],
                    'motivo' => $excepcionFatal->getMessage(),
                ];
            }
        }
    }
}

/**
 * ¿El valor recibido es una fecha que ningún servidor aceptaría?
 */
function es_fecha_invalida(mixed $fecha): bool
{
    return is_string($fecha) && preg_match('/^0000-00-00/', $fecha) === 1;
}

/**
 * Clasifica el resultado de un INSERT ... ON DUPLICATE KEY UPDATE.
 */
function contar_fila(array &$destino, int $afectadas): void
{
    if ($afectadas === 1) {
        $destino['insertados']++;
        return;
    }

    if ($afectadas === 2) {
        $destino['actualizados']++;
        return;
    }

    $destino['sin_cambios']++;
}

/**
 * Catálogo de encargados: lo que ya está en la base de datos más los registros
 * completos del volcado, para poder resolver y autocompletar los incompletos.
 */
function catalogo_encargados(array $filas): array
{
    $catalogo = [];

    if (tabla_existe('encargados')) {
        foreach (db()->query('SELECT id, nombre, telefono FROM encargados')->fetchAll() as $fila) {
            $catalogo[clave_nombre((string) $fila['nombre'])] = [
                'id'       => (int) $fila['id'],
                'nombre'   => (string) $fila['nombre'],
                'telefono' => (string) ($fila['telefono'] ?? ''),
            ];
        }
    }

    foreach ($filas as $fila) {
        $nombres = colapsar_espacios((string) ($fila['encargado_nombres'] ?? ''));
        $apellidos = colapsar_espacios((string) ($fila['encargado_apellidos'] ?? ''));

        // Solo los registros completos pueden servir de referencia.
        if ($nombres === '' || $apellidos === '') {
            continue;
        }

        $clave = clave_nombre($nombres . ' ' . $apellidos);

        if (isset($catalogo[$clave])) {
            continue;
        }

        $catalogo[$clave] = [
            'id'       => null,
            'nombre'   => colapsar_espacios($nombres . ' ' . $apellidos),
            'telefono' => colapsar_espacios((string) ($fila['telefono_encargado'] ?? '')),
        ];
    }

    return $catalogo;
}

/**
 * Crea en la tabla encargados los registros del catálogo que aún no existen.
 *
 * @param array<string, array{id: int|null, nombre: string, telefono: string}> $catalogo
 */
function cargar_encargados(array &$catalogo, array &$informe): void
{
    $sentencia = db()->prepare(
        'INSERT INTO encargados (nombre, telefono) VALUES (:nombre, :telefono)
         ON DUPLICATE KEY UPDATE telefono = COALESCE(NULLIF(VALUES(telefono), \'\'), telefono)'
    );

    $busqueda = db()->prepare('SELECT id FROM encargados WHERE nombre = :nombre');

    foreach ($catalogo as $clave => $registro) {
        if ($registro['id'] !== null) {
            $informe['encargados']['reutilizados']++;
            continue;
        }

        try {
            $sentencia->execute([
                ':nombre'   => $registro['nombre'],
                ':telefono' => $registro['telefono'] !== '' ? $registro['telefono'] : null,
            ]);
        } catch (PDOException $excepcion) {
            // El nombre ya estaba registrado bajo una variante equivalente.
        }

        // La lectura se hace por nombre y no por lastInsertId para que una
        // clave única equivalente devuelva el registro que ya existía.
        $busqueda->execute([':nombre' => $registro['nombre']]);
        $id = (int) $busqueda->fetchColumn();

        if ($id === 0) {
            throw new RuntimeException('No se pudo registrar el encargado "' . $registro['nombre'] . '".');
        }

        $catalogo[$clave]['id'] = $id;
        $informe['encargados']['creados']++;
    }
}

/**
 * Detecta nombres de encargado que llegan con teléfonos distintos.
 *
 * No bloquea la migración: se queda con el primer teléfono y deja aviso.
 */
function conflictos_de_telefono(array $filas, array $catalogo, array &$informe): void
{
    $telefonos = [];

    foreach ($catalogo as $clave => $registro) {
        $telefono = normalizar_telefono($registro['telefono']);

        if ($telefono !== '') {
            $telefonos[$clave][$telefono] = $registro['telefono'];
        }
    }

    foreach ($filas as $fila) {
        $nombres = colapsar_espacios((string) ($fila['encargado_nombres'] ?? ''));
        $apellidos = colapsar_espacios((string) ($fila['encargado_apellidos'] ?? ''));
        $telefono = colapsar_espacios((string) ($fila['telefono_encargado'] ?? ''));

        if ($nombres === '' && $apellidos === '') {
            continue;
        }

        if ($telefono === '') {
            continue;
        }

        $clave = clave_nombre($nombres . ' ' . $apellidos);
        $telefonos[$clave][normalizar_telefono($telefono)] = $telefono;
    }

    foreach ($telefonos as $clave => $variantes) {
        if (count($variantes) < 2) {
            continue;
        }

        $informe['encargados']['conflictos'][] = [
            'encargado'  => $catalogo[$clave]['nombre'] ?? $clave,
            'telefonos'  => array_values($variantes),
        ];
    }
}

/**
 * Migra el padrón de alumnos con todas sus validaciones.
 *
 * Devuelve, en el informe, los alumnos que no se agregaron y el motivo.
 */
function migrar_alumnos(PDO $origen, array &$informe): void
{
    $filas = $origen->query(
        'SELECT codigo, nombres, apellidos, seccion, estado_estudiante, telefono_estudiante,
                encargado_nombres, encargado_apellidos, telefono_encargado
         FROM estudiantes
         ORDER BY id ASC'
    )->fetchAll();

    $informe['origen']['estudiantes'] = count($filas);

    $catalogo = catalogo_encargados($filas);
    conflictos_de_telefono($filas, $catalogo, $informe);
    cargar_encargados($catalogo, $informe);

    $sentencia = db()->prepare(
        'INSERT INTO alumnos (codigo, nombre, seccion_id, telefono, encargado_id, estado_pago, activo)
         VALUES (:codigo, :nombre, :seccion, :telefono, :encargado, :estado_pago, :activo)
         ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre), seccion_id = VALUES(seccion_id), telefono = VALUES(telefono),
                encargado_id = VALUES(encargado_id), estado_pago = VALUES(estado_pago), activo = VALUES(activo)'
    );

    foreach ($filas as $fila) {
        $codigo = colapsar_espacios((string) ($fila['codigo'] ?? ''));
        $nombre = colapsar_espacios(
            colapsar_espacios((string) ($fila['nombres'] ?? '')) . ' ' .
            colapsar_espacios((string) ($fila['apellidos'] ?? ''))
        );

        if ($codigo === '' || $nombre === '') {
            bloquear_alumno($informe, $codigo, $nombre, 'El registro no trae código ni nombre completo.');
            continue;
        }

        $encargado = colapsar_espacios((string) ($fila['encargado_nombres'] ?? ''));
        $apellidoEncargado = colapsar_espacios((string) ($fila['encargado_apellidos'] ?? ''));
        $declarado = $encargado !== '' || $apellidoEncargado !== '';
        $clave = clave_nombre($encargado . ' ' . $apellidoEncargado);

        $encargadoId = null;

        if ($declarado) {
            if (!isset($catalogo[$clave])) {
                // Regla 3: declarado sin datos completos y sin registro previo.
                bloquear_alumno(
                    $informe,
                    $codigo,
                    $nombre,
                    'Viaja con encargado pero el encargado no tiene nombre completo ("'
                    . colapsar_espacios($encargado . ' ' . $apellidoEncargado)
                    . '") y no existe un registro previo en la base de datos.'
                );
                continue;
            }

            $encargadoId = $catalogo[$clave]['id'];
        }

        $seccion = colapsar_espacios((string) ($fila['seccion'] ?? ''));
        $telefono = colapsar_espacios((string) ($fila['telefono_estudiante'] ?? ''));

        // La sección se crea si todavía no está en el catálogo: así ninguna
        // sección del padrón se queda sin alumnos por faltar en el origen.
        $seccionId = asegurar_seccion($seccion);

        try {
            $sentencia->execute([
                ':codigo'      => $codigo,
                ':nombre'      => $nombre,
                ':seccion'     => $seccionId,
                ':telefono'    => $telefono !== '' ? $telefono : null,
                ':encargado'   => $encargadoId,
                ':estado_pago' => 'pagado',
                ':activo'      => strtolower((string) $fila['estado_estudiante']) === 'activo' ? 1 : 0,
            ]);
        } catch (PDOException $excepcion) {
            bloquear_alumno($informe, $codigo, $nombre, $excepcion->getMessage());
            continue;
        }

        contar_fila($informe['alumnos'], $sentencia->rowCount());
        $informe['alumnos']['pagados']++;

        // La relación con encargado ES el indicador de "viaja con encargado".
        if ($encargadoId !== null) {
            $informe['alumnos']['con_encargado']++;
        } else {
            $informe['alumnos']['sin_encargado']++;
        }

        $seccionContador = $seccion !== '' ? $seccion : 'sin sección';
        $informe['alumnos']['por_seccion'][$seccionContador] = ($informe['alumnos']['por_seccion'][$seccionContador] ?? 0) + 1;
    }
}

/**
 * Aplica la restricción: el alumno no se agrega y el motivo queda en el informe.
 */
function bloquear_alumno(array &$informe, string $codigo, string $nombre, string $motivo): void
{
    $informe['alumnos']['bloqueados']++;
    $informe['alumnos']['errores'][] = [
        'codigo' => $codigo,
        'nombre' => $nombre,
        'motivo' => $motivo,
    ];
}

/**
 * Vacía el padrón para volver a migrar desde cero.
 *
 * Se usan DELETE y no TRUNCATE para poder deshacerse en una transacción.
 */
function vaciar_padron(): void
{
    db()->exec('DELETE FROM alumnos');
    db()->exec('DELETE FROM secciones');
    db()->exec('DELETE FROM encargados');
    db()->exec('DELETE FROM profesores');
}
