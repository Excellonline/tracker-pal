const input = document.getElementById("trackerUrl");
const status = document.getElementById("status");

function validTrackerUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.includes("/macros/s/");
  } catch (_error) {
    return false;
  }
}

chrome.storage.sync.get({ trackerUrl: globalThis.TRACKERPAL_DEFAULT_URL || "" }, (settings) => {
  input.value = settings.trackerUrl;
});

document.getElementById("saveButton").addEventListener("click", () => {
  const trackerUrl = input.value.trim();
  if (!validTrackerUrl(trackerUrl)) {
    status.textContent = "Enter a valid Apps Script web app URL.";
    input.focus();
    return;
  }
  chrome.storage.sync.set({ trackerUrl }, () => {
    status.textContent = "Connection saved.";
  });
});

document.getElementById("clearButton").addEventListener("click", () => {
  chrome.storage.sync.set({ trackerUrl: "" }, () => {
    input.value = "";
    status.textContent = "Gmail and Sheets connection removed. Local tracking is still available.";
  });
});
