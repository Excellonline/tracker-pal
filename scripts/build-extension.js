const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "trackerpal-extension");
const output = path.join(process.env.USERPROFILE, "Desktop", "TrackerPal Chrome Extension");
const shortcutPath = path.join(process.env.USERPROFILE, "Desktop", "TrackerPal.url");

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === "config.js" || entry.name === "store") continue;
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

const shortcut = fs.readFileSync(shortcutPath, "utf8");
const urlLine = shortcut.split(/\r?\n/).find((line) => line.startsWith("URL="));
if (!urlLine) throw new Error("TrackerPal Desktop shortcut has no URL.");
const trackerUrl = urlLine.slice(4).trim();
const parsed = new URL(trackerUrl);
if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.includes("/macros/s/")) {
  throw new Error("TrackerPal Desktop shortcut does not point to an Apps Script web app.");
}

fs.rmSync(output, { recursive: true, force: true });
copyTree(source, output);
fs.writeFileSync(path.join(output, "config.js"), `globalThis.TRACKERPAL_DEFAULT_URL = ${JSON.stringify(trackerUrl)};\n`, "utf8");
console.log(output);
