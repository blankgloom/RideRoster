# Guía de instalación y puesta en marcha

Este documento explica cómo ejecutar RideRoster en local y cómo dejar lista la base de
datos. Para una referencia rápida, consulta la sección *Puesta en marcha* del
[README](README.md).

---

## 1. Requisitos

| Componente | Versión mínima | Notas |
| --- | --- | --- |
| PHP | 8.0 | Con las extensiones `pdo_mysql` y `json` |
| MySQL / MariaDB | 5.7 / 10.3 | Motor InnoDB y juego de caracteres `utf8mb4` |
| Servidor web | Apache o equivalente | No es obligatorio: el proyecto se puede levantar con el servidor embebido de PHP |

En Windows la forma más directa es usar [XAMPP](https://www.apachefriends.org/),
que ya incluye Apache, PHP y MariaDB.

---

## 2. Estructura del proyecto

```
RideRoster/
├── index.php            Interfaz del sistema (pestañas Inicio y Administración)
├── listado.php          Listado de abordaje imprimible (PDF)
├── bin/rideroster       Herramienta de terminal: instalar, migrar, estado
├── api/index.php        API JSON del sistema
├── app/                 Configuración, base de datos, consultas y lógica de negocio
├── assets/              Hojas de estilo y JavaScript de la interfaz
├── database/schema.sql  Esquema de la base de datos
├── DESIGN.md            Sistema de diseño (paleta, tipografía, componentes)
├── CHANGELOG.md         Registro de versiones
└── INSTALACION.md       Este documento
```

---

## 3. Puesta en marcha con XAMPP

1. Copia la carpeta del proyecto dentro de `htdocs` de XAMPP
   (por ejemplo `C:\xampp\htdocs\RideRoster`).
2. Abre el **Panel de control de XAMPP** y arranca **Apache** y **MySQL**.
3. Abre una terminal en la carpeta del proyecto y prepara la base de datos:

   ```bash
   php bin/rideroster instalar
   ```

   El comando crea la base `rideroster`, aplica el esquema y carga los datos de
   demostración. **No borra nada** si la base ya existe: solo completa lo que falta.

4. Entra al sistema en <http://localhost/RideRoster/>.

---

## 4. Puesta en marcha sin XAMPP

El proyecto no depende de Apache. Con PHP y MySQL arrancados por separado:

```bash
# 1. Preparar la base de datos
php bin/rideroster instalar

# 2. Levantar el servidor embebido
php -S localhost:8080 -t .
```

Y abre <http://localhost:8080>.

---

## 5. Configuración de la conexión

La configuración se toma de las **variables de entorno** y, si no existen, se usan los
valores habituales de XAMPP.

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` | Servidor de base de datos |
| `DB_PORT` | `3306` | Puerto del servidor |
| `DB_NAME` | `rideroster` | Nombre de la base de datos |
| `DB_USER` | `root` | Usuario de conexión |
| `DB_PASS` | *(vacío)* | Contraseña de conexión |
| `DB_SOCKET` | *(detección automática)* | Ruta del socket de MySQL, si se usa |
| `APP_TIMEZONE` | `America/El_Salvador` | Zona horaria de las fechas del sistema |

Ejemplo con credenciales propias:

```bash
DB_USER=colecturia DB_PASS='clave-secreta' php bin/rideroster instalar
```

En Apache se pueden fijar con `SetEnv` en el `.htaccess` o con directivas `php_value` /
variables de entorno del servidor.

---

## 6. Comandos de la herramienta

```bash
php bin/rideroster ayuda      # Muestra la lista de comandos
php bin/rideroster instalar   # Crea la base, aplica el esquema y carga la demostración
php bin/rideroster migrar     # Actualiza el esquema sin borrar información
php bin/rideroster estado     # Muestra la conexión y el resumen de la base de datos
```

`instalar` es idempotente: se puede ejecutar las veces que haga falta.

---

## 7. Estructura de la base de datos

| Tabla | Contenido |
| --- | --- |
| `paseos` | Catálogo de destinos: nombre, destino, costo por persona, profesor a cargo |
| `personal_salvamento` | Personal de comandos de salvamento reutilizable entre paseos |
| `paseo_personal` | Relación entre un paseo y su personal de salvamento |
| `viajes` | Viajes programados: fecha, horarios, capacidad del bus y estado |
| `pasajeros` | Estudiantes inscritos, con código, encargado y compañero de viaje |
| `pagos` | Pagos registrados por viaje y por estudiante |
| `asientos` | Asignación de asientos: estudiante o acompañante y número de butaca |
| `parametros` | Parámetros globales del sistema y versión del esquema |

El esquema vive en [`database/schema.sql`](database/schema.sql) y se puede aplicar
también a mano desde phpMyAdmin o desde la consola de MySQL:

```bash
mysql -u root -p < database/schema.sql
```

---

## 8. Migraciones

El sistema se actualiza solo: en cada arranque compara `esquema_version` (tabla
`parametros`) con la versión del código y aplica lo que falte, por ejemplo:

- creación de la tabla `asientos` y de la columna `amigo_codigo`;
- conversión de los códigos antiguos al formato `[Año][Sección][Número de lista]`;
- asignación de preferencias de compañero en los datos de demostración.

Si prefieres aplicarlas a mano:

```bash
php bin/rideroster migrar
```

Ninguna migración borra información registrada.

---

## 9. Problemas frecuentes

**"No fue posible conectar con la base de datos"**
Comprueba que MySQL esté encendido y que las credenciales sean correctas. El detalle del
error aparece en la misma pantalla.

**La página carga pero no hay datos**
La base existe pero está vacía. Ejecuta `php bin/rideroster instalar` para cargar los
datos de demostración.

**"El código no cumple el formato requerido"**
El código debe tener el formato `[Año][Sección][Número de lista]`, por ejemplo `2B03`:
un o dos dígitos de año, una letra de sección y dos dígitos de número de lista.

**Los cambios no aparecen en el navegador**
Recarga con `Ctrl+F5` para descartar la caché del navegador.
