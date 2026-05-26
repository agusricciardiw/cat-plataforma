const { Pool } = require('pg');
require('dotenv').config();

// Activar SSL solo cuando la DB realmente lo soporte.
// NODE_ENV=production NO implica SSL — el postgres del docker-compose interno no usa SSL.
// Setear DB_SSL=true en .env si la DB es Supabase, RDS, Neon u otro proveedor cloud.
const sslConfig = process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('supabase')
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'cat_plataforma',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl:      sslConfig,
  max:                20,    // maximo de conexiones en el pool
  idleTimeoutMillis:  30000, // cerrar conexiones ociosas despues de 30s
  connectionTimeoutMillis: 5000, // timeout al obtener una conexion del pool
});

const logger = require('../logger').child({ module: 'db.pool' });

pool.on('error', (err) => {
  logger.error({ err }, 'Error inesperado en cliente PostgreSQL');
});

module.exports = pool;
