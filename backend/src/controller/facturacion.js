const m = require('../model/facturacion');
const { sendMail, templateLOYS } = require('../services/mailer');
const { UUID_REGEX } = require('../config');
const logger = require('../logger').child({ module: 'controller.facturacion' });

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Agentes preview ───────────────────────────────────────────

async function getAgentes(req, res) {
  try {
    const { servicio_id } = req.query;
    if (!servicio_id) return res.status(400).json({ error: 'servicio_id requerido' });
    const agentes = await m.getAgentesParaFacturar(servicio_id);
    res.json(agentes);
  } catch (err) {
    logger.error({ err }, 'getAgentes fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── Crear solicitud y enviar mails ────────────────────────────

async function crear(req, res) {
  try {
    const {
      servicio_id, concepto, periodo_desde, periodo_hasta,
      fecha_vencimiento, cuit_receptor, razon_social_receptor,
      valor_uf, observaciones, agentes,
    } = req.body;

    if (!concepto || !periodo_desde || !periodo_hasta || !fecha_vencimiento)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    if (!cuit_receptor || !razon_social_receptor)
      return res.status(400).json({ error: 'CUIT y razón social del receptor son obligatorios' });
    if (!Array.isArray(agentes) || agentes.length === 0)
      return res.status(400).json({ error: 'Debe haber al menos un agente' });

    // Crear en DB
    const { solicitud, items } = await m.crearSolicitud({
      servicio_id: servicio_id || null,
      concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
      cuit_receptor, razon_social_receptor, valor_uf: valor_uf || null,
      generado_por: req.user.id,
      observaciones,
      agentes,
    });

    // Enviar mails (en background, no bloqueamos la respuesta)
    const solicitudData = {
      concepto, periodo_desde, periodo_hasta, fecha_vencimiento,
      cuit_receptor, razon_social_receptor,
    };

    const mailPromises = items.map(async (item) => {
      const agente = agentes.find(a => a.profile_id === item.profile_id) || {};
      const formUrl = `${FRONTEND_URL()}/facturar/${item.token}`;

      try {
        if (item.tipo === 'loys') {
          const { subject, html, text } = templateLOYS({
            agente: {
              nombre_completo: item.nombre_completo,
              cuil:    item.cuil,
              modulos: agente.modulos || item.datos_enviados?.modulos,
              monto:   agente.monto   || item.datos_enviados?.monto,
            },
            solicitud: solicitudData,
            formUrl,
          });

          if (item.email) {
            await sendMail({ to: item.email, subject, html, text });
            await m.marcarMailEnviado(item.id);
          } else {
            logger.warn({ item_id: item.id }, 'Item sin email - no se envio mail');
          }
        }
        // Planta: pendiente de implementación
      } catch (mailErr) {
        logger.error({ err: mailErr, item_id: item.id, email: item.email }, 'Error enviando mail');
      }
    });

    // Lanzar envíos en background
    Promise.allSettled(mailPromises).then(results => {
      const errores = results.filter(r => r.status === 'rejected');
      if (errores.length > 0) {
        logger.error({ solicitud_id: solicitud.id, mails_fallidos: errores.length }, 'Mails fallidos en solicitud de facturacion');
      }
    });

    res.status(201).json({ solicitud, items, total: items.length });
  } catch (err) {
    logger.error({ err }, 'crear solicitud de facturacion fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── Listar / detalle ──────────────────────────────────────────

async function getLista(req, res) {
  try {
    const lista = await m.getLista();
    res.json(lista);
  } catch (err) {
    logger.error({ err }, 'getLista fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getById(req, res) {
  try {
    const sol = await m.getById(req.params.id);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(sol);
  } catch (err) {
    logger.error({ err, solicitud_id: req.params.id }, 'getById fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── Endpoint público: form del agente ────────────────────────

async function getForm(req, res) {
  try {
    if (!UUID_REGEX.test(req.params.token)) return res.status(404).json({ error: 'Link no válido o expirado' });
    const item = await m.getItemByToken(req.params.token);
    if (!item) return res.status(404).json({ error: 'Link no válido o expirado' });
    if (item.estado === 'aprobada') return res.status(410).json({ error: 'Esta factura ya fue aprobada. No podés modificarla.' });
    res.json(item);
  } catch (err) {
    logger.error({ err, token: req.params.token }, 'getForm fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postForm(req, res) {
  try {
    if (!UUID_REGEX.test(req.params.token)) return res.status(404).json({ error: 'Link no válido' });
    const { factura_numero, factura_fecha, factura_archivo, factura_datos } = req.body;
    if (!factura_numero) return res.status(400).json({ error: 'El número de factura es obligatorio' });

    const item = await m.getItemByToken(req.params.token);
    if (!item) return res.status(404).json({ error: 'Link no válido' });
    if (item.estado === 'aprobada') return res.status(410).json({ error: 'Esta factura ya fue aprobada' });

    const updated = await m.presentarFactura(req.params.token, {
      factura_numero, factura_fecha: factura_fecha || null,
      factura_archivo: factura_archivo || null,
      factura_datos:   factura_datos   || null,
    });
    if (!updated) return res.status(400).json({ error: 'No se pudo registrar la factura' });

    res.json({ ok: true, item: updated });
  } catch (err) {
    logger.error({ err, token: req.params.token }, 'postForm fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── Acciones RRHH ─────────────────────────────────────────────

async function accionRRHH(req, res) {
  try {
    const { estado, observaciones_rrhh } = req.body;
    const item = await m.accionRRHH(req.params.item_id, {
      estado,
      observaciones_rrhh,
      revisada_por: req.user.id,
    });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (err) {
    if (err.message.startsWith('Estado inválido')) return res.status(400).json({ error: err.message });
    logger.error({ err, item_id: req.params.item_id }, 'accionRRHH fallo');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { getAgentes, crear, getLista, getById, getForm, postForm, accionRRHH };
