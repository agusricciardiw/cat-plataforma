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

# Dependencias de produccion. --chown=1001:0 deja la propiedad correcta para
# OpenShift (UID random cae en grupo 0) directamente en el COPY, evitando un
# `chmod -R /app` posterior que recorria los miles de archivos de node_modules
# (ese paso recursivo era lentisimo en VPS con disco lento).
COPY --from=deps --chown=1001:0 /app/node_modules ./node_modules

# ── Cache-bust de codigo ─────────────────────────────────────────────────────
# GIT_SHA cambia en cada commit => invalida las capas de codigo de aca para abajo
# y fuerza recopiar src/. Sin esto, BuildKit puede reusar la capa COPY cacheada
# y dejar un deploy con codigo viejo (paso en prod: el fix c713a3a no entro hasta
# un rebuild manual con --no-cache). Va DESPUES de node_modules para no invalidar
# la capa cara de dependencias.
ARG GIT_SHA=dev
LABEL org.opencontainers.image.revision=$GIT_SHA
RUN echo "build revision: $GIT_SHA"

COPY --chown=1001:0 package.json ./
COPY --chown=1001:0 src ./src
COPY --chown=1001:0 migrations ./migrations

# Solo /app/uploads necesita ser escribible en runtime; el codigo y node_modules
# son read-only. Grupo 0 ya tiene lectura via --chown; solo damos g+w a uploads.
RUN mkdir -p /app/uploads && chmod -R g=u /app/uploads

# Usuario no-root nominal (1001 — OpenShift lo reemplaza por random igual,
# pero local docker run respeta este UID y evita correr como root).
USER 1001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
