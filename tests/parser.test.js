const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
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
  isNaN
};

vm.createContext(context);

[
  "src/Config.js",
  "src/OrderTrackerDedupe.js",
  "src/OrderEmailParser.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

const parser = context.OrderEmailParser;
const dedupe = context.OrderTrackerDedupe;

function parse(overrides) {
  return parser.parseEmail(
    {
      from: overrides.from || "Store <orders@example.com>",
      subject: overrides.subject || "",
      body: overrides.body || "",
      date: overrides.date || new Date("2026-05-21T12:00:00-04:00"),
      threadId: overrides.threadId || "thread-1",
      messageId: overrides.messageId || "message-1",
      manualImport: Boolean(overrides.manualImport)
    },
    "America/New_York"
  );
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

test("parses Amazon shipped email with TBA tracking and ETA", () => {
  const result = parse({
    from: "Amazon.com <shipment-tracking@amazon.com>",
    subject: "Your Amazon.com order of USB-C cables has shipped",
    body: "Arriving tomorrow. Tracking number TBA123456789012. Track package: https://www.amazon.com/progress-tracker/package"
  });

  assert.equal(result.store, "Amazon");
  assert.equal(result.status, "Shipped");
  assert.equal(result.item, "USB-C cables");
  assert.equal(result.carrier, "Amazon Logistics");
  assert.equal(result.trackingNumber, "TBA123456789012");
  assert.equal(result.estimatedArrival, "2026-05-22");
  assert.equal(result.shouldImport, true);
});

test("parses Shopify-style order confirmation", () => {
  const result = parse({
    from: "Great Candle Co <notifications@shopify.com>",
    subject: "Order confirmation #GC10045",
    body: "Great Candle Co\nThanks for your order.\nOrder number: GC10045\nEstimated delivery: May 29, 2026"
  });

  assert.equal(result.status, "Ordered");
  assert.equal(result.store, "Great Candle Co");
  assert.equal(result.orderNumber, "GC10045");
  assert.equal(result.estimatedArrival, "2026-05-29");
});

test("parses UPS tracking number", () => {
  const result = parse({
    from: "UPS Quantum View <pkginfo@ups.com>",
    subject: "UPS Ship Notification",
    body: "Your package has shipped. Tracking Number: 1Z999AA10123456784. Scheduled Delivery: Friday"
  });

  assert.equal(result.carrier, "UPS");
  assert.equal(result.trackingNumber, "1Z999AA10123456784");
  assert.equal(result.estimatedArrival, "2026-05-22");
  assert.equal(result.trackingUrl.includes("ups.com"), true);
});

test("parses same-day weekday ETA as today", () => {
  const result = parse({
    from: "UPS Quantum View <pkginfo@ups.com>",
    subject: "UPS Delivery Update",
    body: "Tracking Number: 1Z999AA10123456784. Scheduled Delivery: Thursday"
  });

  assert.equal(result.estimatedArrival, "2026-05-21");
});

test("parses FedEx shipment with numeric tracking", () => {
  const result = parse({
    from: "FedEx Delivery Manager <trackingupdates@fedex.com>",
    subject: "Your FedEx package is on its way",
    body: "Tracking number: 123456789012. Scheduled delivery: 5/27/2026"
  });

  assert.equal(result.carrier, "FedEx");
  assert.equal(result.trackingNumber, "123456789012");
  assert.equal(result.estimatedArrival, "2026-05-27");
});

test("parses USPS tracking", () => {
  const result = parse({
    from: "USPS Informed Delivery <USPSInformeddelivery@usps.gov>",
    subject: "USPS Package Update",
    body: "Expected Delivery: May 23. USPS Tracking Number: 9400111899223856100000"
  });

  assert.equal(result.carrier, "USPS");
  assert.equal(result.trackingNumber, "9400111899223856100000");
  assert.equal(result.estimatedArrival, "2026-05-23");
});

test("parses DHL delivery", () => {
  const result = parse({
    from: "DHL Express <no-reply@dhl.com>",
    subject: "DHL Shipment Notification",
    body: "Your shipment is on its way. DHL tracking number: 1234567890. Estimated delivery: 05/28"
  });

  assert.equal(result.carrier, "DHL");
  assert.equal(result.trackingNumber, "1234567890");
  assert.equal(result.estimatedArrival, "2026-05-28");
});

test("uses brand-like domain part instead of generic mail subdomain", () => {
  const result = parse({
    from: "Orders <hello@orders.coolkeyboardco.com>",
    subject: "Your order has shipped",
    body: "Tracking number: 1Z999AA10123456784"
  });

  assert.equal(result.store, "Coolkeyboardco");
});

test("skips cancellation and refund emails", () => {
  const canceled = parse({
    subject: "Your order was canceled",
    body: "Order number: ABC12345"
  });
  const refund = parse({
    subject: "Refund issued for your order",
    body: "Order number: ABC12345"
  });

  assert.equal(canceled, null);
  assert.equal(refund, null);
});

test("skips digital delivery emails", () => {
  const result = parse({
    subject: "Your digital download is ready",
    body: "Order number: ABC12345"
  });

  assert.equal(result, null);
});

test("marks delivery exceptions and delays", () => {
  const result = parse({
    from: "FedEx Delivery Manager <trackingupdates@fedex.com>",
    subject: "Delivery exception for your FedEx package",
    body: "Tracking number: 123456789012. Delivery attempted today. Action required."
  });

  assert.equal(result.status, "Exception");
  assert.equal(result.carrier, "FedEx");
});

test("recognizes regional and fulfillment carriers from sender/body", () => {
  const veho = parse({
    from: "Veho <tracking@shipveho.com>",
    subject: "Your package is on the way",
    body: "Tracking number: VHO123456789. Estimated delivery: May 24"
  });
  const pitney = parse({
    from: "Pitney Bowes <tracking@pitneybowes.com>",
    subject: "Shipment update",
    body: "Tracking number: PB123456789. Estimated delivery: May 25"
  });

  assert.equal(veho.carrier, "Veho");
  assert.equal(pitney.carrier, "Pitney Bowes");
});

test("imports shipped email with missing ETA and adds note", () => {
  const result = parse({
    subject: "Your order has shipped",
    body: "Tracking number: 1Z999AA10123456784"
  });

  assert.equal(result.shouldImport, true);
  assert.equal(result.estimatedArrival, "");
  assert.equal(result.notes.includes("No ETA"), true);
});

test("manual Gmail label import forces a low-signal email into TrackerPal", () => {
  const result = parse({
    from: "Receipt Desk <hello@smallshop.example>",
    subject: "Thanks from the counter",
    body: "Here is the receipt we talked about.",
    manualImport: true
  });

  assert.equal(result.shouldImport, true);
  assert.equal(result.status, "Ordered");
  assert.equal(result.item, "Thanks from the counter");
  assert.match(result.notes, /Manually imported/);
});

test("delivered update remains not received", () => {
  const result = parse({
    from: "UPS <pkginfo@ups.com>",
    subject: "Your package was delivered",
    body: "Delivered today. Tracking number: 1Z999AA10123456784"
  });

  assert.equal(result.status, "Delivered");
  assert.equal(result.received, false);
});

test("dedupe uses tracking number before message id", () => {
  const a = dedupe.getKeys({
    store: "Amazon",
    orderNumber: "ORDER-1",
    trackingNumber: "1Z 999 AA1 0123456784",
    messageId: "m1"
  });
  const b = dedupe.getKeys({
    store: "Other",
    orderNumber: "ORDER-2",
    trackingNumber: "1Z999AA10123456784",
    messageId: "m2"
  });

  assert.equal(a.trackingKey, b.trackingKey);
  assert.notEqual(a.messageKey, b.messageKey);
});

test("dedupe preserves delivered status over older shipped status", () => {
  assert.equal(dedupe.chooseStatus("Delivered", "Shipped"), "Delivered");
  assert.equal(dedupe.chooseStatus("Shipped", "Delivered"), "Delivered");
});
