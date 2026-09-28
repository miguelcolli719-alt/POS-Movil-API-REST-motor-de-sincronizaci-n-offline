# POS Móvil — API REST + motor de sincronización offline

Backend del proyecto **POS Móvil Multiplataforma**. Incluye la API REST, el esquema MySQL, la autenticación, las reglas de negocio de ventas e inventario y un módulo de referencia para persistencia y sincronización offline con IndexedDB/Dexie.


---

## 📋 Requisitos previos

- Git
- Node.js 20 o superior
- npm 10 o superior
- MySQL 8.0.16 o superior

Comprueba las versiones instaladas:

```powershell
git --version
node --version
npm --version
mysql --version
```

---

## 🚀 Instalación después de clonar

### 1. Clonar el repositorio

```powershell
git clone https://github.com/USUARIO/pos-movil.git
cd pos-movil
```

Reemplaza `USUARIO/pos-movil` por la dirección real del repositorio cuando lo publiques.

### 2. Instalar dependencias

```powershell
npm ci
```

Usa `npm install` únicamente cuando quieras modificar dependencias y actualizar `package-lock.json`.

### 3. Crear la configuración local

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

Después edita `.env` con tus propios datos de MySQL y secretos JWT. Ese archivo es local, está ignorado por Git y **nunca debe publicarse**.

Puedes generar cada secreto JWT con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Genera dos valores diferentes: uno para `JWT_ACCESS_SECRET` y otro para `JWT_REFRESH_SECRET`.

### 4. Crear e importar la base de datos

```powershell
mysql --user=root --password --execute="CREATE DATABASE IF NOT EXISTS pos_movil_residencia CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
$schemaPath = (Resolve-Path .\database\schema.sql).Path.Replace('\', '/')
mysql --user=root --password --database=pos_movil_residencia --execute="SOURCE $schemaPath"
```

Usa el mismo nombre en `DATABASE_NAME`. El archivo `database/schema.sql` contiene la estructura final, índices, restricciones y triggers, pero no datos de aplicación. Si ya tienes la base preparada, omite este paso.

> **Advertencia:** el archivo recrea las tablas mediante `DROP TABLE IF EXISTS`. Impórtalo únicamente en una base nueva o prescindible; no lo ejecutes sobre una base que contenga información que quieras conservar.

### 5. Cargar los datos iniciales

Define `SEED_ADMIN_PASSWORD` antes de ejecutar el seeder para no depender de una contraseña de respaldo de desarrollo.

```powershell
npm run seed
```

Se crean de forma idempotente:

- La sucursal `Sucursal Central`.
- El impuesto IVA del 16 %.
- Los métodos de pago básicos.
- El usuario administrador inicial `admin`.

Si el administrador ya existe, el seeder no reemplaza su contraseña.

### 6. Aprovisionar un dispositivo

El envío de ventas y algunas operaciones de sincronización requieren un dispositivo aprobado. Configura temporalmente estas variables en `.env`:

```dotenv
DEVICE_ACTION=approve
DEVICE_IDENTIFIER=POS-CAJA-01
DEVICE_SECRET=un-secreto-de-entre-32-y-72-caracteres
DEVICE_SUCURSAL_ID=1
DEVICE_DESCRIPTION=Caja principal
```

Ejecuta:

```powershell
npm run device:provision
```

El secreto del dispositivo debe conservarse de manera segura en el cliente; el backend almacena únicamente su hash.

### 7. Iniciar el servidor

Modo desarrollo, con reinicio automático proporcionado por Node.js:

```powershell
npm run dev
```

Modo producción:

```powershell
npm start
```

De forma predeterminada, la API queda disponible en `http://localhost:3000`.

### 8. Verificar el arranque

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/ready
```

- `/health` confirma que el proceso está activo.
- `/ready` también comprueba la conexión con MySQL.

---

## ✨ Características principales

- API REST versionada bajo `/api/v1`.
- Arquitectura por capas: rutas → controladores → servicios → repositorios.
- MySQL con esquema reproducible, transacciones y restricciones de integridad.
- Autenticación con bcrypt, JWT de acceso y rotación de refresh tokens.
- Autenticación de dispositivos aprobados o bloqueados.
- Control de acceso por roles `administrador` y `vendedor`.
- Bloqueo temporal de cuentas después de varios intentos fallidos de acceso.
- Ventas idempotentes por UUID y folio por dispositivo.
- Bloqueo de inventario para evitar sobreventa concurrente.
- Cálculos monetarios en centavos, sin depender de flotantes binarios.
- CRUD de productos, clientes y proveedores.
- Pull incremental de catálogo, clientes e inventario.
- Búsqueda offline local por nombre, SKU y código de barras.
- Cola de ventas offline con reintentos, backoff exponencial y política de errores definitivos.
- Validación de contratos con Zod y errores centralizados.
- Logging estructurado con request ID mediante Pino.
- Pruebas unitarias, de integración y del motor cliente.

---

## 🔐 Acceso inicial

No se incluyen credenciales personales ni secretos de producción en el repositorio.

| Dato | Origen |
|---|---|
| Usuario inicial | `admin`, creado por `npm run seed` |
| Contraseña inicial | Valor local de `SEED_ADMIN_PASSWORD` |
| Identificador de dispositivo | Valor local de `DEVICE_IDENTIFIER` |
| Secreto de dispositivo | Valor local de `DEVICE_SECRET` |

El login devuelve los tokens de sesión y la identidad del dispositivo se envía mediante las cabeceras `X-Device-Id` y `X-Device-Secret` en los endpoints que la exigen.

---

## 📡 Endpoints principales

La base del API es:

```text
http://localhost:3000/api/v1
```

Todos los endpoints, salvo login y refresh, requieren `Authorization: Bearer <accessToken>`.

### Autenticación

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Iniciar sesión |
| `POST` | `/auth/refresh` | Rotar el refresh token y obtener un access token nuevo |
| `POST` | `/auth/logout` | Revocar la sesión actual |

### Productos y categorías

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/productos` | Autenticado | Listado paginado con filtros |
| `GET` | `/productos/pull` | Autenticado | Cambios incrementales del catálogo |
| `POST` | `/productos` | Administrador | Crear un producto |
| `PUT` | `/productos/:id` | Administrador | Actualizar parcialmente un producto |
| `DELETE` | `/productos/:id` | Administrador | Desactivar un producto |
| `GET` | `/categorias` | Autenticado | Listar categorías activas |

### Clientes

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/clientes` | Autenticado | Listado paginado |
| `GET` | `/clientes/:id` | Autenticado | Obtener un cliente |
| `GET` | `/clientes/pull` | Usuario + dispositivo | Cambios incrementales para uso offline |
| `POST` | `/clientes` | Administrador o vendedor | Crear un cliente |
| `PUT` | `/clientes/:id` | Administrador o vendedor | Actualizar un cliente |
| `DELETE` | `/clientes/:id` | Administrador | Desactivar un cliente |

### Proveedores

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/proveedores` | Autenticado | Listado paginado |
| `GET` | `/proveedores/:id` | Autenticado | Obtener un proveedor |
| `POST` | `/proveedores` | Administrador | Crear un proveedor |
| `PUT` | `/proveedores/:id` | Administrador | Actualizar un proveedor |
| `DELETE` | `/proveedores/:id` | Administrador | Desactivar un proveedor |

### Inventario, ventas y sincronización

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/inventario` | Autenticado | Consultar existencias por sucursal |
| `GET` | `/inventario/pull` | Usuario + dispositivo | Descargar cambios de stock de la sucursal del dispositivo |
| `POST` | `/inventario/ajustes` | Administrador | Registrar una entrada o corrección de inventario |
| `POST` | `/ventas/push` | Usuario + dispositivo | Sincronizar un lote idempotente de ventas offline |
| `GET` | `/sincronizacion/status` | Autenticado | Consultar el estado general de sincronización |

### Estado del servicio

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/health` | No | Liveness del proceso |
| `GET` | `/ready` | No | Readiness del proceso y MySQL |

Los errores usan un formato uniforme:

```json
{
  "success": false,
  "error": {
    "code": "CODIGO_ESTABLE",
    "message": "Mensaje seguro para el cliente",
    "requestId": "uuid"
  }
}
```

---

## 📱 Motor offline (`client-sync/`)

`client-sync/` es un módulo JavaScript independiente del framework visual. El frontend debe proporcionar Dexie 4 e integrar las funciones exportadas desde `client-sync/src/index.js`.

Flujo esperado:

1. Autenticar al usuario y registrar la sesión en `setAuthContext`.
2. Inicializar `PosDatabase` sobre IndexedDB.
3. Ejecutar `pullCatalogo`, `pullClientes` y `pullInventario` cuando exista conexión.
4. Resolver búsquedas locales con `buscarProductosOffline`, incluso sin red.
5. Crear ventas con `crearVentaLocal`; se guardan en la cola `pending`.
6. Ejecutar `syncPendingSales` o `startAutoSync` al recuperar conectividad.
7. Marcar como definitivos los rechazos de negocio y reintentar solamente errores transitorios.

Ejemplo de búsqueda local:

```js
import { buscarProductosOffline } from './client-sync/src/index.js';

const productos = await buscarProductosOffline(db, {
  q: '7501234567890',
  sucursalId: 1,
  soloConStock: true,
});
```

El backend vuelve a validar precios, descuentos, impuestos, stock y permisos. Los datos calculados por el cliente nunca se consideran una fuente de verdad.

---

## 🧪 Pruebas y calidad

### Backend

```powershell
# Pruebas unitarias
npm test

# Pruebas de integración con MySQL real
npm run test:integration

# Cobertura
npm run test:coverage

# Análisis estático
npm run lint
```

Usa una base MySQL exclusiva para las pruebas de integración: esos escenarios crean y modifican datos.

### Motor offline

```powershell
Set-Location client-sync
npm test
npm run typecheck
```

---

## 📁 Estructura del proyecto

```text
pos-movil/
├── src/
│   ├── config/          # Entorno, conexión MySQL y logger
│   ├── controllers/     # Adaptación HTTP
│   ├── errors/          # Taxonomía AppError
│   ├── middlewares/     # Auth, roles, dispositivo, validación y errores
│   ├── repositories/    # Acceso parametrizado a MySQL
│   ├── routes/          # Endpoints de /api/v1
│   ├── services/        # Reglas de negocio y transacciones
│   ├── utils/           # Dinero, fechas y funciones auxiliares
│   ├── validators/      # Contratos Zod
│   ├── app.js           # Configuración de Express
│   └── server.js        # Arranque y cierre controlado
├── database/
│   ├── schema.sql       # Estructura final reproducible de MySQL
│   ├── scripts/         # Seeder y aprovisionamiento
│   └── seeders/         # Datos demo opcionales
├── client-sync/
│   ├── src/             # IndexedDB, búsqueda, ventas y sincronización
│   └── tests/           # Pruebas del módulo offline
├── tests/
│   ├── unit/            # Pruebas aisladas del backend
│   └── integration/     # Escenarios reales contra MySQL
├── docs/                # Guía técnica consolidada
├── .env.example         # Plantilla segura de configuración
├── package.json         # Dependencias y comandos del backend
└── README.md
```

La explicación general del sistema está en [docs/guia-del-proyecto.md](docs/guia-del-proyecto.md).

---

## 🔧 Comandos npm

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el backend en desarrollo con `node --watch` |
| `npm start` | Inicia el backend con `NODE_ENV=production` |
| `npm test` | Ejecuta pruebas unitarias sin integración MySQL |
| `npm run test:integration` | Ejecuta también las pruebas contra MySQL |
| `npm run test:coverage` | Genera el reporte de cobertura |
| `npm run lint` | Ejecuta ESLint |
| `npm run seed` | Crea los datos base de forma idempotente |
| `npm run device:provision` | Aprueba o bloquea un dispositivo |

---

## 🌐 Variables de entorno

La lista completa y comentada se encuentra en `.env.example`. Las principales son:

### Servidor y base de datos

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto HTTP |
| `LOG_LEVEL` | `debug` | Nivel de logs |
| `DATABASE_HOST` | `127.0.0.1` | Servidor MySQL |
| `DATABASE_PORT` | `3306` | Puerto MySQL |
| `DATABASE_NAME` | `pos_movil_residencia` | Nombre de la base |
| `DATABASE_USER` | `root` | Usuario local; en producción usa uno de privilegios mínimos |
| `DATABASE_PASSWORD` | — | Contraseña de MySQL |
| `DB_CONNECTION_LIMIT` | `10` | Máximo de conexiones del pool |
| `DB_QUEUE_LIMIT` | `100` | Máximo de solicitudes en espera |

### Autenticación y seguridad

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | Secreto del access token; mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | — | Secreto diferente para refresh tokens |
| `JWT_ACCESS_EXPIRES` | `15m` | Duración del access token |
| `JWT_REFRESH_EXPIRES` | `30d` | Duración del refresh token |
| `BCRYPT_SALT_ROUNDS` | `12` | Costo de bcrypt |
| `CORS_ORIGIN` | `http://localhost:5173` | Orígenes permitidos separados por coma |
| `TRUST_PROXY` | `false` | Proxy o CIDR en el que Express puede confiar |

### Bloqueo de acceso por cuenta

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `AUTH_ACCOUNT_MAX_FAILURES` | `5` | Fallos antes de bloquear la cuenta |
| `AUTH_ACCOUNT_LOCK_SECONDS` | `900` | Duración del bloqueo |

### Herramientas administrativas

| Variable | Uso |
|---|---|
| `SEED_ADMIN_PASSWORD` | Contraseña del administrador que crea el seeder |
| `DEVICE_ACTION` | `approve` o `block` |
| `DEVICE_IDENTIFIER` | Identificador estable del dispositivo |
| `DEVICE_SECRET` | Secreto requerido al aprobarlo |
| `DEVICE_SUCURSAL_ID` | Sucursal asignada al dispositivo |
| `DEVICE_DESCRIPTION` | Descripción opcional |

El arranque valida la configuración mediante Zod y termina inmediatamente si falta un valor obligatorio o si es inválido.

---

## 🛡️ Seguridad aplicada

- Consultas parametrizadas mediante `mysql2`.
- Hash de contraseñas y secretos con bcrypt.
- Access tokens de corta duración y refresh tokens rotatorios.
- Detección de reuso de refresh token y revocación de la familia comprometida.
- Bloqueo distribuido por cuenta después de varios fallos de login.
- Dispositivos con secreto, estado aprobado/bloqueado y sucursal vinculada.
- CORS por allowlist, Helmet y límite JSON de 512 KB.
- Autorización por rol en cada operación de escritura restringida.
- Errores de producción sin sentencias SQL ni stacks expuestos al cliente.
- `.env`, dependencias, cobertura y logs excluidos del repositorio.

Si se despliega detrás de Nginx, IIS o un balanceador, configura `TRUST_PROXY` con la IP o red exacta del proxy. No se acepta `true`, para evitar confiar ciegamente en cabeceras reenviadas.

---

## 🧹 Notas de desarrollo

- El backend usa CommonJS y `client-sync/` usa módulos ES.
- `npm run dev` emplea el modo watch nativo de Node.js; no requiere Nodemon.
- Los importes se transforman a centavos antes de realizar operaciones aritméticas.
- El pull incremental usa cursores compuestos para no perder filas con la misma marca de tiempo.
- El catálogo offline conserva registros inactivos como tombstones para retirar datos locales correctamente.
- `database/schema.sql` es la fuente de verdad de la estructura final. Si modificas MySQL, vuelve a exportar y sanear ese archivo antes de publicar el cambio.
- Los datos en `database/seeders/datos_demo.sql` son opcionales y no forman parte del arranque normal.

---

## 📚 Documentación técnica

- [Guía general del proyecto](docs/guia-del-proyecto.md)

---

## ☁️ Antes de publicar en GitHub

Comprueba exactamente qué se enviará:

```powershell
git status --short
git ls-files
git check-ignore -v .env
```

El último comando debe confirmar que `.env` está ignorado. No publiques secretos, dumps con datos reales, logs ni archivos de cobertura.

---

## 🆘 Solución rápida de problemas

### No se puede importar `database/schema.sql`

- Confirma que MySQL está iniciado.
- Revisa host, puerto, usuario, contraseña y permisos configurados localmente.
- Confirma que la base indicada en `DATABASE_NAME` existe y coincide con la usada en el comando de importación.

### `/health` responde pero `/ready` devuelve 503

El proceso HTTP funciona, pero MySQL no está disponible o su configuración no es válida.

### Login correcto, pero la sincronización responde `DISPOSITIVO_REQUERIDO`

Aprueba el dispositivo con `npm run device:provision` y envía `X-Device-Id` y `X-Device-Secret`.

## 📝 Licencia

El paquete está marcado actualmente como `UNLICENSED`. Antes de publicarlo como software reutilizable, agrega una licencia explícita elegida por los responsables del proyecto.

