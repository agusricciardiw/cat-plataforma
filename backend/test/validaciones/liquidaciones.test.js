const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  previewSchema,
  crearLiquidacionSchema,
  crearUFSchema,
} = require('../../src/service/validaciones/liquidaciones');

const opts = { abortEarly: false, stripUnknown: true };

test('preview: válido pasa y conserva fechas como string', () => {
  const { error, value } = previewSchema.validate({
    fecha_desde: '2026-05-01', fecha_hasta: '2026-05-31', valor_uf: 1500.5,
  }, opts);
  assert.equal(error, undefined);
  assert.equal(typeof value.fecha_desde, 'string'); // .raw() mantiene string
  assert.equal(value.fecha_desde, '2026-05-01');
});

test('preview: valor_uf <= 0 rechazado', () => {
  const { error } = previewSchema.validate(
    { fecha_desde: '2026-05-01', fecha_hasta: '2026-05-31', valor_uf: 0 }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /mayor a 0/i);
});

test('preview: fecha faltante rechazada', () => {
  const { error } = previewSchema.validate({ valor_uf: 100 }, opts);
  assert.ok(error);
});

test('preview: fecha no-ISO rechazada', () => {
  const { error } = previewSchema.validate(
    { fecha_desde: '01/05/2026', fecha_hasta: '2026-05-31', valor_uf: 100 }, opts);
  assert.ok(error);
});

test('crear: acepta observaciones opcionales', () => {
  const { error } = crearLiquidacionSchema.validate({
    fecha_desde: '2026-05-01', fecha_hasta: '2026-05-31', valor_uf: 100, observaciones: 'mayo',
  }, opts);
  assert.equal(error, undefined);
});

test('crearUF: válido pasa', () => {
  const { error } = crearUFSchema.validate({ valor: 1234.5, vigente_desde: '2026-06-01' }, opts);
  assert.equal(error, undefined);
});

test('crearUF: valor <= 0 rechazado', () => {
  const { error } = crearUFSchema.validate({ valor: -1, vigente_desde: '2026-06-01' }, opts);
  assert.ok(error);
});
