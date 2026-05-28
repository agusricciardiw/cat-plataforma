const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearRolSchema, editarRolSchema } = require('../../src/service/validaciones/roles');

const opts = { abortEarly: false, stripUnknown: true };

test('crear: válido pasa', () => {
  const { error } = crearRolSchema.validate({ key: 'subjefe_cgm', label: 'Subjefe CGM' }, opts);
  assert.equal(error, undefined);
});

test('crear: key con mayúsculas rechazada', () => {
  const { error } = crearRolSchema.validate({ key: 'Subjefe', label: 'X' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /key inválido/i);
});

test('crear: key faltante rechazada', () => {
  const { error } = crearRolSchema.validate({ label: 'X' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /key y label son requeridos/i);
});

test('crear: label faltante rechazada', () => {
  const { error } = crearRolSchema.validate({ key: 'rol_x' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /key y label son requeridos/i);
});

test('crear: acepta clonar_de y color', () => {
  const { error } = crearRolSchema.validate(
    { key: 'rol_x', label: 'Rol X', clonar_de: 'operador', color: '#fff', bg: 'bg-blue-500' }, opts);
  assert.equal(error, undefined);
});

test('editar: label requerido', () => {
  const { error } = editarRolSchema.validate({ descripcion: 'sin label' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /label es requerido/i);
});

test('editar: válido pasa', () => {
  const { error } = editarRolSchema.validate({ label: 'Nuevo label' }, opts);
  assert.equal(error, undefined);
});
