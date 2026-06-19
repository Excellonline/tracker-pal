var OrderTrackerWeb = (function () {
  function doGet() {
    var template = HtmlService.createTemplateFromFile("TrackerPal");
    template.version = ORDER_TRACKER_CONFIG.version;
    return template
      .evaluate()
      .setTitle("TrackerPal")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  function getState() {
    var ss = getSpreadsheet_();
    OrderTrackerSheets.ensureWorkbook(ss);
    var orders = OrderTrackerSheets.getOrders(ss);
    return {
      appName: "TrackerPal",
      version: ORDER_TRACKER_CONFIG.version,
      sheetUrl: ss.getUrl(),
      generatedAt: Utilities.formatDate(new Date(), getTimezone_(ss), "yyyy-MM-dd HH:mm:ss"),
      today: Utilities.formatDate(new Date(), getTimezone_(ss), "yyyy-MM-dd"),
      stats: calculateStats_(orders, getTimezone_(ss)),
      orders: orders
    };
  }

  function addManualOrder(entry) {
    var ss = getSpreadsheet_();
    OrderTrackerSheets.ensureWorkbook(ss);
    var record = OrderTrackerManual.entryToRecord(mapClientEntry_(entry || {}), getTimezone_(ss));
    var result = OrderTrackerSheets.upsertOrder(ss, record);
    OrderTrackerSheets.log("INFO", "trackerpal", "Manual order " + result.action + " from TrackerPal.", JSON.stringify({ rowIndex: result.rowIndex }));
    return {
      action: result.action,
      rowIndex: result.rowIndex,
      state: getState()
    };
  }

  function setReceived(rowIndex, received) {
    var ss = getSpreadsheet_();
    OrderTrackerSheets.ensureWorkbook(ss);
    OrderTrackerSheets.setReceived(ss, Number(rowIndex), Boolean(received));
    return getState();
  }

  function updateStatus(rowIndex, status) {
    var ss = getSpreadsheet_();
    OrderTrackerSheets.ensureWorkbook(ss);
    OrderTrackerSheets.updateStatus(ss, Number(rowIndex), String(status || ""));
    return getState();
  }

  function syncNow() {
    var message = OrderTrackerApp.syncOrders();
    var state = getState();
    state.message = message;
    return state;
  }

  function backfillNow() {
    var message = OrderTrackerApp.backfillOrders();
    var state = getState();
    state.message = message;
    return state;
  }

  function getSpreadsheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("TrackerPal must be opened from its bound Google Sheet project.");
    }

    return ss;
  }

  function getTimezone_(ss) {
    var settings = OrderTrackerSheets.getSettings(ss);
    return String(settings.timezone || ORDER_TRACKER_CONFIG.timezone);
  }

  function calculateStats_(orders, timezone) {
    var today = Utilities.formatDate(new Date(), timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd");
    var stats = {
      open: 0,
      overdue: 0,
      dueToday: 0,
      exceptions: 0,
      delivered: 0,
      missingEta: 0,
      received: 0
    };

    orders.forEach(function (order) {
      if (order.received) {
        stats.received += 1;
        return;
      }

      stats.open += 1;
      if (order.status === "Exception") stats.exceptions += 1;
      if (order.status === "Delivered") stats.delivered += 1;

      if (!order.estimatedArrival && order.status !== "Delivered" && order.status !== "Exception") {
        stats.missingEta += 1;
      }

      if (order.estimatedArrival && order.status !== "Delivered" && order.status !== "Exception") {
        if (order.estimatedArrival < today) stats.overdue += 1;
        if (order.estimatedArrival === today) stats.dueToday += 1;
      }
    });

    return stats;
  }

  function mapClientEntry_(entry) {
    return {
      Status: entry.status || "Ordered",
      Store: entry.store || "",
      Item: entry.item || "",
      "Order Number": entry.orderNumber || "",
      Carrier: entry.carrier || "",
      "Tracking Number": entry.trackingNumber || "",
      "Estimated Arrival": entry.estimatedArrival || "",
      "Tracking URL": entry.trackingUrl || "",
      Notes: entry.notes || ""
    };
  }

  return {
    doGet: doGet,
    getState: getState,
    addManualOrder: addManualOrder,
    setReceived: setReceived,
    updateStatus: updateStatus,
    syncNow: syncNow,
    backfillNow: backfillNow
  };
})();
