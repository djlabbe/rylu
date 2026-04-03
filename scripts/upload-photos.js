import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY in environment');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'rylu';
const CONCURRENCY = 20;
const FOLDERS = [
  { local: 'public/photos/thumbs', remote: 'photos/thumbs' },
  { local: 'public/photos/web',    remote: 'photos/web' },
];

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(localPath, remoteKey) {
  const body = await readFile(localPath);
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: remoteKey,
    Body: body,
    ContentType: 'image/webp',
  }));
}

async function uploadFolder(localDir, remotePrefix) {
  const files = (await readdir(localDir)).filter(f => f.endsWith('.webp'));
  console.log(`\n${remotePrefix}: ${files.length} files`);

  let done = 0;
  let skipped = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async file => {
      const remoteKey = `${remotePrefix}/${file}`;
      if (await exists(remoteKey)) {
        skipped++;
        return;
      }
      await uploadFile(join(localDir, file), remoteKey);
      done++;
    }));
    if ((done + skipped) % 100 === 0 || i + CONCURRENCY >= files.length) {
      console.log(`  ${done} uploaded, ${skipped} skipped (already exist)`);
    }
  }
}

for (const { local, remote } of FOLDERS) {
  await uploadFolder(local, remote);
}
console.log('\nAll done.');
