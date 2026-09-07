// Prints one version's section from CHANGELOG.md, for use as GitHub release
// notes. Exists because electron-builder publishes releases with an empty
// body — every release before v1.5.0 shipped with no notes at all.
//
// Usage: node scripts/changelog-section.js 1.5.0
const fs = require("node:fs");
const path = require("node:path");

const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
  console.error("usage: changelog-section.js <version>");
  process.exit(1);
}

const changelog = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
const lines = changelog.split("\n");

// Section runs from its own "## [x.y.z]" heading to the next "## " heading.
const startsSection = (line) => /^## /.test(line);
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));

if (start === -1) {
  console.error(`No section for ${version} in CHANGELOG.md`);
  process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex(startsSection);
const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();

if (!body) {
  console.error(`The section for ${version} is empty`);
  process.exit(1);
}

console.log(body);
