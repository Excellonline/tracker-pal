const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const listed = childProcess.execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf8"
}).split("\0").filter(Boolean);

const deploymentPattern = new RegExp("AK" + "fy[a-zA-Z0-9_-]{20,}");
const accessKeyPattern = new RegExp("tp" + "_[a-f0-9]{20,}");
const findings = [];

for (const relative of listed) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const content = fs.readFileSync(absolute);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (deploymentPattern.test(text) || accessKeyPattern.test(text)) findings.push(relative);
}

assert.deepStrictEqual(findings, [], `tracked/public files contain private deployment values: ${findings.join(", ")}`);

const config = fs.readFileSync(path.join(root, "src", "Config.js"), "utf8");
assert.match(config, /desktopWebAppUrl:\s*""/, "public Apps Script config has no private desktop deployment URL");

const desktopCode = fs.readFileSync(path.join(root, "trackerpal-desktop", "src", "Code.js"), "utf8");
assert.doesNotMatch(desktopCode, /spreadsheetId:\s*"[^\"]+"/, "desktop source has no hardcoded spreadsheet ID");
assert.match(desktopCode, /TRACKERPAL_PRIVATE_CONFIG/, "desktop source loads private ignored configuration");
assert.match(desktopCode, /isAuthorizedRequest_/, "desktop web app requires its rotated access key");

console.log("ok - public source and Store assets contain no private TrackerPal deployment values");
