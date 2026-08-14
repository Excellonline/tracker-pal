(() => {
  const CSV_HEADERS = ["Package name", "Tracking number / pickup address", "Carrier", "Status", "Entry date", "Completed date"];

  function isoDate(value) {
    const exact = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exact) return `${exact[1]}-${exact[2]}-${exact[3]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function completedEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .filter((entry) => entry && entry.received)
      .slice()
      .sort((left, right) => {
        const rightCompleted = new Date(right.receivedAt || 0).getTime() || 0;
        const leftCompleted = new Date(left.receivedAt || 0).getTime() || 0;
        if (rightCompleted !== leftCompleted) return rightCompleted - leftCompleted;
        return (new Date(right.createdAt || 0).getTime() || 0) - (new Date(left.createdAt || 0).getTime() || 0);
      });
  }

  function exportRows(entries) {
    return completedEntries(entries).map((entry) => [
      String(entry.item || ""),
      String(entry.trackingNumber || ""),
      String(entry.carrier || ""),
      String(entry.status || ""),
      isoDate(entry.createdAt),
      isoDate(entry.receivedAt)
    ]);
  }

  function protectSpreadsheetCell(value, preserveLongNumber = false) {
    const text = String(value || "");
    if (/^\s*[=+\-@\t\r]/.test(text) || (preserveLongNumber && /^\d{12,}$/.test(text))) return `'${text}`;
    return text;
  }

  function csvCell(value, preserveLongNumber = false) {
    const protectedValue = protectSpreadsheetCell(value, preserveLongNumber);
    return `"${protectedValue.replace(/"/g, '""')}"`;
  }

  function buildCsv(entries) {
    const rows = exportRows(entries);
    const lines = [CSV_HEADERS.map((value) => csvCell(value)).join(",")];
    for (const row of rows) {
      lines.push(row.map((value, index) => csvCell(value, index === 1)).join(","));
    }
    return `\uFEFF${lines.join("\r\n")}\r\n`;
  }

  function pdfSafeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "?")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function wrapText(value, width, fontSize = 8) {
    const maxCharacters = Math.max(4, Math.floor(width / (fontSize * 0.53)));
    const words = pdfSafeText(value).split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    for (const word of words) {
      let remainder = word;
      while (remainder.length > maxCharacters) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(remainder.slice(0, maxCharacters));
        remainder = remainder.slice(maxCharacters);
      }
      const next = line ? `${line} ${remainder}` : remainder;
      if (next.length > maxCharacters && line) {
        lines.push(line);
        line = remainder;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function textCommand(text, x, y, size = 8, font = "F1", color = "0.06 0.15 0.12") {
    return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfSafeText(text)}) Tj ET`;
  }

  function pageHeader(pageNumber) {
    const commands = [
      textCommand("TrackerPal completed shipment history", 42, 570, 18, "F2", "0.03 0.37 0.27"),
      textCommand(`Created ${isoDate(new Date().toISOString())} - Page ${pageNumber}`, 42, 551, 8, "F1", "0.32 0.41 0.37"),
      "0.84 0.89 0.86 RG 0.8 w 42 540 m 750 540 l S"
    ];
    const columns = [
      ["Package", 42], ["Tracking / pickup", 194], ["Carrier", 376],
      ["Status", 439], ["Entered", 529], ["Completed", 619]
    ];
    for (const [label, x] of columns) commands.push(textCommand(label, x, 522, 8, "F2", "0.12 0.29 0.23"));
    commands.push("0.77 0.85 0.81 RG 0.7 w 42 513 m 750 513 l S");
    return commands;
  }

  function buildPdfPages(entries) {
    const rows = exportRows(entries);
    const xPositions = [42, 194, 376, 439, 529, 619];
    const widths = [144, 174, 55, 82, 82, 90];
    const pages = [];
    let pageNumber = 1;
    let commands = pageHeader(pageNumber);
    let y = 494;

    if (!rows.length) {
      commands.push(textCommand("No completed shipments were available when this file was created.", 42, y, 10, "F1", "0.32 0.41 0.37"));
    }

    for (const row of rows) {
      const wrapped = row.map((value, index) => wrapText(value || (index === 5 ? "Not recorded" : "-"), widths[index]));
      const lineCount = Math.max(...wrapped.map((lines) => lines.length));
      const rowHeight = Math.max(22, (lineCount * 10) + 8);
      if (y - rowHeight < 40) {
        pages.push(commands.join("\n"));
        pageNumber += 1;
        commands = pageHeader(pageNumber);
        y = 494;
      }
      wrapped.forEach((lines, columnIndex) => {
        lines.forEach((line, lineIndex) => {
          commands.push(textCommand(line, xPositions[columnIndex], y - 10 - (lineIndex * 10)));
        });
      });
      y -= rowHeight;
      commands.push(`0.90 0.93 0.91 RG 0.5 w 42 ${y} m 750 ${y} l S`);
    }
    pages.push(commands.join("\n"));
    return pages;
  }

  function buildPdf(entries) {
    const pageStreams = buildPdfPages(entries);
    const objects = new Map();
    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageIds = [];
    pageStreams.forEach((stream, index) => {
      const contentId = 5 + (index * 2);
      const pageId = contentId + 1;
      pageIds.push(pageId);
      objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    });
    objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

    const maxObjectId = Math.max(...objects.keys());
    let pdf = "%PDF-1.4\n%TrackerPal\n";
    const offsets = [0];
    for (let id = 1; id <= maxObjectId; id += 1) {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= maxObjectId; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
  }

  function fileName(extension) {
    return `trackerpal-completed-${isoDate(new Date().toISOString())}.${extension}`;
  }

  function download(content, type, extension) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(extension);
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCsv(entries) {
    download(buildCsv(entries), "text/csv;charset=utf-8", "csv");
  }

  function downloadPdf(entries) {
    download(buildPdf(entries), "application/pdf", "pdf");
  }

  const api = { buildCsv, buildPdf, completedEntries, downloadCsv, downloadPdf, exportRows, isoDate };
  globalThis.TrackerPalExports = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
