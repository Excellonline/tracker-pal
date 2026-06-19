var OrderEmailParser = (function () {
  var MONTHS = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  var WEEKDAYS = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  function parseEmail(email, timezone) {
    var subject = cleanText(email.subject);
    var body = cleanBody(email.body);
    var from = cleanText(email.from);
    var text = [subject, from, body].join("\n");
    var baseDate = email.date ? new Date(email.date) : new Date();

    if (isNonReceivableEmail(subject)) {
      return null;
    }

    var carrier = extractCarrier(text);
    var trackingNumber = extractTrackingNumber(text, carrier);
    if (!carrier && trackingNumber) {
      carrier = inferCarrierFromTracking(trackingNumber);
    }

    var result = {
      received: false,
      status: extractStatus(text),
      store: extractStore(from, subject, body),
      item: extractItem(subject, body),
      orderNumber: extractOrderNumber(text),
      carrier: carrier,
      trackingNumber: trackingNumber,
      estimatedArrival: extractEstimatedArrival(text, baseDate, timezone),
      trackingUrl: extractTrackingUrl(text, carrier, trackingNumber),
      lastUpdate: "",
      sourceDate: formatDateTime(baseDate, timezone),
      sourceSubject: subject,
      threadId: email.threadId || "",
      messageId: email.messageId || "",
      notes: ""
    };

    if (email.manualImport) {
      result.status = result.status || "Ordered";
      result.item = result.item || subject.slice(0, 160);
    }

    result.shouldImport = Boolean(email.manualImport) || shouldImport(result, text);
    result.notes = buildNotes(result, Boolean(email.manualImport));
    return result.shouldImport ? result : null;
  }

  function shouldImport(result, text) {
    var score = 0;
    if (result.trackingNumber) score += 3;
    if (result.carrier) score += 1;
    if (result.orderNumber) score += 1;
    if (result.estimatedArrival) score += 1;
    if (result.status === "Shipped" || result.status === "Out for delivery" || result.status === "Delivered" || result.status === "Exception") score += 1;
    if (/order confirmation|thanks for your order|your order|order placed|receipt/i.test(text) && result.store) score += 1;
    return score >= 2;
  }

  function extractStatus(text) {
    if (/out for delivery/i.test(text)) return "Out for delivery";
    if (/(?:has been|was|is)?\s*delivered|delivery completed|package arrived|arrived today/i.test(text)) return "Delivered";
    if (/delivery exception|shipment exception|delayed|delay|delivery attempted|action required|unable to deliver|returned to sender|address needed|incorrect address/i.test(text)) return "Exception";
    if (/shipped|shipment|on its way|has left|label created|ready to ship/i.test(text)) return "Shipped";
    if (/order confirmation|thanks for your order|we received your order|order placed|purchase confirmation/i.test(text)) return "Ordered";
    return "";
  }

  function extractStore(from, subject, body) {
    var fromName = from.replace(/<[^>]+>/g, "").replace(/["']/g, "").trim();
    var emailMatch = from.match(/@([A-Z0-9.-]+)/i);
    var domain = emailMatch ? emailMatch[1].toLowerCase() : "";
    var combined = [from, subject, body.slice(0, 500)].join("\n");

    if (/amazon/i.test(combined) || /amazon\./i.test(domain)) return "Amazon";
    if (/walmart/i.test(combined) || /walmart\./i.test(domain)) return "Walmart";
    if (/target/i.test(combined) || /target\./i.test(domain)) return "Target";
    if (/best buy|bestbuy/i.test(combined) || /bestbuy\./i.test(domain)) return "Best Buy";
    if (/ebay/i.test(combined) || /ebay\./i.test(domain)) return "eBay";
    if (/etsy/i.test(combined) || /etsy\./i.test(domain)) return "Etsy";
    if (/shopify/i.test(from) || /myshopify\.com/i.test(domain)) return firstMeaningfulLine(body) || "Shopify Store";

    if (fromName && !/@/.test(fromName)) {
      var cleanedFromName = titleCase(fromName.replace(/\b(no.?reply|do.?not.?reply|orders?|shipping|tracking|notifications?)\b/gi, "").trim());
      if (cleanedFromName) {
        return cleanedFromName;
      }
    }

    if (domain) {
      return titleCase(storeNameFromDomain(domain));
    }

    return "";
  }

  function extractItem(subject, body) {
    var patterns = [
      /your\s+(?:[\w.-]+\s+)?order\s+of\s+(.+?)\s+(?:has shipped|is on|will arrive|arrives|was delivered)/i,
      /(?:shipment|shipping update|delivery update)\s+(?:for|about)\s+(.+?)(?:\.|\n|$)/i,
      /order confirmation\s+(?:for|:\s*)\s*(.+?)(?:\.|\n|$)/i,
      /item(?:s)?\s*[:#]\s*(.+?)(?:\n|$)/i,
      /product\s*[:#]\s*(.+?)(?:\n|$)/i
    ];

    var text = subject + "\n" + body.slice(0, 1500);
    for (var i = 0; i < patterns.length; i += 1) {
      var match = text.match(patterns[i]);
      if (match && match[1]) {
        return cleanItem(match[1]);
      }
    }

    return "";
  }

  function extractOrderNumber(text) {
    var patterns = [
      /\border\s+confirmation\s*#\s*([A-Z0-9][A-Z0-9-]{3,35})/i,
      /\bconfirmation\s*#\s*([A-Z0-9][A-Z0-9-]{3,35})/i,
      /\border\s*(?:number|no\.?|#|id)\s*[:#]?\s*(?:is\s*)?([A-Z0-9][A-Z0-9-]{3,35})/i,
      /\border\s+([A-Z0-9][A-Z0-9-]{4,35})/i
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var match = text.match(patterns[i]);
      if (match && match[1] && !/confirmation|placed|shipped|status|details/i.test(match[1])) {
        return match[1].replace(/[.,;:)]$/, "").trim();
      }
    }

    return "";
  }

  function extractCarrier(text) {
    if (/\bUPS\b|ups\.com/i.test(text)) return "UPS";
    if (/\bFedEx\b|fedex\.com/i.test(text)) return "FedEx";
    if (/\bUSPS\b|postal service|usps\.com/i.test(text)) return "USPS";
    if (/\bDHL\b|dhl\.com/i.test(text)) return "DHL";
    if (/Amazon Logistics|TBA[0-9A-Z]{8,}/i.test(text)) return "Amazon Logistics";
    if (/\bOnTrac\b|ontrac\.com|lasership/i.test(text)) return "OnTrac";
    if (/\bVeho\b|shipveho\.com/i.test(text)) return "Veho";
    if (/Pitney Bowes|pitneybowes\.com/i.test(text)) return "Pitney Bowes";
    if (/\bGLS\b|gls-us\.com/i.test(text)) return "GLS";
    return "";
  }

  function extractTrackingNumber(text, carrier) {
    var carrierPatterns = [
      /\b(1Z[0-9A-Z]{16})\b/i,
      /\b(TBA[0-9A-Z]{8,})\b/i,
      /\b([A-Z]{2}\d{9}US)\b/i,
      /\b(9[2345]\d{20,24})\b/,
      /\b(420\d{5,9}9[2345]\d{18,24})\b/
    ];

    for (var i = 0; i < carrierPatterns.length; i += 1) {
      var carrierMatch = text.match(carrierPatterns[i]);
      if (carrierMatch && carrierMatch[1]) {
        return OrderTrackerDedupe.normalizeTracking(carrierMatch[1]);
      }
    }

    var phrasePatterns = [
      /tracking\s*(?:number|no\.?|#|id)?\s*[:#]?\s*(?:is\s*)?([A-Z0-9][A-Z0-9 -]{7,40})/i,
      /track(?:ing)?\s*(?:your\s*)?(?:package|shipment)?\s*(?:with|using)?\s*[:#]?\s*([A-Z0-9][A-Z0-9 -]{7,40})/i
    ];

    for (var j = 0; j < phrasePatterns.length; j += 1) {
      var match = text.match(phrasePatterns[j]);
      if (match && match[1]) {
        var candidate = sanitizeTrackingCandidate(match[1]);
        if (candidate) {
          return candidate;
        }
      }
    }

    if (/fedex/i.test(carrier || text)) {
      var fedex = text.match(/\b(\d{12,15})\b/);
      if (fedex) return fedex[1];
    }

    if (/dhl/i.test(carrier || text)) {
      var dhl = text.match(/\b(\d{10,11})\b/);
      if (dhl) return dhl[1];
    }

    return "";
  }

  function sanitizeTrackingCandidate(value) {
    var candidate = value
      .split(/\n|\.|,|;|\||\s{3,}/)[0]
      .replace(/\b(carrier|status|delivery|estimated|arrives?|shipped|with|using|number|no)\b.*$/i, "")
      .trim();

    candidate = OrderTrackerDedupe.normalizeTracking(candidate);

    if (candidate.length < 8 || candidate.length > 35) {
      return "";
    }

    if (/^(PACKAGE|SHIPMENT|TRACKING|NUMBER|DELIVERY)$/i.test(candidate)) {
      return "";
    }

    return candidate;
  }

  function inferCarrierFromTracking(trackingNumber) {
    if (/^1Z/i.test(trackingNumber)) return "UPS";
    if (/^TBA/i.test(trackingNumber)) return "Amazon Logistics";
    if (/^[A-Z]{2}\d{9}US$/i.test(trackingNumber)) return "USPS";
    if (/^9[2345]\d{20,24}$/.test(trackingNumber)) return "USPS";
    return "";
  }

  function extractEstimatedArrival(text, baseDate, timezone) {
    var patterns = [
      /estimated\s+(?:delivery|arrival)(?:\s+date)?\s*[:\-]?\s*(.+?)(?:\.|\n|$)/i,
      /scheduled\s+delivery\s*[:\-]?\s*(.+?)(?:\.|\n|$)/i,
      /expected\s+(?:delivery|arrival)\s*[:\-]?\s*(.+?)(?:\.|\n|$)/i,
      /(?:arrives|arriving|arrival)\s+(?:by|on|before)?\s*(.+?)(?:\.|\n|$)/i,
      /will\s+be\s+delivered\s+(?:by|on)?\s*(.+?)(?:\.|\n|$)/i,
      /delivery\s+date\s*[:\-]?\s*(.+?)(?:\.|\n|$)/i
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var match = text.match(patterns[i]);
      if (match && match[1]) {
        var parsed = parseDateCandidate(match[1], baseDate, timezone);
        if (parsed) {
          return parsed;
        }
      }
    }

    return "";
  }

  function parseDateCandidate(value, baseDate, timezone) {
    var candidate = cleanText(value)
      .replace(/\bat\b.+$/i, "")
      .replace(/\bby\b\s+\d{1,2}(:\d{2})?\s*(am|pm)\b.*$/i, "")
      .replace(/\b(end of day|eod)\b.*$/i, "")
      .trim();

    if (!candidate) return "";

    var lower = candidate.toLowerCase();
    if (/\btoday\b/.test(lower)) {
      return formatDateOnly(baseDate, timezone);
    }

    if (/\btomorrow\b/.test(lower)) {
      return formatDateOnly(addDays(baseDate, 1), timezone);
    }

    var weekday = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (weekday && !hasMonthName(lower) && !/\d{1,2}\/\d{1,2}/.test(lower)) {
      return formatDateOnly(nextWeekday(baseDate, WEEKDAYS[weekday[1]]), timezone);
    }

    var rangeParts = candidate.split(/\s+(?:-|to|through|and)\s+/i);
    if (rangeParts.length > 1) {
      candidate = rangeParts[rangeParts.length - 1];
    }

    var monthDate = candidate.match(/\b(?:sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)?,?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/i);
    if (monthDate) {
      return buildDate(Number(monthDate[3] || baseDate.getFullYear()), MONTHS[monthDate[1].toLowerCase().replace(".", "")], Number(monthDate[2]), baseDate, timezone);
    }

    var numericDate = candidate.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (numericDate) {
      var year = numericDate[3] ? Number(normalizeYear(numericDate[3])) : baseDate.getFullYear();
      return buildDate(year, Number(numericDate[1]) - 1, Number(numericDate[2]), baseDate, timezone);
    }

    return "";
  }

  function buildDate(year, month, day, baseDate, timezone) {
    var date = new Date(year, month, day);
    if (!isFinite(date.getTime())) {
      return "";
    }

    if (!year || date.getFullYear() < 2000) {
      date.setFullYear(baseDate.getFullYear());
    }

    if (date.getTime() < addDays(baseDate, -180).getTime()) {
      date.setFullYear(date.getFullYear() + 1);
    }

    return formatDateOnly(date, timezone);
  }

  function normalizeYear(value) {
    var year = Number(value);
    if (year < 100) {
      return 2000 + year;
    }
    return year;
  }

  function extractTrackingUrl(text, carrier, trackingNumber) {
    var urls = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
    for (var i = 0; i < urls.length; i += 1) {
      var url = urls[i];
      if (/track|tracking|shipment|package|ups\.com|fedex\.com|usps\.com|dhl\.com|ontrac\.com/i.test(url)) {
        return url.replace(/[.,;]+$/, "");
      }
    }

    if (carrier && trackingNumber && ORDER_TRACKER_CONFIG.carrierTrackingUrls[carrier]) {
      return ORDER_TRACKER_CONFIG.carrierTrackingUrls[carrier].replace("{trackingNumber}", encodeURIComponent(trackingNumber));
    }

    return "";
  }

  function formatDateOnly(date, timezone) {
    if (typeof Utilities !== "undefined" && Utilities.formatDate) {
      return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd");
    }

    var yyyy = date.getFullYear();
    var mm = String(date.getMonth() + 1).padStart(2, "0");
    var dd = String(date.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }

  function formatDateTime(date, timezone) {
    if (typeof Utilities !== "undefined" && Utilities.formatDate) {
      return Utilities.formatDate(date, timezone || ORDER_TRACKER_CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
    }

    return date.toISOString();
  }

  function addDays(date, days) {
    var copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function nextWeekday(baseDate, targetDay) {
    var copy = new Date(baseDate.getTime());
    var diff = (targetDay + 7 - copy.getDay()) % 7;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  function hasMonthName(value) {
    return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(value);
  }

  function cleanBody(value) {
    return cleanText(value).replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  }

  function cleanText(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  }

  function cleanItem(value) {
    return cleanText(value).replace(/^["']|["']$/g, "").slice(0, 160);
  }

  function firstMeaningfulLine(body) {
    var lines = String(body || "").split(/\n/);
    for (var i = 0; i < lines.length; i += 1) {
      var line = cleanText(lines[i]);
      if (line.length > 3 && !/^(hi|hello|thanks|thank you|view|track|order|shipping)$/i.test(line)) {
        return titleCase(line.slice(0, 80));
      }
    }

    return "";
  }

  function storeNameFromDomain(domain) {
    var parts = String(domain || "")
      .toLowerCase()
      .split(".")
      .filter(function (part) {
        return part && !/^(www|mail|email|e|em|m|click|links|link|orders?|shipping|tracking|notifications?|news|info|reply|noreply|no-reply|service|support|secure|shop|store|us)$/.test(part);
      });

    if (!parts.length) {
      parts = String(domain || "").toLowerCase().split(".");
    }

    return parts[0] || "";
  }

  function isNonReceivableEmail(subject) {
    return /\b(order|shipment|purchase)?\s*(canceled|cancelled|refunded|refund issued|refund processed)\b/i.test(subject) ||
      /\b(return received|return processed|return started|return label|your return)\b/i.test(subject) ||
      /\b(digital download|download ready|e[- ]?gift card|gift card delivered)\b/i.test(subject);
  }

  function titleCase(value) {
    return cleanText(value)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\w\S*/g, function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
  }

  function buildNotes(result, manualImport) {
    var notes = [];
    if (manualImport) notes.push("Manually imported from Gmail label");
    if (!result.estimatedArrival) notes.push("No ETA found in email");
    if (!result.trackingNumber) notes.push("No tracking number found");
    return notes.join("; ");
  }

  return {
    parseEmail: parseEmail,
    parseDateCandidate: parseDateCandidate,
    extractTrackingNumber: extractTrackingNumber,
    extractEstimatedArrival: extractEstimatedArrival,
    inferCarrierFromTracking: inferCarrierFromTracking
  };
})();
