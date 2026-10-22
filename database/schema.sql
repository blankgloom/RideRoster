-- RideRoster · Esquema de base de datos (MySQL / MariaDB)

CREATE TABLE IF NOT EXISTS parametros (
    clave       VARCHAR(60) NOT NULL PRIMARY KEY,
    valor       VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paseos (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    nombre             VARCHAR(140) NOT NULL,
    destino            VARCHAR(180) NOT NULL,
    costo_persona      DECIMAL(10,2) NOT NULL DEFAULT 0,
    profesor_encargado VARCHAR(140) NOT NULL,
    descripcion        TEXT NULL,
    activo             TINYINT(1) NOT NULL DEFAULT 1,
    creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paseos_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_salvamento (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(140) NOT NULL,
    puesto     VARCHAR(120) NULL,
    activo     TINYINT(1) NOT NULL DEFAULT 1,
    creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_personal_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paseo_personal (
    paseo_id   INT NOT NULL,
    personal_id INT NOT NULL,
    PRIMARY KEY (paseo_id, personal_id),
    CONSTRAINT fk_paseo_personal_paseo FOREIGN KEY (paseo_id) REFERENCES paseos (id) ON DELETE CASCADE,
    CONSTRAINT fk_paseo_personal_persona FOREIGN KEY (personal_id) REFERENCES personal_salvamento (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS viajes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    paseo_id      INT NOT NULL,
    fecha         DATE NOT NULL,
    hora_salida   TIME NOT NULL,
    hora_retorno  TIME NULL,
    capacidad_bus INT NOT NULL DEFAULT 55,
    estado        ENUM('programado', 'en_curso', 'finalizado') NOT NULL DEFAULT 'programado',
    notas         TEXT NULL,
    creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_viajes_paseo FOREIGN KEY (paseo_id) REFERENCES paseos (id),
    INDEX idx_viajes_fecha (fecha, hora_salida),
    INDEX idx_viajes_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pasajeros (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    viaje_id     INT NOT NULL,
    nombre       VARCHAR(140) NOT NULL,
    codigo       VARCHAR(40) NOT NULL,
    encargado    VARCHAR(140) NULL,
    amigo_codigo VARCHAR(40) NULL,
    creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pasajeros_viaje FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE CASCADE,
    INDEX idx_pasajeros_viaje (viaje_id),
    INDEX idx_pasajeros_codigo (viaje_id, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asientos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    viaje_id    INT NOT NULL,
    pasajero_id INT NOT NULL,
    rol         ENUM('estudiante', 'tutor') NOT NULL DEFAULT 'estudiante',
    numero      INT NOT NULL,
    CONSTRAINT fk_asientos_viaje FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE CASCADE,
    CONSTRAINT fk_asientos_pasajero FOREIGN KEY (pasajero_id) REFERENCES pasajeros (id) ON DELETE CASCADE,
    INDEX idx_asientos_viaje (viaje_id, numero),
    INDEX idx_asientos_pasajero (pasajero_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    viaje_id    INT NOT NULL,
    pasajero_id INT NULL,
    monto       DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodo      ENUM('efectivo', 'transferencia', 'otro') NOT NULL DEFAULT 'efectivo',
    fecha       DATE NOT NULL,
    nota        VARCHAR(255) NULL,
    creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagos_viaje FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE CASCADE,
    CONSTRAINT fk_pagos_pasajero FOREIGN KEY (pasajero_id) REFERENCES pasajeros (id) ON DELETE SET NULL,
    INDEX idx_pagos_viaje (viaje_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
