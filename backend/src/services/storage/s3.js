/**
 * S3 storage driver — compatible con MinIO en dev y HCP del GCBA en producción.
 *
 * Habilitación: `STORAGE_DRIVER=s3` + las env vars S3_*.
 *
 * Para activar este driver:
 *   1. Instalar SDK:  npm install @aws-sdk/client-s3
 *   2. Setear en .env:
 *        STORAGE_DRIVER=s3
 *        S3_ENDPOINT=http://localhost:9000        (MinIO local; en prod: HCP)
 *        S3_REGION=us-east-1
 *        S3_BUCKET=sigat-uploads
 *        S3_ACCESS_KEY=...
 *        S3_SECRET_KEY=...
 *        S3_FORCE_PATH_STYLE=true                 (true para MinIO/HCP)
 *        S3_PUBLIC_URL_BASE=http://localhost:9000/sigat-uploads   (opcional)
 *
 * Mientras el SDK no esté instalado, este módulo arroja en runtime si se
 * intenta usarlo. El stub mantiene la forma del contrato.
 */
const { S3 } = (() => {
  try {
    return require('@aws-sdk/client-s3');
  } catch {
    return { S3: null };
  }
})();

const cfg = {
  endpoint:        process.env.S3_ENDPOINT,
  region:          process.env.S3_REGION || 'us-east-1',
  bucket:          process.env.S3_BUCKET,
  accessKeyId:     process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  forcePathStyle:  process.env.S3_FORCE_PATH_STYLE === 'true',
  publicUrlBase:   process.env.S3_PUBLIC_URL_BASE,
};

let client = null;
function getClient() {
  if (!S3) {
    throw new Error(
      'STORAGE_DRIVER=s3 requiere @aws-sdk/client-s3. Ejecutar: npm install @aws-sdk/client-s3'
    );
  }
  if (!cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('STORAGE_DRIVER=s3 requiere S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY');
  }
  if (!client) {
    client = new S3({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return client;
}

async function save(buffer, filename) {
  await getClient().putObject({
    Bucket: cfg.bucket,
    Key: filename,
    Body: buffer,
  });
  return filename;
}

async function read(key) {
  const res = await getClient().getObject({ Bucket: cfg.bucket, Key: key });
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function deleteFile(key) {
  await getClient().deleteObject({ Bucket: cfg.bucket, Key: key });
}

function publicUrl(key) {
  if (cfg.publicUrlBase) return `${cfg.publicUrlBase.replace(/\/$/, '')}/${key}`;
  const ep = (cfg.endpoint || '').replace(/\/$/, '');
  return `${ep}/${cfg.bucket}/${key}`;
}

module.exports = {
  save,
  read,
  delete: deleteFile,
  publicUrl,
  serveStatic: false,
};
