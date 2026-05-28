# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────────────────────
# Dockerfile para el frontend de SIGAT (ES0901 cap. 10, Anexo III).
#
# - Stage 1 (builder): Node 22 LTS compila el bundle de Vite.
# - Stage 2 (runtime): nginx 1.27 (alpine) sirve los estaticos en puerto 8080
#   (no 80; OpenShift bloquea puertos privilegiados para containers no-root).
# - SPA fallback: cualquier ruta que no matchee un archivo cae a index.html
#   (React Router se encarga del routing del lado del cliente).
# - OpenShift compatible: grupo 0 con permisos de escritura en los dirs que
#   nginx necesita (/var/cache/nginx, /var/run, /var/log/nginx, /tmp).
#
# Variables de build (build-args):
#   VITE_API_URL              URL absoluta del backend. Default: ""
#   VITE_GOOGLE_MAPS_API_KEY  API key Google Maps (pendiente migrar a Mapa GCBA)
#
# Build:
#   docker build -t sigat-frontend:dev \
#     --build-arg VITE_API_URL=http://localhost:3000 \
#     --build-arg VITE_GOOGLE_MAPS_API_KEY=xxx \
#     -f frontend/Dockerfile .
#
# (Importante: el contexto del build es la raiz del repo, no `frontend/`,
# para que envDir: ".." de vite.config.js pueda leer `.env` si existe.)
#
# Run local:
#   docker run --rm -p 8080:8080 sigat-frontend:dev
# ────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build del bundle ───────────────────────────────────────────────
FROM node:22-alpine AS builder

ARG VITE_API_URL=""
ARG VITE_GOOGLE_MAPS_API_KEY=""

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

WORKDIR /app

# Copiar manifests y lockfile primero para cachear `npm ci`.
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Cache-bust de codigo ─────────────────────────────────────────────────────
# GIT_SHA cambia en cada commit => invalida la copia de fuentes y el `npm run build`
# de aca para abajo, evitando que un deploy quede con bundle viejo por cache de
# BuildKit. Va DESPUES de `npm ci` para no reinstalar deps en cada commit.
ARG GIT_SHA=dev
RUN echo "build revision: $GIT_SHA"

# Copiar fuentes del frontend y, opcionalmente, .env de la raiz que Vite lee
# via `envDir: ".."` definido en vite.config.js. Si .env no existe, los ARG
# alcanzan.
COPY frontend/ ./
COPY .env* /repo-root/

# Truco para envDir: ".."  → /app es el cwd, asi que ".." es /. Movemos los
# .env a / temporalmente (build-time only).
RUN if ls /repo-root/.env* 1> /dev/null 2>&1; then cp /repo-root/.env* /; fi

RUN npm run build


# ── Stage 2: runtime nginx ──────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# nginx.conf custom con SPA fallback. Sobrescribe el default.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Config inline (mantenida aqui para evitar otro archivo en el repo).
# SC2016: los $uri son variables de nginx (deben quedar literales en comillas
# simples), no expansiones de shell — el warning de shellcheck es falso positivo.
# hadolint ignore=SC2016
RUN printf '%s\n' \
  'server {' \
  '  listen 8080;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '' \
  '  # Headers de seguridad basicos (ES0902 — luego ampliar con CSP segun assets reales)' \
  '  add_header X-Frame-Options "SAMEORIGIN" always;' \
  '  add_header X-Content-Type-Options "nosniff" always;' \
  '  add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
  '' \
  '  # Cache largo para assets con hash en el nombre (Vite genera /assets/<hash>.<ext>)' \
  '  location /assets/ {' \
  '    expires 1y;' \
  '    add_header Cache-Control "public, immutable";' \
  '    try_files $uri =404;' \
  '  }' \
  '' \
  '  # SPA fallback — toda ruta no-archivo va a index.html' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '' \
  '  # Healthcheck local para probes' \
  '  location = /healthz {' \
  '    access_log off;' \
  '    return 200 "ok";' \
  '    add_header Content-Type text/plain;' \
  '  }' \
  '}' > /etc/nginx/conf.d/app.conf

# OpenShift: nginx necesita escribir en estos dirs en runtime. Grupo 0 con
# rwx + sticky en archivos relevantes evita EACCES con UID random.
RUN chgrp -R 0 /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    chmod -R g=u /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    # nginx en alpine guarda el pid en /run/nginx.pid; asegurar permisos
    touch /var/run/nginx.pid && chgrp 0 /var/run/nginx.pid && chmod g=u /var/run/nginx.pid

USER 1001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
