const Joi = require('joi');

const vincularOsSchema = Joi.object({
  os_adicional_id: Joi.string().uuid().required()
    .messages({ 'any.required': 'os_adicional_id requerido', 'string.guid': 'os_adicional_id inválido' }),
});

const buiPagadaSchema = Joi.object({
  bui_pagada: Joi.boolean().optional(),
});

// postDocumento: el archivo se valida por magic bytes; acá validamos los campos.
const documentoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required()
    .messages({ 'any.required': 'Nombre requerido', 'string.empty': 'Nombre requerido' }),
  tipo:   Joi.string().trim().max(50).optional(),
});

module.exports = { vincularOsSchema, buiPagadaSchema, documentoSchema };
