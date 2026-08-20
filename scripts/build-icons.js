const { execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "assets");
const svgPath = path.join(assetsDir, "icon.svg");
const iconSizes = [16, 32, 64, 128, 256];

async function main() {
  console.log("Building icons from SVG...");

  const masterPngPath = path.join(os.tmpdir(), "quicktoss-icon-master.png");
  await sharp(svgPath, { density: 384 }).resize(1024, 1024).png().toFile(masterPngPath);

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "quicktoss-icons-"));
  execSync(
    `npx electron-icon-builder --input="${masterPngPath}" --output="${outputDir}" --flatten`,
    {
      stdio: "inherit",
    }
  );

  const generatedDir = path.join(outputDir, "icons");
  fs.copyFileSync(path.join(generatedDir, "icon.icns"), path.join(assetsDir, "icon.icns"));
  fs.copyFileSync(path.join(generatedDir, "icon.ico"), path.join(assetsDir, "icon.ico"));
  fs.copyFileSync(path.join(generatedDir, "512x512.png"), path.join(assetsDir, "icon.png"));

  for (const size of iconSizes) {
    fs.copyFileSync(
      path.join(generatedDir, `${size}x${size}.png`),
      path.join(assetsDir, `icon-${size}.png`)
    );
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.rmSync(masterPngPath, { force: true });

  console.log("Icons generated successfully!");
}

main().catch((error) => {
  console.error("Error generating icons:", error.message);
  process.exit(1);
});
