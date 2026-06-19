const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

class FakeSpreadsheet {
  constructor(sheets) {
    this.sheets = sheets;
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets[name] = sheet;
    return sheet;
  }

  getSheets() {
    return Object.values(this.sheets);
  }

  deleteSheet(sheet) {
    delete this.sheets[sheet.name];
  }
}

class FakeSheet {
  constructor(name, rows = [[]]) {
    this.name = name;
    this.rows = rows.map((row) => row.slice());
  }

  getRange(row, column, numRows = 1, numColumns = 1) {
    if (typeof row === "string") {
      const parsed = parseA1(row);
      return new FakeRange(this, parsed.row, parsed.column, parsed.numRows, parsed.numColumns);
    }

    return new FakeRange(this, row, column, numRows, numColumns);
  }

  appendRow(row) {
    this.rows.push(row.slice());
  }

  getLastRow() {
    return this.rows.length;
  }

  getLastColumn() {
    return Math.max(...this.rows.map((row) => row.length), 0);
  }

  getMaxRows() {
    return Math.max(this.rows.length, 100);
  }

  getFilter() {
    return true;
  }

  clear() {
    this.rows = [[]];
  }

  setConditionalFormatRules(rules) {
    this.conditionalFormatRules = rules;
  }

  setFrozenRows() {}
  setColumnWidth() {}
  autoResizeColumns() {}
}

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const values = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const row = [];
      const source = this.sheet.rows[this.row - 1 + r] || [];
      for (let c = 0; c < this.numColumns; c += 1) {
        row.push(source[this.column - 1 + c] ?? "");
      }
      values.push(row);
    }
    return values;
  }

  getValue() {
    return this.getValues()[0][0];
  }

  setValues(values) {
    for (let r = 0; r < values.length; r += 1) {
      const rowIndex = this.row - 1 + r;
      this.sheet.rows[rowIndex] = this.sheet.rows[rowIndex] || [];
      for (let c = 0; c < values[r].length; c += 1) {
        this.sheet.rows[rowIndex][this.column - 1 + c] = values[r][c];
      }
    }
    return this;
  }

  clearContent() {
    for (let r = 0; r < this.numRows; r += 1) {
      const rowIndex = this.row - 1 + r;
      this.sheet.rows[rowIndex] = this.sheet.rows[rowIndex] || [];
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.rows[rowIndex][this.column - 1 + c] = "";
      }
    }
    return this;
  }

  insertCheckboxes() {
    return this;
  }

  setFontWeight() {
    return this;
  }

  setNumberFormat() {
    return this;
  }

  setDataValidation(rule) {
    this.dataValidation = rule;
    return this;
  }

  createFilter() {
    return this;
  }

  setValue(value) {
    this.setValues([[value]]);
    return this;
  }

  setFormula(value) {
    this.setValues([[value]]);
    return this;
  }

  setFontSize() {
    return this;
  }
}

function parseA1(a1) {
  const [start, end = start] = a1.split(":");
  const startCell = parseCell(start);
  const endCell = parseCell(end);
  return {
    row: startCell.row,
    column: startCell.column,
    numRows: endCell.row - startCell.row + 1,
    numColumns: endCell.column - startCell.column + 1
  };
}

function parseCell(cell) {
  const match = cell.match(/^([A-Z]+)(\d+)$/i);
  if (!match) throw new Error(`Unsupported A1 range in fake sheet: ${cell}`);
  return {
    column: columnToNumber(match[1]),
    row: Number(match[2])
  };
}

function columnToNumber(letters) {
  return letters
    .toUpperCase()
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

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
  },
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
      return "2026-05-21 09:00:00";
    }
  }
};

vm.createContext(context);

[
  "src/Config.js",
  "src/OrderTrackerDedupe.js",
  "src/OrderEmailParser.js",
  "src/OrderTrackerManual.js",
  "src/OrderTrackerSheets.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

function makeSpreadsheet() {
  const config = context.ORDER_TRACKER_CONFIG;
  return new FakeSpreadsheet({
    [config.sheets.orders]: new FakeSheet(config.sheets.orders, [config.headers.orders]),
    [config.sheets.manualEntry]: new FakeSheet(config.sheets.manualEntry, [[]]),
    [config.sheets.settings]: new FakeSheet(config.sheets.settings, [
      config.headers.settings,
      ["timezone", "America/New_York", ""]
    ]),
    [config.sheets.log]: new FakeSheet(config.sheets.log, [config.headers.log])
  });
}

function makeBlankSpreadsheet() {
  return new FakeSpreadsheet({
    Sheet1: new FakeSheet("Sheet1", [[]])
  });
}

function makeRecord(overrides = {}) {
  return {
    received: false,
    status: "Shipped",
    store: "Amazon",
    item: "USB-C cable",
    orderNumber: "ORDER-1",
    carrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    estimatedArrival: "2026-05-22",
    trackingUrl: "https://example.com/track",
    lastUpdate: "",
    sourceDate: "2026-05-21 08:00:00",
    sourceSubject: "Your package shipped",
    threadId: "thread-1",
    messageId: "message-1",
    notes: "",
    ...overrides
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("upsert inserts then treats identical message as unchanged", () => {
  const ss = makeSpreadsheet();
  const first = context.OrderTrackerSheets.upsertOrder(ss, makeRecord());
  const second = context.OrderTrackerSheets.upsertOrder(ss, makeRecord());

  assert.equal(first.action, "inserted");
  assert.equal(second.action, "unchanged");
  assert.equal(ss.getSheetByName("Orders").rows.length, 2);
});

test("setup creates dashboard, tracker tabs, headers, and default settings", () => {
  const ss = makeBlankSpreadsheet();
  context.OrderTrackerSheets.ensureWorkbook(ss);

  assert.ok(ss.getSheetByName("Dashboard"));
  assert.ok(ss.getSheetByName("Orders"));
  assert.ok(ss.getSheetByName("Manual Entry"));
  assert.ok(ss.getSheetByName("Settings"));
  assert.ok(ss.getSheetByName("Import Log"));
  assert.equal(ss.getSheetByName("Orders").rows[0][0], "Received");
  assert.equal(ss.getSheetByName("Manual Entry").rows[2][0], "Status");
  assert.equal(ss.getSheetByName("Manual Entry").rows[2][1], "Ordered");
  assert.equal(ss.getSheetByName("Settings").rows[1][0], "scan_days");
  assert.match(ss.getSheetByName("Dashboard").rows[2][1], /SUMPRODUCT/);
  assert.equal(ss.getSheetByName("Orders").conditionalFormatRules.length, 5);
});

test("checkbox-only blank rows are cleaned and not counted as orders", () => {
  const ss = makeSpreadsheet();
  const orders = ss.getSheetByName("Orders");
  const blankCheckboxRow = new Array(context.ORDER_TRACKER_CONFIG.headers.orders.length).fill("");
  blankCheckboxRow[0] = false;
  orders.rows.push(blankCheckboxRow.slice());
  orders.rows.push(context.ORDER_TRACKER_CONFIG.headers.orders.map(() => ""));
  context.OrderTrackerSheets.upsertOrder(ss, makeRecord());

  const trackedOrders = context.OrderTrackerSheets.getOrders(ss);
  assert.equal(trackedOrders.length, 1);
  assert.equal(trackedOrders[0].item, "USB-C cable");
  assert.equal(orders.rows[1][0], "");
});

test("manual entry sheet can be read and cleared", () => {
  const ss = makeBlankSpreadsheet();
  context.OrderTrackerSheets.ensureWorkbook(ss);
  const manual = ss.getSheetByName("Manual Entry");
  manual.rows[3][1] = "Farmers Market";
  manual.rows[4][1] = "Custom chair";
  manual.rows[5][1] = "RECEIPT-77";
  manual.rows[8][1] = "2026-05-30";

  const entry = context.OrderTrackerSheets.getManualEntry(ss);
  assert.equal(entry.Store, "Farmers Market");
  assert.equal(entry.Item, "Custom chair");
  assert.equal(entry["Order Number"], "RECEIPT-77");

  context.OrderTrackerSheets.clearManualEntry(ss);
  assert.equal(manual.rows[2][1], "Ordered");
  assert.equal(manual.rows[3][1], "");
});

test("manual entry converts to an upsertable order record", () => {
  const ss = makeSpreadsheet();
  const record = context.OrderTrackerManual.entryToRecord(
    {
      Status: "Ordered",
      Store: "In-person Shop",
      Item: "Lamp",
      "Order Number": "LAMP-1",
      Carrier: "",
      "Tracking Number": "",
      "Estimated Arrival": "May 31",
      "Tracking URL": "",
      Notes: "Paid cash"
    },
    "America/New_York"
  );
  const result = context.OrderTrackerSheets.upsertOrder(ss, record);

  assert.equal(result.action, "inserted");
  assert.equal(ss.getSheetByName("Orders").rows[1][2], "In-person Shop");
  assert.equal(ss.getSheetByName("Orders").rows[1][3], "Lamp");
  assert.equal(ss.getSheetByName("Orders").rows[1][14], "Paid cash");
});

test("delivered update changes status but preserves manual Received checkbox", () => {
  const ss = makeSpreadsheet();
  context.OrderTrackerSheets.upsertOrder(ss, makeRecord());

  const orders = ss.getSheetByName("Orders");
  orders.rows[1][0] = true;

  const update = context.OrderTrackerSheets.upsertOrder(
    ss,
    makeRecord({
      status: "Delivered",
      sourceSubject: "Your package was delivered",
      messageId: "message-2"
    })
  );

  assert.equal(update.action, "updated");
  assert.equal(orders.rows[1][0], true);
  assert.equal(orders.rows[1][1], "Delivered");
  assert.equal(orders.rows[1][13], "message-2");
});

test("newer ETA overwrites older ETA for the same tracking number", () => {
  const ss = makeSpreadsheet();
  context.OrderTrackerSheets.upsertOrder(ss, makeRecord({ estimatedArrival: "2026-05-22" }));
  context.OrderTrackerSheets.upsertOrder(
    ss,
    makeRecord({
      estimatedArrival: "2026-05-23",
      sourceSubject: "Delivery rescheduled",
      messageId: "message-3"
    })
  );

  const orders = ss.getSheetByName("Orders");
  assert.equal(orders.rows[1][7], "2026-05-23");
});

test("auto notes clear when later email fills missing data", () => {
  const ss = makeSpreadsheet();
  context.OrderTrackerSheets.upsertOrder(
    ss,
    makeRecord({
      estimatedArrival: "",
      notes: "No ETA found in email"
    })
  );
  context.OrderTrackerSheets.upsertOrder(
    ss,
    makeRecord({
      estimatedArrival: "2026-05-24",
      notes: "",
      sourceSubject: "Delivery date updated",
      messageId: "message-4"
    })
  );

  const orders = ss.getSheetByName("Orders");
  assert.equal(orders.rows[1][7], "2026-05-24");
  assert.equal(orders.rows[1][14], "");
});

test("manual notes survive later updates", () => {
  const ss = makeSpreadsheet();
  context.OrderTrackerSheets.upsertOrder(ss, makeRecord({ notes: "Leave by the side door" }));
  context.OrderTrackerSheets.upsertOrder(
    ss,
    makeRecord({
      status: "Delivered",
      notes: "",
      sourceSubject: "Package delivered",
      messageId: "message-5"
    })
  );

  const orders = ss.getSheetByName("Orders");
  assert.equal(orders.rows[1][1], "Delivered");
  assert.equal(orders.rows[1][14], "Leave by the side door");
});

test("batch upsert merges multiple updates for the same package into one row", () => {
  const ss = makeSpreadsheet();
  const result = context.OrderTrackerSheets.upsertOrders(ss, [
    makeRecord({
      status: "Shipped",
      estimatedArrival: "2026-05-22",
      sourceSubject: "Your package shipped",
      messageId: "message-1"
    }),
    makeRecord({
      status: "Delivered",
      estimatedArrival: "2026-05-22",
      sourceSubject: "Your package was delivered",
      messageId: "message-2"
    })
  ]);

  const orders = ss.getSheetByName("Orders");
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 1);
  assert.equal(orders.rows.length, 2);
  assert.equal(orders.rows[1][1], "Delivered");
  assert.equal(orders.rows[1][13], "message-2");
});
