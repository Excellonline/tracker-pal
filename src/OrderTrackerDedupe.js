var OrderTrackerDedupe = (function () {
  var STATUS_RANK = {
    Ordered: 1,
    Shipped: 2,
    "Out for delivery": 3,
    Exception: 3,
    Delivered: 4
  };

  function getKeys(record) {
    var trackingKey = normalize(record.trackingNumber);
    var orderStoreKey = "";
    var messageKey = normalize(record.messageId);

    if (record.orderNumber && record.store) {
      orderStoreKey = normalize(record.store) + "::" + normalize(record.orderNumber);
    }

    return {
      trackingKey: trackingKey,
      orderStoreKey: orderStoreKey,
      messageKey: messageKey
    };
  }

  function chooseStatus(existingStatus, incomingStatus) {
    if (!incomingStatus) {
      return existingStatus || "";
    }

    if (!existingStatus) {
      return incomingStatus;
    }

    var existingRank = STATUS_RANK[existingStatus] || 0;
    var incomingRank = STATUS_RANK[incomingStatus] || 0;
    return incomingRank >= existingRank ? incomingStatus : existingStatus;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeTracking(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  return {
    getKeys: getKeys,
    chooseStatus: chooseStatus,
    normalize: normalize,
    normalizeTracking: normalizeTracking
  };
})();
