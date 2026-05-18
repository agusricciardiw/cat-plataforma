# Documento de Arquitectura — SIGAT (CAT Plataforma)

> **Sistema:** SIGAT — Sistema Integrado de Gestión del CAT
> **Repartición:** DGCAT — Dirección General Cuerpo de Agentes de Tránsito · GCBA
> **Entregado a:** ASI — Agencia de Sistemas de Información del GCBA
> **Estándares de referencia:** ES0901 v6.3 (Desarrollo), ES0902 v6.2 (Seguridad), ES0903 v2.2 (API)
> **Versión del documento:** 1.0 (2026-05-18)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura física](#3-arquitectura-física)
4. [Arquitectura lógica](#4-arquitectura-lógica)
5. [Módulos de negocio](#5-módulos-de-negocio)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Integraciones](#7-integraciones)
8. [Seguridad](#8-seguridad)
9. [Especificaciones no funcionales](#9-especificaciones-no-funcionales)
10. [Operación y observabilidad](#10-operación-y-observabilidad)
11. [Roles y permisos](#11-roles-y-permisos)
12. [Anexos](#12-anexos)

---

## 1. Resumen ejecutivo

SIGAT es el sistema operativo digital de la Dirección General Cuerpo de Agentes de Tránsito (DGCAT) del GCBA. Gestiona la operatoria diaria del Cuerpo y la totalidad del ciclo de **servicios adicionales privados** prestados por agentes a beneficiarios externos.

**Funcionalidad core:**

- Misiones operativas y asignación de agentes a bases
- Órdenes de Servicio (OS) ordinarias y de alcoholemia
- Pipeline completo de Servicios Adicionales (SS.AA.): presupuesto → BUI → OS Adicional → convocatoria → postulación pública → presentismo → liquidación → facturación al cliente
- Nómina, equipo y gestión de personal
- Administración de usuarios, roles y permisos (RBAC dinámico)

**Usuarios:**

Personal interno del GCBA-DGCAT (~12-15 roles diferenciados, ver §11). Las dos únicas vías de acceso sin autenticación son los formularios públicos de postulación (`/postular/:token`) y de presentación de factura por parte del agente (`/facturar/:token`), protegidos con tokens de un solo uso y rate limiting.

**Modalidad de operación:** 24×7 sin ventana de mantenimiento (ES0901 6.5).

---

## 2. Stack tecnológico

### 2.1 Lenguajes y runtimes

| Componente | Tecnología | Versión actual | Versión homologada ASI |
|---|---|---|---|
| Backend runtime | Node.js | 24.x | 22.19.0 LTS (próximo: 24.13.0) |
| Backend framework | Express.js | 4.19 | NestJS / Express / Fastify |
| Frontend runtime | React + Vite | React 19.2 / Vite 8 | React 18.3-19.1.2 |
| Frontend router | React Router | 7.13 | — |
| Lenguaje | JavaScript (CommonJS en backend, ESM en frontend) | — | — |
| Package manager | npm | 10.x | npm |

### 2.2 Persistencia

| Componente | Tecnología | Versión actual | Versión homologada ASI |
|---|---|---|---|
| RDBMS | PostgreSQL | 18.3 | 15.13 (en revisión con ASI) |
| Cliente Node | `pg` | 8.12 | — |
| Migraciones | Scripts SQL versionados en `backend/src/db/` | — | — |
| Object storage (dev) | filesystem local (`backend/uploads/`) | — | — |
| Object storage (prod) | S3-compatible — HCP del GCBA cuando ASI lo provea | — | HCP (S3 protocol) |

### 2.3 Librerías clave (backend)

| Categoría | Librería | Versión | Uso |
|---|---|---|---|
| Auth | `jsonwebtoken` | 9.0 | Firmar JWTs (driver `jwt-local`); aislado en adapter |
| Auth | `bcryptjs` / `bcrypt` | 2.4 / 6.0 | Hash de contraseñas |
| Validación | `joi` | 18.1 | Schemas de validación en boundary |
| HTTP | `cors`, `helmet` | 2.8 / 7.1 | CORS dinámico, security headers |
| Rate limit | `express-rate-limit` | 7.3 | Límites en rutas públicas |
| Logging | `pino`, `pino-http` | 9.x / 10.x | Logs estructurados JSON (ELK-ready) |
| Storage S3 | `@aws-sdk/client-s3` | 3.x | Driver S3 del storage adapter |
| Sockets | `socket.io` | 4.7 | Realtime push (notificaciones por base) |
| Multipart | `multer` | 1.4 | Upload de archivos (memoryStorage) |
| Mail | `nodemailer` | 8.x | SMTP O365 institucional |
| Parsers | `csv-parse` | 6.x | Import de nómina |

### 2.4 Librerías clave (frontend)

| Categoría | Librería | Uso |
|---|---|---|
| Mapas | `leaflet` + `leaflet-geoman-free` + `leaflet-draw` | Mapa interactivo (a migrar a Mapa GCBA) |
| PDFs | `jspdf`, `html2canvas` | Generación client-side de reportes y presupuestos |
| Drag & drop | `@dnd-kit/core` | Reordenamiento en tablas operativas |
| Charts | `react-organizational-chart` | Organigrama de equipo |
| Realtime | `socket.io-client` | Notificaciones desde el backend |

### 2.5 Containerización

- `backend/Dockerfile` — multi-stage Node 22 Alpine, user no-root, tini PID 1, healthcheck contra `/api/health/live`, OpenShift-ready (grupo 0 con permisos `g=u`).
- `frontend/Dockerfile` — multi-stage Vite build + nginx 1.27 Alpine en puerto 8080, SPA fallback, security headers, healthcheck `/healthz`.

---

## 3. Arquitectura física

### 3.1 Entorno objetivo (producción ASI)

```
                          Internet / Intranet GCBA
                                    │
                          ┌─────────▼─────────┐
                          │   WAF + Reverse   │
                          │     Proxy ASI     │
                          └─────────┬─────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  Load Balancer L7 │
                          │   (Round Robin)   │
                          └─────────┬─────────┘
                                    │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼────┐                ┌────▼────┐                ┌────▼────┐
   │  Pod 1  │                │  Pod 2  │                │  Pod N  │
   │ sigat-  │                │ sigat-  │                │ sigat-  │
   │ backend │                │ backend │                │ backend │
   │  :3000  │                │  :3000  │                │  :3000  │
   └────┬────┘                └────┬────┘                └────┬────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
            ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
            │PostgreSQL │    │   HCP     │    │ Keycloak  │
            │ (ASI DC,  │    │ (S3 GCBA, │    │ (DGSEI,   │
            │ fuera de  │    │ archivos) │    │ identidad)│
            │OpenShift) │    └───────────┘    └───────────┘
            └───────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                                  │
            ┌─────▼─────┐                     ┌─────▼─────┐
            │   ELK     │                     │   ESB     │
            │ (logs)    │                     │ (integ.   │
            │           │                     │  GCBA)    │
            └───────────┘                     └───────────┘

   ┌─────────┐
   │ SPA en  │  ← Servido desde otro Pod (nginx) con bundle estático
   │  CDN /  │     buildeado contra VITE_API_URL=<URL backend>
   │ nginx   │
   └─────────┘
```

### 3.2 Premisas físicas (ES0901 6.1-6.5)

- **DMZ** con balanceador L7 round-robin.
- **Pods stateless**: no escriben información persistente en su filesystem (logs temporales y debug OK, todo lo demás va a Postgres o HCP).
- **DB fuera de OpenShift**, gestionada por ASI.
- **Modo 24×7** sin ventana de mantenimiento. Updates con rolling deploy (Pod por Pod).
- **DNS obligatorio**, IPs nunca hardcoded en config.
- **Granjas independientes**: ningún acoplamiento entre Pods (sin sticky sessions; socket.io requiere sticky pero hoy SIGAT puede tolerar reconexión).

### 3.3 Entorno actual de desarrollo

- `localhost:3000` — backend Node con nodemon
- `localhost:5173` — frontend Vite con HMR
- `localhost:5432` — PostgreSQL local (Windows service `postgresql-x64-18`)
- Filesystem local `backend/uploads/` para storage (driver `local`)
- JWT propio (driver `jwt-local`) — sin Keycloak local

### 3.4 Entorno de staging dockerizado (verificado en sesión 2026-05-18)

- `sigat-backend:dev` — imagen OCI multi-stage
- `sigat-frontend:dev` — imagen OCI nginx con bundle Vite
- MinIO local como stand-in del HCP (`localhost:9000`, bucket `sigat-uploads`)
- Postgres del host accedido vía `host.docker.internal`
- Validado: upload real de BUI por UI → archivo aparece en MinIO con nombre correcto.

---

## 4. Arquitectura lógica

### 4.1 Capas del backend

```
┌─────────────────────────────────────────────────────────────────┐
│  router/*.js          — definición de rutas + rate limit + auth │
├─────────────────────────────────────────────────────────────────┤
│  middleware/auth.js   — authMiddleware + requireRole +          │
│                         requirePermiso (RBAC dinámico)          │
├─────────────────────────────────────────────────────────────────┤
│  controller/*.js      — orquestación de request/response,       │
│                         validación con Joi, manejo de errores   │
├─────────────────────────────────────────────────────────────────┤
│  service/*.js         — lógica de negocio (transacciones,       │
│                         flujos de estado, validaciones)         │
├─────────────────────────────────────────────────────────────────┤
│  model/*.js           — queries SQL (pg.Pool), advisory locks   │
├─────────────────────────────────────────────────────────────────┤
│  services/identity/   — adapter de identidad (driver swap)      │
│  services/storage/    — adapter de storage (driver swap)        │
│  services/mailer.js   — envío de mails SMTP institucional       │
├─────────────────────────────────────────────────────────────────┤
│  db/pool.js           — conexión PostgreSQL (Pool pg)           │
│  jobs/runner.js       — scheduler con advisory locks            │
│  logger.js            — pino + pino-http (ELK-compatible)       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Adapters (swappable providers)

Dos puntos del sistema están detrás de adapters para preparar la migración a la infra del GCBA sin reescribir código:

#### Identity (`backend/src/services/identity/`)

| Driver | Estado | Uso |
|---|---|---|
| `jwt-local` (default) | Activo | JWT firmado con HS256 + refresh tokens UUID en DB + blacklist `revoked_tokens` |
| `keycloak` | Stub | OIDC contra `identidad-gcaba.apps.buenosaires.gob.ar` (DGSEI). Plan en `keycloak.js` |

Switch vía `IDENTITY_PROVIDER=keycloak`. El resto del backend ya no toca `jsonwebtoken` directo — todo pasa por `identity.verifyToken()`, `identity.issueTokensForLogin()`, etc.

#### Storage (`backend/src/services/storage/`)

| Driver | Estado | Uso |
|---|---|---|
| `local` (default) | Activo | Filesystem `backend/uploads/` |
| `s3` | Activo (validado contra MinIO) | S3-compatible (HCP del GCBA en prod) |

Switch vía `STORAGE_DRIVER=s3` + vars `S3_*`. Todos los puntos del backend que escribían/leían/borraban archivos pasan por `storage.save()`, `storage.read()`, `storage.delete()`, `storage.publicUrl()`.

### 4.3 Capas del frontend

```
┌─────────────────────────────────────────────────────────────────┐
│  pages/*.jsx          — vistas top-level por ruta               │
├─────────────────────────────────────────────────────────────────┤
│  components/*.jsx     — componentes reutilizables               │
│  components/AppShell  — layout principal con sidebar real       │
│                         (Sidebar.jsx es archivo huérfano)       │
├─────────────────────────────────────────────────────────────────┤
│  lib/api.js           — cliente HTTP centralizado contra        │
│                         VITE_API_URL                            │
│  contexts/AuthContext — estado de auth + token + refresh        │
├─────────────────────────────────────────────────────────────────┤
│  SessionGuard         — protege rutas autenticadas, excluye     │
│                         /login, /postular/, /facturar/          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Patrones de coordinación

- **Advisory locks de PostgreSQL** para serializar generación de números (`numero_servicio`, `P-NNN/YYYY` en presupuestos) y para coordinar **jobs background** entre múltiples Pods (`pg_try_advisory_lock`, ver `jobs/runner.js`).
- **Transacciones cascadeadas** para mantener consistencia entre dominios (cancelar un servicio → presupuesto → OS adicional → SS.AA., todo en una sola transacción).
- **Tokens de un solo uso** para flujos públicos (postulación, facturación).
- **Realtime push** vía socket.io con autenticación por handshake (token JWT validado por el mismo adapter de identidad).

---

## 5. Módulos de negocio

| Módulo | Rutas frontend | Rutas API | Roles principales | Estado |
|---|---|---|---|---|
| Auth | `/login` | `/api/auth/*` | (sin auth) | ✅ |
| Misiones | `/misiones` | `/api/misiones` | jefe_base, supervisor, agente | ✅ |
| OS ordinarias / alcoholemia | `/os` | `/api/os` | jefe_base, coordinador, planeamiento | ✅ |
| OS Adicional | `/os-adicional`, `/os-adicional/:id` | `/api/os-adicional` | operador_adicionales | ✅ |
| Presupuestos | `/presupuestos` | `/api/presupuestos` | operador_adicionales, gerencia, director, jefe_cgm | ✅ |
| Servicios | `/servicios`, `/servicios/:id` | `/api/servicios` | gerencia, director, operador_adicionales | ✅ |
| Beneficiarios | (dentro de Servicios) | `/api/beneficiarios` | idem Servicios | ✅ |
| Servicios Adicionales (SS.AA.) | `/servicios-adicionales` | `/api/servicios-adicionales` | operador_adicionales, supervisor, agente | ✅ |
| Postulación pública | `/postular/:token` | `/api/postular/:token` | (sin auth, agente vía CUIT) | ✅ |
| Sanciones | (en SS.AA.) | `/api/sanciones` | operador_disciplinario | ✅ |
| Liquidaciones / Cobros | `/cobros` | `/api/liquidaciones` | RRHH (admin, gerencia, director, operador_adicionales, jefe_cgm) | ✅ |
| Facturación a clientes (LOYS) | `/facturacion` | `/api/facturacion` | idem RRHH | ✅ |
| Facturación pública (agente) | `/facturar/:token` | `/api/facturacion/form/:token` | (sin auth, vía token) | ✅ |
| Nómina | `/nomina`, `/importar-nomina` | `/api/profiles`, controllers de syncNomina | admin con permiso `ADMIN_IMPORTAR_NOMINA` | ✅ |
| Equipo | `/equipo` | `/api/profiles` | jefe_base, supervisor | ✅ |
| Admin Usuarios | `/admin/usuarios` | `/api/profiles` | admin | ✅ |
| Admin Roles/Permisos | `/admin/permisos` | `/api/permisos`, `/api/roles` | admin | ✅ |
| Config / SMTP | (en admin) | `/api/config` | admin (`FACTURACION_CONFIG_SMTP`) | ✅ |
| Mapa | (en componentes de OS) | `/api/mapa` | usuarios autenticados | ✅ |
| Actividad / Audit log | (panel admin) | `/api/actividad` | admin | ✅ |
| Upload genérico | (avatar) | `/api/upload` | usuarios autenticados | ✅ |

### 5.1 Pipeline de Servicios Adicionales (privado)

```
Beneficiario
    │
    ▼
Presupuesto (borrador → enviado → aprobado | rechazado | modificado | vencido)
    │
    ▼
Servicio creado al aprobar (numero_servicio formato "YY-N")
    │
    ▼
BUI emitida/pagada (PDF subido al storage)
    │
    ▼
OS Adicional (borrador → validacion → validada → vigente → cumplida | cancelada)
    │
    ▼
SS.AA. (pendiente → en_gestion → convocado → en_curso → cerrado | cancelado)
    │       │
    │       ▼
    │  Convocatoria pública (token único, agentes postulan via CUIT)
    │       │
    │       ▼
    │  Scoring + asignación de turnos (sa_estructura)
    │
    ▼
Presentismo (registrado por supervisor turno por turno)
    │
    ▼
sa_modulos_agente (módulos acreditados)
    │
    ▼
Liquidación (TXT bancario generado, archivo en storage)
    │
    ▼
Facturación LOYS (cada agente sube su factura vía link público)
    │
    ▼
Pagado
```

### 5.2 Jobs background

Tres jobs corren en intervalo, wrappeados con `pg_try_advisory_lock` para que en multi-Pod solo una instancia ejecute por tick (ver `backend/src/jobs/runner.js`):

| Job | Intervalo | Lock ID | Acción |
|---|---|---|---|
| `checkVigenciaCumplida` | 5 min | 4810001 | `UPDATE ordenes_servicio SET estado='cumplida'` cuando `vigencia_fin <= NOW()` |
| `checkServiciosEnCurso` | 1 min | 4810002 | `UPDATE servicios_adicionales SET estado='en_curso'` cuando arranca el primer turno |
| `limpiarTokensExpirados` | 1 hora | 4810003 | `DELETE FROM refresh_tokens / revoked_tokens WHERE expires_at < NOW()` |

---

## 6. Modelo de datos

PostgreSQL 18.3 (en prod ASI: 15.13 si se aprueba). 52 tablas, agrupadas por dominio funcional.

### 6.1 Diagrama de dominios (alto nivel)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Identidad y  │  │  Operativa   │  │   SS.AA. (pipe   │
│   RBAC       │  │  cotidiana   │  │   privado)       │
├──────────────┤  ├──────────────┤  ├──────────────────┤
│ profiles     │  │ bases        │  │ beneficiarios    │
│ roles        │  │ misiones     │  │ presupuestos     │
│ rol_permisos │  │ mision_      │  │ servicios        │
│ refresh_     │  │   agentes    │  │ os_adicional*    │
│   tokens     │  │ ordenes_     │  │ servicios_       │
│ revoked_     │  │   servicio   │  │   adicionales    │
│   tokens     │  │ os_items*    │  │ sa_*             │
│              │  │ os_fechas    │  │ liquidaciones    │
│              │  │ os_alcohol*  │  │ facturacion*     │
└──────────────┘  └──────────────┘  └──────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Documentos   │  │   Sistema    │  │   Auditoría      │
├──────────────┤  ├──────────────┤  ├──────────────────┤
│ beneficiario │  │ sistema_     │  │ actividad        │
│   _documen-  │  │   config     │  │                  │
│   tos        │  │ valor_uf_    │  │                  │
│ servicio_    │  │   historico  │  │                  │
│   documentos │  │ grupos /     │  │                  │
│              │  │ grupo_reglas │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
```

### 6.2 Tablas por dominio

#### Identidad y RBAC

| Tabla | Descripción |
|---|---|
| `profiles` | Usuario / agente (UUID PK). Campos de nómina (CUIT, legajo, cargo, función, etc.), `email`, `password_hash`, `role`, `base_id`, `turno`, `activo` |
| `roles` | Catálogo de roles (15 cargados, 12 documentados). Soporta roles custom |
| `rol_permisos` | M:N entre rol y permiso. Permisos hardcoded en código pero asignaciones dinámicas |
| `refresh_tokens` | Refresh tokens activos (UUID, profile_id, expires_at) |
| `revoked_tokens` | Blacklist de access tokens por `jti` (logout antes de expiración) |
| `bases` | Bases físicas del DGCAT |

#### Operativa cotidiana

| Tabla | Descripción |
|---|---|
| `misiones` | Asignación diaria de agentes a operativos |
| `mision_agentes` | M:N agente↔misión |
| `ordenes_servicio` | OS ordinarias y de alcoholemia (`tipo`, `estado`, `vigencia_fin`) |
| `os_items` | Ítems de cada OS (lugares/operativos puntuales) |
| `os_item_fechas`, `os_item_turnos`, `os_item_relevos` | Detalle temporal de cada ítem |
| `os_fechas` | Fechas globales de una OS |
| `os_alcoholemia_accesos` | Accesos específicos para OS de alcoholemia |

#### SS.AA. (pipeline privado)

| Tabla | Descripción |
|---|---|
| `beneficiarios` | Clientes externos que contratan servicios privados |
| `presupuestos` | Cotizaciones (`numero` `P-NNN/YYYY` auto-generado por trigger). `items` JSONB. Estados: borrador/enviado/aprobado/rechazado/modificado/vencido |
| `servicios` | Servicio comprometido al aprobar presupuesto (`numero_servicio` `YY-N` con advisory lock para evitar duplicados) |
| `os_adicional` | OS específica de servicios privados (separada de `ordenes_servicio` ordinarias) |
| `os_adicional_fechas`, `_turnos`, `_fases`, `_fase_zonas`, `_zonas`, `_elementos`, `_recursos` | Detalle estructural y de recursos de la OS Adicional |
| `servicios_adicionales` | SS.AA. ejecutable. Sin columna `nombre` (es `sa_nombre`). Estados: pendiente→en_gestion→convocado→en_curso→cerrado/cancelado |
| `sa_turnos` | Detalle de turnos (fecha + hora + dotación por rol — agentes, supervisores, motorizados, choferes, choferes_grua, coordinadores) |
| `sa_requerimientos` | Resumen de dotación requerida por rol y servicio |
| `sa_convocatoria` | Convocatoria pública asociada al servicio (token único) |
| `sa_convocatoria_tokens` | Tokens de postulación de un solo uso |
| `sa_postulantes` | Postulaciones recibidas |
| `sa_postulante_turnos` | Turnos asociados a cada postulación |
| `sa_estructura` | Asignación final de agentes a turnos tras scoring |
| `sa_presentismo` | Registro turno por turno (presente / ausente / justificado) |
| `sa_modulos_agente` | Módulos acreditados post-presentismo |
| `sa_recursos_estado` | Estado de recursos (motos, vehículos) por turno |
| `sa_penalizaciones`, `sa_sanciones` | Sanciones a postulantes/agentes |
| `sa_scoring_config` | Configuración del algoritmo de scoring (pesos, módulos in-flight, etc.) |

#### Cobros y facturación

| Tabla | Descripción |
|---|---|
| `liquidaciones` | Liquidación generada al cerrar servicios (TXT bancario referenciado en `txt_archivo`) |
| `liquidacion_detalle` | Detalle por agente |
| `facturacion_solicitudes` | Solicitud de facturación a beneficiario |
| `facturacion_items` | Item por agente (con `token` único para el form público) |
| `valor_uf_historico` | Histórico de UF (unidad funcional para liquidar) |

#### Documentos y otros

| Tabla | Descripción |
|---|---|
| `beneficiario_documentos` | Documentos de beneficiarios (PDF, DOCX, imágenes). Campo `nombre_archivo` apunta al objeto en el storage |
| `servicio_documentos` | Idem para servicios |
| `interrupciones` | Cortes/eventos que interrumpen un servicio |
| `grupos`, `grupo_reglas` | Configuración de agrupaciones / reglas |
| `actividad` | Audit log de acciones |
| `sistema_config` | Config dinámica (SMTP, otros) editable desde admin |

### 6.3 Invariantes técnicas a preservar

- **`pg_advisory_xact_lock`** en `model/servicios.js::generarNumero` para evitar duplicación de `numero_servicio` bajo concurrencia.
- **Cascada transaccional** de `cancelarServicio`: servicio → presupuesto → OS adicional → SS.AA., toda en una sola transacción.
- **Scoring de SS.AA. cuenta módulos in-flight** (no solo acreditados): suma `sa_modulos_agente` + `sa_estructura JOIN sa_convocatoria` con estados pendiente/confirmado. Filtro `NOT EXISTS sa_presentismo` evita doble conteo.
- **Período de scoring** = mes del servicio que se arma (derivado de `MIN(sa_turnos.fecha)`), NO mes actual.
- **`mergeOsTurnosEnSA()`** sincroniza turnos al re-validar OS Adicional. Detecta conflictos (exceso de dotación/módulos, turnos nuevos, eliminados).
- **Dotación real** vive en `sa_turnos.dotacion_*` (6 columnas por rol). Las columnas summary en `servicios_adicionales.sa_dotacion_*` y `os_adicional.dotacion_*` (3 cols) suelen estar en 0, no son fuente de verdad.

---

## 7. Integraciones

### 7.1 Activas

| Integración | Tipo | Estado |
|---|---|---|
| **SMTP O365 institucional** (`cat-notificaciones@buenosaires.gob.ar`) | Saliente | Credenciales en DB (`sistema_config`), no `.env`. Editable desde admin con permiso `FACTURACION_CONFIG_SMTP` |
| **Google Maps** | Cliente | Frontend usa `VITE_GOOGLE_MAPS_API_KEY`. **A migrar a Mapa GCBA** (ES0901 D6) |
| **MinIO / S3 / HCP** | Cliente | Storage adapter `s3` validado contra MinIO; en prod ASI apuntará al HCP |
| **Keycloak (futuro)** | Cliente OIDC | Stub listo en `services/identity/keycloak.js`, activación via `IDENTITY_PROVIDER=keycloak` |

### 7.2 Pendientes para producción ASI

| Integración | Requisito | Estado |
|---|---|---|
| **Keycloak OIDC del GCBA** | ES0902 C1 — obligatorio para auth | Stub; pendiente registro del cliente con DGSEI |
| **HCP del GCBA** | ES0901 8.4 — obligatorio para storage | Adapter listo; pendiente credenciales |
| **API GEO del catálogo GCBA** | ES0901 8.3 + D5 — validar/normalizar direcciones | Pendiente |
| **Mapa GCBA** | ES0901 D6 — reemplazar Google Maps | Pendiente |
| **ESB del GCBA** | ES0901 8.1 — integraciones entre sistemas GCBA | N/A hoy (SIGAT no integra con otros sistemas todavía) |
| **ELK del GCBA** | ES0901 6.7 — logs centralizados | Logger pino ya emite JSON ELK-ready; pendiente shipping endpoint |

### 7.3 Rutas públicas (sin auth, vía token)

Dos endpoints en el backend permiten acceso anónimo con token de un solo uso:

| Ruta | Propósito | Token | Rate limit |
|---|---|---|---|
| `GET/POST /api/postular/:token` | Form de postulación a SS.AA. | `sa_convocatoria_tokens` | 60 GET / 5 POST por IP / 15min |
| `GET/POST /api/facturacion/form/:token` | Form de presentación de factura por agente | `facturacion_items.token` | 60 GET / 5 POST por IP / 15min |

El frontend tiene rutas equivalentes (`/postular/:token`, `/facturar/:token`) explícitamente excluidas del `SessionGuard`.

---

## 8. Seguridad

### 8.1 Autenticación

**Estado actual** (driver `jwt-local`):
- Login con email + password (bcrypt hash en `profiles.password_hash`)
- Access token JWT firmado con HS256 + secret en env `JWT_SECRET`. Payload: `{ id, email, role, base_id, turno, nombre_completo, legajo, jti }`. Default TTL: 8h.
- Refresh token UUID v4 persistido en `refresh_tokens` con rotación en cada uso. TTL: 7 días.
- Logout invalida el refresh + agrega el `jti` a `revoked_tokens` (blacklist hasta `exp`).
- Cada request autenticada pasa por `authMiddleware` que verifica firma + chequea blacklist.

**Estado objetivo ASI** (driver `keycloak`):
- Redirect OIDC authorization_code + PKCE contra `identidad-gcaba.apps.buenosaires.gob.ar`.
- Backend recibe access token de Keycloak por Authorization Bearer; valida con JWKS del realm.
- Roles siguen administrándose en SIGAT (mapeo `sub` o `email` → `profiles.id`).
- Endpoints de login/refresh propios devuelven HTTP 501.

### 8.2 Autorización (RBAC)

Dos mecanismos coexisten:

1. **`requireRole('admin', 'gerencia', ...)`** — check estático contra un set de roles. Usado en routers para gates simples.
2. **`requirePermiso('VER_SSAA')`** — check dinámico contra `rol_permisos`. Admin siempre pasa. Soporta roles custom. Usado para permisos finos.

Lista completa de permisos en `§11`.

### 8.3 Rate limiting

| Ruta | Límite | Configurable |
|---|---|---|
| `POST /api/auth/login` | 10 / 15min | `config.js` |
| `POST /api/auth/refresh` | 5 / 1min | hardcoded |
| `GET /api/postular/:token` | 60 / 15min | `RATE_LIMIT_*` |
| `POST /api/postular/:token` | 5 / 15min | idem |
| `GET /api/facturacion/form/:token` | 60 / 15min | idem |
| `POST /api/facturacion/form/:token` | 5 / 15min | idem |

### 8.4 Headers y CORS

- **`helmet()`** aplica defaults seguros (X-Frame-Options, X-Content-Type-Options, X-Powered-By off, etc.).
- **CORS dinámico** valida origen contra una whitelist (localhost dev + `FRONTEND_URL` prod).
- **Frontend nginx** suma `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### 8.5 Manejo de datos sensibles

- Passwords almacenados como **bcrypt hash** (`profiles.password_hash`), nunca en texto plano.
- **Redaction automática en logs**: `password`, `password_hash`, `token`, `accessToken`, `refreshToken`, `JWT_SECRET`, `authorization`, `cookie` y variantes son enmascarados como `[REDACTED]` antes de salir al transporte pino.
- **SMTP password** en DB cifrado por la app (`sistema_config`). El `.env` solo tiene placeholders/defaults.

### 8.6 Validación de inputs

- **Joi schemas** en `service/validaciones/*` para todos los endpoints que reciben body.
- **Magic bytes** verificados para todos los uploads (`service/upload.js` para imágenes, `service/uploadDocumento.js` para PDF/Office/imágenes). El cliente puede mentir en MIME y extensión; los bytes iniciales del archivo no.
- **CUIT format** validado con regex `^\d{11}$` (sin guiones).
- **UUID format** validado antes de queries contra tokens (evita exponer errores SQL al cliente — ES0902 Vu6/Vu7).

### 8.7 OWASP Top 10 — estado

| Riesgo | Mitigación actual | Pendiente |
|---|---|---|
| A01 Broken Access Control | `authMiddleware` + `requireRole`/`requirePermiso` en todos los routers privados | Audit sistemática (#10 backlog) |
| A02 Cryptographic Failures | bcrypt para passwords, TLS in transit (vía ASI), redaction en logs | Cifrado en reposo de archivos sensibles (lo provee HCP) |
| A03 Injection | `pg` parameterizado en todas las queries (sin string concat); Joi en boundary | — |
| A04 Insecure Design | Adapters de identity/storage, advisory locks, transacciones cascadeadas | — |
| A05 Security Misconfiguration | helmet, CORS dinámico, security headers en nginx | Hardening completo (CSP) |
| A06 Vulnerable Components | `npm audit` periódico (manual hoy, automático con #8 CI) | Pipeline CI con Retire.js + gemnasium |
| A07 ID and Auth Failures | Rate limit en login/refresh/rutas públicas, JWT con jti + blacklist | Migración a Keycloak |
| A08 Software/Data Integrity | Build determinístico con package-lock.json, hash de docker images | SAST automático |
| A09 Logging Failures | pino estructurado, request ID, redaction, niveles | Shipping a ELK del GCBA |
| A10 SSRF | Sin user-supplied URLs en el backend | — |

---

## 9. Especificaciones no funcionales

### 9.1 Performance (ES0901 cap. 11)

- **Inicio < 60s** (timeout de scaling de OpenShift). SIGAT arranca actualmente en ~3s en dev.
- **Request < 30s** (timeout HTTP de OpenShift). Endpoints actuales responden en <500ms en dev. Pendiente medición bajo carga real.
- **Cache de datos**: hoy sin cache layer; en prod ASI usaremos Redis del GCBA para endpoints pesados (scoring, listados grandes).
- **Cache de estáticos**: Varnish del GCBA en prod; en dev nginx con `Cache-Control: public, immutable` para `/assets/<hash>`.

### 9.2 Disponibilidad

- **24×7 sin ventana de mantenimiento**. Updates con rolling deploy Pod-by-Pod.
- **Backups**: gestionados por ASI (Postgres y HCP). En caliente, sin downtime.
- **Modo degradado**: en caso de caída de DB, `/api/health/ready` devuelve 503 → OpenShift retira el Pod del balanceador hasta que recupere.

### 9.3 Escalabilidad

- **Horizontal** sobre OpenShift: N réplicas del backend stateless; jobs internos coordinados con `pg_try_advisory_lock`.
- **Vertical** en la DB: queda en manos de ASI escalar la instancia Postgres.
- **Socket.io**: la implementación actual no soporta cluster sin sticky sessions o un adapter Redis. Para escala >1 Pod con socket habilitará Redis del GCBA (pendiente).

### 9.4 Mantenibilidad

- **Logs estructurados** con `req_id`, `user_id`, módulo y nivel → trazabilidad granular.
- **Health checks** dedicados para liveness y readiness.
- **Adapters swap** → cambios de proveedor son sólo configuración.

---

## 10. Operación y observabilidad

### 10.1 Logs (ES0901 6.7, cap. 11 Auditoría)

- **Formato**: JSON línea-por-línea en prod (`NODE_ENV=production`), pretty colorizado en dev.
- **Stack destino**: ELK del GCBA (Elasticsearch + Logstash + Kibana).
- **Campos base** en cada evento: `timestamp` (ISO 8601), `level` (string), `service: "sigat-backend"`, `env`, `module` (opcional, vía child loggers).
- **Request logs**: `req_id` autogenerado, método, URL, statusCode, responseTime, `user_id` (si está autenticado).
- **Niveles**: configurables vía env `LOG_LEVEL`. Default `info` en prod, `debug` en dev.
- **Redaction**: campos sensibles enmascarados antes del transporte (ver §8.5).
- **Health checks skipeados** del autoLogging para no inundar logs con el ruido del orquestador.

### 10.2 Monitoreo

- **`/api/health/live`** → liveness probe (proceso responde, sin chequear deps).
- **`/api/health/ready`** → readiness probe (`SELECT 1` a DB; 503 si falla).
- **HEALTHCHECK del container** (Docker/OpenShift): cada 30s pega a `/api/health/live`.
- **`docker inspect`** en CI/staging puede leer `.State.Health.Status` para validar deploys.

### 10.3 Deployment

- **Build**: `docker build -f backend/Dockerfile backend/` y `docker build -f frontend/Dockerfile .`.
- **Registry**: ASI proveerá registry interno para push de imágenes homologadas.
- **CD**: pipeline automático en OpenShift (ES0901 cap. 10, Anexo III).
- **Variables sensibles**: pasadas como env vars del Pod (ConfigMap + Secret de OpenShift), no en la imagen.

### 10.4 Backups

- Gestionados íntegramente por ASI:
  - Postgres: backups totales/incrementales en caliente
  - HCP: replicación interna del servicio
- No hay archivos críticos en el filesystem de los Pods (todo el state vive en DB y HCP).

### 10.5 Rollback

- **Código**: `git revert` + redeploy. Plan documentado en `UPGRADE.md` por versión.
- **DB**: migraciones idempotentes en `backend/src/db/migrate_*.js`. Restore desde backup ASI si hace falta.
- **Imágenes**: tags semver permiten rollback a versión anterior con un cambio de tag en OpenShift.

---

## 11. Roles y permisos

### 11.1 Roles del sistema

15 roles cargados en la DB; los 12 documentados:

`gerencia`, `jefe_base`, `coordinador`, `supervisor`, `agente`, `admin`, `director`, `planeamiento`, `jefe_cgm`, `coordinador_cgm`, `operador_adicionales`, `operador_disciplinario`.

Roles custom soportados (extensible vía `/admin/permisos`).

### 11.2 Permisos clave (RBAC dinámico)

Visualización por módulo: `VER_OS`, `VER_OS_ADICIONAL`, `VER_SSAA`, `VER_MISIONES`, `VER_EQUIPO`, `VER_SERVICIOS`, `VER_PRESUPUESTOS`, `VER_COBROS`, `VER_FACTURACION`, `VER_NOMINA`.

SS.AA.: `SSAA_CREAR`, `SSAA_ARMADO`, `SSAA_CONVOCATORIA`, `SSAA_PRESENTISMO`, `SSAA_POSTULANTES`, `SSAA_AVANZAR_ESTADO`, `SSAA_REVISAR_CAMBIOS`, `SSAA_CONFIG_SCORING`.

Cobros: `COBROS_NUEVA_LIQUIDACION`, `COBROS_ACTUALIZAR_UF`.

Facturación: `FACTURACION_APROBAR`, `FACTURACION_RECHAZAR`, `FACTURACION_SUBSANAR`, `FACTURACION_CONFIG_SMTP`.

Otros: `PRESUPUESTOS_MODIFICAR_APROBADO`, `ADMIN_IMPORTAR_NOMINA`.

### 11.3 Asignación rol↔permiso

Tabla `rol_permisos` (M:N). Editable desde `/admin/permisos` con permiso de admin.

---

## 12. Anexos

### 12.1 Variables de entorno

#### Backend (`backend/.env`)

```env
# Server
NODE_ENV=production               # development | production
PORT=3000
LOG_LEVEL=info                    # trace|debug|info|warn|error|fatal

# Database
DB_HOST=<host-postgres-asi>
DB_PORT=5432
DB_NAME=cat_plataforma
DB_USER=<user>
DB_PASSWORD=<password>

# Identity provider (jwt-local | keycloak)
IDENTITY_PROVIDER=jwt-local       # cambiar a keycloak en prod
JWT_SECRET=<random-strong-secret>
JWT_EXPIRES_IN=8h

# Keycloak (solo si IDENTITY_PROVIDER=keycloak)
KEYCLOAK_ISSUER=https://identidad-gcaba.apps.buenosaires.gob.ar/realms/gcaba
KEYCLOAK_CLIENT_ID=sigat
KEYCLOAK_AUDIENCE=sigat
KEYCLOAK_JWKS_URI=https://identidad-gcaba.apps.buenosaires.gob.ar/realms/gcaba/protocol/openid-connect/certs

# Storage (local | s3)
STORAGE_DRIVER=s3                 # 's3' en prod
UPLOADS_DIR=./uploads             # solo si driver=local
MAX_FILE_SIZE_MB=10

# S3 / HCP (solo si STORAGE_DRIVER=s3)
S3_ENDPOINT=https://hcp.gcba.gob.ar
S3_REGION=us-east-1
S3_BUCKET=sigat-uploads
S3_ACCESS_KEY=<provided-by-asi>
S3_SECRET_KEY=<provided-by-asi>
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL_BASE=<opcional>

# CORS
FRONTEND_URL=<URL del frontend en prod>
```

#### Frontend (raíz `.env`, leído vía `envDir: ".."` en `vite.config.js`)

```env
VITE_API_URL=<URL del backend en prod>
VITE_GOOGLE_MAPS_API_KEY=<api-key>   # a reemplazar por Mapa GCBA
```

### 12.2 Scripts disponibles

#### Backend

| Comando | Acción |
|---|---|
| `npm run dev` | Arranca con nodemon (auto-reload) |
| `npm start` | Producción (sin nodemon) |
| `npm run db:migrate` | Aplica migraciones SQL |
| `npm run db:seed` | Carga datos iniciales |

#### Frontend

| Comando | Acción |
|---|---|
| `npm run dev` | Vite dev server con HMR |
| `npm run build` | Build de producción (output en `dist/`) |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint |

### 12.3 Contactos ASI

- Estándares públicos: https://buenosaires.gob.ar/gcaba_historico/agencia-de-sistemas-de-informacion/estandares-de-la-agencia
- Consultas sobre herramientas no homologadas: estandares.DGISIS@buenosaires.gob.ar
- Identidad / Keycloak: DGSEI
- Wiki miBA (referencia, no aplica a SIGAT al ser interno): https://gcaba.sharepoint.com/sites/grupo_ManualdeIntegracinmiBALogin

### 12.4 Documentos relacionados

- [`README.md`](../README.md) — Setup local y onboarding
- [`CHANGELOG.md`](../CHANGELOG.md) — Historial semver
- [`UPGRADE.md`](../UPGRADE.md) — Instrucciones de migración entre versiones

---

## Histórico del documento

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-18 | Versión inicial. Cubre stack, capas, módulos, modelo de datos (52 tablas), integraciones, seguridad, no funcionales, operación. Refleja estado post-refactor de adapters (identity + storage), advisory locks, Dockerfiles y logging estructurado. |
