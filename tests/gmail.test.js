const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

const htmlOnlyMessage = {
  getFrom: () => "Store <orders@example.com>",
  getSubject: () => "HTML package update",
  getPlainBody: () => "",
  getBody: () => "<p>Tracking&nbsp;number: 1Z999AA10123456784</p><p>Estimated delivery: May 22</p>",
  getDate: () => new Date("2026-05-20T12:00:00-04:00"),
  getId: () => "message-html"
};

const plainMessage = {
  getFrom: () => "Store <orders@example.com>",
  getSubject: () => "Plain package update",
  getPlainBody: () => "Tracking number: 1Z999AA10123456784",
  getBody: () => "",
  getDate: () => new Date("2026-05-21T12:00:00-04:00"),
  getId: () => "message-plain"
};

const thread = {
  getId: () => "thread-1",
  getMessages: () => [plainMessage, htmlOnlyMessage]
};

const manualMessage = {
  getFrom: () => "Local Shop <hello@smallshop.example>",
  getSubject: () => "Counter receipt",
  getPlainBody: () => "Receipt from the counter.",
  getBody: () => "",
  getDate: () => new Date("2026-05-22T12:00:00-04:00"),
  getId: () => "message-manual"
};

const manualThread = {
  getId: () => "thread-manual",
  getMessages: () => [manualMessage]
};

const context = {
  console,
  Date,
  String,
  Number,
  Math,
  Object,
  JSON,
  GmailApp: {
    search(query) {
      if (query.includes("label:TrackerPal")) return [manualThread];
      return query.includes("tracking") || query.includes("shipped") ? [thread] : [];
    },
    getUserLabelByName(name) {
      return name === "TrackerPal" ? { getName: () => name } : null;
    },
    createLabel(name) {
      return { getName: () => name };
    }
  }
};

vm.createContext(context);

["src/Config.js", "src/OrderTrackerGmail.js"].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

const messages = context.OrderTrackerGmail.findCandidateMessages(7, 75);

assert.equal(messages.length, 3);
assert.equal(messages[0].messageId, "message-html");
assert.equal(messages[1].messageId, "message-plain");
assert.equal(messages[2].messageId, "message-manual");
assert.equal(messages[2].manualImport, true);
assert.match(messages[0].body, /Tracking number/);
assert.match(messages[0].body, /Estimated delivery/);
assert.equal(context.OrderTrackerGmail.ensureManualImportLabel().getName(), "TrackerPal");

console.log("ok - Gmail scanner dedupes threads, sorts messages, imports TrackerPal label, and falls back to HTML body");
