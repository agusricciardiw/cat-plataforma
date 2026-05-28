const { test } = require('node:test');
const assert = require('node:assert/strict');
const { putPermisosRolSchema } = require('../../src/service/validaciones/permisos');

const opts = { abortEarly: false, stripUnknown: true };

test('permisos: array de strings válido', () => {
  const { error } = putPermisosRolSchema.validate({ permisos: ['os.ver', 'os.editar'] }, opts);
  assert.equal(error, undefined);
});

test('permisos: array vacío válido (revoca todo)', () => {
  const { error } = putPermisosRolSchema.validate({ permisos: [] }, opts);
  assert.equal(error, undefined);
});

test('permisos: no-array rechazado', () => {
  const { error } = putPermisosRolSchema.validate({ permisos: 'os.ver' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /array/i);
});

test('permisos: faltante rechazado', () => {
  const { error } = putPermisosRolSchema.validate({}, opts);
  assert.ok(error);
});
