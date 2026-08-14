(() => {
  const CONSENT_VERSION = 2;
  const statuses = ["Ordered", "Shipped", "Out for delivery", "Delivered", "Exception"];
  const packageForm = document.getElementById("packageForm");
  const packageList = document.getElementById("packageList");
  const stats = document.getElementById("stats");
  const deliverySummary = document.getElementById("deliverySummary");
  const addPackagePanel = document.getElementById("addPackagePanel");
  const addPackageToggle = document.getElementById("addPackageToggle");
  const cancelAddButton = document.getElementById("cancelAddButton");
  const itemInput = document.getElementById("item");
  const trackingInput = document.getElementById("trackingNumber");
  const trackingFieldLabel = document.getElementById("trackingFieldLabel");
  const carrierSelect = document.getElementById("carrier");
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

  function statusClass(status) {
    return `status-${String(status || "ordered").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  }

  function statusLabel(status) {
    return status === "Out for delivery" ? "Out today" : status;
  }

  function entryDateValue(value) {
    const exactDate = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exactDate) return `${exactDate[1]}-${exactDate[2]}-${exactDate[3]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }

  function entryDateLabel(value) {
    const dateValue = entryDateValue(value);
    if (!dateValue) return "Date unknown";
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
  }

  function sortPackagesByEntryDate() {
    packages.sort((left, right) => {
      const rightTime = new Date(right.createdAt || 0).getTime() || 0;
      const leftTime = new Date(left.createdAt || 0).getTime() || 0;
      return rightTime - leftTime;
    });
  }

  function updateEntryDate(entry, dateValue) {
    const [year, month, day] = String(dateValue).split("-").map(Number);
    if (!year || !month || !day) return false;
    const existing = new Date(entry.createdAt);
    const updated = Number.isNaN(existing.getTime()) ? new Date() : existing;
    updated.setFullYear(year, month - 1, day);
    entry.createdAt = updated.toISOString();
    return true;
  }

  function syncTrackingField() {
    const pickup = carrierSelect.value === "Pickup";
    trackingFieldLabel.textContent = pickup ? "Address (optional)" : "Tracking number";
    trackingInput.required = !pickup;
    trackingInput.maxLength = pickup ? 160 : 40;
    trackingInput.placeholder = pickup ? "123 Main St (optional)" : "1Z999AA10123456784";
    trackingInput.autocomplete = pickup ? "street-address" : "off";
  }

  function renderPackages() {
    sortPackagesByEntryDate();
    const open = packages.filter((entry) => !entry.received).length;
    const arriving = packages.filter((entry) => !entry.received && entry.status === "Out for delivery").length;
    const received = packages.filter((entry) => entry.received).length;
    stats.innerHTML = [
      [open, "Open"], [arriving, "Arriving"], [received, "Received"]
    ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const visible = packages.filter((entry) => activeFilter === "all" || !entry.received);
    if (deliverySummary) {
      const label = activeFilter === "all" ? "saved" : "open";
      deliverySummary.textContent = `${visible.length} ${label} ${visible.length === 1 ? "package" : "packages"}`;
    }
    if (!visible.length) {
      packageList.innerHTML = `<div class="empty">
        <span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4.5 8 7.5-4 7.5 4v8L12 20l-7.5-4V8Z"/><path d="m4.5 8 7.5 4 7.5-4M12 12v8"/></svg></span>
        <strong>${packages.length ? "All caught up" : "No packages yet"}</strong>
        <span>${packages.length ? "Switch to All to see received packages." : "Use Add a package to save your first tracking number."}</span>
      </div>`;
      return;
    }

    packageList.innerHTML = visible.map((entry) => {
      const url = TrackerPalTracking.trackingUrl(entry.carrier, entry.trackingNumber);
      const item = escapeHtml(entry.item);
      const dateValue = entryDateValue(entry.createdAt);
      const dateLabel = escapeHtml(entryDateLabel(entry.createdAt));
      return `<article class="package-row ${statusClass(entry.status)} ${entry.received ? "is-received" : ""}" data-id="${escapeHtml(entry.id)}" role="listitem">
        <span class="status-marker" aria-hidden="true"></span>
        <div class="package-content">
          <div class="package-mainline">
            <div class="package-title"><strong title="${item}">${item}</strong></div>
            <div class="package-toolbar">
              <div class="status-control">
                <select data-action="status" aria-label="Change status for ${item}" title="Change status">
                  ${statuses.map((status) => `<option value="${status}" ${status === entry.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
                </select>
                <svg class="status-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg>
              </div>
              <button class="compact-action received-button ${entry.received ? "done" : ""}" type="button" data-action="received" aria-label="${entry.received ? "Reopen" : "Mark"} ${item}${entry.received ? "" : " received"}" aria-pressed="${entry.received}" title="${entry.received ? "Reopen package" : "Mark received"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>
              <button class="compact-action delete-button" type="button" data-action="delete" aria-label="Delete ${item}" title="Delete package"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>
              ${url ? `<button class="carrier-pill carrier-track" type="button" data-action="track" data-url="${escapeHtml(url)}" aria-label="Track ${item} with ${escapeHtml(entry.carrier)}" title="Track with ${escapeHtml(entry.carrier)}"><span>${escapeHtml(entry.carrier)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8m-6 0h6v6"/></svg></button>` : `<span class="carrier-pill">${escapeHtml(entry.carrier)}</span>`}
            </div>
          </div>
          <div class="package-meta">
            <span class="tracking-number" title="${escapeHtml(entry.trackingNumber)}">${escapeHtml(entry.trackingNumber || (entry.carrier === "Pickup" ? "Pickup location not added" : "No tracking number"))}</span>
            <label class="entry-date" title="Edit entry date">
              <span class="sr-only">Edit entry date for ${item}</span>
              <input type="date" data-action="date" value="${dateValue}" aria-label="Edit entry date for ${item}" title="Edit entry date">
              <span class="entry-date-display" aria-hidden="true"><time datetime="${dateValue}">${dateLabel}</time><svg viewBox="0 0 24 24"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg></span>
            </label>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function bindPackageControls() {
    if (initialized) return;
    initialized = true;
    syncTrackingField();
    carrierSelect.addEventListener("change", syncTrackingField);

    packageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const selectedCarrier = String(data.get("carrier"));
      const rawTrackingValue = String(data.get("trackingNumber") || "").trim();
      const trackingNumber = selectedCarrier === "Pickup" ? rawTrackingValue : TrackerPalTracking.normalize(rawTrackingValue);
      packages.unshift({
        id: crypto.randomUUID(),
        item: String(data.get("item")).trim(),
        trackingNumber,
        carrier: selectedCarrier === "Auto" ? TrackerPalTracking.detectCarrier(trackingNumber) : selectedCarrier,
        status: selectedCarrier === "Pickup" ? "Ordered" : "Shipped",
        received: false,
        createdAt: new Date().toISOString()
      });
      savePackages(`${packages[0].item} added.`);
      event.currentTarget.reset();
      syncTrackingField();
      addPackagePanel.open = false;
      renderPackages();
      addPackageToggle.focus();
    });

    addPackagePanel.addEventListener("toggle", () => {
      if (addPackagePanel.open) requestAnimationFrame(() => itemInput.focus());
    });

    cancelAddButton.addEventListener("click", () => {
      packageForm.reset();
      syncTrackingField();
      addPackagePanel.open = false;
      addPackageToggle.focus();
    });

    packageList.addEventListener("click", (event) => {
      const control = event.target.closest("[data-action]");
      if (!control || !packageList.contains(control)) return;
      const action = control.dataset.action;
      const card = control.closest("[data-id]");
      if (!action || !card) return;
      const index = packages.findIndex((entry) => entry.id === card.dataset.id);
      if (index < 0) return;
      if (action === "track") chrome.tabs.create({ url: control.dataset.url });
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
      const action = event.target.dataset.action;
      if (action !== "status" && action !== "date") return;
      const card = event.target.closest("[data-id]");
      const entry = packages.find((candidate) => candidate.id === card.dataset.id);
      if (!entry) return;
      const entryId = card.dataset.id;
      let message = "";
      if (action === "status") {
        entry.status = event.target.value;
        message = `${entry.item} status changed to ${entry.status}.`;
      }
      if (action === "date") {
        if (!updateEntryDate(entry, event.target.value)) return;
        sortPackagesByEntryDate();
        message = `${entry.item} entry date changed.`;
      }
      savePackages(message);
      renderPackages();
      const restoredCard = Array.from(packageList.querySelectorAll("[data-id]")).find((row) => row.dataset.id === entryId);
      if (restoredCard) restoredCard.querySelector(`[data-action="${action}"]`)?.focus();
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
