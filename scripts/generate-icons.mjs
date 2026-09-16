import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const rootPublic = path.join(__dirname, "..", "public");

const bubbleSvg = readFileSync(path.join(iconsDir, "icon.svg"));
const badgeSvg = readFileSync(path.join(iconsDir, "badge.svg"));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  for (const size of sizes) {
    await sharp(bubbleSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
  }

  // Maskable: fundo cheio (o bubble já ocupa a área toda, adequado como maskable)
  for (const size of [192, 512]) {
    await sharp(bubbleSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `maskable-${size}.png`));
  }

  await sharp(bubbleSvg).resize(180, 180).png().toFile(path.join(rootPublic, "apple-touch-icon.png"));
  await sharp(bubbleSvg).resize(32, 32).png().toFile(path.join(rootPublic, "favicon-32.png"));
  await sharp(bubbleSvg).resize(16, 16).png().toFile(path.join(rootPublic, "favicon-16.png"));

  await sharp(badgeSvg)
    .resize(72, 72)
    .flatten({ background: "#008069" })
    .png()
    .toFile(path.join(iconsDir, "badge-72.png"));

  console.log("Ícones gerados em public/icons e public/");
}

run();
