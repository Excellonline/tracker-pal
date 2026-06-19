var ORDER_TRACKER_CONFIG = {
  appName: "TrackerPal",
  version: "0.3.0",
  desktopWebAppUrl: "https://script.google.com/macros/s/AKfycbw-1VmCIHNVcEO-qvjtE2i9ORDNiz4C3nqBNbFwjGgTlGR_Q4mRW7TLy11W86BXWAOn/exec?key=tp_7b6d0d9dbd934ce0b5f7d82a3e93fd2f",
  timezone: "America/New_York",
  sheets: {
    dashboard: "Dashboard",
    orders: "Orders",
    manualEntry: "Manual Entry",
    settings: "Settings",
    log: "Import Log"
  },
  headers: {
    orders: [
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
    settings: ["Key", "Value", "Notes"],
    log: ["Time", "Level", "Action", "Message", "Details"]
  },
  defaults: {
    scanDays: 7,
    backfillDays: 60,
    manualImportDays: 365,
    summaryEnabled: true,
    summaryHour: 8,
    maxThreadsPerQuery: 75
  },
  manualImportLabel: "TrackerPal",
  manualEntryFields: [
    ["Status", "Ordered", "Ordered, Shipped, Out for delivery, Delivered, or Exception."],
    ["Store", "", "Store or seller name."],
    ["Item", "", "What you are expecting."],
    ["Order Number", "", "Optional order or receipt number."],
    ["Carrier", "", "Optional carrier name."],
    ["Tracking Number", "", "Optional tracking number."],
    ["Estimated Arrival", "", "Optional date such as 2026-05-24 or May 24."],
    ["Tracking URL", "", "Optional tracking link."],
    ["Notes", "", "Optional private note."]
  ],
  settingNotes: {
    scan_days: "How many days back the hourly sync scans.",
    backfill_days: "How many days back backfillOrders scans.",
    timezone: "Timezone for dates and daily summary trigger.",
    summary_enabled: "TRUE sends a daily summary; FALSE disables summary emails.",
    summary_recipient: "Email address that receives the daily unreceived-orders summary.",
    summary_hour: "Hour of day, 0-23, for the daily summary trigger.",
    max_threads_per_query: "Maximum Gmail threads returned for each smart search query."
  },
  searchQueries: [
    "tracking",
    "shipped",
    "shipment",
    "delivered",
    "delayed",
    "\"delivery exception\"",
    "\"delivery attempted\"",
    "\"out for delivery\"",
    "\"estimated delivery\"",
    "\"your order\"",
    "\"order confirmation\"",
    "from:ups.com",
    "from:fedex.com",
    "from:usps.com",
    "from:dhl.com",
    "from:ontrac.com",
    "from:lasership.com",
    "from:shipveho.com",
    "from:pitneybowes.com",
    "from:gls-us.com",
    "from:amazon.com",
    "from:shopify.com"
  ],
  carrierTrackingUrls: {
    UPS: "https://www.ups.com/track?tracknum={trackingNumber}",
    FedEx: "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
    USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}",
    DHL: "https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id={trackingNumber}",
    OnTrac: "https://www.ontrac.com/tracking/?number={trackingNumber}",
    "Amazon Logistics": "https://www.amazon.com/progress-tracker/package/ref=ppx_yo_dt_b_track_package"
  }
};
