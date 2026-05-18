/**
 * LocalFs storage driver — persiste archivos en filesystem local.
 * Usado en desarrollo. NO compatible con ES0901 D7 para producción ASI:
 * en prod el driver debe ser `s3` apuntando al HCP del GCBA.
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { UPLOADS_DIR } = require('../../config');

const baseDir = path.isAbsolute(UPLOADS_DIR)
  ? UPLOADS_DIR
  : path.join(process.cwd(), UPLOADS_DIR);

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

async function save(buffer, filename) {
  const dest = path.join(baseDir, filename);
  await fsp.writeFile(dest, buffer);
  return filename;
}

async function read(key) {
  return fsp.readFile(path.join(baseDir, key));
}

async function deleteFile(key) {
  try {
    await fsp.unlink(path.join(baseDir, key));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function publicUrl(key) {
  return `/uploads/${key}`;
}

function localPath(key) {
  return path.join(baseDir, key);
}

module.exports = {
  save,
  read,
  delete: deleteFile,
  publicUrl,
  localPath,
  baseDir,
  serveStatic: true,
};
