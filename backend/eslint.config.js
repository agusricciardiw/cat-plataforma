/**
 * ESLint flat config para el backend de SIGAT.
 *
 * Apunta a detectar problemas de seguridad (ES0902 + ES0901 Anexo I "Static
 * Application Security Testing") sin volver al codigo no-ejecutable: la
 * mayoria de reglas estan en `warn`, no en `error`. Despues de la primera
 * pasada del CI se decide cuales escalar.
 *
 * Reglas activas:
 *  - eslint:recommended (defaults razonables)
 *  - plugin:security/recommended (OWASP-aligned: eval, no literal fs path,
 *    weak random, regex DoS, etc.)
 *
 * Plugin homologado por ASI para SAST en JS (ES0901 Anexo I, seccion 5).
 */
const js = require('@eslint/js');
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  security.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
    },
    rules: {
      // ── Severidad — empezamos con warn para no romper el build ─────
      // Despues de la primera corrida del CI, las que confirmemos
      // que son criticas se suben a 'error'.
      'no-unused-vars':                          ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console':                              'off', // Migracion progresiva a logger esta documentada
      'no-undef':                                'error',
      'no-empty':                                ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins':                   'warn',

      // ── Security plugin: ajustes finos ─────────────────────────────
      // 'detect-non-literal-fs-filename' tiende a falsos positivos en
      // codigo donde el path viene de config (uploads dir, etc.) — el
      // storage adapter lo aisla, asi que bajamos a warn.
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-object-injection':        'off',  // demasiado ruidoso, sin valor real
      'security/detect-non-literal-require':     'off',  // usado deliberadamente en factories (storage, identity)
    },
  },
  {
    // Scripts de migracion one-shot — relajamos reglas porque son codigo
    // operativo no productivo.
    files: ['src/db/migrate_*.js', 'src/db/seed*.js', 'src/db/reset-*.js', 'src/db/fix-*.js', 'src/db/limpiar_*.js', 'src/db/add-*.js'],
    rules: {
      'no-unused-vars': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'uploads/',
      'coverage/',
      'dist/',
      '*.min.js',
      'src/db/*_temp.js',  // codigo experimental, no runtime
    ],
  },
];
