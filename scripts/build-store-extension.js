const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "trackerpal-extension");
const storeSource = path.join(source, "store");
const manifest = JSON.parse(fs.readFileSync(path.join(storeSource, "manifest.json"), "utf8"));
const dist = path.join(root, "dist");
const output = path.join(dist, "trackerpal-chrome-store");
const zip = path.join(dist, `trackerpal-chrome-store-v${manifest.version}.zip`);
const sharedFiles = [
  "background.js",
  "packages.js",
  "privacy.css",
  "privacy.html",
  "privacy.js",
  "tracking.js"
];

function copyFile(relativePath) {
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(source, relativePath), target);
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

fs.mkdirSync(dist, { recursive: true });
fs.rmSync(output, { recursive: true, force: true });
fs.rmSync(zip, { force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of sharedFiles) copyFile(file);
fs.cpSync(path.join(source, "icons"), path.join(output, "icons"), { recursive: true });
fs.copyFileSync(path.join(storeSource, "manifest.json"), path.join(output, "manifest.json"));
fs.copyFileSync(path.join(storeSource, "sidepanel.html"), path.join(output, "sidepanel.html"));
fs.copyFileSync(path.join(storeSource, "sidepanel.css"), path.join(output, "sidepanel.css"));

const forbiddenNames = new Set(["config.js", "config.example.js", "options.html", "options.css", "options.js"]);
const forbiddenContent = [
  /<iframe\b/i,
  /script\.google\.com/i,
  /googleusercontent\.com/i,
  /TRACKERPAL_DEFAULT_URL/,
  /options_page/,
  /Gmail\s*\+\s*Sheets/i
];
const outputFiles = walkFiles(output);
for (const file of outputFiles) {
  if (forbiddenNames.has(path.basename(file))) throw new Error(`Store package contains forbidden file: ${path.basename(file)}`);
  if (!/\.(?:png|ico)$/i.test(file)) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenContent) {
      if (pattern.test(content)) throw new Error(`Store package contains forbidden content ${pattern} in ${path.relative(output, file)}`);
    }
  }
}

const shortcut = path.join(process.env.USERPROFILE || "", "Desktop", "TrackerPal.url");
if (fs.existsSync(shortcut)) {
  const urlLine = fs.readFileSync(shortcut, "utf8").split(/\r?\n/).find((line) => line.startsWith("URL="));
  const deploymentId = urlLine && urlLine.match(/\/macros\/s\/([^/]+)\/exec/);
  if (deploymentId) {
    for (const file of outputFiles.filter((candidate) => !/\.(?:png|ico)$/i.test(candidate))) {
      if (fs.readFileSync(file, "utf8").includes(deploymentId[1])) {
        throw new Error(`Store package contains the private TrackerPal deployment ID in ${path.relative(output, file)}.`);
      }
    }
  }
}

const zipEntries = fs.readdirSync(output).sort();
execFileSync("tar.exe", ["-a", "-c", "-f", zip, "-C", output, ...zipEntries], { stdio: "inherit" });

const archivedEntries = execFileSync("tar.exe", ["-t", "-f", zip], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
if (!archivedEntries.includes("manifest.json")) {
  throw new Error("Store ZIP must contain manifest.json at the archive root.");
}
console.log(zip);
