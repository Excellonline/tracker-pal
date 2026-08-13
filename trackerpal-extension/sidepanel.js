const frame = document.getElementById("trackerFrame");
const loading = document.getElementById("loading");
const notice = document.getElementById("notice");
const noticeTitle = document.getElementById("noticeTitle");
const noticeMessage = document.getElementById("noticeMessage");
const packagesView = document.getElementById("packagesView");
const syncedView = document.getElementById("syncedView");
let trackerUrl = "";
let loadTimer = 0;

function validTrackerUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.includes("/macros/s/");
  } catch (_error) {
    return false;
  }
}

function setView(view) {
  const synced = view === "synced";
  packagesView.hidden = synced;
  syncedView.hidden = !synced;
  document.getElementById("packagesTab").classList.toggle("active", !synced);
  document.getElementById("packagesTab").setAttribute("aria-pressed", String(!synced));
  document.getElementById("syncedTab").classList.toggle("active", synced);
  document.getElementById("syncedTab").setAttribute("aria-pressed", String(synced));
  if (synced) loadTracker();
}

function showNotice(title, message) {
  clearTimeout(loadTimer);
  loading.hidden = true;
  frame.hidden = true;
  noticeTitle.textContent = title;
  noticeMessage.textContent = message;
  notice.hidden = false;
}

function loadTracker() {
  notice.hidden = true;
  frame.hidden = true;
  loading.hidden = false;
  if (!validTrackerUrl(trackerUrl)) {
    showNotice("Connect Gmail + Sheets", "Add your private TrackerPal Apps Script URL in settings. Local package tracking works without this connection.");
    return;
  }
  frame.src = trackerUrl;
  loadTimer = setTimeout(() => {
    showNotice("Sign-in may be required", "Open TrackerPal in a full browser tab to finish Google sign-in, then refresh this panel.");
  }, 12000);
}

async function openTracker() {
  if (validTrackerUrl(trackerUrl)) await chrome.tabs.create({ url: trackerUrl });
  else chrome.runtime.openOptionsPage();
}

frame.addEventListener("load", () => {
  clearTimeout(loadTimer);
  loading.hidden = true;
  notice.hidden = true;
  frame.hidden = false;
});

document.getElementById("packagesTab").addEventListener("click", () => setView("packages"));
document.getElementById("syncedTab").addEventListener("click", () => setView("synced"));
document.getElementById("reloadButton").addEventListener("click", loadTracker);
document.getElementById("openButton").addEventListener("click", openTracker);
document.getElementById("noticeOpenButton").addEventListener("click", openTracker);
document.getElementById("settingsButton").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("syncSettingsButton").addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.sync.get({ trackerUrl: globalThis.TRACKERPAL_DEFAULT_URL || "" }, (settings) => {
  trackerUrl = settings.trackerUrl;
});
