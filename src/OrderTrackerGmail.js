var OrderTrackerGmail = (function () {
  function findCandidateMessages(days, maxThreadsPerQuery) {
    var threadsById = {};
    var manualThreadIds = {};
    var messages = [];

    ORDER_TRACKER_CONFIG.searchQueries.forEach(function (term) {
      var query = "newer_than:" + Number(days || ORDER_TRACKER_CONFIG.defaults.scanDays) + "d " + term;
      addSearchResults_(query, threadsById, null, maxThreadsPerQuery);
    });

    var manualQuery = "newer_than:" + Number(ORDER_TRACKER_CONFIG.defaults.manualImportDays || 365) + "d label:" + ORDER_TRACKER_CONFIG.manualImportLabel;
    addSearchResults_(manualQuery, threadsById, manualThreadIds, maxThreadsPerQuery);

    Object.keys(threadsById).forEach(function (threadId) {
      var thread = threadsById[threadId];
      thread.getMessages().forEach(function (message) {
        var plainBody = message.getPlainBody();
        messages.push({
          from: message.getFrom(),
          subject: message.getSubject(),
          body: plainBody || htmlToText_(message.getBody()),
          date: message.getDate(),
          threadId: thread.getId(),
          messageId: message.getId(),
          manualImport: Boolean(manualThreadIds[threadId])
        });
      });
    });

    messages.sort(function (a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return messages;
  }

  function ensureManualImportLabel() {
    var labelName = ORDER_TRACKER_CONFIG.manualImportLabel;
    return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  }

  function addSearchResults_(query, threadsById, manualThreadIds, maxThreadsPerQuery) {
    var threads = [];

    try {
      threads = GmailApp.search(query, 0, Number(maxThreadsPerQuery || ORDER_TRACKER_CONFIG.defaults.maxThreadsPerQuery));
    } catch (error) {
      console.warn("Gmail search skipped: " + query + " - " + (error && error.message ? error.message : error));
    }

    threads.forEach(function (thread) {
      var id = thread.getId();
      threadsById[id] = thread;
      if (manualThreadIds) {
        manualThreadIds[id] = true;
      }
    });
  }

  function htmlToText_(html) {
    return String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  return {
    findCandidateMessages: findCandidateMessages,
    ensureManualImportLabel: ensureManualImportLabel
  };
})();
