# Contributing

Thanks for helping improve TrackerPal.

## Local Setup

```powershell
npm install
npm test
```

## Pull Request Checklist

- Keep changes focused and explain the user-facing impact.
- Add or update tests when parser, Gmail, Sheets, summary, or dedupe behavior changes.
- Run `npm test` before opening a pull request.
- Do not commit `.clasp.json`, `.clasprc.json`, deployment URLs, secret keys, email addresses, tracking numbers, or screenshots with private package data.
- Keep Google Apps Script deployment details in local notes rather than public docs.

## Coding Notes

- Prefer small Apps Script functions with explicit dependencies where practical.
- Preserve manual user fields, especially `Received` and manual notes, when importing automated updates.
- Treat parsing changes carefully: a broader matcher can create false positives in Gmail.
- Keep tests as plain Node.js scripts unless the project adopts a dedicated test runner.
