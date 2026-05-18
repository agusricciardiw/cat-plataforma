# CAT Plataforma (SIGAT)

Sistema de gestión del Cuerpo de Agentes de Tránsito · DGCAT · GCBA.

Gestiona órdenes de servicio, servicios adicionales privados, presupuestos, liquidaciones, facturación a clientes, nómina y administración de usuarios y permisos.

---

## Estructura

```
cat-plataforma/
├── backend/      # Node.js + Express (API REST + WebSocket)
├── frontend/     # React + Vite (SPA)
├── CHANGELOG.md  # Historial de versiones
└── UPGRADE.md    # Instrucciones de migración entre versiones
```

## Requisitos

- **Node.js** 22.x LTS (homologado ASI; ver `project_asi_estandares` en memoria)
- **PostgreSQL** 15.13 o superior
- **npm** (incluido con Node)
- **Windows / Linux / macOS** (desarrollo). Producción: OpenShift on-prem ASI.

## Setup local

### 1. Clonar el repositorio

```powershell
git clone https://github.com/agusricciardiw/cat-plataforma.git
cd cat-plataforma
git checkout agustin
```

### 2. Crear la base de datos

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE cat_plataforma;"
```

### 3. Configurar variables de entorno

#### `backend/.env`

```env
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cat_plataforma
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT (provisorio — futuro: Keycloak OIDC del GCBA)
JWT_SECRET=cambiar_por_string_aleatorio_largo
JWT_EXPIRES_IN=8h

# CORS
FRONTEND_URL=http://localhost:5173

# Archivos (futuro: storage S3-compatible del GCBA)
UPLOADS_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

#### `.env` (raíz, para el frontend Vite)

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=tu_key   # pendiente: migrar a Mapa GCBA
```

### 4. Instalar dependencias

```powershell
cd backend
npm install
cd ../frontend
npm install
```

### 5. Correr migraciones y seed

```powershell
cd backend
npm run db:migrate
npm run db:seed
```

### 6. Levantar

En dos terminales:

```powershell
# Terminal 1 — backend (puerto 3000)
cd backend
npm run dev

# Terminal 2 — frontend (puerto 5173)
cd frontend
npm run dev
```

## Endpoints de salud

| Endpoint | Propósito |
|---|---|
| `GET /api/health` | Compat (responde si el proceso vive) |
| `GET /api/health/live` | Liveness probe — proceso responde |
| `GET /api/health/ready` | Readiness probe — DB accesible |

## Scripts disponibles

### Backend (`backend/package.json`)

| Script | Acción |
|---|---|
| `npm run dev` | Levanta el backend con nodemon (auto-reload) |
| `npm start` | Levanta el backend en modo producción |
| `npm run db:migrate` | Ejecuta migraciones SQL |
| `npm run db:seed` | Carga datos iniciales |

### Frontend (`frontend/package.json`)

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint sobre el código fuente |

## Módulos principales

- **Misiones** — Operativo cotidiano de agentes
- **OS / OS Adicional** — Órdenes de Servicio (ordinarias y adicionales)
- **Presupuestos** — Cotización de servicios adicionales privados
- **Servicios / SS.AA.** — Pipeline completo de servicios adicionales
- **Cobros / Facturación** — Liquidación a agentes + facturación a clientes (LOYS)
- **Nómina / Equipo** — Gestión del personal
- **Admin** — Usuarios, roles y permisos RBAC

## Roles del sistema

`gerencia`, `jefe_base`, `coordinador`, `supervisor`, `agente`, `admin`, `director`, `planeamiento`, `jefe_cgm`, `coordinador_cgm`, `operador_adicionales`, `operador_disciplinario` (y otros — ver tabla `roles` en DB).

## Branching y entrega

- **`agustin`** — rama de desarrollo activa
- **`develop`** — integración (a establecer)
- **`master`** — releases formales con tag semver (a establecer)

Cada release lleva un tag `vMAJOR.MINOR.PATCH`. Ver [CHANGELOG.md](CHANGELOG.md) e [UPGRADE.md](UPGRADE.md).

## Contexto institucional

Producto en uso real institucional (no side-project). El host final es **OpenShift on-prem en el Data Center de la ASI (Agencia de Sistemas de Información del GCBA)**. Cumple los estándares **ES0901 (Desarrollo) v6.3** y **ES0902 (Seguridad) v6.2** publicados en https://buenosaires.gob.ar/gcaba_historico/agencia-de-sistemas-de-informacion/estandares-de-la-agencia
