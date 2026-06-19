var OrderTrackerManual = (function () {
  function entryToRecord(entry, timezone) {
    var store = clean_(entry.Store);
    var item = clean_(entry.Item);
    var orderNumber = clean_(entry["Order Number"]);
    var trackingNumber = OrderTrackerDedupe.normalizeTracking(entry["Tracking Number"]);
    var status = normalizeStatus_(entry.Status);

    if (!store && !item && !orderNumber && !trackingNumber) {
      throw new Error("Manual entry needs at least a store, item, order number, or tracking number.");
    }

    return {
      received: false,
      status: status,
      store: store,
      item: item,
      orderNumber: orderNumber,
      carrier: clean_(entry.Carrier),
      trackingNumber: trackingNumber,
      estimatedArrival: normalizeEta_(entry["Estimated Arrival"], timezone),
      trackingUrl: clean_(entry["Tracking URL"]),
      lastUpdate: "",
      sourceDate: formatDateTime_(new Date(), timezone),
      sourceSubject: "Manual entry",
      threadId: "",
      messageId: buildManualMessageId_(entry),
      notes: clean_(entry.Notes),
      shouldImport: true
    };
  }

  function normalizeStatus_(value) {
    var status = clean_(value) || "Ordered";
    var known = {
      ordered: "Ordered",
      shipped: "Shipped",
      "out for delivery": "Out for delivery",
      delivered: "Delivered",
      exception: "Exception"
    };

    return known[status.toLowerCase()] || status;
  }

  function normalizeEta_(value, timezone) {
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return formatDateOnly_(value, timezone);
    }

    var text = clean_(value);
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    return OrderEmailParser.parseDateCandidate(text, new Date(), timezone) || text;
  }

  function buildManualMessageId_(entry) {
    var stableParts = [
      clean_(entry.Store),
      clean_(entry.Item),
      clean_(entry["Order Number"]),
      OrderTrackerDedupe.normalizeTracking(entry["Tracking Number"]),
      clean_(entry["Estimated Arrival"])
    ].join("|");

    return "manual-" + OrderTrackerDedupe.normalize(stableParts || String(new Date().getTime()));
  }

  function clean_(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  }

  function formatDateOnly_(date, timezone) {
    if (typeof Utilities !== "undefined" && Utilities.formatDate) {
      return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd");
    }

    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function formatDateTime_(date, timezone) {
    if (typeof Utilities !== "undefined" && Utilities.formatDate) {
      return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
    }

    return date.toISOString();
  }

  return {
    entryToRecord: entryToRecord
  };
})();
