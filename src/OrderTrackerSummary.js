var OrderTrackerSummary = (function () {
  function send(recipient, openOrders, timezone, sheetUrl) {
    var sorted = sortOrders(openOrders, timezone);
    var subject = buildSubject(sorted, timezone);
    var body = buildBody(sorted, timezone, sheetUrl);

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body
    });

    return {
      count: sorted.length,
      message: "Sent daily summary with " + sorted.length + " unreceived item(s)."
    };
  }

  function sortOrders(openOrders, timezone) {
    var today = dateOnly(new Date(), timezone);
    return openOrders.slice().sort(function (a, b) {
      var aDate = a.estimatedArrival || "9999-12-31";
      var bDate = b.estimatedArrival || "9999-12-31";
      var aPriority = orderPriority(a, today);
      var bPriority = orderPriority(b, today);

      if (aPriority !== bPriority) return aPriority - bPriority;
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return String(a.store || "").localeCompare(String(b.store || ""));
    });
  }

  function orderPriority(order, today) {
    if (order.status === "Exception") return 0;
    if (order.estimatedArrival && order.estimatedArrival < today) return 1;
    if (order.estimatedArrival === today) return 2;
    if (order.status === "Delivered") return 3;
    return 4;
  }

  function buildSubject(openOrders, timezone) {
    var today = dateOnly(new Date(), timezone);
    var dueCount = openOrders.filter(function (order) {
      return order.status !== "Delivered" && order.status !== "Exception" && order.estimatedArrival && order.estimatedArrival <= today;
    }).length;
    var exceptionCount = openOrders.filter(function (order) {
      return order.status === "Exception";
    }).length;

    if (exceptionCount > 0) {
      return "Order Tracker: " + exceptionCount + " exception(s), " + openOrders.length + " open";
    }

    if (dueCount > 0) {
      return "Order Tracker: " + dueCount + " due or overdue, " + openOrders.length + " open";
    }

    return "Order Tracker: " + openOrders.length + " open item(s)";
  }

  function buildBody(openOrders, timezone, sheetUrl) {
    if (!openOrders.length) {
      var emptyLines = ["No unreceived orders are currently tracked."];
      if (sheetUrl) {
        emptyLines.push("");
        emptyLines.push("Tracker: " + sheetUrl);
      }

      return emptyLines.join("\n");
    }

    var today = dateOnly(new Date(), timezone);
    var lines = [
      "Unreceived orders as of " + today + "",
      ""
    ];

    openOrders.forEach(function (order) {
      var dueLabel = "";
      if (order.status === "Exception") {
        dueLabel = "EXCEPTION";
      } else if (order.estimatedArrival && order.estimatedArrival < today) {
        dueLabel = "OVERDUE";
      } else if (order.estimatedArrival === today) {
        dueLabel = "DUE TODAY";
      }

      lines.push(
        [
          dueLabel ? "[" + dueLabel + "]" : "",
          order.store || "Unknown store",
          order.item ? "- " + order.item : "",
          order.status ? "(" + order.status + ")" : ""
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (order.estimatedArrival) lines.push("  ETA: " + order.estimatedArrival);
      if (order.carrier || order.trackingNumber) {
        lines.push("  Tracking: " + [order.carrier, order.trackingNumber].filter(Boolean).join(" "));
      }
      if (order.trackingUrl) lines.push("  Link: " + order.trackingUrl);
      if (order.notes) lines.push("  Notes: " + order.notes);
      lines.push("");
    });

    lines.push("Check Received in the Orders sheet once each item is physically received.");
    if (sheetUrl) {
      lines.push("");
      lines.push("Tracker: " + sheetUrl);
    }
    return lines.join("\n");
  }

  function dateOnly(date, timezone) {
    return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd");
  }

  return {
    send: send,
    sortOrders: sortOrders
  };
})();
