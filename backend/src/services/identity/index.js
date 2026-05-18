/**
 * Identity provider abstraction (ES0902 C1 + ES0901 8.2).
 *
 * Provee una capa uniforme para autenticacion, desacoplada del proveedor real.
 * En desarrollo y en el estado actual usa JWT propio (driver `jwt-local`).
 * Para homologacion ASI el driver `keycloak` apuntara al servidor de identidad
 * gestionado por la DGSEI (identidad-gcaba.apps.buenosaires.gob.ar) via OIDC.
 *
 * Contrato implementado por cada driver:
 *
 *   verifyToken(token: string)
 *     → Promise<UserPayload | null>
 *     // Devuelve el payload si el token es valido y no esta revocado.
 *     // Nunca arroja: errores de verificacion → null.
 *
 *   issueTokensForLogin(email: string, password: string)
 *     → Promise<{ accessToken, refreshToken, user } | null>
 *     // Solo aplica a providers con `supportsLocalIssuance = true`.
 *     // En Keycloak el login es por redirect OIDC, este metodo arroja.
 *
 *   refreshTokens(refreshToken: string)
 *     → Promise<{ accessToken, refreshToken } | null>
 *     // Idem.
 *
 *   revokeSession({ accessToken, refreshToken })
 *     → Promise<void>
 *     // Cierra la sesion: invalida refresh + revoca access (si aplica).
 *
 *   supportsLocalIssuance: boolean
 *     // Indica si el provider emite credenciales (login/refresh local) o
 *     // delega completamente al servidor de identidad externo.
 *
 * UserPayload (forma comun para todos los drivers):
 *   { id, email, role, base_id, turno, nombre_completo, legajo, jti? }
 *
 * Seleccion del driver: env `IDENTITY_PROVIDER` (default: `jwt-local`).
 */
const { IDENTITY_PROVIDER } = require('../../config');

let provider;
switch (IDENTITY_PROVIDER) {
  case 'keycloak':
    provider = require('./keycloak');
    break;
  case 'jwt-local':
  default:
    provider = require('./jwt-local');
    break;
}

module.exports = provider;
module.exports.driver = IDENTITY_PROVIDER;
