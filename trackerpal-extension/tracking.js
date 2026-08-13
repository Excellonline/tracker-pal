(function (root, factory) {
  var api = factory();
  root.TrackerPalTracking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalize(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function detectCarrier(value) {
    var tracking = normalize(value);
    if (/^1Z[0-9A-Z]{16}$/.test(tracking)) return "UPS";
    if (/^(94|93|92|95)[0-9]{18,20}$/.test(tracking) || /^[A-Z]{2}[0-9]{9}US$/.test(tracking)) return "USPS";
    if (/^[0-9]{12}$/.test(tracking) || /^[0-9]{15}$/.test(tracking)) return "FedEx";
    if (/^[0-9]{10}$/.test(tracking)) return "DHL";
    return "Other";
  }

  function trackingUrl(carrier, value) {
    var tracking = normalize(value);
    if (!tracking) return "";
    if (carrier === "UPS") return "https://www.ups.com/track?tracknum=" + encodeURIComponent(tracking);
    if (carrier === "USPS") return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + encodeURIComponent(tracking);
    if (carrier === "FedEx") return "https://www.fedex.com/fedextrack/?trknbr=" + encodeURIComponent(tracking);
    if (carrier === "DHL") return "https://www.dhl.com/global-en/home/tracking.html?tracking-id=" + encodeURIComponent(tracking);
    return "";
  }

  return { normalize: normalize, detectCarrier: detectCarrier, trackingUrl: trackingUrl };
});
