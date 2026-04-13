require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);

const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

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

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads')));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/profiles',     require('./routes/profiles'));
app.use('/api/bases',        require('./routes/bases'));
app.use('/api/misiones',     require('./routes/misiones'));
app.use('/api/os',           require('./routes/os'));
app.use('/api/os-adicional', require('./routes/os_adicional'));
app.use('/api/actividad',    require('./routes/actividad'));
app.use('/api/upload',       require('./routes/upload'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket conectado:', socket.id);
  socket.on('join:base', (base_id) => {
    if (base_id) socket.join(`base:${base_id}`);
  });
  socket.on('disconnect', () => {
    console.log('Socket desconectado:', socket.id);
  });
});

app.emitToBase = (base_id, evento, data) => {
  io.to(`base:${base_id}`).emit(evento, data);
};

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const pool = require('./db/pool');

async function checkVigenciaCumplida() {
  try {
    const result = await pool.query(`
      UPDATE ordenes_servicio
      SET estado = 'cumplida', updated_at = NOW()
      WHERE estado = 'vigente'
        AND vigencia_fin IS NOT NULL
        AND vigencia_fin <= NOW()
      RETURNING numero, tipo
    `);
    if (result.rows.length > 0) {
      result.rows.forEach(os => {
        console.log(`[job] OS-${String(os.numero).padStart(3,'0')} (${os.tipo}) → cumplida automaticamente`);
      });
    }
  } catch (err) {
    console.error('[job] Error en checkVigenciaCumplida:', err.message);
  }
}

setInterval(checkVigenciaCumplida, 5 * 60 * 1000);
checkVigenciaCumplida();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\ncat-api corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Base de datos: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
});
