document.getElementById("deleteAllData").addEventListener("click", () => {
  if (!window.confirm("Delete every package and all TrackerPal settings from this Chrome profile?")) return;
  chrome.storage.local.clear(() => {
    document.getElementById("deleteStatus").textContent = "All TrackerPal data was deleted.";
  });
});
