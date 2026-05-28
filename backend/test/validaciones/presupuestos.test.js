const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  crearPresupuestoSchema,
  actualizarPresupuestoSchema,
  modificarAprobadoSchema,
  buiSchema,
} = require('../../src/service/validaciones/presupuestos');

const opts = { abortEarly: false, stripUnknown: true };

test('crear: válido con items pasa', () => {
  const { error, value } = crearPresupuestoSchema.validate({
    beneficiario: 'ACME', evento: 'Recital',
    valor_modulo: 71249.25, validez_dias: 3,
    items: [{ dia: '2026-06-01', personal: 10, rol: 'infante' }],
  }, opts);
  assert.equal(error, undefined);
  assert.equal(value.items[0].rol, 'infante'); // unknown dentro de item se conserva
});

test('crear: beneficiario faltante rechazado', () => {
  const { error } = crearPresupuestoSchema.validate({ evento: 'X' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /beneficiario es requerido/i);
});

test('crear: evento faltante rechazado', () => {
  const { error } = crearPresupuestoSchema.validate({ beneficiario: 'ACME' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /evento es requerido/i);
});

test('crear: valor_modulo negativo rechazado', () => {
  const { error } = crearPresupuestoSchema.validate(
    { beneficiario: 'ACME', evento: 'X', valor_modulo: -5 }, opts);
  assert.ok(error);
});

test('crear: items no-array rechazado', () => {
  const { error } = crearPresupuestoSchema.validate(
    { beneficiario: 'ACME', evento: 'X', items: 'nope' }, opts);
  assert.ok(error);
});

test('actualizar: estado inválido rechazado', () => {
  const { error } = actualizarPresupuestoSchema.validate({ estado: 'fantasia' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /estado inválido/i);
});

test('actualizar: estado válido aceptado', () => {
  const { error } = actualizarPresupuestoSchema.validate({ estado: 'aprobado' }, opts);
  assert.equal(error, undefined);
});

test('actualizar: vacío rechazado', () => {
  const { error } = actualizarPresupuestoSchema.validate({}, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /al menos un campo/i);
});

test('modificar-aprobado: no acepta estado (se descarta) y exige un campo', () => {
  const { error, value } = modificarAprobadoSchema.validate({ evento: 'Nuevo', estado: 'aprobado' }, opts);
  assert.equal(error, undefined);
  assert.equal(value.estado, undefined);
});

test('bui: números opcionales válidos', () => {
  const { error } = buiSchema.validate({ numero: 'BUI-123' }, opts);
  assert.equal(error, undefined);
});
