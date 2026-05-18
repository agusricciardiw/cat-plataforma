/**
 * service/auth.js — login / refresh / logout
 *
 * Delega al adapter de identidad (services/identity/). Hoy el adapter es
 * `jwt-local` (preserva comportamiento previo). Cuando se enchufe Keycloak
 * (`IDENTITY_PROVIDER=keycloak`), estos endpoints dejan de tener sentido
 * porque el flow es authorization_code + PKCE via redirect — en ese caso
 * devuelven HTTP 501 desde el controller verificando `supportsLocalIssuance`.
 *
 * Forma de retorno mantenida con `token` (no `accessToken`) para preservar
 * compat con el frontend actual. Cuando se haga la migracion a Keycloak el
 * frontend va a recibir el access_token directo del IdP y este servicio no
 * sera el que lo emita.
 */
const identity = require('../services/identity');

class LocalIssuanceNotSupportedError extends Error {
  constructor() {
    super(`El identity provider activo (${identity.driver}) no emite tokens localmente. Usar el flow OIDC del IdP externo.`);
    this.code = 'LOCAL_ISSUANCE_NOT_SUPPORTED';
  }
}

function ensureLocalIssuance() {
  if (!identity.supportsLocalIssuance) throw new LocalIssuanceNotSupportedError();
}

async function login(email, password) {
  ensureLocalIssuance();
  const result = await identity.issueTokensForLogin(email, password);
  if (!result) return null;
  // Compat con el frontend: campo `token` en lugar de `accessToken`
  return { token: result.accessToken, refreshToken: result.refreshToken, user: result.user };
}

async function refresh(refreshToken) {
  ensureLocalIssuance();
  const result = await identity.refreshTokens(refreshToken);
  if (!result) return null;
  return { token: result.accessToken, refreshToken: result.refreshToken };
}

async function logout(refreshToken, accessToken) {
  await identity.revokeSession({ refreshToken, accessToken });
}

module.exports = { login, refresh, logout, LocalIssuanceNotSupportedError };
