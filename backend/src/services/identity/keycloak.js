/**
 * Keycloak OIDC identity driver — STUB.
 *
 * Activacion: `IDENTITY_PROVIDER=keycloak` + env vars KEYCLOAK_*.
 *
 * Para activar este driver:
 *   1. Coordinar con DGSEI el registro del cliente OIDC para SIGAT en
 *      identidad-gcaba.apps.buenosaires.gob.ar/.
 *   2. Instalar dependencias:
 *        npm install jwks-rsa jose
 *      (jwks-rsa para cachear las llaves publicas del realm, jose para
 *      validar firmas ES/RS y leer claims OIDC).
 *   3. Setear en .env:
 *        IDENTITY_PROVIDER=keycloak
 *        KEYCLOAK_ISSUER=https://identidad-gcaba.apps.buenosaires.gob.ar/realms/gcaba
 *        KEYCLOAK_CLIENT_ID=sigat
 *        KEYCLOAK_AUDIENCE=sigat
 *        KEYCLOAK_JWKS_URI=https://identidad-gcaba.apps.buenosaires.gob.ar/realms/gcaba/protocol/openid-connect/certs
 *   4. Reemplazar el flow de /api/auth/login del frontend por el redirect
 *      authorization_code + PKCE. Backend recibe el id_token / access_token
 *      via Authorization Bearer y lo valida con verifyToken().
 *   5. Mapear claims del token (preferred_username, email, groups) a la
 *      tabla `profiles` para resolver `role`, `base_id` y demas campos
 *      especificos de SIGAT (Keycloak solo provee identidad, los roles
 *      siguen en la app — ver ES0902 C1).
 *
 * Mientras no este activado, este modulo arroja en runtime si se intenta
 * usarlo. Mantiene la forma del contrato.
 */

function notImplemented(method) {
  return () => {
    throw new Error(
      `IDENTITY_PROVIDER=keycloak: ${method} no esta implementado todavia. ` +
      `Ver instrucciones en backend/src/services/identity/keycloak.js`
    );
  };
}

async function verifyToken(token) {
  // TODO: validar el JWT contra el JWKS del realm de GCBA.
  //
  // Boceto:
  //   const jwksClient = require('jwks-rsa');
  //   const { jwtVerify, createRemoteJWKSet } = require('jose');
  //   const JWKS = createRemoteJWKSet(new URL(process.env.KEYCLOAK_JWKS_URI));
  //   const { payload } = await jwtVerify(token, JWKS, {
  //     issuer: process.env.KEYCLOAK_ISSUER,
  //     audience: process.env.KEYCLOAK_AUDIENCE,
  //   });
  //   // Mapear claims OIDC -> UserPayload de SIGAT
  //   const profile = await findProfileBySubject(payload.sub) ||
  //                   await findProfileByEmail(payload.email);
  //   if (!profile) return null;
  //   return {
  //     id: profile.id,
  //     email: profile.email,
  //     role: profile.role,
  //     base_id: profile.base_id,
  //     turno: profile.turno,
  //     nombre_completo: profile.nombre_completo,
  //     legajo: profile.legajo,
  //     jti: payload.jti,
  //   };
  throw new Error(
    'IDENTITY_PROVIDER=keycloak: verifyToken no esta implementado todavia. ' +
    'Ver instrucciones en backend/src/services/identity/keycloak.js'
  );
}

module.exports = {
  verifyToken,
  issueTokensForLogin: notImplemented('issueTokensForLogin'),
  refreshTokens: notImplemented('refreshTokens'),
  revokeSession: notImplemented('revokeSession'),
  supportsLocalIssuance: false,
};
