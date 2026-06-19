var OrderTrackerApp = (function () {
  function addMenu() {
    SpreadsheetApp.getUi()
      .createMenu("Order Tracker")
      .addItem("Open TrackerPal", "openTrackerPal")
      .addItem("Show dashboard", "showDashboard")
      .addItem("Show orders", "showOrders")
      .addSeparator()
      .addItem("Set up sheet", "setupOrderTracker")
      .addItem("Sync recent orders", "syncOrders")
      .addItem("Backfill 60 days", "backfillOrders")
      .addSeparator()
      .addItem("Add manual order", "addManualOrder")
      .addItem("Import manual entry", "importManualEntry")
      .addSeparator()
      .addItem("Send daily summary now", "sendDailySummary")
      .addItem("Install hourly/daily triggers", "installTriggers")
      .addItem("Remove triggers", "removeTriggers")
      .addItem("Health check", "healthCheck")
      .addToUi();
  }

  function setup() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    OrderTrackerGmail.ensureManualImportLabel();
    OrderTrackerSheets.log("INFO", "setup", "Order tracker setup complete.", "");
    return "Order tracker setup complete.";
  }

  function openTrackerPal() {
    var url = ORDER_TRACKER_CONFIG.desktopWebAppUrl || ScriptApp.getService().getUrl() || SpreadsheetApp.getActiveSpreadsheet().getUrl();
    var html = HtmlService.createHtmlOutput(
      '<p><a href="' + url + '" target="_blank" rel="noopener">Open TrackerPal</a></p>' +
      '<script>window.open("' + url + '", "_blank");google.script.host.close();</script>'
    ).setWidth(320).setHeight(90);
    SpreadsheetApp.getUi().showModalDialog(html, "TrackerPal");
    return url;
  }

  function syncOrders() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var settings = OrderTrackerSheets.getSettings(ss);
    return runSync_(ss, Number(settings.scan_days || ORDER_TRACKER_CONFIG.defaults.scanDays), "sync");
  }

  function backfillOrders() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var settings = OrderTrackerSheets.getSettings(ss);
    return runSync_(ss, Number(settings.backfill_days || ORDER_TRACKER_CONFIG.defaults.backfillDays), "backfill");
  }

  function addManualOrder() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var ui = SpreadsheetApp.getUi();
    var entry = promptForManualEntry_(ui);
    if (!entry) {
      return "Manual order add cancelled.";
    }

    var record = OrderTrackerManual.entryToRecord(entry, getTimezone_(ss));
    var result = OrderTrackerSheets.upsertOrder(ss, record);
    OrderTrackerSheets.log("INFO", "manual", "Manual order " + result.action + ".", JSON.stringify({ rowIndex: result.rowIndex }));
    showMessage_("Manual order " + result.action + ".");
    return "Manual order " + result.action + ".";
  }

  function importManualEntry() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var entry = OrderTrackerSheets.getManualEntry(ss);
    var record = OrderTrackerManual.entryToRecord(entry, getTimezone_(ss));
    var result = OrderTrackerSheets.upsertOrder(ss, record);

    OrderTrackerSheets.clearManualEntry(ss);
    OrderTrackerSheets.log("INFO", "manual", "Manual entry " + result.action + ".", JSON.stringify({ rowIndex: result.rowIndex }));
    showMessage_("Manual entry " + result.action + ".");
    return "Manual entry " + result.action + ".";
  }

  function sendDailySummary() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var settings = OrderTrackerSheets.getSettings(ss);

    if (!OrderTrackerSheets.toBool(settings.summary_enabled)) {
      OrderTrackerSheets.log("INFO", "summary", "Summary skipped because summary_enabled is FALSE.", "");
      return "Summary disabled.";
    }

    var recipient = String(settings.summary_recipient || "").trim();
    if (!recipient) {
      throw new Error("Missing summary_recipient in Settings.");
    }

    var timezone = String(settings.timezone || ORDER_TRACKER_CONFIG.timezone);
    var openOrders = OrderTrackerSheets.getUnreceivedOrders(ss);
    var result = OrderTrackerSummary.send(recipient, openOrders, timezone, ss.getUrl());
    OrderTrackerSheets.log("INFO", "summary", result.message, JSON.stringify({ count: result.count }));
    return result.message;
  }

  function installTriggers() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var settings = OrderTrackerSheets.getSettings(ss);
    var timezone = String(settings.timezone || ORDER_TRACKER_CONFIG.timezone);
    var summaryHour = clampHour_(Number(settings.summary_hour || ORDER_TRACKER_CONFIG.defaults.summaryHour));
    var summaryRecipient = String(settings.summary_recipient || "").trim();
    var summaryEnabled = OrderTrackerSheets.toBool(settings.summary_enabled);

    deleteTrigger_("syncOrders");
    deleteTrigger_("sendDailySummary");

    OrderTrackerGmail.ensureManualImportLabel();
    ScriptApp.newTrigger("syncOrders").timeBased().everyHours(1).create();

    if (summaryEnabled && summaryRecipient) {
      ScriptApp.newTrigger("sendDailySummary")
        .timeBased()
        .everyDays(1)
        .atHour(summaryHour)
        .inTimezone(timezone)
        .create();
    }

    OrderTrackerSheets.log(
      "INFO",
      "triggers",
      summaryEnabled && summaryRecipient
        ? "Installed hourly sync trigger and daily summary trigger."
        : "Installed hourly sync trigger. Daily summary trigger skipped because summary recipient is missing or summary is disabled.",
      JSON.stringify({ summaryHour: summaryHour, timezone: timezone, summaryEnabled: summaryEnabled, hasSummaryRecipient: Boolean(summaryRecipient) })
    );

    return summaryEnabled && summaryRecipient ? "Installed triggers." : "Installed hourly sync trigger only.";
  }

  function removeTriggers() {
    deleteTrigger_("syncOrders");
    deleteTrigger_("sendDailySummary");
    OrderTrackerSheets.log("INFO", "triggers", "Removed order tracker triggers.", "");
    return "Removed order tracker triggers.";
  }

  function runSync_(ss, days, mode) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      var lockMessage = "Skipped " + mode + " because another order tracker run is already active.";
      OrderTrackerSheets.log("WARN", mode, lockMessage, "");
      return lockMessage;
    }

    try {
      return runSyncLocked_(ss, days, mode);
    } finally {
      lock.releaseLock();
    }
  }

  function runSyncLocked_(ss, days, mode) {
    var settings = OrderTrackerSheets.getSettings(ss);
    var maxThreads = Number(settings.max_threads_per_query || ORDER_TRACKER_CONFIG.defaults.maxThreadsPerQuery);
    var timezone = String(settings.timezone || ORDER_TRACKER_CONFIG.timezone);
    var messages = OrderTrackerGmail.findCandidateMessages(days, maxThreads);
    var stats = { scanned: messages.length, parsed: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0 };
    var records = [];

    messages.forEach(function (message) {
      try {
        var parsed = OrderEmailParser.parseEmail(message, timezone);
        if (!parsed || !parsed.shouldImport) {
          stats.skipped += 1;
          return;
        }

        stats.parsed += 1;
        records.push(parsed);
      } catch (error) {
        stats.errors += 1;
        OrderTrackerSheets.log(
          "ERROR",
          mode,
          error && error.message ? error.message : String(error),
          JSON.stringify({
            subject: message.subject,
            messageId: message.messageId
          })
        );
      }
    });

    var upsertStats = OrderTrackerSheets.upsertOrders(ss, records);
    stats.inserted += upsertStats.inserted;
    stats.updated += upsertStats.updated;
    stats.unchanged += upsertStats.unchanged;

    OrderTrackerSheets.log("INFO", mode, "Order tracker " + mode + " complete.", JSON.stringify(stats));
    return "Scanned " + stats.scanned + "; inserted " + stats.inserted + "; updated " + stats.updated + "; unchanged " + stats.unchanged + "; skipped " + stats.skipped + "; errors " + stats.errors + ".";
  }

  function healthCheck() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var settings = OrderTrackerSheets.getSettings(ss);
    var triggerNames = ScriptApp.getProjectTriggers().map(function (trigger) {
      return trigger.getHandlerFunction();
    });
    var missing = [];

    if (triggerNames.indexOf("syncOrders") === -1) missing.push("hourly sync trigger");
    if (OrderTrackerSheets.toBool(settings.summary_enabled) && triggerNames.indexOf("sendDailySummary") === -1) missing.push("daily summary trigger");
    if (OrderTrackerSheets.toBool(settings.summary_enabled) && !String(settings.summary_recipient || "").trim()) missing.push("summary recipient");

    var openCount = OrderTrackerSheets.getUnreceivedOrders(ss).length;
    var message = missing.length
      ? "Needs attention: missing " + missing.join(", ") + ". Open tracked items: " + openCount + "."
      : "Order tracker looks healthy. Open tracked items: " + openCount + ".";

    OrderTrackerSheets.log(missing.length ? "WARN" : "INFO", "health", message, JSON.stringify({ triggers: triggerNames }));
    showMessage_(message);
    return message;
  }

  function showDashboard() {
    return showSheet_(ORDER_TRACKER_CONFIG.sheets.dashboard);
  }

  function showOrders() {
    return showSheet_(ORDER_TRACKER_CONFIG.sheets.orders);
  }

  function deleteTrigger_(handlerName) {
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === handlerName) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
  }

  function clampHour_(hour) {
    if (isNaN(hour)) {
      return ORDER_TRACKER_CONFIG.defaults.summaryHour;
    }

    return Math.max(0, Math.min(23, Math.floor(hour)));
  }

  function getTimezone_(ss) {
    var settings = OrderTrackerSheets.getSettings(ss);
    return String(settings.timezone || ORDER_TRACKER_CONFIG.timezone);
  }

  function promptForManualEntry_(ui) {
    var store = prompt_(ui, "Store or seller", "Example: Local market, IKEA, Etsy seller");
    if (store === null) return null;

    var item = prompt_(ui, "Item", "What are you expecting?");
    if (item === null) return null;

    var orderNumber = prompt_(ui, "Order number", "Optional. Leave blank if unknown.");
    if (orderNumber === null) return null;

    var carrier = prompt_(ui, "Carrier", "Optional. UPS, FedEx, USPS, DHL, etc.");
    if (carrier === null) return null;

    var trackingNumber = prompt_(ui, "Tracking number", "Optional. Leave blank if there is none.");
    if (trackingNumber === null) return null;

    var estimatedArrival = prompt_(ui, "Estimated arrival", "Optional. Example: 2026-05-24 or May 24");
    if (estimatedArrival === null) return null;

    var notes = prompt_(ui, "Notes", "Optional.");
    if (notes === null) return null;

    return {
      Status: "Ordered",
      Store: store,
      Item: item,
      "Order Number": orderNumber,
      Carrier: carrier,
      "Tracking Number": trackingNumber,
      "Estimated Arrival": estimatedArrival,
      "Tracking URL": "",
      Notes: notes
    };
  }

  function prompt_(ui, title, body) {
    var response = ui.prompt(title, body, ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) {
      return null;
    }

    return response.getResponseText();
  }

  function showMessage_(message) {
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (error) {
      console.log(message);
    }
  }

  function showSheet_(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    OrderTrackerSheets.ensureWorkbook(ss);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Missing sheet: " + sheetName);
    }

    ss.setActiveSheet(sheet);
    return "Showing " + sheetName + ".";
  }

  return {
    addMenu: addMenu,
    setup: setup,
    openTrackerPal: openTrackerPal,
    syncOrders: syncOrders,
    backfillOrders: backfillOrders,
    addManualOrder: addManualOrder,
    importManualEntry: importManualEntry,
    sendDailySummary: sendDailySummary,
    installTriggers: installTriggers,
    removeTriggers: removeTriggers,
    healthCheck: healthCheck,
    showDashboard: showDashboard,
    showOrders: showOrders
  };
})();
