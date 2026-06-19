const assert = require("assert");
const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "src", "appsscript.json"), "utf8")
);

assert.equal(manifest.timeZone, "America/New_York");
assert.equal(manifest.runtimeVersion, "V8");
assert.equal(manifest.webapp.executeAs, "USER_DEPLOYING");
assert.equal(manifest.webapp.access, "MYSELF");
assert.equal(manifest.executionApi.access, "MYSELF");

[
  "https://www.googleapis.com/auth/spreadsheets.currentonly",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://mail.google.com/"
].forEach((scope) => {
  assert.ok(manifest.oauthScopes.includes(scope), `Missing scope: ${scope}`);
});

console.log("ok - Apps Script manifest has timezone, execution API, and required scopes");
