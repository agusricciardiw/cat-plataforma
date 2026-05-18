# CHANGELOG

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Semantic Versioning](https://semver.org/lang/es/) (MAJOR.MINOR.PATCH).

Cada release se publica como tag en git desde la rama `master` con sufijo opcional `-BETA` para pruebas.

---

## [Unreleased]

### Cumplimiento ASI (ES0901 / ES0902)
- Rate limiting agregado a `/api/facturacion/form/:token` GET y POST (ES0902 Vu9).
- Health checks separados: `/api/health/live` (liveness) y `/api/health/ready` (readiness con check DB).
- README, CHANGELOG y UPGRADE alineados al estándar ASI (ES0901 Anexo I).
- **Stateless jobs** (ES0901 6.5 — apps stateless en granja): los 3 jobs internos del backend (`checkVigenciaCumplida` cada 5min, `checkServiciosEnCurso` cada 1min, `limpiarTokensExpirados` cada 1h) ahora corren detrás de un `pg_try_advisory_lock` con IDs estables (4810001/2/3). En despliegue multi-réplica solo una instancia ejecuta cada tick, las demás hacen no-op silencioso. Nuevo helper `backend/src/jobs/runner.js` con `scheduleJob` y `JOB_LOCK_IDS`.
- **Dockerfiles multi-stage para OpenShift** (ES0901 cap. 10, Anexo III):
  - `backend/Dockerfile`: Node 22 Alpine en stage de deps + runtime. Usuario no-root (UID 1001 nominal, OpenShift asigna random igual), `chgrp 0` + `chmod g=u` en `/app` para escritura compatible con grupo 0. `tini` como PID 1, `curl` para HEALTHCHECK contra `/api/health/live`. Default `STORAGE_DRIVER=local`, override a `s3` por env en producción.
  - `frontend/Dockerfile`: build de Vite con Node 22, runtime nginx 1.27 alpine en puerto **8080** (no 80, compat OpenShift no-root). Build acepta `VITE_API_URL` y `VITE_GOOGLE_MAPS_API_KEY` como `--build-arg`. nginx.conf inline con SPA fallback (`try_files`), cache largo para `/assets/<hash>`, headers de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), endpoint `/healthz`. Permisos de grupo 0 en `/var/cache/nginx`, `/var/run`, `/var/log/nginx`.
  - `.dockerignore` en ambos servicios.

### Fixed
- `GET /api/facturacion/form/:token` y queries `getLista`/`getById`/`getItemByToken` en `model/facturacion.js`: la columna se llamaba `s.nombre` pero `servicios_adicionales` no tiene esa columna; reemplazado por `s.sa_nombre`. La ruta pública devolvía 500 sistemáticamente.
- `frontend/vite.config.js`: agregado `envDir: '..'` para que Vite lea el `.env` desde la raíz del repo (donde realmente vive). Antes, `VITE_API_URL` quedaba `undefined` en dev y los links a `/uploads/<archivo>` (ver PDF de BUI, factura, comprobantes, documentos de servicio) se resolvían contra el frontend en lugar del backend, terminando en la pantalla de login por el fallback del SPA.
- Mensajes de error customizados en `controller/facturacion.js` (`getForm`, `postForm`): tokens malformados devuelven 404 en lugar de exponer error de PostgreSQL al cliente, errores internos devuelven "Error interno del servidor" en lugar de `err.message` (ES0902 Vu6, Vu7).

### Added — medición de tiempos y SLA budgets (ES0901 cap. 11)
- **Thresholds en request logs**: pino-http ahora escala el nivel según `responseTime`. `>= REQUEST_HARD_MS` (5000ms default) → `error`, `>= REQUEST_SLOW_MS` (500ms default) → `warn`. Mensaje custom indica "slow request (Xms)". Justificación: OpenShift corta requests > 30s; queremos alertas en ELK mucho antes de llegar al límite duro.
- **Startup time medido** y loggeado: el primer log al `listen()` incluye `startup_ms` y `sla.startup_target_ms`. Si supera 30s, el log sale como `warn`. SIGAT actual: ~700ms (lejos del límite de 60000ms ASI).
- **Duración por tick de cada job**: `jobs/runner.js` mide y loggea `duration_ms`. `JOB_SLOW_MS` (default 5000ms) escala el nivel a `warn`. Jobs actuales: 2-45ms.
- **Latencia DB en `/api/health/ready`**: la respuesta ahora incluye `db_latency_ms`. Útil para diagnóstico operativo y como señal de salud para el orquestador.
- Nuevos env vars opcionales en `config.js`: `REQUEST_SLOW_MS`, `REQUEST_HARD_MS`, `JOB_SLOW_MS`.

### Refactored — adapter de mapas y geocoding (ES0901 D5, D6, 8.3)
- **`frontend/src/lib/mapa.js`** — config central de `tileLayer` para Leaflet. Lee URL, atribución y subdominios desde `VITE_MAPA_TILE_URL`, `VITE_MAPA_TILE_ATTRIBUTION`, `VITE_MAPA_TILE_SUBDOMAINS`, `VITE_MAPA_TILE_MAX_ZOOM`. Default OSM/Carto (estado actual). Cuando ASI confirme el endpoint del Mapa GCBA (USIG/cartografía), solo se cambian estas vars en `.env`.
- **`frontend/src/lib/geo.js`** — cliente único de geocoding con drivers swappable (`google` default, `nominatim`, `gcba` stub) seleccionables por `VITE_GEO_PROVIDER`. Contrato común `geocode(direccion) → [{lat,lng,label,raw}]`. El driver `gcba` está listo para implementarse cuando ASI confirme el endpoint del API GEO del catálogo (USIG `/normalizar` o `/geocoder/2.2/`).
- **Migrados 7 puntos de `tileLayer` hardcoded**: `UbicacionInput.jsx`, `MapaPoligono.jsx`, `MapaModal.jsx`, `ResumenOS.jsx`, `OSItemPanel.jsx`, `ReporteOSAdicional.jsx` (usa `window.L`, importa solo `tileConfig`), `MapaAdicional.jsx`.
- **Migrados 3 puntos de geocoding hardcoded**: `UbicacionInput.jsx` (Google), `MapaModal.jsx` (Nominatim), `MapaAdicional.jsx` (Nominatim). El consumer ahora maneja la interfaz normalizada `{lat,lng,label,raw}`.
- Ningún componente del frontend toca directamente `tile.openstreetmap.org`, `basemaps.cartocdn.com`, `nominatim.openstreetmap.org` ni `maps.googleapis.com` — todo pasa por los módulos centrales.

### Added
- **`.github/workflows/ci.yml`** — Pipeline CI con los mismos scanners que ASI corre en su GitLab (ES0901 Anexo I sección 5): ESLint + plugin security (SAST), `node --check` syntax, `npm audit` (Dependency Scanning, falla con high+), Retire.js, NodeJsScan (SAST profundo Node-específico), Hadolint para Dockerfiles, build del frontend. 9 jobs en paralelo (~3 min total). Concurrency control para no duplicar runs en PRs activos. DAST (OWASP ZAP) queda para workflow separado con stack vivo.
- **`backend/eslint.config.js`** — ESLint 10 flat config con plugin security recommended. Reglas calibradas (false positives manejables como warn). Excluye scripts de migración one-shot. Script `npm run lint`.

### Fixed
- **`backend/src/service/servicios_adicionales.js:257`** — bug encontrado por ESLint: en el loop de importación CSV de postulantes, la rama "turno no encontrado" pusheaba un objeto con `legajo` (variable inexistente en scope) en lugar de `cuit` (variable real). Generaba `ReferenceError` en runtime cada vez que un CSV traía un nombre de turno mal escrito. Las otras 4 ramas del mismo loop ya usaban `cuit` consistentemente.

### Added
- **`docs/arquitectura.md`** — Documento de arquitectura completo, entregable formal para el assessment de ASI (E2 — Aplicaciones Web del ES0902). 12 secciones: resumen ejecutivo, stack tecnológico con versiones, arquitectura física (diagrama de despliegue), arquitectura lógica (capas, adapters), módulos de negocio, modelo de datos (52 tablas agrupadas por dominio), integraciones (activas + pendientes para producción ASI), seguridad (OWASP Top 10), especificaciones no funcionales, operación y observabilidad, roles y permisos RBAC, anexos (env vars, scripts, contactos ASI). Referenciado desde el README.

### Refactored
- **Logging estructurado** (ES0901 6.7 + cap. 11 Auditoría): nuevo `backend/src/logger.js` con `pino` + redaction de campos sensibles (`password`, `password_hash`, `token`, `accessToken`, `refreshToken`, `JWT_SECRET`, `authorization`, `cookie`). En desarrollo salida pretty colorizada; en producción JSON puro de una línea por evento, parseable por el stack ELK (Elastic + Logstash + Kibana) del GCBA. Niveles configurables vía env `LOG_LEVEL` (`trace|debug|info|warn|error|fatal`, default `debug` en dev, `info` en prod).
  - Request logger automático con `pino-http` en `index.js`: cada request loggeado con `req_id` autogenerado, método, URL, status, response time. Health checks (`/api/health*`) skipeados para no inundar logs con el ruido del orquestador. Categorización automática de nivel: 4xx → `warn`, 5xx → `error`.
  - Migrados a `logger`: `index.js` (startup, jobs, socket connect/disconnect, error middleware), `middleware/auth.js`, `jobs/runner.js`, `db/pool.js`, `services/identity/jwt-local.js`, `controller/auth.js`, `controller/facturacion.js`.
  - Migración progresiva: el resto de controllers/services/models conservan `console.log`/`console.error`. Siguen apareciendo en stdout y son recogidos por el pipeline de ELK, pero sin campos estructurados. La migración del resto se hace en sesiones futuras (cada archivo es independiente).
  - Scripts de migración one-shot en `backend/src/db/migrate_*.js` quedan con `console.log` por diseño — no son runtime del servidor, no los toca ELK.
- **Identity provider adapter** (`backend/src/services/identity/`): nueva capa de abstracción con dos drivers — `jwt-local` (preserva el flujo actual con JWT propio + refresh + revoked tokens, default) y `keycloak` (stub OIDC contra `identidad-gcaba.apps.buenosaires.gob.ar` del GCBA, listo para enchufar). Selección por env `IDENTITY_PROVIDER`. Todos los puntos de verificación/emisión de credenciales pasan ahora por esta capa:
  - `middleware/auth.js::authMiddleware` ahora delega en `identity.verifyToken`; `requireRole` y `requirePermiso` intactos
  - `service/auth.js`: `login` / `refresh` / `logout` delegan en el adapter (`issueTokensForLogin`, `refreshTokens`, `revokeSession`). Nuevo error `LocalIssuanceNotSupportedError` para cuando el provider activo no emite credenciales (caso Keycloak)
  - `controller/auth.js`: responde HTTP 501 si se intenta login/refresh local con un provider sin `supportsLocalIssuance`
  - `index.js` socket.io: handshake delega en `identity.verifyToken` (ya no usa `jsonwebtoken` directo)
- `jsonwebtoken` queda aislado dentro de `services/identity/jwt-local.js`. El resto del backend no lo importa.
- **Storage adapter** (`backend/src/services/storage/`): nueva capa de abstracción con dos drivers — `local` (filesystem, default para dev) y `s3` (compat MinIO/HCP del GCBA, para producción ASI). Selección por env `STORAGE_DRIVER`. Todos los puntos donde el backend persistía/leía/borraba archivos pasan ahora por esta capa:
  - `service/upload.js::saveUploadedFile` y `service/uploadDocumento.js::guardarDocumento` (ahora async)
  - Nuevo `service/uploadDocumento.js::eliminarArchivoSiExiste` (existía como import optional en `controller/servicios.js`, ahora implementado)
  - `router/facturacion.js`: migrado de `multer.diskStorage` a `multer.memoryStorage` + `storage.save()`
  - `model/liquidaciones.js`: TXT del banco persistido vía adapter
  - `controller/beneficiarios.js`: delete de documento vía `storage.delete()`
  - `controller/upload.js`: URL pública vía `storage.publicUrl()`
  - `index.js`: el static serving de `/uploads` solo se monta cuando el driver es `local`
- Habilitación de S3 documentada en `backend/src/services/storage/s3.js` (requiere `npm install @aws-sdk/client-s3` y vars `S3_*`).

### Pendiente para v2.0.0 (homologación ASI)
- Migrar autenticación JWT propia a Keycloak OIDC (`identidad-gcaba.apps.buenosaires.gob.ar`).
- Migrar `backend/uploads/` filesystem a storage S3-compatible (HCP del GCBA).
- Reemplazar Google Maps por Mapa del GCBA + API GEO del catálogo.
- Logs estructurados ELK-compatibles.
- Pipeline CI con SAST + DAST + Dependency Scanning.
- Dockerfile para deploy en OpenShift.

---

## [1.0.0] — 2026-04-28

### Added
- **Módulo Presupuestos** (nuevo, completo).
  - Tabla `presupuestos` con trigger de auto-numeración `P-NNN/AAAA`.
  - CRUD completo en backend (`controller/presupuestos.js`, `router/presupuestos.js`).
  - Roles permitidos: `admin`, `operador_adicionales`, `gerencia`, `director`, `jefe_cgm`.
  - Frontend: `PresupuestosPage`, `PresupuestosLista` con tabs de estado (borrador/enviado/aprobado/rechazado/vencido).
  - Modal de creación/edición con tabla dinámica de ítems (Día, Cobertura, Horario, Personal, Módulos, Total).
  - Generador de PDF institucional con logos CAT + BA Ciudad.
  - Logo SVG oficial BA Ciudad incorporado en assets.

### Changed
- **Trazabilidad OS Adicional → Presupuesto**: al crear una OS Adicional, en lugar de seleccionar fechas en un calendario, ahora se selecciona un presupuesto aprobado y las fechas se extraen de sus ítems. Componente `ModalFechas` reemplazado por `ModalPresupuestoSelector` con filtro por número/beneficiario/evento.
- **Sidebar Servicios Adicionales reordenado**: Presupuestos movido a primera posición del grupo SS.AA., antes de OS Adicional y Gestión SS.AA.
- **Configuración SSL del pool de PG** condicional: activo cuando `NODE_ENV=production` o `DB_HOST` contiene `supabase`.
- **CORS** ampliado para incluir `https://cat-plataforma-dev.onrender.com` y `process.env.FRONTEND_URL`.

### Sistema de Scoring SS.AA. (refinado en sesiones previas)
- Configuración y visualización del algoritmo de scoring (`SAConfigScoring.jsx`).
- Integración de scoring en detalle del servicio adicional (`SADetalle.jsx`).
- Mejoras en tab de armado de dotación (`SATabArmado.jsx`).
- Soporte para marcación justificada en presentismo (`SATabPresentismo.jsx`).
- Lógica de scoring y estados de presentismo en backend (`controller`, `model`, `service` de servicios adicionales).
- Migraciones: `migrate_config_justificado.js`, `migrate_presentismo_justificado.js`.

### Database migrations
Antes de actualizar a esta versión: ver [UPGRADE.md](UPGRADE.md).

---

## [0.x.x] — versiones previas

Historial previo no formalizado bajo semver. La línea de versiones formales arranca en 1.0.0 con la incorporación del módulo Presupuestos.
