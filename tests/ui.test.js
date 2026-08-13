const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "src", "TrackerPal.html"), "utf8");
const bound = fs.readFileSync(path.join(root, "trackerpal-bound-ui", "src", "TrackerPal.html"), "utf8");
const desktop = fs.readFileSync(path.join(root, "trackerpal-desktop", "src", "TrackerPal.html"), "utf8");

for (const [name, html] of [["main", main], ["bound", bound], ["desktop", desktop]]) {
  assert.match(html, /function safeTrackingUrl\(/, `${name} UI validates tracking link protocols`);
  assert.match(html, /aria-label="Search orders"/, `${name} UI labels search`);
  assert.match(html, /role="status" aria-live="polite"/, `${name} UI announces feedback`);
  assert.match(html, /prefers-reduced-motion/, `${name} UI honors reduced motion`);
  assert.match(html, /data-label="Status"/, `${name} UI includes responsive order labels`);
  assert.match(html, /<html lang="en">/, `${name} UI declares its document language`);
  assert.match(html, /name="viewport"/, `${name} UI declares a mobile viewport`);
  assert.match(html, /aria-pressed=/, `${name} UI exposes selected filters`);
  assert.match(html, /event\.key === "Tab"/, `${name} UI contains keyboard focus in its dialog`);
  assert.match(html, /\.inert = true/, `${name} UI makes background content inert while its dialog is open`);
}

assert.match(main, /id="syncBtn"/, "main UI exposes Gmail sync");
assert.match(main, /id="backfillBtn"/, "main UI exposes backfill");
assert.doesNotMatch(bound, /id="syncBtn"|id="backfillBtn"/, "bound UI hides unsupported Gmail actions");
assert.doesNotMatch(desktop, /id="syncBtn"|id="backfillBtn"/, "desktop UI hides unsupported Gmail actions");

console.log("ok - web UIs share the polished responsive and safe interaction contract");
