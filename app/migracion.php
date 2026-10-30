<?php

declare(strict_types=1);

const PREFIJOS_CODIGO = ['2B', '3A', '3C', '2D', '1A', '3B', '4A', '2C'];
const ESQUEMA_VERSION = 8;

const TABLAS_PRINCIPALES = ['paseos', 'viajes', 'pasajeros', 'companeros', 'pagos', 'parametros', 'alumnos', 'profesores', 'encargados', 'secciones'];

function tablas_principales_existen(): bool
{
    foreach (TABLAS_PRINCIPALES as $tabla) {
        if (!tabla_existe($tabla)) {
            return false;
        }
    }

    return true;
}

function aplicar_esquema_sql(?PDO $pdo = null): void
{
    $pdo = $pdo ?? db();
    $ruta = dirname(__DIR__) . '/database/schema.sql';

    if (!is_readable($ruta)) {
        return;
    }

    $sql = file_get_contents($ruta);
    $lineas = array_filter(
        explode("\n", $sql),
        static fn (string $linea): bool => !str_starts_with(trim($linea), '--')
    );

    foreach (array_filter(array_map('trim', explode(';', implode("\n", $lineas)))) as $sentencia) {
        if ($sentencia === '') {
            continue;
        }

        $pdo->exec($sentencia);
    }
}

function agregar_columna_si_falta(string $tabla, string $columna, string $definicion): void
{
    if (columna_existe($tabla, $columna)) {
        return;
    }

    db()->exec(sprintf('ALTER TABLE `%s` ADD COLUMN %s', $tabla, $definicion));
}

function tabla_existe(string $tabla): bool
{
    $sentencia = db()->prepare('SELECT COUNT(*) FROM information_schema.tables
                                WHERE table_schema = DATABASE() AND table_name = :tabla');
    $sentencia->execute([':tabla' => $tabla]);

    return (int) $sentencia->fetchColumn() > 0;
}

function columna_existe(string $tabla, string $columna): bool
{
    $sentencia = db()->prepare('SELECT COUNT(*) FROM information_schema.columns
                                WHERE table_schema = DATABASE() AND table_name = :tabla AND column_name = :columna');
    $sentencia->execute([':tabla' => $tabla, ':columna' => $columna]);

    return (int) $sentencia->fetchColumn() > 0;
}

function esquema_al_actualizado(): bool
{
    return tabla_existe('asientos') && tabla_existe('companeros') && columna_existe('viajes', 'boletos_cerrados');
}

/**
 * Restricción de integridad referencial ya registrada en la base de datos.
 */
function restriccion_existe(string $restriccion): bool
{
    $sentencia = db()->prepare('SELECT COUNT(*) FROM information_schema.table_constraints
                                WHERE constraint_schema = DATABASE() AND constraint_name = :restriccion');
    $sentencia->execute([':restriccion' => $restriccion]);

    return (int) $sentencia->fetchColumn() > 0;
}

function agregar_restriccion_si_falta(string $restriccion, string $sentencia): void
{
    if (restriccion_existe($restriccion)) {
        return;
    }

    db()->exec($sentencia);
}

/**
 * ¿La columna es de relleno obligatorio?
 */
function columna_obligatoria(string $tabla, string $columna): bool
{
    $sentencia = db()->prepare('SELECT IS_NULLABLE FROM information_schema.columns
                                WHERE table_schema = DATABASE()
                                  AND table_name = :tabla AND column_name = :columna');
    $sentencia->execute([':tabla' => $tabla, ':columna' => $columna]);
    $resultado = $sentencia->fetchColumn();

    return $resultado !== false && $resultado === 'NO';
}

/**
 * El padrón de alumnos, sus secciones y el catálogo de profesores ya están
 * disponibles.
 */
function esquema_padron_disponible(): bool
{
    return tabla_existe('alumnos')
        && tabla_existe('encargados')
        && tabla_existe('profesores')
        && tabla_existe('secciones')
        && columna_existe('pasajeros', 'alumno_id')
        && columna_existe('paseos', 'profesor_id')
        && columna_existe('alumnos', 'seccion_id')
        && !columna_existe('alumnos', 'seccion')
        && !columna_obligatoria('paseos', 'profesor_encargado');
}

/**
 * Convierte el texto de sección que traían los alumnos en el catálogo de
 * secciones y enlaza cada alumno con la suya.
 *
 * Solo se ejecuta una vez: al terminar, la columna de texto desaparece.
 */
function migrar_secciones_de_alumnos(): void
{
    if (!columna_existe('alumnos', 'seccion')) {
        return;
    }

    // 1) Crea las secciones que todavía solo existen como texto, con el año que
    //    indica la primera cifra del nombre (1A → primer año, 2J25 → segundo).
    db()->exec('INSERT IGNORE INTO secciones (nombre, anio, activo)
                SELECT DISTINCT TRIM(a.seccion),
                       GREATEST(CAST(SUBSTRING(TRIM(a.seccion), 1, 1) AS UNSIGNED), 1), 1
                FROM alumnos a
                WHERE a.seccion IS NOT NULL AND TRIM(a.seccion) <> \'\'');

    // 2) Enlaza cada alumno con su sección.
    db()->exec('UPDATE alumnos a
                INNER JOIN secciones s ON s.nombre = a.seccion
                SET a.seccion_id = s.id
                WHERE a.seccion_id IS NULL');

    // 3) A partir de aquí la sección vive solo en la tabla de secciones.
    db()->exec('ALTER TABLE alumnos DROP COLUMN seccion');
}

/**
 * El profesor de un paseo pasa a elegirse de la lista de profesores, así que
 * el texto se vuelve opcional.
 */
function permitir_profesor_sin_asignar(): void
{
    if (!columna_obligatoria('paseos', 'profesor_encargado')) {
        return;
    }

    db()->exec('ALTER TABLE paseos MODIFY COLUMN profesor_encargado VARCHAR(140) NULL');
}

/**
 * Crea el padrón (alumnos, secciones y encargados), el catálogo de profesores y
 * los enlaces que permiten agregar un alumno a un viaje por su código y elegir
 * el profesor de un paseo como opción y no como texto libre.
 */
function aplicar_esquema_padron(): void
{
    if (!tabla_existe('alumnos') || !tabla_existe('encargados')
        || !tabla_existe('profesores') || !tabla_existe('secciones')) {
        aplicar_esquema_sql();
    }

    agregar_columna_si_falta('pasajeros', 'alumno_id', 'alumno_id INT NULL');
    agregar_columna_si_falta('paseos', 'profesor_id', 'profesor_id INT NULL');
    agregar_columna_si_falta('alumnos', 'seccion_id', 'seccion_id INT NULL');

    migrar_secciones_de_alumnos();
    permitir_profesor_sin_asignar();

    agregar_restriccion_si_falta(
        'fk_alumnos_encargado',
        'ALTER TABLE alumnos ADD CONSTRAINT fk_alumnos_encargado
         FOREIGN KEY (encargado_id) REFERENCES encargados (id) ON DELETE RESTRICT'
    );
    agregar_restriccion_si_falta(
        'fk_alumnos_seccion',
        'ALTER TABLE alumnos ADD CONSTRAINT fk_alumnos_seccion
         FOREIGN KEY (seccion_id) REFERENCES secciones (id) ON DELETE RESTRICT'
    );
    agregar_restriccion_si_falta(
        'fk_pasajeros_alumno',
        'ALTER TABLE pasajeros ADD CONSTRAINT fk_pasajeros_alumno
         FOREIGN KEY (alumno_id) REFERENCES alumnos (id) ON DELETE SET NULL'
    );
    agregar_restriccion_si_falta(
        'fk_paseos_profesor',
        'ALTER TABLE paseos ADD CONSTRAINT fk_paseos_profesor
         FOREIGN KEY (profesor_id) REFERENCES profesores (id) ON DELETE SET NULL'
    );
}

function crear_tabla_asientos(): void
{
    db()->exec('CREATE TABLE IF NOT EXISTS asientos (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        viaje_id    INT NOT NULL,
        pasajero_id INT NOT NULL,
        rol         ENUM(\'estudiante\', \'tutor\') NOT NULL DEFAULT \'estudiante\',
        numero      INT NOT NULL,
        CONSTRAINT fk_asientos_viaje FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE CASCADE,
        CONSTRAINT fk_asientos_pasajero FOREIGN KEY (pasajero_id) REFERENCES pasajeros (id) ON DELETE CASCADE,
        INDEX idx_asientos_viaje (viaje_id, numero),
        INDEX idx_asientos_pasajero (pasajero_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

/**
 * Columnas que marcan el cierre de boletos de una salida.
 */
function aplicar_esquema_boletos(): void
{
    agregar_columna_si_falta('viajes', 'boletos_cerrados', 'boletos_cerrados TINYINT(1) NOT NULL DEFAULT 0');
    agregar_columna_si_falta('viajes', 'boletos_cerrados_en', 'boletos_cerrados_en DATETIME NULL');
}

/**
 * Crea la tabla de compañeros de viaje.
 */
function crear_tabla_companeros(): void
{
    if (!tabla_existe('pasajeros')) {
        return;
    }

    db()->exec('CREATE TABLE IF NOT EXISTS companeros (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        pasajero_id INT NOT NULL,
        codigo      VARCHAR(40) NOT NULL,
        creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_companeros (pasajero_id, codigo),
        INDEX idx_companeros_codigo (codigo),
        CONSTRAINT fk_companeros_pasajero FOREIGN KEY (pasajero_id) REFERENCES pasajeros (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

/**
 * Un pasajero puede declarar varios compañeros con los que quiere sentarse, así
 * que el código único que vivía en la columna amigo_codigo pasa a la tabla
 * companeros. Lo que ya estaba guardado se conserva.
 */
function migrar_companeros_de_pasajeros(): void
{
    crear_tabla_companeros();

    if (!columna_existe('pasajeros', 'amigo_codigo')) {
        return;
    }

    $yaMigrado = (int) db()->query('SELECT COUNT(*) FROM companeros')->fetchColumn() > 0;

    if (!$yaMigrado) {
        db()->exec("INSERT INTO companeros (pasajero_id, codigo)
                    SELECT id, UPPER(TRIM(amigo_codigo)) FROM pasajeros
                    WHERE amigo_codigo IS NOT NULL AND TRIM(amigo_codigo) <> ''");
    }

    db()->exec('ALTER TABLE pasajeros DROP COLUMN amigo_codigo');
}

function normalizar_codigos_existentes(): void
{
    $viajes = db()->query('SELECT id FROM viajes ORDER BY id ASC')->fetchAll();

    foreach ($viajes as $indice => $fila) {
        $viajeId = (int) $fila['id'];
        $prefijo = PREFIJOS_CODIGO[$indice % count(PREFIJOS_CODIGO)];

        $pasajeros = db()->prepare('SELECT id, codigo FROM pasajeros WHERE viaje_id = :viaje ORDER BY id ASC');
        $pasajeros->execute([':viaje' => $viajeId]);

        $mapa = [];
        $contador = 1;
        $cambios = [];

        foreach ($pasajeros->fetchAll() as $pasajero) {
            $codigo = (string) $pasajero['codigo'];

            if (formato_codigo_valido($codigo)) {
                continue;
            }

            if (!isset($mapa[$codigo])) {
                $mapa[$codigo] = sprintf('%s%02d', $prefijo, $contador);
                $contador++;
            }

            $cambios[] = ['id' => (int) $pasajero['id'], 'codigo' => $mapa[$codigo]];
        }

        if ($cambios === []) {
            continue;
        }

        $actualizar = db()->prepare('UPDATE pasajeros SET codigo = :codigo WHERE id = :id');

        foreach ($cambios as $cambio) {
            $actualizar->execute([':codigo' => $cambio['codigo'], ':id' => $cambio['id']]);
        }
    }
}

function asignar_preferencias_demo(): void
{
    if (!tabla_existe('companeros')) {
        return;
    }

    $total = (int) db()->query('SELECT COUNT(*) FROM companeros')->fetchColumn();

    if ($total > 0) {
        return;
    }

    $viajes = db()->query('SELECT id FROM viajes ORDER BY id ASC')->fetchAll();

    foreach ($viajes as $fila) {
        $viajeId = (int) $fila['id'];

        $pasajeros = db()->prepare('SELECT id, codigo FROM pasajeros WHERE viaje_id = :viaje ORDER BY id ASC');
        $pasajeros->execute([':viaje' => $viajeId]);
        $lista = $pasajeros->fetchAll();

        if (count($lista) < 3) {
            continue;
        }

        $insertar = db()->prepare('INSERT IGNORE INTO companeros (pasajero_id, codigo)
                                   VALUES (:pasajero, :codigo)');

        // De cada cinco estudiantes, el primero viaja con los dos que le siguen.
        foreach ($lista as $indice => $pasajero) {
            if ($indice % 5 !== 0) {
                continue;
            }

            foreach ([1, 2] as $paso) {
                if (!isset($lista[$indice + $paso])) {
                    continue;
                }

                $insertar->execute([
                    ':pasajero' => (int) $pasajero['id'],
                    ':codigo'   => normalizar_codigo((string) $lista[$indice + $paso]['codigo']),
                ]);
            }
        }
    }
}

/**
 * Renombra la tabla de personal de salvamento a personal de asistencia.
 */
function migrar_personal_salvamento_a_asistencia(): void
{
    if (!tabla_existe('personal_salvamento')) {
        return;
    }

    if (tabla_existe('personal_asistencia')) {
        return;
    }

    db()->exec('RENAME TABLE personal_salvamento TO personal_asistencia');
}

function aplicar_migraciones(bool $forzar = false): void
{
    static $aplicadas = false;

    if ($aplicadas && !$forzar) {
        return;
    }

    try {
        if (!tablas_principales_existen()) {
            aplicar_esquema_sql();
        }

        if (parametro_int('esquema_version', 0) >= ESQUEMA_VERSION
            && esquema_al_actualizado()
            && esquema_padron_disponible()) {
            $aplicadas = true;
            return;
        }

        if (!tabla_existe('asientos')) {
            crear_tabla_asientos();
        }

        migrar_personal_salvamento_a_asistencia();
        agregar_columna_si_falta('companeros', 'con_encargado', 'con_encargado TINYINT(1) NOT NULL DEFAULT 0');
        aplicar_esquema_padron();
        aplicar_esquema_boletos();

        normalizar_codigos_existentes();
        migrar_companeros_de_pasajeros();
        asignar_preferencias_demo();

        db()->prepare('INSERT INTO parametros (clave, valor, descripcion) VALUES (:clave, :valor, :descripcion)
                       ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)')
            ->execute([
                ':clave'       => 'esquema_version',
                ':valor'       => (string) ESQUEMA_VERSION,
                ':descripcion' => 'Versión del esquema de la base de datos',
            ]);

        refrescar_parametros();
        $aplicadas = true;
    } catch (Throwable $excepcion) {
        // En la linea de comandos un fallo de migracion no puede quedarse en silencio.
        if (PHP_SAPI === 'cli') {
            fwrite(STDERR, 'Migracion fallida: ' . $excepcion->getMessage()
                . ' (' . basename($excepcion->getFile()) . ':' . $excepcion->getLine() . ')' . PHP_EOL);
        }

        $aplicadas = false;
    }
}
