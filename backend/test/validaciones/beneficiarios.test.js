const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  crearBeneficiarioSchema,
  actualizarBeneficiarioSchema,
} = require('../../src/service/validaciones/beneficiarios');

const opts = { abortEarly: false, stripUnknown: true };

test('crear: input válido completo pasa y normaliza email a minúsculas', () => {
  const { error, value } = crearBeneficiarioSchema.validate({
    razon_social: '  ACME SA  ',
    nombre: 'Juan Pérez',
    email: 'Contacto@ACME.com',
    telefono: '+54 11 4000-0000',
    cuit: '30-12345678-9',
  }, opts);
  assert.equal(error, undefined);
  assert.equal(value.razon_social, 'ACME SA');      // trim aplicado
  assert.equal(value.email, 'contacto@acme.com');   // lowercase aplicado
});

test('crear: solo razon_social es suficiente', () => {
  const { error } = crearBeneficiarioSchema.validate({ razon_social: 'ACME' }, opts);
  assert.equal(error, undefined);
});

test('crear: razon_social faltante es rechazada', () => {
  const { error } = crearBeneficiarioSchema.validate({ nombre: 'Juan' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /razón social es requerida/i);
});

test('crear: razon_social vacía/espacios es rechazada', () => {
  const { error } = crearBeneficiarioSchema.validate({ razon_social: '   ' }, opts);
  assert.ok(error);
});

test('crear: email inválido es rechazado', () => {
  const { error } = crearBeneficiarioSchema.validate(
    { razon_social: 'ACME', email: 'no-es-un-email' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /email inválido/i);
});

test('crear: CUIT con formato inválido es rechazado', () => {
  const { error } = crearBeneficiarioSchema.validate(
    { razon_social: 'ACME', cuit: '123' }, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /CUIT inválido/i);
});

test('crear: CUIT sin guiones (11 dígitos) es aceptado', () => {
  const { error } = crearBeneficiarioSchema.validate(
    { razon_social: 'ACME', cuit: '30123456789' }, opts);
  assert.equal(error, undefined);
});

test('crear: campos desconocidos se descartan (anti mass-assignment)', () => {
  const { error, value } = crearBeneficiarioSchema.validate(
    { razon_social: 'ACME', activo: false, id: 'inyectado' }, opts);
  assert.equal(error, undefined);
  assert.equal(value.activo, undefined); // activo no existe en el schema de creación
  assert.equal(value.id, undefined);
});

test('actualizar: objeto vacío es rechazado', () => {
  const { error } = actualizarBeneficiarioSchema.validate({}, opts);
  assert.ok(error);
  assert.match(error.details[0].message, /al menos un campo/i);
});

test('actualizar: solo activo booleano es válido', () => {
  const { error, value } = actualizarBeneficiarioSchema.validate({ activo: false }, opts);
  assert.equal(error, undefined);
  assert.equal(value.activo, false);
});

test('actualizar: activo no booleano es rechazado', () => {
  const { error } = actualizarBeneficiarioSchema.validate({ activo: 'sí' }, opts);
  assert.ok(error);
});
