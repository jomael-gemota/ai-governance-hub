/**
 * Converts the site favicon (SVG) into a small PNG used as an inline
 * CID attachment in invitation emails. Run with: `node scripts/build-email-logo.js`.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const SRC_SVG = path.resolve(__dirname, '../../frontend/public/favicon.svg');
const OUT_PNG = path.resolve(__dirname, '../src/assets/email-logo.png');
const SIZE = 128;

async function main() {
  const svgBuffer = fs.readFileSync(SRC_SVG);
  fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
  await sharp(svgBuffer, { density: 384 })
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_PNG);
  const stat = fs.statSync(OUT_PNG);
  console.log(`Wrote ${OUT_PNG} (${stat.size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
