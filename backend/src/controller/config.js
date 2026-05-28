const m = require('../model/config');
const logger = require('../logger').child({ module: 'controller.config' });
const { setSMTPSchema, testSMTPSchema } = require('../service/validaciones/config');

const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true };
const CLAVES_SMTP = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];

/** GET /api/config/smtp — devuelve config SMTP sin la contraseña en claro */
async function getSMTP(req, res) {
  try {
    const smtp = await m.getSMTP();
    // Enmascarar la contraseña: solo indicar si está configurada
    const resp = { ...smtp };
    if (resp.smtp_pass) resp.smtp_pass_set = true;
    delete resp.smtp_pass;
    res.json(resp);
  } catch (err) {
    logger.error({ err }, 'getSMTP fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/** PUT /api/config/smtp — actualiza credenciales SMTP */
async function setSMTP(req, res) {
  const { error, value } = setSMTPSchema.validate(req.body, VALIDATE_OPTS);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const pares = [];
    for (const clave of CLAVES_SMTP) {
      if (value[clave] !== undefined) {
        pares.push({ clave, valor: value[clave] });
      }
    }
    if (pares.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    await m.setMultiple(pares, req.user.id);
    logger.info({ user_id: req.user.id, campos: pares.map(p => p.clave) }, 'SMTP actualizado');
    res.json({ ok: true, actualizados: pares.map(p => p.clave) });
  } catch (err) {
    logger.error({ err }, 'setSMTP fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/** POST /api/config/smtp/test — intenta conectarse al SMTP y envía un mail de prueba */
async function testSMTP(req, res) {
  try {
    const { sendMail } = require('../services/mailer');
    const { error, value } = testSMTPSchema.validate(req.body, VALIDATE_OPTS);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const destino = req.user.email || value.destino;
    if (!destino) return res.status(400).json({ error: 'No hay email del operador para la prueba. Pasá destino en el body.' });

    await sendMail({
      to: destino,
      subject: 'CAT Plataforma — Test de configuración SMTP',
      html: `<p>✅ El servidor de correo está configurado correctamente.</p><p style="color:#636366;font-size:12px">Enviado desde la plataforma CAT · DGCAT · GCBA</p>`,
      text: 'El servidor de correo está configurado correctamente.',
    });

    res.json({ ok: true, enviado_a: destino });
  } catch (err) {
    // El 400 con err.message es intencional aca: la prueba SMTP devuelve
    // mensajes de configuracion (host inalcanzable, auth fail, etc.) que el
    // operador necesita ver para diagnosticar. No es un 500 con stack trace.
    logger.warn({ err }, 'Test SMTP fallido');
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSMTP, setSMTP, testSMTP };
