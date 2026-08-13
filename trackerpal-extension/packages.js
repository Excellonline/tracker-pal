(() => {
  const CONSENT_VERSION = 1;
  const statuses = ["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"];
  const packageForm = document.getElementById("packageForm");
  const packageList = document.getElementById("packageList");
  const stats = document.getElementById("stats");
  const liveStatus = document.getElementById("liveStatus");
  const consentDialog = document.getElementById("privacyConsent");
  const acceptPrivacy = document.getElementById("acceptPrivacy");
  let packages = [];
  let activeFilter = "open";
  let initialized = false;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
  }

  function savePackages(message) {
    chrome.storage.local.set({ packages }, () => {
      if (!message || !liveStatus) return;
      liveStatus.textContent = "";
      requestAnimationFrame(() => { liveStatus.textContent = message; });
    });
  }

  function renderPackages() {
    const open = packages.filter((entry) => !entry.received).length;
    const arriving = packages.filter((entry) => !entry.received && entry.status === "Out for delivery").length;
    const received = packages.filter((entry) => entry.received).length;
    stats.innerHTML = [
      [open, "Open"], [arriving, "Arriving"], [received, "Received"]
    ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const visible = packages.filter((entry) => activeFilter === "all" || !entry.received);
    if (!visible.length) {
      packageList.innerHTML = `<div class="empty"><strong>${packages.length ? "All caught up" : "No packages yet"}</strong><span>${packages.length ? "Switch to All to see received packages." : "Add a tracking number above to get started."}</span></div>`;
      return;
    }

    packageList.innerHTML = visible.map((entry) => {
      const url = TrackerPalTracking.trackingUrl(entry.carrier, entry.trackingNumber);
      return `<article class="package-card" data-id="${escapeHtml(entry.id)}">
        <div class="package-top">
          <div class="package-title"><strong>${escapeHtml(entry.item)}</strong><span>${escapeHtml(entry.trackingNumber)}</span></div>
          <span class="carrier-pill">${escapeHtml(entry.carrier)}</span>
        </div>
        <div class="package-actions">
          <select data-action="status" aria-label="Status for ${escapeHtml(entry.item)}">
            ${statuses.map((status) => `<option ${status === entry.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
          ${url ? `<button type="button" data-action="track" data-url="${escapeHtml(url)}">Track</button>` : ""}
          <button class="received-button ${entry.received ? "done" : ""}" type="button" data-action="received">${entry.received ? "Received" : "Mark received"}</button>
          <button class="delete-button" type="button" data-action="delete" aria-label="Delete ${escapeHtml(entry.item)}">Delete</button>
        </div>
      </article>`;
    }).join("");
  }

  function bindPackageControls() {
    if (initialized) return;
    initialized = true;

    packageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const trackingNumber = TrackerPalTracking.normalize(data.get("trackingNumber"));
      const selectedCarrier = String(data.get("carrier"));
      packages.unshift({
        id: crypto.randomUUID(),
        item: String(data.get("item")).trim(),
        trackingNumber,
        carrier: selectedCarrier === "Auto" ? TrackerPalTracking.detectCarrier(trackingNumber) : selectedCarrier,
        status: "Shipped",
        received: false,
        createdAt: new Date().toISOString()
      });
      savePackages(`${packages[0].item} added.`);
      event.currentTarget.reset();
      renderPackages();
      document.getElementById("item").focus();
    });

    packageList.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      const card = event.target.closest("[data-id]");
      if (!action || !card) return;
      const index = packages.findIndex((entry) => entry.id === card.dataset.id);
      if (index < 0) return;
      if (action === "track") chrome.tabs.create({ url: event.target.dataset.url });
      let message = "";
      if (action === "received") {
        packages[index].received = !packages[index].received;
        message = packages[index].received ? `${packages[index].item} marked received.` : `${packages[index].item} reopened.`;
      }
      if (action === "delete") {
        const item = packages[index].item;
        if (!window.confirm(`Delete ${item}?`)) return;
        packages.splice(index, 1);
        message = `${item} deleted.`;
      }
      if (action === "received" || action === "delete") {
        savePackages(message);
        renderPackages();
      }
    });

    packageList.addEventListener("change", (event) => {
      if (event.target.dataset.action !== "status") return;
      const card = event.target.closest("[data-id]");
      const entry = packages.find((candidate) => candidate.id === card.dataset.id);
      if (!entry) return;
      entry.status = event.target.value;
      savePackages(`${entry.item} status changed to ${entry.status}.`);
      renderPackages();
    });

    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((candidate) => {
        const active = candidate.dataset.filter === activeFilter;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderPackages();
    }));
  }

  function loadPackageData() {
    bindPackageControls();
    chrome.storage.local.get({ packages: [] }, (settings) => {
      packages = Array.isArray(settings.packages) ? settings.packages : [];
      renderPackages();
    });
  }

  function continueAfterConsent() {
    chrome.storage.local.set({ privacyConsentVersion: CONSENT_VERSION }, () => {
      consentDialog.close();
      loadPackageData();
    });
  }

  acceptPrivacy.addEventListener("click", continueAfterConsent);
  chrome.storage.local.get({ privacyConsentVersion: 0 }, (settings) => {
    if (settings.privacyConsentVersion >= CONSENT_VERSION) loadPackageData();
    else consentDialog.showModal();
  });
})();
