# Deployment Guide

This guide covers a private Google Apps Script deployment for TrackerPal.

## Prerequisites

- Node.js 20 or newer
- npm
- A Google account that owns the Gmail inbox and target Google Sheet
- Google Apps Script API enabled at <https://script.google.com/home/usersettings>
- `@google/clasp`, installed through this project's dev dependencies

Install dependencies:

```powershell
npm install
```

Authenticate with clasp:

```powershell
npm run login
```

## Create a New Tracker

Create a new Sheet-bound Apps Script project:

```powershell
npm run create
```

Push the local source:

```powershell
npm run push
```

Open the Apps Script editor:

```powershell
npm run open
```

Run these functions from the editor:

1. `setupOrderTracker`
2. `installTriggers`
3. `backfillOrders`
4. `healthCheck`

First-run authorization must happen in the owner account's browser session.

## Connect an Existing Tracker

If you already have an Apps Script project, copy `.clasp.example.json` to `.clasp.json` and fill in the local project values.

```json
{
  "scriptId": "your-script-id",
  "rootDir": "src",
  "parentId": "your-sheet-or-drive-parent-id"
}
```

Then push and open:

```powershell
npm run push
npm run open
```

`.clasp.json` is ignored by git because it contains deployment-specific IDs.

## Daily Operation

After setup, TrackerPal runs from Apps Script triggers:

- Hourly Gmail sync imports new order and shipping updates.
- Daily summary sends open package status when `summary_enabled` and `summary_recipient` are set.
- The custom `Order Tracker` menu appears in the Sheet for manual sync, backfill, trigger management, health checks, and manual entries.

Apps Script daily triggers run inside Google's scheduled window, so an 8 AM summary can arrive shortly after 8 AM.

## Desktop and Bound UI Variants

The `trackerpal-bound-ui/`, `trackerpal-desktop/`, and `trackerpal-sheet-ui/` folders are optional deployment variants. Keep each deployment's local clasp config private and push from the relevant folder when updating that Apps Script project.

Example for a variant folder:

```powershell
node ..\node_modules\@google\clasp\build\src\index.js -P . push --force
```

## Safe Publishing Checklist

Before publishing repository changes:

1. Run `npm test`.
2. Confirm `git status -sb` does not show `.clasp.json`, `.clasprc.json`, credentials, logs, or local shortcut files.
3. Avoid committing full web app URLs that include secret query parameters.
4. Keep screenshots free of email addresses, package details, tracking numbers, and Google project IDs.
