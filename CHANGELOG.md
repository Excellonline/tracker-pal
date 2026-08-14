# Changelog

All notable changes to TrackerPal will be documented in this file.

## 0.4.3 - 2026-08-13

- Centered summary values and labels within their three equal-width columns.
- Centered text-only carrier pills and tightened short status pills so labels no longer sit against excess right padding.
- Reordered dense delivery actions to carrier, Receive, then Delete for a cleaner right-edge group.
- Fixed the hidden Gmail loading layer so it cannot cover Google's permission controls, and clarified the full-tab approval path.

## 0.4.2 - 2026-08-13

- Removed redundant pencil icons from the clickable status and entry-date controls.
- Moved each red status pill beside its package title while keeping Receive, Delete, and carrier actions aligned at the right edge.
- Added an All-view footer for downloading received shipment history as CSV or a real multi-page PDF.
- Added truthful completion timestamps for newly received packages and safe local export handling with no new Chrome permissions.

## 0.4.1 - 2026-08-13

- Replaced the always-open package form with a collapsed, keyboard-friendly Add package control.
- Reworked deliveries into a dense, clean list with a red editable status pill, compact Receive/Delete icons, and carrier tracking pills.
- Added a quiet “Designed by Sev” credit beneath the local-storage notice.
- Added Pickup as a carrier option with an optional address field and no external address transfer.
- Added automatic entry dates, newest-first ordering, and a compact editable date control on every delivery.
- Simplified the package summary into a single emerald status strip and reduced repetitive card styling.
- Added narrow-panel behavior, item-specific accessible action names, and safer nested-icon click handling.
- Corrected Store ZIP entries so `manifest.json` is written at the archive root.
- Refreshed the Chrome Web Store screenshot to match the redesigned side panel.

## 0.4.0 - 2026-08-13

- Added a native Manifest V3 Chrome side-panel extension with local package tracking.
- Added automatic UPS, USPS, FedEx, and DHL tracking-link detection.
- Reduced Chrome access to the side-panel and storage permissions only.
- Added a separate Store-safe build without private Google configuration or remote content.
- Rebuilt the interface and icon around a modern emerald-green visual system.
- Improved responsive behavior, keyboard access, focus handling, safe links, and error states.
- Added Chrome Web Store privacy, listing, and packaging documentation.
- Rotated the Desktop access key and moved private deployment values out of public source control.
- Updated the Apps Script developer toolchain and removed all reported dependency vulnerabilities.

## 0.3.0 - 2026-06-19

- Added Gmail and Google Sheets package tracking workflow.
- Added dashboard, manual entry, daily summary, and web UI support.
- Added local Node.js test coverage for parser, Gmail, summary, Apps Script, and Sheets behavior.
