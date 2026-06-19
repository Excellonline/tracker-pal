const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = {
  console,
  encodeURIComponent,
  Date,
  String,
  Number,
  Math,
  Object,
  RegExp,
  JSON,
  isFinite,
  isNaN,
  Session: {
    getActiveUser: () => ({ getEmail: () => "test@example.com" }),
    getEffectiveUser: () => ({ getEmail: () => "test@example.com" })
  },
  Utilities: {
    formatDate: (date, timezone, format) => {
      assert.ok(timezone);
      if (format === "yyyy-MM-dd") {
        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0")
        ].join("-");
      }

      return date.toISOString().replace("T", " ").slice(0, 19);
    }
  },
  MailApp: {
    sent: [],
    sendEmail(message) {
      this.sent.push(message);
    }
  },
  ScriptApp: {
    triggers: [],
    newTrigger(handler) {
      const trigger = {
        handler,
        timeBased() {
          return this;
        },
        everyHours(value) {
          this.everyHoursValue = value;
          return this;
        },
        everyDays(value) {
          this.everyDaysValue = value;
          return this;
        },
        atHour(value) {
          this.hour = value;
          return this;
        },
        inTimezone(value) {
          this.timezone = value;
          return this;
        },
        create() {
          context.ScriptApp.triggers.push(this);
          return this;
        },
        getHandlerFunction() {
          return this.handler;
        }
      };
      return trigger;
    },
    getProjectTriggers() {
      return this.triggers;
    },
    deleteTrigger(trigger) {
      this.triggers = this.triggers.filter((item) => item !== trigger);
    }
  },
  LockService: {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  },
  SpreadsheetApp: {
    newDataValidation: () => ({
      requireValueInList() {
        return this;
      },
      setAllowInvalid() {
        return this;
      },
      build() {
        return {};
      }
    }),
    newConditionalFormatRule: () => ({
      whenFormulaSatisfied() {
        return this;
      },
      setBackground() {
        return this;
      },
      setRanges() {
        return this;
      },
      build() {
        return {};
      }
    })
  }
};

vm.createContext(context);

[
  "src/Config.js",
  "src/OrderTrackerDedupe.js",
  "src/OrderEmailParser.js",
  "src/OrderTrackerManual.js",
  "src/OrderTrackerSummary.js",
  "src/OrderTrackerSheets.js",
  "src/OrderTrackerGmail.js",
  "src/OrderTrackerApp.js",
  "src/OrderTrackerWeb.js",
  "src/Code.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

assert.equal(typeof context.setupOrderTracker, "function");
assert.equal(typeof context.openTrackerPal, "function");
assert.equal(typeof context.syncOrders, "function");
assert.equal(typeof context.backfillOrders, "function");
assert.equal(typeof context.addManualOrder, "function");
assert.equal(typeof context.importManualEntry, "function");
assert.equal(typeof context.sendDailySummary, "function");
assert.equal(typeof context.installTriggers, "function");
assert.equal(typeof context.removeTriggers, "function");
assert.equal(typeof context.healthCheck, "function");
assert.equal(typeof context.showDashboard, "function");
assert.equal(typeof context.showOrders, "function");
assert.equal(typeof context.doGet, "function");
assert.equal(typeof context.getTrackerPalState, "function");
assert.equal(typeof context.addTrackerPalManualOrder, "function");
assert.equal(typeof context.setTrackerPalReceived, "function");
assert.equal(typeof context.updateTrackerPalStatus, "function");
assert.equal(typeof context.syncTrackerPalNow, "function");
assert.equal(typeof context.backfillTrackerPalNow, "function");

const result = context.OrderTrackerSummary.send(
  "test@example.com",
  [
    {
      store: "Amazon",
      item: "USB-C cable",
      status: "Shipped",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      estimatedArrival: "2026-05-21",
      trackingUrl: "https://example.com/track"
    }
  ],
  "America/New_York",
  "https://docs.google.com/spreadsheets/d/test"
);

assert.equal(result.count, 1);
assert.equal(context.MailApp.sent.length, 1);
assert.match(context.MailApp.sent[0].body, /USB-C cable/);
assert.match(context.MailApp.sent[0].body, /docs\.google\.com\/spreadsheets/);

console.log("ok - Apps Script source files load and summary can send with stubs");
