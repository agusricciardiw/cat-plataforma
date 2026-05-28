const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  vincularOsSchema,
  buiPagadaSchema,
  documentoSchema,
} = require('../../src/service/validaciones/servicios');

const opts = { abortEarly: false, stripUnknown: true };
const UUID = '11111111-1111-4111-8111-111111111111';

test('vincularOs: uuid válido pasa', () => {
  const { error } = vincularOsSchema.validate({ os_adicional_id: UUID }, opts);
  assert.equal(error, undefined);
});

test('vincularOs: faltante rechazado', () => {
  const { error } = vincularOsSchema.validate({}, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /os_adicional_id requerido/i);
});

test('vincularOs: no-uuid rechazado', () => {
  const { error } = vincularOsSchema.validate({ os_adicional_id: '123' }, opts);
  assert.ok(error);
});

test('buiPagada: booleano opcional', () => {
  assert.equal(buiPagadaSchema.validate({ bui_pagada: true }, opts).error, undefined);
  assert.equal(buiPagadaSchema.validate({}, opts).error, undefined);
});

test('buiPagada: no booleano rechazado', () => {
  const { error } = buiPagadaSchema.validate({ bui_pagada: 'sí' }, opts);
  assert.ok(error);
});

test('documento: nombre requerido', () => {
  const { error } = documentoSchema.validate({ tipo: 'acta' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /nombre requerido/i);
});

test('documento: válido pasa', () => {
  const { error } = documentoSchema.validate({ nombre: 'Acta de servicio', tipo: 'acta' }, opts);
  assert.equal(error, undefined);
});
