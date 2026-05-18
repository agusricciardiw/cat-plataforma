# UPGRADE

Instrucciones de migración entre versiones de SIGAT.

Cada sección documenta los pasos necesarios para pasar de una versión X.Y.Z a la siguiente. Ejecutar los pasos **en orden**.

Antes de cualquier upgrade en producción:
1. Hacer backup de la base de datos.
2. Hacer backup del directorio de uploads.
3. Anunciar la baja controlada desde admin (sin ventana de mantenimiento real — ASI exige 24×7).
4. Verificar que `git status` esté limpio y la rama destino tenga el tag esperado.

---

## Próximo → [Unreleased]

### Cambios automáticos (sin acción manual)
- Health checks nuevos disponibles en `/api/health/live` y `/api/health/ready`. El endpoint legacy `/api/health` sigue funcionando.
- Rate limiting agregado a `/api/facturacion/form/:token`. Límites configurables vía `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_GET_MAX`, `RATE_LIMIT_POST_MAX` en `backend/src/config.js`.
- Fix: ruta pública `GET /api/facturacion/form/:token` ahora funciona (estaba rota por columna inexistente).

### Storage adapter — opcional: activar S3
Por default sigue usando filesystem local (sin acción requerida). Para enchufar S3/MinIO en este entorno:

1. Instalar SDK en `backend/`:
   ```powershell
   cd backend
   npm install @aws-sdk/client-s3
   ```
2. Agregar a `backend/.env`:
   ```env
   STORAGE_DRIVER=s3
   S3_ENDPOINT=http://localhost:9000
   S3_BUCKET=sigat-uploads
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   S3_FORCE_PATH_STYLE=true
   ```
3. Reiniciar el backend.

### Rollback
- `git revert` del commit correspondiente. Sin migraciones de DB asociadas.

---

## 0.x.x → 1.0.0 (2026-04-28)

### 1. Migración SQL — tabla `presupuestos`

El módulo Presupuestos requiere una tabla nueva. Sin esto, cualquier operación sobre presupuestos devuelve error 500.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d cat_plataforma -f backend/src/db/presupuestos.sql
```

Crea la tabla `presupuestos` con trigger de auto-numeración `P-NNN/AAAA`.

### 2. Migraciones — presentismo justificado

```powershell
cd backend
node src/db/migrate_config_justificado.js
node src/db/migrate_presentismo_justificado.js
```

### 3. Variables de entorno requeridas en producción

Verificar que el `.env` del backend tenga:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL` (para CORS dinámico)

Y el `.env` raíz para el build de Vite tenga:

- `VITE_API_URL` apuntando al backend del entorno destino. **Crítico**: si `VITE_API_URL` está vacío al momento del build, el frontend cae a `http://localhost:3000` y no funciona en producción.

### 4. Reinstalar dependencias

```powershell
cd backend && npm install
cd ../frontend && npm install
```

### 5. Rebuild del frontend

```powershell
cd frontend
npm run build
```

### Rollback

1. Restaurar backup de DB previo al paso 1.
2. `git checkout <tag-previo>`.
3. Reinstalar dependencias y rebuild.

---

## Pendiente para v2.0.0 — Homologación ASI

Cuando se preparen las versiones que cumplen estándares ASI completos, esta sección documentará:

- Migración de autenticación JWT propia → Keycloak OIDC (requiere coordinación con DGSEI para registro del cliente OIDC).
- Migración de `backend/uploads/` filesystem → storage S3-compatible (HCP del GCBA o equivalente). Incluirá script de migración de archivos existentes.
- Reemplazo de Google Maps por Mapa GCBA + API GEO del catálogo (requiere whitelist con ASI).
- Configuración de log shipping al ELK del GCBA.
- Pipeline CI con SAST/DAST.
- Deploy en OpenShift vía imagen OCI.

Cada uno de estos pasos será documentado en su release correspondiente.
