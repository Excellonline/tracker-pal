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
for (const file of ["background.js", "sidepanel.html", "sidepanel.css", "sidepanel.js", "exports.js", "packages.js", "tracking.js", "privacy.html", "privacy.css", "privacy.js", "options.html", "options.css", "options.js", "config.example.js"]) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
}
for (const size of [16, 32, 48, 128]) {
  assert.ok(fs.existsSync(path.join(root, "icons", `icon-${size}.png`)), `icon-${size}.png exists`);
}
assert.strictEqual(tracking.detectCarrier("1Z999AA10123456784"), "UPS", "detects UPS tracking numbers");
assert.strictEqual(tracking.detectCarrier("9400111899223856928499"), "USPS", "detects USPS tracking numbers");
assert.strictEqual(tracking.detectCarrier("123456789012"), "FedEx", "detects FedEx tracking numbers");
assert.match(tracking.trackingUrl("UPS", "1Z999AA10123456784"), /^https:\/\/www\.ups\.com\//, "builds a secure UPS tracking URL");
assert.strictEqual(tracking.trackingUrl("Pickup", "123 Main St"), "", "never sends pickup addresses to a carrier URL");

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
const personalMarkup = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
for (const [name, markup] of [["personal", personalMarkup], ["Store", storeMarkup]]) {
  assert.match(markup, /<html lang="en">/, `${name} side panel declares its language`);
  assert.match(markup, /name="viewport"/, `${name} side panel declares a mobile viewport`);
  assert.match(markup, /<details class="add-package" id="addPackagePanel">\s*<summary id="addPackageToggle">/, `${name} Add package form is collapsed by default with native disclosure semantics`);
  assert.match(markup, /id="cancelAddButton"/, `${name} Add package form has an explicit cancel path`);
  assert.match(markup, /id="trackingFieldLabel" for="trackingNumber"/, `${name} exposes a relabelable tracking or pickup-address field`);
  assert.match(markup, /<option>Pickup<\/option>/, `${name} offers Pickup as a carrier choice`);
  assert.match(markup, /id="deliveriesTitle"/, `${name} delivery list has a visible page heading`);
  assert.match(markup, /id="packageList" role="list"/, `${name} deliveries expose list semantics`);
  assert.match(markup, /data-filter="open" aria-pressed="true"/, `${name} exposes the selected Open filter`);
  assert.match(markup, /id="historyExport" aria-labelledby="historyExportTitle" hidden/, `${name} keeps completed-history exports hidden until All is selected`);
  assert.match(markup, /data-export="csv" disabled/, `${name} provides a local CSV history download`);
  assert.match(markup, /data-export="pdf" disabled/, `${name} provides a local PDF history download`);
  assert.match(markup, /<script src="exports\.js"><\/script>\s*<script src="packages\.js"><\/script>/, `${name} loads local export helpers before package controls`);
  assert.match(markup, /id="liveStatus" role="status" aria-live="polite"/, `${name} announces package changes`);
  assert.match(markup, /Designed by Sev/, `${name} credits the designer in the quiet local-storage footer`);
}
const packagesSource = fs.readFileSync(path.join(root, "packages.js"), "utf8");
assert.match(packagesSource, /privacyConsentVersion/, "consent choice is persisted");
assert.match(packagesSource, /chrome\.storage\.local/, "package data is stored locally");
assert.match(packagesSource, /role="listitem"/, "rendered deliveries expose list-item semantics");
assert.match(packagesSource, /event\.target\.closest\("\[data-action\]"\)/, "nested delivery button icons keep delegated actions working");
assert.match(packagesSource, /class="status-control"/, "delivery status uses a compact editable control");
assert.doesNotMatch(packagesSource, /class="status-edit"/, "status stays clean without a redundant pencil icon");
assert.match(packagesSource, /package-title[^`]+<\/div>\s*<div class="status-control">/, "status pill follows and visually hugs the package title");
assert.match(packagesSource, /class="compact-action received-button/, "received actions stay compact in dense lists");
assert.match(packagesSource, /class="compact-action delete-button/, "delete actions stay compact in dense lists");
assert.match(packagesSource, /aria-label="Track \$\{item\} with/, "carrier tracking buttons name their package and carrier");
assert.match(packagesSource, /pickup \? "Address \(optional\)" : "Tracking number"/, "Pickup relabels the tracking field as an optional address");
assert.match(packagesSource, /trackingInput\.required = !pickup/, "Pickup makes the address optional while shipped packages still require tracking numbers");
assert.match(packagesSource, /selectedCarrier === "Pickup" \? rawTrackingValue/, "Pickup addresses keep their readable formatting");
assert.match(packagesSource, /createdAt: new Date\(\)\.toISOString\(\)/, "new packages receive their entry date automatically");
assert.match(packagesSource, /sortPackagesByEntryDate\(\)/, "delivery rows are kept in entry-date order");
assert.match(packagesSource, /<input type="date" data-action="date"/, "each delivery exposes a native editable entry date");
assert.match(packagesSource, /title="Edit entry date"/, "entry dates explain their edit action on hover");
assert.doesNotMatch(packagesSource, /entry-date-display"[^`]*<svg/, "entry date stays clean without a redundant pencil icon");
assert.match(packagesSource, /updateEntryDate\(entry, event\.target\.value\)/, "edited entry dates are saved with the package");
assert.match(packagesSource, /addPackagePanel\.open = false/, "successful package entry collapses the Add package form");
assert.match(packagesSource, /addPackageToggle\.focus\(\)/, "collapsed Add package flow restores keyboard focus");
assert.match(packagesSource, /receivedAt = new Date\(\)\.toISOString\(\)/, "marking a package received records its truthful completion date");
assert.match(packagesSource, /delete packages\[index\]\.receivedAt/, "reopening a package removes its completion date");
assert.match(packagesSource, /historyExport\.hidden = activeFilter !== "all"/, "completed-history footer appears only in the All view");
assert.match(packagesSource, /TrackerPalExports\.downloadCsv\(packages\)/, "CSV history download is wired locally");
assert.match(packagesSource, /TrackerPalExports\.downloadPdf\(packages\)/, "PDF history download is wired locally");
for (const [name, cssPath] of [["personal", path.join(root, "sidepanel.css")], ["Store", path.join(storeRoot, "sidepanel.css")]]) {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(css, /\.add-package summary/, `${name} disclosure is styled as a first-class control`);
  assert.match(css, /\.package-row\s*\{/, `${name} renders deliveries as a clean row list`);
  assert.match(css, /grid-template-columns:\s*4px minmax\(0, 1fr\)/, `${name} keeps delivery details in a compact connected row`);
  assert.match(css, /\.status-control select\s*\{[\s\S]*?border-radius:\s*999px[\s\S]*?color:\s*var\(--danger\)/, `${name} renders status as a red editable pill`);
  assert.match(css, /\.package-toolbar\s*\{[^}]*margin-left:\s*auto/, `${name} keeps receive, delete, and carrier actions aligned at the right edge`);
  assert.match(css, /\.compact-action\s*\{[\s\S]*?width:\s*32px[\s\S]*?height:\s*32px/, `${name} uses tidy icon actions for dense delivery lists`);
  assert.match(css, /button\.carrier-pill/, `${name} makes the compact carrier pill the tracking action`);
  assert.match(css, /\.entry-date\s*\{/, `${name} presents the editable entry date as a compact row control`);
  assert.match(css, /\.entry-date:focus-within/, `${name} keeps the invisible native date input visibly focusable`);
  assert.match(css, /\.history-export\s*\{/, `${name} styles completed-history downloads as a distinct footer`);
  assert.match(css, /\.history-export\[hidden\]\s*\{\s*display:\s*none/, `${name} removes hidden export controls from the layout`);
  assert.match(css, /\.history-export-actions button\s*\{[^}]*min-height:\s*44px/, `${name} keeps export downloads easy to click`);
  assert.match(css, /:focus-visible/, `${name} preserves visible keyboard focus`);
  assert.match(css, /@media \(max-width: 390px\)/, `${name} adapts delivery rows for narrow side panels`);
  assert.match(css, /prefers-reduced-motion/, `${name} honors reduced-motion preferences`);
}
console.log("ok - Chrome extension packages are complete, Store-safe, and minimally permissioned");
