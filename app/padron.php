<?php

declare(strict_types=1);

/**
 * Padrón del instituto: secciones, alumnos y encargados, más el catálogo de
 * profesores.
 *
 * El padrón vive fuera de los viajes. Un alumno entra a una salida de forma
 * individual (por código) y, cuando viaja, su pago total se registra en la
 * tabla pagos. No existen planes de cuotas ni la opción "por pagos": el estado
 * del padrón es pagado o pendiente.
 */

/** Máximo de alumnos que devuelve el API en una sola llamada. */
const LIMITE_ALUMNOS = 5000;

/**
 * Espacios simples, sin sobrantes: "  Juan   Carlos " → "Juan Carlos".
 */
function colapsar_espacios(string $texto): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $texto));
}

/**
 * Clave de comparación de un nombre: minúsculas, sin acentos ni eñes.
 *
 * Es al menos tan laxa como la colación utf8mb4_unicode_ci de las tablas, de
 * modo que dos variantes del mismo nombre nunca compiten por la clave única.
 */
function clave_nombre(string $nombre): string
{
    $texto = mb_strtolower(colapsar_espacios($nombre), 'UTF-8');

    return strtr($texto, [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
        'â' => 'a', 'ê' => 'e', 'î' => 'i', 'ô' => 'o', 'û' => 'u', 'ç' => 'c',
        'ä' => 'a', 'ë' => 'e', 'ï' => 'i', 'ö' => 'o', 'ß' => 'ss',
    ]);
}

/**
 * Teléfono reducido a dígitos para poder compararlo sin importar el formato.
 */
function normalizar_telefono(?string $telefono): string
{
    return (string) preg_replace('/\D+/', '', (string) $telefono);
}

/**
 * Nombre completo de un estudiante o de un encargado.
 */
function nombre_completo(string $nombres, string $apellidos): string
{
    return colapsar_espacios($nombres . ' ' . $apellidos);
}

/**
 * Año escolar de una sección: "1A" → 1, "2J25" → 2.
 *
 * Si el nombre no arranca con una cifra se asocia al primer año.
 */
function anio_de_seccion(string $nombre): int
{
    if (preg_match('/^(\d{1,2})/', colapsar_espacios($nombre), $coincidencia) === 1) {
        return (int) $coincidencia[1];
    }

    return 1;
}

/**
 * Catálogo de secciones con el número de alumnos inscritos en cada una.
 *
 * El orden alfabético es el orden escolar: 1A, 1AG, 1B, 1BG … 2A … 3G.
 */
function listar_secciones(): array
{
    $secciones = db()->query(
        'SELECT s.id, s.nombre, s.anio, s.especialidad, s.activo,
                (SELECT COUNT(*) FROM alumnos a WHERE a.seccion_id = s.id) AS alumnos
         FROM secciones s
         ORDER BY s.nombre ASC'
    )->fetchAll();

    foreach ($secciones as &$seccion) {
        $seccion['id'] = (int) $seccion['id'];
        $seccion['anio'] = (int) $seccion['anio'];
        $seccion['activo'] = (int) $seccion['activo'];
        $seccion['alumnos'] = (int) $seccion['alumnos'];
    }

    return $secciones;
}

/**
 * Condiciones compartidas entre el listado y el conteo del padrón.
 *
 * @return array{0: string, 1: array<string, mixed>}
 */
function condiciones_alumnos(array $filtros): array
{
    $condiciones = [];
    $parametros = [];

    $busqueda = colapsar_espacios((string) ($filtros['q'] ?? ''));

    if ($busqueda !== '') {
        $condiciones[] = '(a.nombre LIKE :busqueda OR a.codigo LIKE :busqueda
                           OR e.nombre LIKE :busqueda OR e.telefono LIKE :busqueda
                           OR a.telefono LIKE :busqueda)';
        $parametros[':busqueda'] = '%' . $busqueda . '%';
    }

    $seccionId = (int) ($filtros['seccion_id'] ?? 0);

    if ($seccionId > 0) {
        $condiciones[] = 'a.seccion_id = :seccion';
        $parametros[':seccion'] = $seccionId;
    }

    $anio = (int) ($filtros['anio'] ?? 0);

    if ($anio > 0) {
        $condiciones[] = 's.anio = :anio';
        $parametros[':anio'] = $anio;
    }

    $condicion = $condiciones !== [] ? ' WHERE ' . implode(' AND ', $condiciones) : '';

    return [$condicion, $parametros];
}

/**
 * Alumnos del padrón con su sección y su encargado, ordenados por sección.
 */
function listar_alumnos(array $filtros = []): array
{
    [$condicion, $parametros] = condiciones_alumnos($filtros);
    $limite = (int) ($filtros['limite'] ?? 0);
    $limite = $limite > 0 ? min(LIMITE_ALUMNOS, $limite) : LIMITE_ALUMNOS;

    $sentencia = db()->prepare(
        'SELECT a.id, a.codigo, a.nombre, a.telefono, a.activo,
                a.seccion_id, s.nombre AS seccion, s.anio AS anio,
                e.id AS encargado_id, e.nombre AS encargado, e.telefono AS telefono_encargado
         FROM alumnos a
         LEFT JOIN secciones s ON s.id = a.seccion_id
         LEFT JOIN encargados e ON e.id = a.encargado_id'
        . $condicion .
        ' ORDER BY s.nombre IS NULL, s.nombre ASC, a.nombre ASC, a.codigo ASC
         LIMIT ' . $limite
    );
    $sentencia->execute($parametros);
    $alumnos = $sentencia->fetchAll();

    foreach ($alumnos as &$alumno) {
        $alumno['id'] = (int) $alumno['id'];
        $alumno['seccion_id'] = $alumno['seccion_id'] !== null ? (int) $alumno['seccion_id'] : null;
        $alumno['anio'] = $alumno['anio'] !== null ? (int) $alumno['anio'] : null;
        $alumno['encargado_id'] = $alumno['encargado_id'] !== null ? (int) $alumno['encargado_id'] : null;
        $alumno['activo'] = (int) $alumno['activo'];
        $alumno['con_encargado'] = $alumno['encargado_id'] !== null;
    }

    return $alumnos;
}

/**
 * Número total de alumnos que cumplen los filtros, aunque el listado se corte
 * por el límite.
 */
function total_alumnos(array $filtros = []): int
{
    [$condicion, $parametros] = condiciones_alumnos($filtros);

    $sentencia = db()->prepare(
        'SELECT COUNT(*)
         FROM alumnos a
         LEFT JOIN secciones s ON s.id = a.seccion_id
         LEFT JOIN encargados e ON e.id = a.encargado_id' . $condicion
    );
    $sentencia->execute($parametros);

    return (int) $sentencia->fetchColumn();
}

/**
 * Resumen general del padrón para las métricas de la vista.
 */
function resumen_padron(): array
{
    $resumen = db()->query(
        'SELECT COUNT(*) AS alumnos,
                COALESCE(SUM(encargado_id IS NOT NULL), 0) AS con_encargado,
                COALESCE(SUM(activo = 1), 0) AS activos,
                COUNT(DISTINCT seccion_id) AS secciones
         FROM alumnos'
    )->fetch();

    return [
        'alumnos'       => (int) ($resumen['alumnos'] ?? 0),
        'con_encargado' => (int) ($resumen['con_encargado'] ?? 0),
        'activos'       => (int) ($resumen['activos'] ?? 0),
        'secciones'     => (int) ($resumen['secciones'] ?? 0),
    ];
}

/**
 * Todo lo que necesita la vista de Alumnos en una sola llamada.
 */
function datos_padron(array $filtros = []): array
{
    return [
        'alumnos'   => listar_alumnos($filtros),
        'secciones' => listar_secciones(),
        'resumen'   => resumen_padron(),
        'total'     => total_alumnos($filtros),
    ];
}

/**
 * Busca una sección por su nombre, con la misma tolerancia que el resto del
 * padrón (mayúsculas, acentos y espacios sobrantes).
 */
function seccion_por_nombre(string $nombre): ?array
{
    $nombre = colapsar_espacios($nombre);

    if ($nombre === '') {
        return null;
    }

    $sentencia = db()->prepare('SELECT id, nombre, anio FROM secciones WHERE nombre = :nombre');
    $sentencia->execute([':nombre' => $nombre]);
    $seccion = $sentencia->fetch();

    if ($seccion === false) {
        return null;
    }

    return ['id' => (int) $seccion['id'], 'nombre' => $seccion['nombre'], 'anio' => (int) $seccion['anio']];
}

/**
 * Devuelve el id de la sección, creándola si todavía no existe.
 *
 * Devuelve null cuando no se pudo determinar ninguna sección.
 */
function asegurar_seccion(string $nombre, ?string $especialidad = null): ?int
{
    $nombre = colapsar_espacios($nombre);

    if ($nombre === '') {
        return null;
    }

    $existente = seccion_por_nombre($nombre);

    if ($existente !== null) {
        if (colapsar_espacios((string) $especialidad) !== '') {
            db()->prepare('UPDATE secciones SET especialidad = :especialidad WHERE id = :id
                           AND (especialidad IS NULL OR especialidad = \'\')')
                ->execute([':especialidad' => $especialidad, ':id' => $existente['id']]);
        }

        return $existente['id'];
    }

    $insertar = db()->prepare('INSERT INTO secciones (nombre, anio, especialidad)
                               VALUES (:nombre, :anio, :especialidad)');

    try {
        $insertar->execute([
            ':nombre'       => $nombre,
            ':anio'         => anio_de_seccion($nombre),
            ':especialidad' => colapsar_espacios((string) $especialidad) !== '' ? $especialidad : null,
        ]);
    } catch (PDOException $excepcion) {
        // Otra petición la creó al mismo tiempo: se reutiliza la existente.
    }

    $creada = seccion_por_nombre($nombre);

    if ($creada === null) {
        throw new RuntimeException('No se pudo registrar la sección "' . $nombre . '".');
    }

    return $creada['id'];
}

/**
 * Resuelve el encargado de un alumno aplicando las reglas del padrón:
 *
 *   · si el nombre ya existe en la base de datos se reutiliza el registro y se
 *     completa el teléfono si faltaba ("viaja con encargado");
 *   · si no existe y el nombre viene completo se crea el registro;
 *   · si no existe y el nombre viene sin apellido se rechaza: el alumno no se
 *     agrega hasta que el encargado tenga un registro previo.
 *
 * @return array{id: int|null, estado: string, nombre: string}
 */
function resolver_encargado(string $nombre, string $telefono): array
{
    $nombre = colapsar_espacios($nombre);
    $telefono = colapsar_espacios($telefono);

    if ($nombre === '') {
        return ['id' => null, 'estado' => 'sin_encargado', 'nombre' => ''];
    }

    $consulta = db()->prepare('SELECT id, telefono FROM encargados WHERE nombre = :nombre');
    $consulta->execute([':nombre' => $nombre]);
    $existente = $consulta->fetch();

    if ($existente !== false) {
        if (($existente['telefono'] ?? null) === null && $telefono !== '') {
            db()->prepare('UPDATE encargados SET telefono = :telefono WHERE id = :id')
                ->execute([':telefono' => $telefono, ':id' => $existente['id']]);
        }

        return ['id' => (int) $existente['id'], 'estado' => 'reutilizado', 'nombre' => $nombre];
    }

    if (mb_strpos($nombre, ' ') === false) {
        return ['id' => null, 'estado' => 'incompleto', 'nombre' => $nombre];
    }

    $insertar = db()->prepare('INSERT INTO encargados (nombre, telefono) VALUES (:nombre, :telefono)');

    try {
        $insertar->execute([
            ':nombre'   => $nombre,
            ':telefono' => $telefono !== '' ? $telefono : null,
        ]);
    } catch (PDOException $excepcion) {
        // El nombre ya estaba registrado bajo una variante equivalente.
    }

    $consulta->execute([':nombre' => $nombre]);
    $registro = $consulta->fetch();

    if ($registro === false) {
        throw new RuntimeException('No se pudo registrar el encargado "' . $nombre . '".');
    }

    return ['id' => (int) $registro['id'], 'estado' => 'creado', 'nombre' => $nombre];
}

/**
 * Catálogo de profesores con su nombre completo, listo para elegirlos en un
 * paseo.
 */
function listar_profesores(?string $busqueda = null): array
{
    $condicion = '';
    $parametros = [];

    $busqueda = colapsar_espacios((string) $busqueda);

    if ($busqueda !== '') {
        $condicion = ' WHERE p.codigo LIKE :busqueda OR p.nombres LIKE :busqueda
                       OR p.apellidos LIKE :busqueda OR p.especialidad_cargo LIKE :busqueda';
        $parametros[':busqueda'] = '%' . $busqueda . '%';
    }

    $sentencia = db()->prepare(
        'SELECT p.id, p.codigo, p.nombres, p.apellidos, p.sexo, p.fecha_nacimiento,
                p.especialidad_cargo, p.permiso, p.alergias, p.fecha_registro, p.activo,
                CONCAT_WS(\' \', p.nombres, p.apellidos) AS nombre
         FROM profesores p' . $condicion . '
         ORDER BY p.apellidos ASC, p.nombres ASC'
    );
    $sentencia->execute($parametros);
    $profesores = $sentencia->fetchAll();

    foreach ($profesores as &$profesor) {
        $profesor['id'] = (int) $profesor['id'];
        $profesor['activo'] = (int) $profesor['activo'];
    }

    return $profesores;
}

/**
 * Profesores activos, para el selector de un paseo.
 */
function profesores_activos(): array
{
    return array_values(array_filter(
        listar_profesores(),
        static fn (array $profesor): bool => $profesor['activo'] === 1
    ));
}
