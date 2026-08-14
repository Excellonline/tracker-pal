# Chrome Web Store Submission

This listing and the Store ZIP describe the public, local-only Chrome extension. The separately built personal Desktop extension can connect to the owner's private Gmail and Google Sheets app, but that integration and its configuration files are deliberately excluded from the Store package.

## Listing

**Name:** TrackerPal

**Category:** Productivity

**Language:** English

**Summary:** Save delivery and pickup details locally and open official carrier tracking pages from Chrome's side panel.

**Detailed description:**

TrackerPal puts a focused package dashboard in Chrome's side panel, so delivery details stay close without taking over the browser.

- Add a package name and tracking number in seconds.
- Add a pickup with an optional address instead of a tracking number.
- Automatically recognize common UPS, USPS, FedEx, and DHL tracking formats.
- Open the correct carrier tracking page with one click.
- Update delivery status and mark packages received.
- Keep deliveries sorted by their automatic entry date, with an option to correct that date later.
- Keep package information locally in the Chrome profile.
- Delete individual entries whenever they are no longer needed.

Before TrackerPal reads or stores a package list, it explains which fields stay in Chrome and asks the user to continue. Clicking a package's carrier pill opens the official carrier website and includes the selected tracking number in that carrier URL. TrackerPal contains no advertising, analytics, affiliate links, remote code, or developer-operated data service.

## Single purpose

TrackerPal's single purpose is to let users record, review, and act on package delivery information from Chrome.

## Permission justifications

**sidePanel:** Displays the TrackerPal delivery dashboard in Chrome's side panel when the user clicks the extension icon.

**storage:** Stores the user's package entries and consent choice locally in the user's Chrome profile. Stored entry fields are package name, tracking number or optional pickup address, carrier, delivery status, received state, and entry date.

The extension does not request host permissions or permission to read tabs, websites, browsing history, email, cookies, or location.

## Data disclosures

- Handles user-provided package names and tracking numbers: **Yes — locally in the Chrome profile**
- Handles personally identifiable information: **Yes — only an optional pickup address typed by the user, stored locally in the Chrome profile**
- Handles location information: **Yes — only that optional typed pickup address; TrackerPal does not read device or browser location**
- Sends a selected tracking number to a carrier: **Yes — only when the user clicks the package's carrier pill, by opening that carrier's URL**
- Sends pickup addresses anywhere: **No**
- Sends package data to the TrackerPal developer: **No**
- Handles authentication information: **No**
- Handles website content or browsing activity: **No**
- Handles financial, health, or personal communications: **No**
- Sells or transfers user data: **No**
- Uses data for advertising, analytics, or credit decisions: **No**

Privacy policy: `https://github.com/Excellonline/tracker-pal/blob/main/docs/PRIVACY.md`

## Reviewer test instructions

1. Install the extension and click the TrackerPal toolbar icon.
2. Read the first-run disclosure. Confirm it states which package fields are stored locally and that clicking a carrier button sends the selected tracking number to the carrier site. Open the bundled privacy details if desired, then click **I understand — continue**.
3. Click **Add a package**, then enter `Sample delivery` and tracking number `1Z999AA10123456784`.
4. Leave the carrier set to **Auto detect** and click the form's **Add package** button.
5. Confirm that UPS is detected and the entry remains after closing and reopening the side panel.
6. Add another entry with carrier **Pickup**; confirm the field changes to **Address (optional)** and that the entry can be saved with that field empty.
7. Click an entry-date pill, change the date, and confirm the list stays ordered newest first.
8. Click the red status pill and change its value, then click the checkmark button and confirm the package leaves the **Open** view.
9. Use the **All** filter to confirm the received package remains available.
10. Click the **UPS** carrier pill and confirm Chrome opens UPS with the sample tracking number in the URL.
11. Delete both sample entries.
12. Open **Privacy**, use **Delete all TrackerPal data**, and confirm the first-run disclosure returns when the side panel is opened again.

No test account, credentials, external setup, Gmail access, or Google Sheets access is required.

Support page: `https://github.com/Excellonline/tracker-pal/blob/main/docs/SUPPORT.md`

## Store package verification

Run `npm run build:store`. The resulting ZIP contains only the native side-panel package tracker, bundled privacy page, icons, and required local scripts. The build rejects iframe markup, Google Apps Script domains, remote frame sources, options/configuration files, and the private TrackerPal deployment ID.

## Upload assets

- Package: `dist/trackerpal-chrome-store-v0.4.1.zip`
- Store icon: `store-assets/icon-128x128.png`
- Screenshot: `store-assets/screenshot-01-side-panel-1280x800.png`
- Small promotional tile: `store-assets/promo-small-440x280.png`
