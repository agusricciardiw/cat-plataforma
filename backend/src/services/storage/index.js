/**
 * Storage abstraction layer (ES0901 8.4, D7).
 *
 * Provee una interfaz uniforme para persistir archivos, desacoplada del medio
 * físico. En desarrollo usa filesystem local; en producción (homologación ASI)
 * el driver `s3` apunta al HCP del GCBA u otro storage S3-compatible.
 *
 * Contrato implementado por cada driver:
 *
 *   save(buffer: Buffer, filename: string)  → Promise<string>  // devuelve la key
 *   read(key: string)                       → Promise<Buffer>
 *   delete(key: string)                     → Promise<void>
 *   publicUrl(key: string)                  → string
 *
 * Selección del driver vía env `STORAGE_DRIVER` (default: `local`).
 */
const { STORAGE_DRIVER } = require('../../config');

let provider;
switch (STORAGE_DRIVER) {
  case 's3':
    provider = require('./s3');
    break;
  case 'local':
  default:
    provider = require('./localFs');
    break;
}

module.exports = provider;
module.exports.driver = STORAGE_DRIVER;
