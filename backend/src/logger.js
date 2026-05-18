/**
 * Logger central de SIGAT (ES0901 6.7 "Logs" + cap. 11 "Auditoria").
 *
 * Formato JSON estructurado compatible con ELK (Elastic + Logstash + Kibana)
 * del GCBA. En desarrollo se pretty-printea para legibilidad en consola.
 *
 * Niveles (pino estandar): trace, debug, info, warn, error, fatal.
 * Default: info. Override por env LOG_LEVEL.
 *
 * Redaction: campos sensibles enmascarados antes de salir al transporte para
 * cumplir con ES0902 Vu2 ("ningun dato sensible en texto plano") y evitar
 * leaks de credenciales / tokens en los logs centralizados.
 *
 * Uso:
 *   const logger = require('./logger');
 *   logger.info({ user_id: 42 }, 'usuario hizo login');
 *   logger.error({ err }, 'fallo al guardar archivo');
 *
 *   // En modulos especificos, usar child logger con contexto fijo:
 *   const log = logger.child({ module: 'jobs' });
 *   log.info({ job: 'vigencia' }, 'tick ejecutado');
 */
const pino = require('pino');
const { LOG_LEVEL, NODE_ENV } = require('./config');

const isProd = NODE_ENV === 'production';

const baseOptions = {
  level: LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: {
    service: 'sigat-backend',
    env: NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    // Renombrar `level` numerico a string legible (ELK lo prefiere asi).
    level: (label) => ({ level: label }),
  },
  // Enmascarar campos sensibles. Pino usa fast-redact: paths son JSONPath-ish.
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'jwt',
      'JWT_SECRET',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
};

// En dev: pretty print legible. En prod: JSON puro para ELK.
const transport = !isProd
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service,env',
        messageFormat: '{module} {msg}',
      },
    }
  : undefined;

const logger = pino({
  ...baseOptions,
  ...(transport ? { transport } : {}),
});

module.exports = logger;
