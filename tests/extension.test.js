const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "trackerpal-extension");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const storeRoot = path.join(root, "store");
const storeManifest = JSON.parse(fs.readFileSync(path.join(storeRoot, "manifest.json"), "utf8"));
const tracking = require(path.join(root, "tracking.js"));
assert.strictEqual(manifest.manifest_version, 3, "extension uses Manifest V3");
assert.deepStrictEqual(manifest.permissions.sort(), ["sidePanel", "storage"].sort(), "extension requests only its required Chrome permissions");
assert.ok(!manifest.host_permissions, "extension requests no website access permissions");
assert.ok(!manifest.permissions.includes("tabs"), "extension does not request broad tabs permission");
assert.strictEqual(manifest.side_panel.default_path, "sidepanel.html", "extension provides a side panel");
assert.strictEqual(manifest.minimum_chrome_version, "114", "personal build declares the Side Panel minimum Chrome version");
for (const file of ["background.js", "sidepanel.html", "sidepanel.css", "sidepanel.js", "packages.js", "tracking.js", "privacy.html", "privacy.css", "privacy.js", "options.html", "options.css", "options.js", "config.example.js"]) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
}
for (const size of [16, 32, 48, 128]) {
  assert.ok(fs.existsSync(path.join(root, "icons", `icon-${size}.png`)), `icon-${size}.png exists`);
}
assert.strictEqual(tracking.detectCarrier("1Z999AA10123456784"), "UPS", "detects UPS tracking numbers");
assert.strictEqual(tracking.detectCarrier("9400111899223856928499"), "USPS", "detects USPS tracking numbers");
assert.strictEqual(tracking.detectCarrier("123456789012"), "FedEx", "detects FedEx tracking numbers");
assert.match(tracking.trackingUrl("UPS", "1Z999AA10123456784"), /^https:\/\/www\.ups\.com\//, "builds a secure UPS tracking URL");

assert.strictEqual(storeManifest.manifest_version, 3, "Store build uses Manifest V3");
assert.strictEqual(storeManifest.minimum_chrome_version, "114", "Store build declares the Side Panel minimum Chrome version");
assert.deepStrictEqual(storeManifest.permissions.sort(), ["sidePanel", "storage"].sort(), "Store build requests only required permissions");
assert.ok(!storeManifest.host_permissions, "Store build requests no website access");
assert.ok(!storeManifest.options_page, "Store build contains no private connection settings");
assert.match(storeManifest.content_security_policy.extension_pages, /frame-src 'none'/, "Store build blocks remote frames");
for (const file of ["manifest.json", "sidepanel.html", "sidepanel.css"]) {
  assert.ok(fs.existsSync(path.join(storeRoot, file)), `Store ${file} exists`);
}
const storeMarkup = fs.readFileSync(path.join(storeRoot, "sidepanel.html"), "utf8");
assert.doesNotMatch(storeMarkup, /<iframe\b|script\.google\.com|googleusercontent\.com|Gmail\s*\+\s*Sheets/i, "Store UI has no remote Google integration");
assert.match(storeMarkup, /privacyConsent/, "Store UI requires first-run privacy consent");
assert.match(storeMarkup, /tracking number in the carrier URL/i, "Store UI discloses carrier transfer before use");
const packagesSource = fs.readFileSync(path.join(root, "packages.js"), "utf8");
assert.match(packagesSource, /privacyConsentVersion/, "consent choice is persisted");
assert.match(packagesSource, /chrome\.storage\.local/, "package data is stored locally");
console.log("ok - Chrome extension packages are complete, Store-safe, and minimally permissioned");
