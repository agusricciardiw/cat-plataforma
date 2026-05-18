/**
 * Schemas de validación Joi para el módulo Facturación.
 *
 * Endpoint público crítico:
 *   POST /api/facturacion/form/:token  (agente presenta su factura)
 *
 * Sin schema en server, un atacante con un token válido podría mandar
 * payloads de cualquier tamaño/forma. Joi limita tipos, longitudes y
 * estructura (ES0902 Vu5: validaciones cliente espejadas en server).
 */
const Joi = require('joi');

// El número de factura argentino tiene formato libre. Aceptamos string
// alfanumérico con dashes, slash, espacios, longitud razonable.
const facturaNumeroSchema = Joi.string()
  .trim()
  .min(1)
  .max(64)
  .pattern(/^[A-Za-z0-9\-\/\s\.]+$/)
  .messages({
    'string.empty':    'El número de factura es obligatorio',
    'string.min':      'El número de factura es obligatorio',
    'string.max':      'El número de factura no puede exceder 64 caracteres',
    'string.pattern.base': 'Formato de número de factura inválido',
    'any.required':    'El número de factura es obligatorio',
  });

const facturaFormSchema = Joi.object({
  factura_numero:  facturaNumeroSchema.required(),
  factura_fecha:   Joi.date().iso().optional().allow(null, ''),
  factura_archivo: Joi.string().max(255).optional().allow(null, ''),
  // factura_datos: metadata (AFIP CAE, tipo, etc.). Acepta object O
  // string JSON — el form publico envia multipart con strings. Limita
  // tamaño total para evitar DoS por payload absurdo.
  factura_datos:   Joi.alternatives()
    .try(Joi.object().max(20), Joi.string().max(2048))
    .optional()
    .allow(null, ''),
}).max(10).unknown(false);

module.exports = { facturaFormSchema };
