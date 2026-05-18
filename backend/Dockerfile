# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────────────────────
# Dockerfile para el backend de SIGAT (ES0901 cap. 10, Anexo III).
#
# - Base: Node.js 22 LTS sobre Alpine (homologado por ASI).
# - Multi-stage: imagen final solo lleva runtime + dependencias de produccion.
# - OpenShift-compatible: el usuario en runtime es no-root (random UID asignado
#   por OpenShift cae en grupo 0; los directorios estan permisivos para grupo
#   0 con g+rwx para que el UID random pueda escribir cuando hace falta).
# - Healthcheck contra /api/health/live (no /ready: no queremos que se mate
#   el contenedor por una caida transitoria de Postgres).
#
# Build:
#   docker build -t sigat-backend:dev -f backend/Dockerfile backend/
#
# Run local:
#   docker run --rm -p 3000:3000 --env-file backend/.env sigat-backend:dev
# ────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependencias de produccion ─────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./

# `npm ci` exige lockfile sincronizado. Si no existe, usar `npm install` para
# generar deterministicamente y luego cachearlo en el repo.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi


# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    # Forzar que el adapter de storage no escriba en filesystem por default:
    # en prod ASI hay que setear STORAGE_DRIVER=s3 + S3_* via env del Pod.
    STORAGE_DRIVER=local

# Herramientas minimas: tini para PID 1 sano, curl para HEALTHCHECK.
RUN apk add --no-cache tini curl

WORKDIR /app

# Copiar dependencias y codigo
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# OpenShift asigna UID random del grupo 0 (root group). El filesystem de la
# app tiene que ser legible/escribible por grupo 0 para evitar EACCES en
# escritura de logs/uploads temporales.
RUN mkdir -p /app/uploads && \
    chgrp -R 0 /app && \
    chmod -R g=u /app

# Usuario no-root nominal (1001 — OpenShift lo reemplaza por random igual,
# pero local docker run respeta este UID y evita correr como root).
USER 1001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
