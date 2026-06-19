var TRACKERPAL = {
  appName: "TrackerPal",
  version: "0.3.0",
  spreadsheetId: "1-ccGyXrzjSSvm73NJgdTQ6kO4ulMsR1c-1clBIxE7Uc",
  timezone: "America/New_York",
  sheets: {
    dashboard: "Dashboard",
    orders: "Orders",
    manualEntry: "Manual Entry",
    settings: "Settings",
    log: "Import Log"
  },
  orderHeaders: [
    "Received",
    "Status",
    "Store",
    "Item",
    "Order Number",
    "Carrier",
    "Tracking Number",
    "Estimated Arrival",
    "Tracking URL",
    "Last Update",
    "Source Date",
    "Source Subject",
    "Gmail Thread ID",
    "Gmail Message ID",
    "Notes"
  ],
  settingsHeaders: ["Key", "Value", "Notes"],
  logHeaders: ["Time", "Level", "Action", "Message", "Details"]
};

function doGet() {
  return HtmlService.createTemplateFromFile("TrackerPal")
    .evaluate()
    .setTitle("TrackerPal")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getTrackerPalState() {
  var ss = getSpreadsheet_();
  ensureWorkbook_(ss);
  var orders = getOrders_(ss);
  var timezone = getTimezone_(ss);
  return {
    appName: TRACKERPAL.appName,
    version: TRACKERPAL.version,
    sheetUrl: ss.getUrl(),
    generatedAt: Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd HH:mm:ss"),
    today: Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd"),
    stats: calculateStats_(orders, timezone),
    orders: orders
  };
}

function addTrackerPalManualOrder(entry) {
  var ss = getSpreadsheet_();
  ensureWorkbook_(ss);
  var record = manualEntryToRecord_(entry || {}, getTimezone_(ss));
  var result = upsertOrder_(ss, record);
  log_(ss, "INFO", "desktop", "Manual order " + result.action + " from TrackerPal desktop app.", JSON.stringify({ rowIndex: result.rowIndex }));
  return {
    action: result.action,
    rowIndex: result.rowIndex,
    state: getTrackerPalState()
  };
}

function setTrackerPalReceived(rowIndex, received) {
  var ss = getSpreadsheet_();
  ensureWorkbook_(ss);
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.orders);
  assertOrderRow_(sheet, rowIndex);
  sheet.getRange(Number(rowIndex), 1).setValue(Boolean(received));
  sheet.getRange(Number(rowIndex), 10).setValue(formatDateTime_(new Date(), getTimezone_(ss)));
  return getTrackerPalState();
}

function updateTrackerPalStatus(rowIndex, status) {
  var allowed = ["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"];
  if (allowed.indexOf(status) === -1) throw new Error("Unknown status: " + status);
  var ss = getSpreadsheet_();
  ensureWorkbook_(ss);
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.orders);
  assertOrderRow_(sheet, rowIndex);
  sheet.getRange(Number(rowIndex), 2).setValue(status);
  sheet.getRange(Number(rowIndex), 10).setValue(formatDateTime_(new Date(), getTimezone_(ss)));
  return getTrackerPalState();
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(TRACKERPAL.spreadsheetId);
}

function ensureWorkbook_(ss) {
  var orders = ensureSheet_(ss, TRACKERPAL.sheets.orders);
  var settings = ensureSheet_(ss, TRACKERPAL.sheets.settings);
  var log = ensureSheet_(ss, TRACKERPAL.sheets.log);
  ensureHeaders_(orders, TRACKERPAL.orderHeaders);
  ensureHeaders_(settings, TRACKERPAL.settingsHeaders);
  ensureHeaders_(log, TRACKERPAL.logHeaders);
  cleanupBlankOrderRows_(orders, TRACKERPAL.orderHeaders);
  ensureSettings_(settings);
  formatOrders_(orders);
}

function ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (current.join("") === "" || current[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
}

function ensureSettings_(sheet) {
  var existing = {};
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (row) {
      if (row[0]) existing[String(row[0])] = true;
    });
  }
  var rows = [
    ["timezone", TRACKERPAL.timezone, "Timezone for dates."],
    ["summary_enabled", "TRUE", "Used by the Gmail automation project."],
    ["summary_hour", 8, "Used by the Gmail automation project."]
  ].filter(function (row) {
    return !existing[row[0]];
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

function formatOrders_(sheet) {
  var headers = getHeaders_(sheet);
  var lastMeaningfulRow = getLastMeaningfulOrderRow_(sheet, headers);
  if (lastMeaningfulRow >= 2) {
    sheet.getRange(2, 1, lastMeaningfulRow - 1, 1).insertCheckboxes();
  }
  sheet.getRange(2, 8, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat("yyyy-mm-dd");
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 240);
  sheet.setColumnWidth(9, 260);
}

function getOrders_(ss) {
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.orders);
  var headers = getHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map(function (row, index) {
      return {
        rawRow: row,
        rowIndex: index + 2,
        received: toBool_(getValue_(row, headers, "Received")),
        status: getValue_(row, headers, "Status"),
        store: getValue_(row, headers, "Store"),
        item: getValue_(row, headers, "Item"),
        orderNumber: getValue_(row, headers, "Order Number"),
        carrier: getValue_(row, headers, "Carrier"),
        trackingNumber: getValue_(row, headers, "Tracking Number"),
        estimatedArrival: asDateString_(getValue_(row, headers, "Estimated Arrival")),
        trackingUrl: getValue_(row, headers, "Tracking URL"),
        lastUpdate: getValue_(row, headers, "Last Update"),
        sourceSubject: getValue_(row, headers, "Source Subject"),
        notes: getValue_(row, headers, "Notes")
      };
    })
    .filter(function (order) {
      return isMeaningfulOrderRow_(order.rawRow, headers);
    })
    .map(function (order) {
      delete order.rawRow;
      return order;
    });
}

function upsertOrder_(ss, record) {
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.orders);
  var headers = getHeaders_(sheet);
  cleanupBlankOrderRows_(sheet, headers);
  var existing = findExistingRow_(sheet, headers, record);
  record.lastUpdate = formatDateTime_(new Date(), getTimezone_(ss));

  if (existing.rowIndex) {
    var row = existing.values.slice();
    setValue_(row, headers, "Status", chooseStatus_(getValue_(row, headers, "Status"), record.status));
    preserveOrSet_(row, headers, "Store", record.store);
    preserveOrSet_(row, headers, "Item", record.item);
    preserveOrSet_(row, headers, "Order Number", record.orderNumber);
    preserveOrSet_(row, headers, "Carrier", record.carrier);
    preserveOrSet_(row, headers, "Tracking Number", record.trackingNumber);
    overwriteIfPresent_(row, headers, "Estimated Arrival", record.estimatedArrival);
    overwriteIfPresent_(row, headers, "Tracking URL", record.trackingUrl);
    setValue_(row, headers, "Last Update", record.lastUpdate);
    overwriteIfPresent_(row, headers, "Source Date", record.sourceDate);
    overwriteIfPresent_(row, headers, "Source Subject", record.sourceSubject);
    preserveOrSet_(row, headers, "Gmail Message ID", record.messageId);
    if (record.notes && !getValue_(row, headers, "Notes")) setValue_(row, headers, "Notes", record.notes);
    sheet.getRange(existing.rowIndex, 1, 1, headers.length).setValues([row]);
    return { action: "updated", rowIndex: existing.rowIndex };
  }

  var rowValues = headers.map(function (header) {
    switch (header) {
      case "Received": return false;
      case "Status": return record.status || "Ordered";
      case "Store": return record.store || "";
      case "Item": return record.item || "";
      case "Order Number": return record.orderNumber || "";
      case "Carrier": return record.carrier || "";
      case "Tracking Number": return record.trackingNumber || "";
      case "Estimated Arrival": return record.estimatedArrival || "";
      case "Tracking URL": return record.trackingUrl || "";
      case "Last Update": return record.lastUpdate || "";
      case "Source Date": return record.sourceDate || "";
      case "Source Subject": return record.sourceSubject || "Manual entry";
      case "Gmail Thread ID": return "";
      case "Gmail Message ID": return record.messageId || "";
      case "Notes": return record.notes || "";
      default: return "";
    }
  });
  sheet.appendRow(rowValues);
  var rowIndex = sheet.getLastRow();
  sheet.getRange(rowIndex, 1).insertCheckboxes();
  return { action: "inserted", rowIndex: rowIndex };
}

function manualEntryToRecord_(entry, timezone) {
  var store = clean_(entry.store);
  var item = clean_(entry.item);
  var orderNumber = clean_(entry.orderNumber);
  var trackingNumber = normalizeTracking_(entry.trackingNumber);
  if (!store && !item && !orderNumber && !trackingNumber) {
    throw new Error("Add at least a store, item, order number, or tracking number.");
  }
  return {
    status: normalizeStatus_(entry.status),
    store: store,
    item: item,
    orderNumber: orderNumber,
    carrier: clean_(entry.carrier),
    trackingNumber: trackingNumber,
    estimatedArrival: normalizeEta_(entry.estimatedArrival, timezone),
    trackingUrl: clean_(entry.trackingUrl),
    sourceDate: formatDateTime_(new Date(), timezone),
    sourceSubject: "Manual entry",
    messageId: "manual-" + normalizeKey_([store, item, orderNumber, trackingNumber, entry.estimatedArrival].join("|")),
    notes: clean_(entry.notes)
  };
}

function findExistingRow_(sheet, headers, record) {
  if (sheet.getLastRow() < 2) return { rowIndex: 0, values: [] };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var incoming = getKeys_(record);
  for (var i = 0; i < values.length; i += 1) {
    if (!isMeaningfulOrderRow_(values[i], headers)) continue;
    var existing = getKeys_({
      store: getValue_(values[i], headers, "Store"),
      orderNumber: getValue_(values[i], headers, "Order Number"),
      trackingNumber: getValue_(values[i], headers, "Tracking Number"),
      messageId: getValue_(values[i], headers, "Gmail Message ID")
    });
    if (incoming.trackingKey && incoming.trackingKey === existing.trackingKey) return { rowIndex: i + 2, values: values[i] };
    if (incoming.orderStoreKey && incoming.orderStoreKey === existing.orderStoreKey) return { rowIndex: i + 2, values: values[i] };
    if (incoming.messageKey && incoming.messageKey === existing.messageKey) return { rowIndex: i + 2, values: values[i] };
  }
  return { rowIndex: 0, values: [] };
}

function getKeys_(record) {
  return {
    trackingKey: normalizeKey_(record.trackingNumber),
    orderStoreKey: record.orderNumber && record.store ? normalizeKey_(record.store) + "::" + normalizeKey_(record.orderNumber) : "",
    messageKey: normalizeKey_(record.messageId)
  };
}

function calculateStats_(orders, timezone) {
  var today = Utilities.formatDate(new Date(), timezone || TRACKERPAL.timezone, "yyyy-MM-dd");
  var stats = { open: 0, overdue: 0, dueToday: 0, exceptions: 0, delivered: 0, missingEta: 0, received: 0 };
  orders.forEach(function (order) {
    if (order.received) {
      stats.received += 1;
      return;
    }
    stats.open += 1;
    if (order.status === "Exception") stats.exceptions += 1;
    if (order.status === "Delivered") stats.delivered += 1;
    if (!order.estimatedArrival && order.status !== "Delivered" && order.status !== "Exception") stats.missingEta += 1;
    if (order.estimatedArrival && order.status !== "Delivered" && order.status !== "Exception") {
      if (order.estimatedArrival < today) stats.overdue += 1;
      if (order.estimatedArrival === today) stats.dueToday += 1;
    }
  });
  return stats;
}

function getTimezone_(ss) {
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.settings);
  if (!sheet || sheet.getLastRow() < 2) return TRACKERPAL.timezone;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < values.length; i += 1) {
    if (values[i][0] === "timezone" && values[i][1]) return String(values[i][1]);
  }
  return TRACKERPAL.timezone;
}

function log_(ss, level, action, message, details) {
  var sheet = ss.getSheetByName(TRACKERPAL.sheets.log);
  if (!sheet) return;
  sheet.appendRow([formatDateTime_(new Date(), getTimezone_(ss)), level, action, message, details || ""]);
}

function assertOrderRow_(sheet, rowIndex) {
  var numeric = Number(rowIndex);
  if (!numeric || numeric < 2 || numeric > sheet.getLastRow()) throw new Error("Invalid order row: " + rowIndex);
}

function cleanupBlankOrderRows_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var runStart = 0;
  var runLength = 0;

  values.forEach(function (row, index) {
    if (!isMeaningfulOrderRow_(row, headers) && hasAnyOrderRowValue_(row, headers)) {
      if (!runStart) runStart = index + 2;
      runLength += 1;
      return;
    }

    if (runLength) {
      sheet.getRange(runStart, 1, runLength, headers.length).clearContent();
      runStart = 0;
      runLength = 0;
    }
  });

  if (runLength) {
    sheet.getRange(runStart, 1, runLength, headers.length).clearContent();
  }
}

function getLastMeaningfulOrderRow_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var index = values.length - 1; index >= 0; index -= 1) {
    if (isMeaningfulOrderRow_(values[index], headers)) return index + 2;
  }
  return 1;
}

function isMeaningfulOrderRow_(row, headers) {
  return [
    "Store",
    "Item",
    "Order Number",
    "Carrier",
    "Tracking Number",
    "Estimated Arrival",
    "Tracking URL",
    "Source Date",
    "Source Subject",
    "Gmail Thread ID",
    "Gmail Message ID",
    "Notes"
  ].some(function (header) {
    return String(getValue_(row, headers, header) || "").trim() !== "";
  });
}

function hasAnyOrderRowValue_(row, headers) {
  return headers.some(function (header) {
    return String(getValue_(row, headers, header) || "").trim() !== "";
  });
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function getValue_(row, headers, header) {
  var index = headers.indexOf(header);
  return index === -1 ? "" : row[index];
}

function setValue_(row, headers, header, value) {
  var index = headers.indexOf(header);
  if (index !== -1) row[index] = value || "";
}

function preserveOrSet_(row, headers, header, value) {
  if (value && !getValue_(row, headers, header)) setValue_(row, headers, header, value);
}

function overwriteIfPresent_(row, headers, header, value) {
  if (value) setValue_(row, headers, header, value);
}

function chooseStatus_(existingStatus, incomingStatus) {
  var rank = { Ordered: 1, Shipped: 2, "Out for delivery": 3, Exception: 3, Delivered: 4 };
  if (!incomingStatus) return existingStatus || "";
  if (!existingStatus) return incomingStatus;
  return (rank[incomingStatus] || 0) >= (rank[existingStatus] || 0) ? incomingStatus : existingStatus;
}

function normalizeStatus_(value) {
  var status = clean_(value) || "Ordered";
  var known = { ordered: "Ordered", shipped: "Shipped", "out for delivery": "Out for delivery", delivered: "Delivered", exception: "Exception" };
  return known[status.toLowerCase()] || status;
}

function normalizeEta_(value, timezone) {
  var text = clean_(value);
  if (!text) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return Utilities.formatDate(value, timezone || TRACKERPAL.timezone, "yyyy-MM-dd");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, timezone || TRACKERPAL.timezone, "yyyy-MM-dd");
  return text;
}

function asDateString_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return Utilities.formatDate(value, TRACKERPAL.timezone, "yyyy-MM-dd");
  return String(value || "");
}

function formatDateTime_(date, timezone) {
  return Utilities.formatDate(date, timezone || TRACKERPAL.timezone, "yyyy-MM-dd HH:mm:ss");
}

function toBool_(value) {
  if (typeof value === "boolean") return value;
  return /^(true|yes|y|1)$/i.test(String(value || "").trim());
}

function clean_(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function normalizeTracking_(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeKey_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
