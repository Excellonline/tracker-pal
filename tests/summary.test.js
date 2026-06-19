const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = {
  console,
  Date,
  String,
  Number,
  Math,
  Object,
  RegExp,
  JSON,
  Utilities: {
    formatDate: () => "2026-05-21"
  },
  MailApp: {
    sent: [],
    sendEmail(message) {
      this.sent.push(message);
    }
  }
};

vm.createContext(context);

["src/Config.js", "src/OrderTrackerSummary.js"].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

const result = context.OrderTrackerSummary.send(
  "test@example.com",
  [
    {
      store: "Low Priority",
      item: "Arrives later",
      status: "Shipped",
      estimatedArrival: "2026-05-30"
    },
    {
      store: "Needs Attention",
      item: "Signature package",
      status: "Exception",
      estimatedArrival: ""
    }
  ],
  "America/New_York",
  "https://docs.google.com/spreadsheets/d/test"
);

assert.equal(result.count, 2);
assert.match(context.MailApp.sent[0].subject, /1 exception/);
assert.match(context.MailApp.sent[0].body, /\[EXCEPTION\] Needs Attention/);
assert.ok(
  context.MailApp.sent[0].body.indexOf("Needs Attention") <
    context.MailApp.sent[0].body.indexOf("Low Priority")
);

console.log("ok - summary prioritizes delivery exceptions");
