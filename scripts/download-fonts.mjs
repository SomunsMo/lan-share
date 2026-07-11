import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = resolve(__dirname, '../src/assets/fonts');

const FONTS = [
  { name: 'AlibabaPuHuiTi-3-65-Medium.woff2', url: 'https://cdn.jsdelivr.net/npm/@pinhai/ali-fonts@1.0.4/fonts/AlibabaPuHuiTi-3-65-Medium.woff2' },
];

const TIMEOUT_MS = 180_000;

async function downloadFont(font) {
  const dest = resolve(fontsDir, font.name);
  process.stdout.write(`Downloading ${font.name}... `);
  const resp = await fetch(font.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();
  writeFileSync(dest, Buffer.from(buf));
  process.stdout.write(`${(buf.byteLength / 1024 / 1024).toFixed(2)} MB\n`);
}

async function main() {
  if (!existsSync(fontsDir)) {
    mkdirSync(fontsDir, { recursive: true });
  }

  const missing = FONTS.filter(f => !existsSync(resolve(fontsDir, f.name)));

  if (missing.length === 0) {
    console.log(`All fonts ready (${FONTS.length}/${FONTS.length}, local cache).`);
    return;
  }

  console.log(`${missing.length}/${FONTS.length} fonts missing, downloading from CDN...\n`);

  let hasError = false;
  for (const font of missing) {
    try {
      await downloadFont(font);
    } catch (err) {
      hasError = true;
      console.error(`  [FAILED] ${err.message}`);
    }
  }

  if (hasError) {
    const stillMissing = FONTS.filter(f => !existsSync(resolve(fontsDir, f.name)));
    console.error(`\n[ERROR] ${stillMissing.length}/${FONTS.length} fonts failed to download.`);
    console.error(`\nPlease manually place the following font files into:\n  ${fontsDir}\n`);
    for (const f of stillMissing) {
      console.error(`  - ${f.name}`);
      console.error(`    Download from: ${f.url}`);
    }
    console.error(`\nAfter placing the files, re-run the build.`);
    process.exit(1);
  }

  console.log(`\nAll fonts ready (${FONTS.length}/${FONTS.length}).`);
}

main().catch(e => { console.error(e); process.exit(1); });
