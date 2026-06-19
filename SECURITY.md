# Security Policy

## Supported Version

Security fixes target the `main` branch.

## Reporting a Vulnerability

If GitHub private vulnerability reporting is enabled for this repository, use that channel. Otherwise, contact the repository owner directly before opening a public issue.

Please do not post package data, email content, tracking numbers, Google project IDs, Apps Script deployment URLs, `.clasp.json`, `.clasprc.json`, OAuth tokens, or secret query parameters in public issues.

## Sensitive Data

TrackerPal is designed to run inside the owner's Google account. It does not require an external backend, but the following local and deployment artifacts should still be treated as sensitive:

- `.clasp.json`
- `.clasprc.json`
- Apps Script deployment URLs with secret query parameters
- Google Sheet IDs and Apps Script project IDs when tied to a personal deployment
- Screenshots containing order, package, email, or tracking data

If sensitive deployment details were committed or published, rotate or redeploy the affected Google Apps Script project and update local clasp configuration.
