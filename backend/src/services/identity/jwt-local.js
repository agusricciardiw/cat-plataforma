/**
 * jwt-local identity driver.
 *
 * Preserva el comportamiento actual: usuarios en `profiles` con password
 * bcrypt, access tokens JWT firmados con HS256 + JWT_SECRET, refresh tokens
 * UUID en la tabla `refresh_tokens`, blacklist en `revoked_tokens`.
 *
 * NO compatible con ES0902 C1 para produccion ASI: en prod el driver debe
 * ser `keycloak` contra identidad-gcaba.apps.buenosaires.gob.ar via OIDC.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../config');
const {
  findUserByEmail, crearRefreshToken, findRefreshToken, eliminarRefreshToken,
  revocarToken, isTokenRevoked,
} = require('../../model/auth');

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function buildPayload(user) {
  return {
    id: user.id || user.profile_id,
    email: user.email,
    role: user.role,
    base_id: user.base_id,
    turno: user.turno,
    nombre_completo: user.nombre_completo,
    legajo: user.legajo,
  };
}

function sign(user) {
  const jti = uuidv4();
  const accessToken = jwt.sign({ ...buildPayload(user), jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { accessToken, jti };
}

async function verifyToken(token) {
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
  } catch {
    return null;
  }
  if (decoded.jti) {
    try {
      if (await isTokenRevoked(decoded.jti)) return null;
    } catch (err) {
      // Fail-open: si la DB no responde, dejamos pasar (preserva comportamiento previo)
      console.error('[identity:jwt-local] Error verificando revocacion:', err.message);
    }
  }
  return decoded;
}

async function issueTokensForLogin(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return null;

  const { accessToken } = sign(user);
  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await crearRefreshToken(user.id, refreshToken, expiresAt);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      base_id: user.base_id,
      base_nombre: user.base_nombre,
      turno: user.turno,
      nombre_completo: user.nombre_completo,
      legajo: user.legajo,
      cuit:               user.cuit               ?? null,
      cargo:              user.cargo              ?? null,
      funcion:            user.funcion            ?? null,
      funcion_especifica: user.funcion_especifica ?? null,
      tipo_contrato:      user.tipo_contrato      ?? null,
      fecha_nacimiento:   user.fecha_nacimiento   ?? null,
      hora_entrada:       user.hora_entrada       ?? null,
      hora_salida:        user.hora_salida        ?? null,
      telefono:           user.telefono           ?? null,
      telefono_ht:        user.telefono_ht        ?? null,
    },
  };
}

async function refreshTokens(refreshToken) {
  const record = await findRefreshToken(refreshToken);
  if (!record) return null;

  // Rotacion: invalidar el refresh actual y emitir uno nuevo
  await eliminarRefreshToken(refreshToken);
  const nuevoRefresh = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await crearRefreshToken(record.profile_id, nuevoRefresh, expiresAt);

  const { accessToken } = sign(record);
  return { accessToken, refreshToken: nuevoRefresh };
}

async function revokeSession({ accessToken, refreshToken } = {}) {
  if (refreshToken) {
    try { await eliminarRefreshToken(refreshToken); } catch (err) {
      console.error('[identity:jwt-local] Error eliminando refresh:', err.message);
    }
  }
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded?.jti && decoded?.exp) {
        await revocarToken(decoded.jti, new Date(decoded.exp * 1000));
      }
    } catch {
      // token malformado: el refresh ya fue eliminado, no hace falta nada mas
    }
  }
}

module.exports = {
  verifyToken,
  issueTokensForLogin,
  refreshTokens,
  revokeSession,
  supportsLocalIssuance: true,
};
