const { login, refresh, logout, LocalIssuanceNotSupportedError } = require('../service/auth');
const { loginSchema, refreshSchema } = require('../service/validaciones/auth');
const logger = require('../logger').child({ module: 'controller.auth' });

async function postLogin(req, res) {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Credenciales incorrectas' });

  try {
    const result = await login(value.email, value.password);
    if (!result) return res.status(401).json({ error: 'Credenciales incorrectas' });
    return res.json(result);
  } catch (err) {
    if (err instanceof LocalIssuanceNotSupportedError) {
      return res.status(501).json({ error: 'Login local deshabilitado. Usar el flow OIDC del IdP del GCBA.' });
    }
    logger.error({ err }, 'Error en login');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postRefresh(req, res) {
  const { error, value } = refreshSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Token requerido' });

  try {
    const result = await refresh(value.refreshToken);
    if (!result) return res.status(401).json({ error: 'Token inválido o expirado' });
    return res.json(result);
  } catch (err) {
    if (err instanceof LocalIssuanceNotSupportedError) {
      return res.status(501).json({ error: 'Refresh local deshabilitado. Usar el flow OIDC del IdP del GCBA.' });
    }
    logger.error({ err }, 'Error en refresh');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postLogout(req, res) {
  try {
    // Recibimos tanto el refreshToken (para eliminarlo) como el
    // access token (para revocarlo por jti antes de que expire)
    await logout(req.body.refreshToken, req.body.token);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error en logout');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { postLogin, postRefresh, postLogout };
