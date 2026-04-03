import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';

const PHOTOS_DIR = 'public/photos';
const THUMBS_DIR = 'public/photos/thumbs';
const WEB_DIR = 'public/photos/web';

const THUMB_WIDTH = 400;   // sidebar filmstrip (displayed ~160px tall)
const WEB_WIDTH = 1600;    // full-entry carousel

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']);

async function run() {
  await mkdir(THUMBS_DIR, { recursive: true });
  await mkdir(WEB_DIR, { recursive: true });

  const files = (await readdir(PHOTOS_DIR)).filter(f => {
    const ext = extname(f);
    return SUPPORTED.has(ext) && !f.startsWith('.');
  });

  console.log(`Processing ${files.length} photos...`);

  let done = 0;
  let skipped = 0;

  for (const file of files) {
    const src = join(PHOTOS_DIR, file);
    const stem = basename(file, extname(file));
    const thumbDest = join(THUMBS_DIR, `${stem}.webp`);
    const webDest = join(WEB_DIR, `${stem}.webp`);

    const needsThumb = !existsSync(thumbDest);
    const needsWeb = !existsSync(webDest);

    if (!needsThumb && !needsWeb) {
      skipped++;
      continue;
    }

    const image = sharp(src).rotate(); // auto-rotate from EXIF

    if (needsThumb) {
      await image.clone()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(thumbDest);
    }

    if (needsWeb) {
      await image.clone()
        .resize({ width: WEB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webDest);
    }

    done++;
    if (done % 50 === 0) console.log(`  ${done}/${files.length - skipped} processed...`);
  }

  console.log(`Done. ${done} converted, ${skipped} already up to date.`);
}

run().catch(err => { console.error(err); process.exit(1); });
