// Medicion de startup (ES0901 cap.11: inicio < 60s, timeout OpenShift)
const __startupStart = process.hrtime.bigint();

require('dotenv').config();

const logger = require('./logger');

// SLA targets para alertas en logs. Ajustables via env si hace falta.
// Justificacion: OpenShift mata requests > 30s. Queremos warn mucho antes.
const REQUEST_SLOW_MS  = Number(process.env.REQUEST_SLOW_MS)  || 500;   // warn si supera
const REQUEST_HARD_MS  = Number(process.env.REQUEST_HARD_MS)  || 5000;  // error si supera

// ── Validación de variables críticas en startup ───────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal({ env_var: key }, 'Variable de entorno requerida no definida');
    process.exit(1);
  }
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const pinoHttp = require('pino-http');

const app = express();
const server = http.createServer(app);

const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://cat-plataforma-dev.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: origenesPermitidos,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security headers (ES0902 A05). El backend SIGAT solo sirve JSON y
// archivos estaticos bajo /uploads cuando driver=local; nunca HTML. Por
// eso el CSP estricto (default-src 'none', sin scripts/styles permitidos)
// no rompe nada y agrega defense-in-depth si alguien intenta forzar una
// respuesta HTML con XSS.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src':  ["'none'"],
      'img-src':      ["'self'", 'data:'],     // imagenes inline base64 OK para previews
      'frame-ancestors': ["'self'"],            // anti-clickjacking
      'form-action':  ["'self'"],
    },
  },
  // HSTS: en prod tras TLS de ASI quedara activo; en dev sin HTTPS es no-op.
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: false },
  crossOriginEmbedderPolicy: false,             // permite GETs de /uploads desde el front
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger (ES0901 6.7 + cap. 11): cada request loggeado en formato ELK
// con req_id autogenerado, metodo, url, status, tiempo de respuesta. Skipea
// health checks para no inundar logs con el ruido del orquestador.
//
// Nivel del log se escala segun el tiempo de respuesta (SLA):
//   - >= REQUEST_HARD_MS  -> error (operacionalmente critico)
//   - >= REQUEST_SLOW_MS  -> warn  (degradacion notable)
//   - 5xx                 -> error
//   - 4xx                 -> warn
//   - resto               -> info
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    const rt = res.responseTime ?? 0;
    if (rt >= REQUEST_HARD_MS) return 'error';
    if (rt >= REQUEST_SLOW_MS) return 'warn';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    const rt = res.responseTime ?? 0;
    if (rt >= REQUEST_HARD_MS) return `slow request (${rt}ms exceeds hard threshold)`;
    if (rt >= REQUEST_SLOW_MS) return `slow request (${rt}ms)`;
    return 'request completed';
  },
  autoLogging: {
    ignore: (req) => req.url.startsWith('/api/health'),
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, user_id: req.user?.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Servir /uploads solo cuando el storage es local (ES0901 8.4: en prod ASI
// el driver S3 sirve directo desde el bucket, este middleware no aplica).
const storage = require('./services/storage');
if (storage.serveStatic && storage.baseDir) {
  app.use('/uploads', express.static(storage.baseDir));
}

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',         require('./router/auth'));
app.use('/api/profiles',     require('./router/profiles'));
app.use('/api/bases',        require('./router/bases'));
app.use('/api/misiones',     require('./router/misiones'));
app.use('/api/os',           require('./router/os'));
app.use('/api/os-adicional',           require('./router/os_adicional'));
app.use('/api/servicios-adicionales',  require('./router/servicios_adicionales'));
app.use('/api/sanciones',              require('./router/sanciones'));
app.use('/api/presupuestos',           require('./router/presupuestos'));
app.use('/api/beneficiarios',         require('./router/beneficiarios'));
app.use('/api/servicios',             require('./router/servicios'));
app.use('/api/liquidaciones',         require('./router/liquidaciones'));
app.use('/api/facturacion',           require('./router/facturacion'));
app.use('/api/config',               require('./router/config'));
app.use('/api/actividad',    require('./router/actividad'));
app.use('/api/upload',       require('./router/upload'));
app.use('/api/postular',     require('./router/postular'));
app.use('/api/permisos',     require('./router/permisos'));
app.use('/api/roles',        require('./router/roles'));
app.use('/api/mapa',         require('./router/mapa'));

// ── Health checks (ES0901 Anexo IV) ──────────────────────────
// /api/health     → compat con clientes antiguos (responde si el proceso vive)
// /api/health/live → liveness: proceso responde, sin chequear deps
// /api/health/ready → readiness: DB accesible, listo para servir trafico
app.get('/api/health',      (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/api/health/live', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.get('/api/health/ready', async (req, res) => {
  const pool = require('./db/pool');
  const t0 = process.hrtime.bigint();
  try {
    await pool.query('SELECT 1');
    const db_latency_ms = Number((process.hrtime.bigint() - t0) / 1_000_000n);
    res.json({ status: 'ok', db: 'ok', db_latency_ms, ts: new Date().toISOString() });
  } catch (err) {
    const db_latency_ms = Number((process.hrtime.bigint() - t0) / 1_000_000n);
    res.status(503).json({ status: 'unavailable', db: 'error', db_latency_ms, ts: new Date().toISOString() });
  }
});

app.set('io', io);

// ── Socket.io — autenticación en handshake (via identity adapter) ──
const identity = require('./services/identity');

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Socket: token requerido'));
  const user = await identity.verifyToken(token);
  if (!user) return next(new Error('Socket: token inválido o expirado'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  logger.debug({ socket_id: socket.id, user_id: socket.user?.id }, 'Socket conectado');
  socket.on('join:base', (base_id) => {
    // Solo permite unirse a la sala de la propia base del usuario
    if (base_id && base_id === socket.user?.base_id) {
      socket.join(`base:${base_id}`);
    }
  });
  socket.on('disconnect', () => {
    logger.debug({ socket_id: socket.id }, 'Socket desconectado');
  });
});

app.emitToBase = (base_id, evento, data) => {
  io.to(`base:${base_id}`).emit(evento, data);
};

app.use((err, req, res, next) => {
  logger.error({ err, req_id: req.id }, 'Error no manejado en el pipeline');
  res.status(500).json({ error: 'Error interno del servidor' });
});

const pool = require('./db/pool');
const { runMigrations } = require('./db/runMigrations');
const { scheduleJob, JOB_LOCK_IDS } = require('./jobs/runner');

// ── Jobs en background ───────────────────────────────────────
// Cada job esta wrappeado con un advisory lock de Postgres para que solo
// una replica del backend ejecute la logica por tick (ver jobs/runner.js).

const jobLogger = logger.child({ module: 'jobs' });

async function limpiarTokensExpirados() {
  const r1 = await pool.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  if (r1.rowCount > 0) jobLogger.info({ count: r1.rowCount }, 'refresh tokens expirados eliminados');

  const r2 = await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`);
  if (r2.rowCount > 0) jobLogger.info({ count: r2.rowCount }, 'revoked tokens expirados eliminados');
}

async function checkVigenciaCumplida() {
  const result = await pool.query(`
    UPDATE ordenes_servicio
    SET estado = 'cumplida', updated_at = NOW()
    WHERE estado = 'vigente'
      AND vigencia_fin IS NOT NULL
      AND vigencia_fin <= NOW()
    RETURNING numero, tipo
  `);
  result.rows.forEach(os => {
    jobLogger.info({ numero: os.numero, tipo: os.tipo }, 'OS pasada a cumplida automaticamente');
  });
}

// Pasar servicios adicionales a "en_curso" cuando arranca el primer turno
async function checkServiciosEnCurso() {
  const result = await pool.query(`
    UPDATE servicios_adicionales sa
    SET estado = 'en_curso', updated_at = NOW()
    WHERE sa.estado = 'convocado'
      AND EXISTS (
        SELECT 1 FROM sa_turnos t
        WHERE t.servicio_id = sa.id
          AND (t.fecha + t.hora_inicio) <= NOW()
      )
    RETURNING id, os_adicional_id
  `);
  result.rows.forEach(r => {
    jobLogger.info({ servicio_id: r.id, os_adicional_id: r.os_adicional_id }, 'Servicio adicional pasado a en_curso');
  });
}

scheduleJob({ lockId: JOB_LOCK_IDS.VIGENCIA_OS,        name: 'checkVigenciaCumplida', intervalMs:  5 * 60 * 1000, fn: checkVigenciaCumplida });
scheduleJob({ lockId: JOB_LOCK_IDS.SERVICIOS_EN_CURSO, name: 'checkServiciosEnCurso', intervalMs:       60 * 1000, fn: checkServiciosEnCurso });
scheduleJob({ lockId: JOB_LOCK_IDS.LIMPIAR_TOKENS,     name: 'limpiarTokensExpirados', intervalMs: 60 * 60 * 1000, fn: limpiarTokensExpirados });

const PORT = process.env.PORT || 3000;

// ── Migraciones de DB ────────────────────────────────────────────
// Se corren antes de aceptar tráfico. Si hay migraciones pendientes
// las aplica en orden; si el schema ya está (VPS existente) lo detecta
// automáticamente y no re-ejecuta nada. Ver src/db/runMigrations.js.
runMigrations(pool).then(() => {
  server.listen(PORT, () => {
  const startup_ms = Number((process.hrtime.bigint() - __startupStart) / 1_000_000n);
  // ES0901 cap. 11: startup < 60s para no cortar el ciclo de escalamiento
  // de OpenShift. Si superamos 30s queremos saberlo en logs.
  const level = startup_ms >= 30000 ? 'warn' : 'info';
  logger[level]({
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    db: `${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`,
    storage_driver: storage.driver,
    identity_provider: identity.driver,
    startup_ms,
    sla: {
      startup_target_ms: 60000,
      request_slow_ms:   REQUEST_SLOW_MS,
      request_hard_ms:   REQUEST_HARD_MS,
    },
  }, `cat-api corriendo (startup ${startup_ms}ms)`);
  });
}).catch(err => {
  logger.fatal({ err }, 'Migración de DB falló — abortando startup');
  process.exit(1);
});
