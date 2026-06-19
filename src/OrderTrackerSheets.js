var OrderTrackerSheets = (function () {
  function ensureWorkbook(ss) {
    if (ss.getName && ss.rename && ss.getName() !== ORDER_TRACKER_CONFIG.appName) {
      ss.rename(ORDER_TRACKER_CONFIG.appName);
    }

    var dashboard = ensureSheet_(ss, ORDER_TRACKER_CONFIG.sheets.dashboard);
    var orders = ensureSheet_(ss, ORDER_TRACKER_CONFIG.sheets.orders);
    var manualEntry = ensureSheet_(ss, ORDER_TRACKER_CONFIG.sheets.manualEntry);
    var settings = ensureSheet_(ss, ORDER_TRACKER_CONFIG.sheets.settings);
    var log = ensureSheet_(ss, ORDER_TRACKER_CONFIG.sheets.log);

    ensureHeaders_(orders, ORDER_TRACKER_CONFIG.headers.orders);
    ensureHeaders_(settings, ORDER_TRACKER_CONFIG.headers.settings);
    ensureHeaders_(log, ORDER_TRACKER_CONFIG.headers.log);
    cleanupBlankOrderRows_(orders, ORDER_TRACKER_CONFIG.headers.orders);
    ensureSettings_(settings);
    formatOrders_(orders);
    formatDashboard_(dashboard);
    formatManualEntry_(manualEntry);
    formatLog_(log);
    cleanupBlankDefaultSheets_(ss);
  }

  function upsertOrder(ss, record) {
    var result = upsertOrders(ss, [record]);
    if (result.updatedRows.length) {
      return { action: "updated", rowIndex: result.updatedRows[0] };
    }

    if (result.insertedRows.length) {
      return { action: "inserted", rowIndex: result.insertedRows[0] };
    }

    if (result.unchangedRows.length) {
      return { action: "unchanged", rowIndex: result.unchangedRows[0] };
    }

    return { action: "unchanged", rowIndex: 0 };
  }

  function upsertOrders(ss, records) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.orders);
    var headers = getHeaders_(sheet);
    cleanupBlankOrderRows_(sheet, headers);
    var now = new Date();
    var timezone = getTimezone_(ss);
    var lastRow = sheet.getLastRow();
    var existingRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    var initialExistingRowCount = existingRows.length;
    var index = buildRowIndex_(headers, existingRows);
    var result = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      insertedRows: [],
      updatedRows: [],
      unchangedRows: []
    };
    var rowsToAppend = [];
    var updatesByRowIndex = {};

    records.forEach(function (record) {
      record.lastUpdate = formatDateTime_(now, timezone);

      var existing = findExistingRowInIndex_(index, record);
      if (existing.rowIndex) {
        var existingOffset = existing.rowIndex - 2;
        var merged = mergeRow_(existingRows[existingOffset], headers, record);
        if (rowsEqual_(existingRows[existingOffset], merged)) {
          result.unchanged += 1;
          result.unchangedRows.push(existing.rowIndex);
          return;
        }

        setValue_(merged, headers, "Last Update", record.lastUpdate);
        existingRows[existingOffset] = merged;
        if (existingOffset >= initialExistingRowCount) {
          rowsToAppend[existingOffset - initialExistingRowCount] = merged;
        } else {
          updatesByRowIndex[existing.rowIndex] = merged;
        }

        addRowToIndex_(index, headers, merged, existing.rowIndex);
        result.updated += 1;
        result.updatedRows.push(existing.rowIndex);
        return;
      }

      var row = recordToRow_(headers, record);
      var newRowIndex = lastRow + rowsToAppend.length + 1;
      rowsToAppend.push(row);
      existingRows.push(row);
      addRowToIndex_(index, headers, row, newRowIndex);
      result.inserted += 1;
      result.insertedRows.push(newRowIndex);
    });

    Object.keys(updatesByRowIndex).forEach(function (rowIndex) {
      var numericRowIndex = Number(rowIndex);
      sheet.getRange(numericRowIndex, 1, 1, headers.length).setValues([updatesByRowIndex[rowIndex]]);
      ensureCheckbox_(sheet, numericRowIndex);
    });

    if (rowsToAppend.length) {
      ensureRowsAvailable_(sheet, lastRow + rowsToAppend.length);
      sheet.getRange(lastRow + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      sheet.getRange(lastRow + 1, 1, rowsToAppend.length, 1).insertCheckboxes();
    }

    return result;
  }

  function getUnreceivedOrders(ss) {
    return getOrders(ss).filter(function (order) {
      return !toBool(order.received);
    });
  }

  function getOrders(ss) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.orders);
    var headers = getHeaders_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    return values
      .map(function (row, index) {
        return {
          rawRow: row,
          rowIndex: index + 2,
          received: toBool(getValue_(row, headers, "Received")),
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

  function setReceived(ss, rowIndex, received) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.orders);
    assertOrderRow_(sheet, rowIndex);
    sheet.getRange(rowIndex, 1).setValue(Boolean(received));
    sheet.getRange(rowIndex, 10).setValue(formatDateTime_(new Date(), getTimezone_(ss)));
  }

  function updateStatus(ss, rowIndex, status) {
    var allowed = ["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"];
    if (allowed.indexOf(status) === -1) {
      throw new Error("Unknown status: " + status);
    }

    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.orders);
    assertOrderRow_(sheet, rowIndex);
    sheet.getRange(rowIndex, 2).setValue(status);
    sheet.getRange(rowIndex, 10).setValue(formatDateTime_(new Date(), getTimezone_(ss)));
  }

  function getSettings(ss) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.settings);
    var lastRow = sheet.getLastRow();
    var settings = defaultSettings_();

    if (lastRow < 2) return settings;

    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    values.forEach(function (row) {
      var key = String(row[0] || "").trim();
      if (key) {
        settings[key] = row[1];
      }
    });

    return settings;
  }

  function getManualEntry(ss) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.manualEntry);
    var entry = {};
    var rows = sheet.getRange(3, 1, ORDER_TRACKER_CONFIG.manualEntryFields.length, 2).getValues();

    rows.forEach(function (row) {
      var key = String(row[0] || "").trim();
      if (key) {
        entry[key] = row[1];
      }
    });

    return entry;
  }

  function clearManualEntry(ss) {
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.manualEntry);
    sheet.getRange(3, 2, ORDER_TRACKER_CONFIG.manualEntryFields.length, 1).clearContent();
    sheet.getRange(3, 2).setValue("Ordered");
  }

  function log(level, action, message, details) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ORDER_TRACKER_CONFIG.sheets.log);
    if (!sheet) return;

    sheet.appendRow([
      formatDateTime_(new Date(), getTimezone_(ss)),
      level,
      action,
      message,
      details || ""
    ]);
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;
    return /^(true|yes|y|1)$/i.test(String(value || "").trim());
  }

  function ensureSheet_(ss, name) {
    return ss.getSheetByName(name) || ss.insertSheet(name);
  }

  function ensureHeaders_(sheet, headers) {
    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var needsHeader = current.join("") === "" || current[0] !== headers[0];
    if (needsHeader) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }

  function ensureSettings_(sheet) {
    var settings = defaultSettings_();
    var existing = {};
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (row) {
        if (row[0]) existing[String(row[0])] = true;
      });
    }

    Object.keys(settings).forEach(function (key) {
      if (!existing[key]) {
        sheet.appendRow([key, settings[key], ORDER_TRACKER_CONFIG.settingNotes[key] || ""]);
      }
    });

    sheet.autoResizeColumns(1, 3);
  }

  function defaultSettings_() {
    var email = "";
    try {
      email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "";
    } catch (error) {
      email = "";
    }

    return {
      scan_days: ORDER_TRACKER_CONFIG.defaults.scanDays,
      backfill_days: ORDER_TRACKER_CONFIG.defaults.backfillDays,
      timezone: ORDER_TRACKER_CONFIG.timezone,
      summary_enabled: ORDER_TRACKER_CONFIG.defaults.summaryEnabled ? "TRUE" : "FALSE",
      summary_recipient: email,
      summary_hour: ORDER_TRACKER_CONFIG.defaults.summaryHour,
      max_threads_per_query: ORDER_TRACKER_CONFIG.defaults.maxThreadsPerQuery
    };
  }

  function formatOrders_(sheet) {
    var headers = ORDER_TRACKER_CONFIG.headers.orders;
    ensureCheckboxColumn_(sheet);
    if (!sheet.getFilter()) {
      sheet.getRange(1, 1, Math.max(2, sheet.getMaxRows()), headers.length).createFilter();
    }

    sheet.setColumnWidth(1, 90);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 220);
    sheet.setColumnWidth(8, 130);
    sheet.setColumnWidth(9, 260);
    sheet.setColumnWidth(12, 320);
    sheet.getRange(2, 8, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat("yyyy-mm-dd");
    applyDataValidation_(sheet);
    applyConditionalFormatting_(sheet);
    sheet.autoResizeColumns(5, 3);
  }

  function applyDataValidation_(sheet) {
    var rowCount = Math.max(1, sheet.getMaxRows() - 1);
    var statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"], true)
      .setAllowInvalid(true)
      .build();
    var carrierRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Amazon Logistics", "UPS", "FedEx", "USPS", "DHL", "OnTrac", "Veho", "Pitney Bowes", "GLS", "Other"], true)
      .setAllowInvalid(true)
      .build();

    sheet.getRange(2, 2, rowCount, 1).setDataValidation(statusRule);
    sheet.getRange(2, 6, rowCount, 1).setDataValidation(carrierRule);
  }

  function applyConditionalFormatting_(sheet) {
    var headers = ORDER_TRACKER_CONFIG.headers.orders;
    var rowCount = Math.max(1, sheet.getMaxRows() - 1);
    var range = sheet.getRange(2, 1, rowCount, headers.length);
    var rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A2=FALSE,$B2="Delivered")')
        .setBackground("#e6f4ea")
        .setRanges([range])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A2=FALSE,$B2<>"Delivered",$B2<>"Exception",$H2<>"",DATEVALUE($H2)<TODAY())')
        .setBackground("#fce8e6")
        .setRanges([range])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A2=FALSE,$B2<>"Delivered",$B2<>"Exception",$H2<>"",DATEVALUE($H2)=TODAY())')
        .setBackground("#fff4ce")
        .setRanges([range])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A2=FALSE,$B2="Exception")')
        .setBackground("#fef7e0")
        .setRanges([range])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A2=FALSE,$B2<>"Delivered",$B2<>"Exception",$H2="")')
        .setBackground("#f1f3f4")
        .setRanges([range])
        .build()
    ];

    sheet.setConditionalFormatRules(rules);
  }

  function formatDashboard_(sheet) {
    sheet.clear();
    sheet.setFrozenRows(1);
    sheet.getRange("A1").setValue("Gmail Order Tracker").setFontWeight("bold").setFontSize(16);
    sheet.getRange("A3:B9").setValues([
      ["Open items", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!H2:H10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Overdue", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(Orders!B2:B10000<>"Delivered")*(Orders!B2:B10000<>"Exception")*(Orders!H2:H10000<>"")*(IFERROR(DATEVALUE(Orders!H2:H10000),0)<TODAY())*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Due today", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(Orders!B2:B10000<>"Delivered")*(Orders!B2:B10000<>"Exception")*(IFERROR(DATEVALUE(Orders!H2:H10000),0)=TODAY())*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Exceptions", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(Orders!B2:B10000="Exception")*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!H2:H10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Delivered, not checked", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(Orders!B2:B10000="Delivered")*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!H2:H10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Missing ETA", '=SUMPRODUCT((Orders!A2:A10000=FALSE)*(Orders!B2:B10000<>"Delivered")*(Orders!B2:B10000<>"Exception")*(Orders!H2:H10000="")*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))'],
      ["Received", '=SUMPRODUCT((Orders!A2:A10000=TRUE)*(LEN(Orders!C2:C10000&Orders!D2:D10000&Orders!E2:E10000&Orders!F2:F10000&Orders!G2:G10000&Orders!H2:H10000&Orders!I2:I10000&Orders!K2:K10000&Orders!L2:L10000&Orders!M2:M10000&Orders!N2:N10000&Orders!O2:O10000)>0))']
    ]);
    sheet.getRange("A11").setValue("Open items by ETA").setFontWeight("bold");
    sheet
      .getRange("A12:F12")
      .setValues([["ETA", "Status", "Store", "Item", "Carrier", "Tracking"]])
      .setFontWeight("bold");
    sheet
      .getRange("A13")
      .setFormula('=IFERROR(SORT(FILTER({Orders!H2:H,Orders!B2:B,Orders!C2:C,Orders!D2:D,Orders!F2:F,Orders!G2:G},Orders!A2:A=FALSE),1,TRUE),"")');
    sheet.autoResizeColumns(1, 6);
    sheet.setColumnWidth(4, 260);
  }

  function formatManualEntry_(sheet) {
    sheet.getRange("A1").setValue("Manual Entry").setFontWeight("bold").setFontSize(16);
    sheet.getRange("A2:C2").setValues([["Field", "Value", "Notes"]]).setFontWeight("bold");

    ORDER_TRACKER_CONFIG.manualEntryFields.forEach(function (field, index) {
      var rowIndex = index + 3;
      var existingLabel = sheet.getRange(rowIndex, 1).getValue();
      sheet.getRange(rowIndex, 1).setValue(field[0]);
      if (!sheet.getRange(rowIndex, 2).getValue() && field[1]) {
        sheet.getRange(rowIndex, 2).setValue(field[1]);
      }
      sheet.getRange(rowIndex, 3).setValue(field[2]);

      if (existingLabel && existingLabel !== field[0]) {
        sheet.getRange(rowIndex, 2).clearContent();
      }
    });

    applyManualEntryValidation_(sheet);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 260);
    sheet.setColumnWidth(3, 420);
  }

  function applyManualEntryValidation_(sheet) {
    var statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"], true)
      .setAllowInvalid(true)
      .build();
    var carrierRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Amazon Logistics", "UPS", "FedEx", "USPS", "DHL", "OnTrac", "Veho", "Pitney Bowes", "GLS", "Other"], true)
      .setAllowInvalid(true)
      .build();

    sheet.getRange(3, 2).setDataValidation(statusRule);
    sheet.getRange(7, 2).setDataValidation(carrierRule);
    sheet.getRange(9, 2).setNumberFormat("yyyy-mm-dd");
  }

  function formatLog_(sheet) {
    sheet.autoResizeColumns(1, ORDER_TRACKER_CONFIG.headers.log.length);
  }

  function ensureCheckboxColumn_(sheet) {
    var headers = getHeaders_(sheet);
    var lastMeaningfulRow = getLastMeaningfulOrderRow_(sheet, headers);
    if (lastMeaningfulRow >= 2) {
      sheet.getRange(2, 1, lastMeaningfulRow - 1, 1).insertCheckboxes();
    }
  }

  function ensureCheckbox_(sheet, rowIndex) {
    sheet.getRange(rowIndex, 1).insertCheckboxes();
  }

  function cleanupBlankDefaultSheets_(ss) {
    ["Sheet1"].forEach(function (name) {
      var sheet = ss.getSheetByName(name);
      if (sheet && ss.getSheets().length > 1 && sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        ss.deleteSheet(sheet);
      }
    });
  }

  function getHeaders_(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  }

  function buildRowIndex_(headers, rows) {
    var index = {
      tracking: {},
      orderStore: {},
      message: {}
    };

    rows.forEach(function (row, offset) {
      if (!isMeaningfulOrderRow_(row, headers)) return;
      addRowToIndex_(index, headers, row, offset + 2);
    });

    return index;
  }

  function addRowToIndex_(index, headers, row, rowIndex) {
    if (!isMeaningfulOrderRow_(row, headers)) return;
    var record = rowToRecord_(headers, row);
    var keys = OrderTrackerDedupe.getKeys(record);
    if (keys.trackingKey) index.tracking[keys.trackingKey] = rowIndex;
    if (keys.orderStoreKey) index.orderStore[keys.orderStoreKey] = rowIndex;
    if (keys.messageKey) index.message[keys.messageKey] = rowIndex;
  }

  function findExistingRowInIndex_(index, record) {
    var keys = OrderTrackerDedupe.getKeys(record);
    if (keys.trackingKey && index.tracking[keys.trackingKey]) {
      return { rowIndex: index.tracking[keys.trackingKey] };
    }

    if (keys.orderStoreKey && index.orderStore[keys.orderStoreKey]) {
      return { rowIndex: index.orderStore[keys.orderStoreKey] };
    }

    if (keys.messageKey && index.message[keys.messageKey]) {
      return { rowIndex: index.message[keys.messageKey] };
    }

    return { rowIndex: 0 };
  }

  function ensureRowsAvailable_(sheet, requiredRows) {
    var maxRows = sheet.getMaxRows();
    if (requiredRows > maxRows) {
      sheet.insertRowsAfter(maxRows, requiredRows - maxRows);
    }
  }

  function assertOrderRow_(sheet, rowIndex) {
    var numeric = Number(rowIndex);
    if (!numeric || numeric < 2 || numeric > sheet.getLastRow()) {
      throw new Error("Invalid order row: " + rowIndex);
    }
  }

  function mergeRow_(existingRow, headers, incoming) {
    var row = existingRow.slice();

    setValue_(row, headers, "Status", OrderTrackerDedupe.chooseStatus(getValue_(row, headers, "Status"), incoming.status));
    preserveOrSet_(row, headers, "Store", incoming.store);
    preserveOrSet_(row, headers, "Item", incoming.item);
    preserveOrSet_(row, headers, "Order Number", incoming.orderNumber);
    preserveOrSet_(row, headers, "Carrier", incoming.carrier);
    preserveOrSet_(row, headers, "Tracking Number", incoming.trackingNumber);
    overwriteIfPresent_(row, headers, "Estimated Arrival", incoming.estimatedArrival);
    overwriteIfPresent_(row, headers, "Tracking URL", incoming.trackingUrl);
    overwriteIfPresent_(row, headers, "Source Date", incoming.sourceDate);
    overwriteIfPresent_(row, headers, "Source Subject", incoming.sourceSubject);
    overwriteIfPresent_(row, headers, "Gmail Thread ID", incoming.threadId);
    overwriteIfPresent_(row, headers, "Gmail Message ID", incoming.messageId);
    mergeNotes_(row, headers, incoming.notes);

    return row;
  }

  function mergeNotes_(row, headers, incomingNotes) {
    var existingNotes = String(getValue_(row, headers, "Notes") || "").trim();
    if (isAutoNote_(existingNotes)) {
      setValue_(row, headers, "Notes", incomingNotes || "");
    }
  }

  function isAutoNote_(notes) {
    var normalized = String(notes || "")
      .split(";")
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean)
      .sort()
      .join("; ");

    return !normalized ||
      normalized === "No ETA found in email" ||
      normalized === "No tracking number found" ||
      normalized === "No ETA found in email; No tracking number found";
  }

  function preserveOrSet_(row, headers, header, incomingValue) {
    if (incomingValue && !getValue_(row, headers, header)) {
      setValue_(row, headers, header, incomingValue);
    }
  }

  function overwriteIfPresent_(row, headers, header, incomingValue) {
    if (incomingValue) {
      setValue_(row, headers, header, incomingValue);
    }
  }

  function rowsEqual_(left, right) {
    if (left.length !== right.length) return false;

    for (var i = 0; i < left.length; i += 1) {
      if (normalizeCell_(left[i]) !== normalizeCell_(right[i])) {
        return false;
      }
    }

    return true;
  }

  function normalizeCell_(value) {
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return String(value.getTime());
    }

    return String(value || "");
  }

  function recordToRow_(headers, record) {
    return headers.map(function (header) {
      switch (header) {
        case "Received":
          return false;
        case "Status":
          return record.status || "";
        case "Store":
          return record.store || "";
        case "Item":
          return record.item || "";
        case "Order Number":
          return record.orderNumber || "";
        case "Carrier":
          return record.carrier || "";
        case "Tracking Number":
          return record.trackingNumber || "";
        case "Estimated Arrival":
          return record.estimatedArrival || "";
        case "Tracking URL":
          return record.trackingUrl || "";
        case "Last Update":
          return record.lastUpdate || "";
        case "Source Date":
          return record.sourceDate || "";
        case "Source Subject":
          return record.sourceSubject || "";
        case "Gmail Thread ID":
          return record.threadId || "";
        case "Gmail Message ID":
          return record.messageId || "";
        case "Notes":
          return record.notes || "";
        default:
          return "";
      }
    });
  }

  function rowToRecord_(headers, row) {
    return {
      store: getValue_(row, headers, "Store"),
      orderNumber: getValue_(row, headers, "Order Number"),
      trackingNumber: getValue_(row, headers, "Tracking Number"),
      messageId: getValue_(row, headers, "Gmail Message ID")
    };
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
      if (isMeaningfulOrderRow_(values[index], headers)) {
        return index + 2;
      }
    }

    return 1;
  }

  function isMeaningfulOrderRow_(row, headers) {
    return meaningfulOrderFields_().some(function (header) {
      return String(getValue_(row, headers, header) || "").trim() !== "";
    });
  }

  function hasAnyOrderRowValue_(row, headers) {
    return headers.some(function (header) {
      return String(getValue_(row, headers, header) || "").trim() !== "";
    });
  }

  function meaningfulOrderFields_() {
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
    ];
  }

  function getValue_(row, headers, header) {
    var index = headers.indexOf(header);
    return index === -1 ? "" : row[index];
  }

  function setValue_(row, headers, header, value) {
    var index = headers.indexOf(header);
    if (index !== -1) {
      row[index] = value || "";
    }
  }

  function getTimezone_(ss) {
    try {
      return getSettings(ss).timezone || ORDER_TRACKER_CONFIG.timezone;
    } catch (error) {
      return ORDER_TRACKER_CONFIG.timezone;
    }
  }

  function formatDateTime_(date, timezone) {
    return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
  }

  function asDateString_(value) {
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd");
    }

    return String(value || "");
  }

  return {
    ensureWorkbook: ensureWorkbook,
    upsertOrder: upsertOrder,
    upsertOrders: upsertOrders,
    getOrders: getOrders,
    getUnreceivedOrders: getUnreceivedOrders,
    setReceived: setReceived,
    updateStatus: updateStatus,
    getManualEntry: getManualEntry,
    clearManualEntry: clearManualEntry,
    getSettings: getSettings,
    log: log,
    toBool: toBool
  };
})();
