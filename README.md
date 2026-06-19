# TrackerPal

TrackerPal is a private Google Apps Script + Google Sheet app for online orders and packages.

The script scans Gmail on a schedule, extracts order and shipping details from matching emails, writes them into a Google Sheet, and sends a daily summary of items that are not checked off as received.

## What it tracks

The `Orders` sheet contains:

`Received`, `Status`, `Store`, `Item`, `Order Number`, `Carrier`, `Tracking Number`, `Estimated Arrival`, `Tracking URL`, `Last Update`, `Source Date`, `Source Subject`, `Gmail Thread ID`, `Gmail Message ID`, `Notes`

Delivered emails set `Status` to `Delivered`, but the `Received` checkbox stays manual so you can confirm the package actually made it into your hands.

The `Dashboard` sheet shows quick counts for open items, overdue arrivals, due-today arrivals, delivery exceptions, delivered-but-not-checked items, missing ETA items, and open items by ETA.

The `Orders` sheet includes status/carrier dropdowns and row highlighting for delivered, overdue, due-today, exception, and missing-ETA rows.

The `Manual Entry` sheet lets you add packages that did not arrive through the tracked Gmail account, including in-person orders, another email account, cash/receipt orders, or one-off items with no tracking email.

## Created Google project

TrackerPal now uses two Apps Script projects:

- Gmail automation and Sheet setup: <https://script.google.com/d/11SkAc1NF0FOLSVFEJlCRf28RdlMHxcg5KycOHUKI8JuPekyuEhYRH3bJ/edit>
- Sheet data store: <https://drive.google.com/open?id=1-ccGyXrzjSSvm73NJgdTQ6kO4ulMsR1c-1clBIxE7Uc>
- TrackerPal Desktop app: <https://script.google.com/macros/s/AKfycbw-1VmCIHNVcEO-qvjtE2i9ORDNiz4C3nqBNbFwjGgTlGR_Q4mRW7TLy11W86BXWAOn/exec>
- TrackerPal Desktop Apps Script: <https://script.google.com/d/1aH8e7_ba8IRCKNd0WXIrkp27u9XzR3kH0WJkZRbfUbYE4NZ-weY1Zh_C/edit>
- Desktop URL shortcut: `C:\Users\Sever\Desktop\TrackerPal.url`
- Normal Chrome launcher: `C:\Users\Sever\Desktop\TrackerPal.lnk`

The desktop app is intentionally separate and bound to the tracker Sheet. It opens for signed-in Google users through a secret-key URL and runs as the Sheet owner, so opening the desktop app should not show a Google OAuth permission-review screen. The Gmail scanner stays in the original automation project because Gmail scopes can make a web app authorization flow show Google's blocked-app screen.

Treat the full desktop app URL, including the `key=` value in the shortcuts, like a password. Anyone with that full URL can open the tracker UI.

If Google shows "This app is blocked", close that blocked window and open `C:\Users\Sever\Desktop\TrackerPal.lnk` instead. The launcher uses the signed-in owner-run URL and should not trigger a Google permission review.

`npx clasp status` should show no untracked Apps Script files before pushing the Gmail automation project.

For the separate desktop app, run clasp from `trackerpal-bound-ui` with `-P .`, for example:

```powershell
node ..\node_modules\@google\clasp\build\src\index.js -P . push --force
```

Do not run `npm run create` again unless you intentionally want a second tracker Sheet. This folder is already bound to the project above.

## Local setup

Install dependencies:

```powershell
npm install
```

Run local parser tests:

```powershell
npm test
```

Log in to Google for clasp:

```powershell
npm run login
```

Enable the Apps Script API for clasp:

1. Open <https://script.google.com/home/usersettings>
2. Turn on **Google Apps Script API**.
3. Wait a minute if Google says the setting is still propagating.

This workspace is already bound to the Google project above. For this tracker, use:

```powershell
npm run push
npm run open
```

Only for a brand-new tracker in a different folder, create a new Google Sheet-bound Apps Script project:

```powershell
npm run create
```

Then push/open it:

```powershell
npm run push
npm run open
```

Run setup from the Apps Script editor rather than `clasp run`; first-run Gmail/Sheets authorization must happen in the owner account's browser session.

## First run in Apps Script

In the Apps Script editor:

1. Run `setupOrderTracker` and approve the requested permissions.
2. Run `installTriggers` to create the hourly Gmail scan and 8 AM Eastern daily summary.
3. Run `backfillOrders` once to import the last 60 days.
4. Run `healthCheck` to confirm the tabs and triggers are in place.
5. Open TrackerPal from the desktop shortcut or `Order Tracker > Open TrackerPal`.

The custom `Order Tracker` menu also appears when the spreadsheet opens.
It includes quick jumps to `Dashboard` and `Orders`, manual sync/backfill commands, summary sending, trigger install/removal, and `healthCheck`.
It also includes:

- `Add manual order`: quick prompt-based entry.
- `Import manual entry`: reads the `Manual Entry` tab and adds/updates the order.

## Morning deployment checklist

If `npm run create` failed with `User has not enabled the Apps Script API`, do this first:

1. Visit <https://script.google.com/home/usersettings>
2. Turn on **Google Apps Script API**
3. Run:

```powershell
npm run create
npm run push
npm run open
```

Then run these functions from the Apps Script editor:

```text
setupOrderTracker
installTriggers
backfillOrders
healthCheck
```

Google will ask for Gmail, Sheets, trigger, and email-send permissions the first time.
Because this is your private script and not a published Google Marketplace app, Google may show an unverified-app warning; use the advanced option to continue to your own project.

The desktop app itself should not ask for Gmail, Sheets, or any other Google permission. If it asks for permission or shows "This app is blocked", the shortcut is pointing at an older deployment.

## Settings

The `Settings` tab is created automatically. You can adjust:

- `scan_days`: how far back the hourly sync scans.
- `backfill_days`: how far back `backfillOrders` scans.
- `timezone`: defaults to `America/New_York`.
- `summary_enabled`: `TRUE` or `FALSE`.
- `summary_recipient`: email address for the daily summary.
- `summary_hour`: hour of day for the daily summary trigger.
- `max_threads_per_query`: Gmail thread cap per search query.

If `summary_recipient` is blank, `installTriggers` still installs hourly sync but skips the daily summary trigger. Fill in the recipient and run `installTriggers` again.

Use `removeTriggers` from Apps Script or the `Order Tracker` menu if you ever want to pause automatic scanning without deleting the tracker.

## Manual orders

For a quick one-off, use `Order Tracker > Add manual order`.

From Gmail, you can manually force an email into TrackerPal by applying the label `TrackerPal` to that email. The hourly sync checks that label for the last 365 days and imports those messages even when they do not match the normal shipping/order keywords.

To use it:

1. Open the email in Gmail.
2. Click the label icon.
3. Choose or create the label `TrackerPal`.
4. Wait for the hourly sync, or run `syncOrders` from Apps Script if you want it immediately.

This is the reliable v1 substitute for a Gmail toolbar button. A true Gmail button would require a Gmail Add-on or Chrome extension, which brings back Google's authorization/review issues.

For a calmer spreadsheet-style entry:

1. Open the `Manual Entry` tab.
2. Fill in any useful fields: store, item, order number, carrier, tracking number, ETA, tracking URL, and notes.
3. Use `Order Tracker > Import manual entry`.

Manual entries dedupe the same way email imports do: tracking number first, then store + order number, then a generated manual ID.

Apps Script daily triggers run within Google's scheduled window around the selected hour, so the 8 AM summary may arrive shortly after 8.

## Privacy

No external backend is used. Data stays in your Gmail, your Google Sheet, and your Apps Script project.

## Manual fallback

If clasp cannot be used, create a Google Sheet, open `Extensions > Apps Script`, and copy each file from `src/` into the Apps Script project. Then run `setupOrderTracker`, `installTriggers`, and `backfillOrders`.
