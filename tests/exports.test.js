const assert = require("assert");
const exportsApi = require("../trackerpal-extension/exports.js");

const timezoneBoundary = new Date("2026-08-14T01:30:00.000Z");
const localBoundaryDate = `${timezoneBoundary.getFullYear()}-${String(timezoneBoundary.getMonth() + 1).padStart(2, "0")}-${String(timezoneBoundary.getDate()).padStart(2, "0")}`;
assert.strictEqual(exportsApi.isoDate(timezoneBoundary.toISOString()), localBoundaryDate, "timestamp exports use the same local calendar day shown in TrackerPal");
assert.strictEqual(exportsApi.isoDate("2026-08-14"), "2026-08-14", "edited date-only values stay exact");

const entries = [
  {
    item: "Newest received",
    trackingNumber: "00123456789012345678",
    carrier: "USPS",
    status: "Delivered",
    received: true,
    createdAt: "2026-08-10T12:00:00.000Z",
    receivedAt: "2026-08-13T12:00:00.000Z"
  },
  {
    item: '=HYPERLINK("bad")',
    trackingNumber: "Pickup, rear door\nUnit 2",
    carrier: "Pickup",
    status: "Ordered",
    received: true,
    createdAt: "2026-08-09T12:00:00.000Z",
    receivedAt: "2026-08-12T12:00:00.000Z"
  },
  {
    item: "Still open",
    trackingNumber: "1Z999AA10123456784",
    carrier: "UPS",
    status: "Shipped",
    received: false,
    createdAt: "2026-08-11T12:00:00.000Z"
  },
  {
    item: "Legacy received",
    trackingNumber: "123",
    carrier: "Other",
    status: "Delivered",
    received: true,
    createdAt: "2026-08-08T12:00:00.000Z"
  }
];

const completed = exportsApi.completedEntries(entries);
assert.strictEqual(completed.length, 3, "exports received packages only");
assert.strictEqual(completed[0].item, "Newest received", "completed history is ordered newest completion first");

const rows = exportsApi.exportRows(entries);
assert.strictEqual(rows[2][5], "", "legacy received packages do not invent a completion date");

const csv = exportsApi.buildCsv(entries);
assert.ok(csv.startsWith("\uFEFF"), "CSV includes a UTF-8 spreadsheet marker");
assert.match(csv, /"'00123456789012345678"/, "CSV protects long numeric tracking identifiers");
assert.match(csv, /"'=HYPERLINK\(""bad""\)"/, "CSV neutralizes spreadsheet formulas and escapes quotes");
assert.match(csv, /"Pickup, rear door\nUnit 2"/, "CSV safely quotes commas and newlines");
assert.doesNotMatch(csv, /Still open/, "CSV excludes open shipments");

const pdf = exportsApi.buildPdf(entries);
const pdfText = Buffer.from(pdf).toString("latin1");
assert.ok(pdfText.startsWith("%PDF-1.4"), "PDF export has a real PDF signature");
assert.match(pdfText, /xref\n/, "PDF export includes a cross-reference table");
assert.ok(pdfText.endsWith("%%EOF\n"), "PDF export has a valid end marker");
assert.match(pdfText, /Newest received/, "PDF includes completed shipment details");
assert.doesNotMatch(pdfText, /Still open/, "PDF excludes open shipments");

const manyEntries = Array.from({ length: 90 }, (_, index) => ({
  item: `Completed shipment ${index + 1}`,
  trackingNumber: `940011189922385692${String(index).padStart(4, "0")}`,
  carrier: "USPS",
  status: "Delivered",
  received: true,
  createdAt: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
  receivedAt: `2026-08-${String((index % 13) + 1).padStart(2, "0")}T12:00:00.000Z`
}));
const multipagePdf = Buffer.from(exportsApi.buildPdf(manyEntries)).toString("latin1");
assert.ok((multipagePdf.match(/\/Type \/Page\b/g) || []).length > 1, "long histories produce a multi-page PDF");

console.log("ok - completed shipment exports are local, safe, and valid");
