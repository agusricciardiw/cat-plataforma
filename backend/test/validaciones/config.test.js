const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setSMTPSchema, testSMTPSchema } = require('../../src/service/validaciones/config');

const opts = { abortEarly: false, stripUnknown: true };

test('setSMTP: subconjunto de campos válido', () => {
  const { error } = setSMTPSchema.validate({ smtp_host: 'smtp.office365.com', smtp_port: 587 }, opts);
  assert.equal(error, undefined);
});

test('setSMTP: objeto vacío rechazado', () => {
  const { error } = setSMTPSchema.validate({}, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /sin campos/i);
});

test('setSMTP: puerto fuera de rango rechazado', () => {
  const { error } = setSMTPSchema.validate({ smtp_port: 99999 }, opts);
  assert.ok(error);
});

test('setSMTP: puerto como string numérico se convierte', () => {
  const { error, value } = setSMTPSchema.validate({ smtp_port: '587' }, opts);
  assert.equal(error, undefined);
  assert.equal(value.smtp_port, 587);
});

test('setSMTP: descarta claves no-SMTP (anti mass-assignment)', () => {
  const { error, value } = setSMTPSchema.validate({ smtp_user: 'u', es_admin: true }, opts);
  assert.equal(error, undefined);
  assert.equal(value.es_admin, undefined);
});

test('testSMTP: destino email inválido rechazado', () => {
  const { error } = testSMTPSchema.validate({ destino: 'no-email' }, opts);
  assert.ok(error);
});

test('testSMTP: vacío válido (usa email del operador)', () => {
  const { error } = testSMTPSchema.validate({}, opts);
  assert.equal(error, undefined);
});
