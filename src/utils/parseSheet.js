import * as XLSX from "xlsx";

function buildMergeLookup(worksheet) {
  const lookup = {};
  const merges = worksheet["!merges"] || [];
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    const anchorRow = m.s.r;
    const anchorCol = m.s.c;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        lookup[`${r},${c}`] = { anchorRow, anchorCol };
      }
    }
  }
  return lookup;
}

function getRawCellValue(worksheet, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[addr];
  if (!cell) return undefined;
  return cell.v;
}

function getCellValue(worksheet, row, col, mergeLookup) {
  const val = getRawCellValue(worksheet, row, col);
  if (val !== undefined && val !== null && String(val).trim() !== "") return val;

  const key = `${row},${col}`;
  if (mergeLookup[key]) {
    const anchor = mergeLookup[key];
    return getRawCellValue(worksheet, anchor.anchorRow, anchor.anchorCol);
  }
  return val;
}

function isDateSerial(value) {
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  if (value < 1 || value > 2958465) return false;
  if (value !== Math.floor(value)) return false;
  if (value < 30000 || value > 60000) return false;
  return true;
}

function excelDateToString(serial) {
  if (typeof serial !== "number" || !isFinite(serial)) return String(serial);
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(epoch.getTime() + serial * 86400000);
  const day = date.getUTCDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Improved header detection:
 * 1. Scans first 15 rows to find the row with the most filled cells (max density).
 * 2. Uses a threshold (40% of max, minimum 3) to skip sparse title / label rows.
 * 3. Then checks merges and the following rows to detect multi-row headers.
 */
function detectHeaderRows(rawData, worksheet, mergeLookup) {
  if (!rawData || rawData.length === 0) return { start: -1, end: -1 };

  const scanLimit = Math.min(rawData.length, 15);

  // Find maximum filled-cell count across the first rows
  let maxFilled = 0;
  for (let r = 0; r < scanLimit; r++) {
    const row = rawData[r] || [];
    const filledCount = row.filter((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "").length;
    if (filledCount > maxFilled) maxFilled = filledCount;
  }

  if (maxFilled === 0) return { start: -1, end: -1 };

  // Find the first row meeting the threshold
  const threshold = Math.max(3, Math.floor(maxFilled * 0.4));
  let firstHeaderRow = -1;
  for (let r = 0; r < scanLimit; r++) {
    const row = rawData[r] || [];
    const filledCount = row.filter((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "").length;
    if (filledCount >= threshold) {
      firstHeaderRow = r;
      break;
    }
  }

  // Fallback: just find first non-empty row
  if (firstHeaderRow === -1) {
    for (let r = 0; r < scanLimit; r++) {
      const row = rawData[r];
      if (row && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
        firstHeaderRow = r;
        break;
      }
    }
  }

  if (firstHeaderRow === -1) return { start: -1, end: -1 };

  const merges = worksheet["!merges"] || [];

  // Check for vertical merges starting at the header row
  let hasVerticalMergeInHeader = false;
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    if (m.s.r === firstHeaderRow && m.e.r > m.s.r) {
      hasVerticalMergeInHeader = true;
      break;
    }
  }

  if (!hasVerticalMergeInHeader) {
    // Check horizontal merges + next row to see if we have a 2-row header
    let nextRow = firstHeaderRow + 1;
    if (nextRow < rawData.length) {
      const row1 = rawData[firstHeaderRow] || [];
      const row2 = rawData[nextRow] || [];
      const row1HasText = row1.some((c) => typeof c === "string" && c.trim() !== "");
      const row2HasText = row2.some((c) => typeof c === "string" && c.trim() !== "" && isNaN(Number(c)));
      const row1HasDates = row1.some((c) => isDateSerial(c));
      const row2HasDates = row2.some((c) => isDateSerial(c));

      // If row 1 is text headers and row 2 is date serials, single-row header
      if (row1HasText && !row1HasDates && row2HasDates) {
        return { start: firstHeaderRow, end: firstHeaderRow };
      }
      // If both rows have text and there are horizontal merges, treat as 2-row header
      if (row1HasText && row2HasText && !row2HasDates) {
        let hasHorizontalMerge = false;
        for (let i = 0; i < merges.length; i++) {
          const m = merges[i];
          if (m.s.r === firstHeaderRow && m.e.c > m.s.c) {
            hasHorizontalMerge = true;
            break;
          }
        }
        if (hasHorizontalMerge) {
          return { start: firstHeaderRow, end: nextRow };
        }
      }
    }
    return { start: firstHeaderRow, end: firstHeaderRow };
  }

  // Vertical merges: find the deepest merge end row
  let maxMergeEndRow = firstHeaderRow;
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    if (m.s.r === firstHeaderRow && m.e.r > maxMergeEndRow) {
      maxMergeEndRow = m.e.r;
    }
  }

  return { start: firstHeaderRow, end: maxMergeEndRow };
}

/**
 * Flatten multi-row headers into single column names.
 * Now includes deduplication for single-row headers too.
 */
function flattenHeaders(rawData, headerStart, headerEnd, worksheet, mergeLookup, colCount) {
  const usedNames = {};

  const deduplicate = (name) => {
    if (usedNames[name]) {
      usedNames[name]++;
      return `${name} (${usedNames[name]})`;
    }
    usedNames[name] = 1;
    return name;
  };

  if (headerStart === headerEnd) {
    const row = [];
    for (let c = 0; c < colCount; c++) {
      const val = getCellValue(worksheet, headerStart, c, mergeLookup);
      let name = val !== undefined && val !== null ? String(val).trim() : "";
      name = name || `Column ${c + 1}`;
      row.push(deduplicate(name));
    }
    return row;
  }

  const parentRow = [];
  for (let c = 0; c < colCount; c++) {
    const val = getCellValue(worksheet, headerStart, c, mergeLookup);
    parentRow.push(val !== undefined && val !== null ? String(val).trim() : "");
  }

  const childRow = [];
  for (let c = 0; c < colCount; c++) {
    const val = getCellValue(worksheet, headerEnd, c, mergeLookup);
    childRow.push(val !== undefined && val !== null ? String(val).trim() : "");
  }

  const headers = [];
  for (let c = 0; c < colCount; c++) {
    let parent = parentRow[c];
    let child = childRow[c];

    if (isDateSerial(Number(parent))) parent = "";
    if (isDateSerial(Number(child))) child = "";

    let name = "";
    if (parent && child && parent !== child) {
      name = `${parent} > ${child}`;
    } else if (parent) {
      name = parent;
    } else if (child) {
      name = child;
    } else {
      name = `Column ${c + 1}`;
    }

    headers.push(deduplicate(name));
  }
  return headers;
}

function classifyColumn(rows, colName, worksheet, colIndex, dataStartRow) {
  let numCount = 0;
  let dateCount = 0;
  let textCount = 0;
  let total = 0;

  for (let i = 0; i < rows.length && i < 50; i++) {
    const val = rows[i][colName];
    if (val === null || val === undefined || String(val).trim() === "") continue;
    total++;

    if (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "")) {
      const num = Number(val);
      if (isDateSerial(num)) {
        dateCount++;
      } else {
        numCount++;
      }
    } else {
      textCount++;
    }
  }

  if (total === 0) return "text";
  if (dateCount / total > 0.5) return "date";
  if (numCount / total > 0.5) return "numeric";
  return "text";
}

export function parseSheetData(workbook, sheetName) {
  if (!workbook || !sheetName) return null;
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return null;

  const mergeLookup = buildMergeLookup(worksheet);
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawData || rawData.length === 0) return { columns: [], rows: [], columnTypes: {} };

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const colCount = range.e.c + 1;

  const { start: headerStart, end: headerEnd } = detectHeaderRows(rawData, worksheet, mergeLookup);
  if (headerStart === -1) return { columns: [], rows: [], columnTypes: {} };

  const columns = flattenHeaders(rawData, headerStart, headerEnd, worksheet, mergeLookup, colCount);

  const dataStartRow = headerEnd + 1;

  // Skip rows that are predominantly date serial numbers (date sub-header rows)
  let skipDateRows = dataStartRow;
  while (skipDateRows < rawData.length && skipDateRows < dataStartRow + 3) {
    const row = rawData[skipDateRows];
    if (!row) { skipDateRows++; continue; }
    const dateCount = row.filter((c) => isDateSerial(c)).length;
    const totalCells = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== "").length;
    if (totalCells > 0 && dateCount / totalCells > 0.6) {
      skipDateRows++;
    } else {
      break;
    }
  }

  const rows = rawData
    .slice(skipDateRows)
    .filter((row) => row && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ""))
    .map((r) => {
      const obj = {};
      columns.forEach((col, i) => {
        let val = r[i] !== undefined ? r[i] : null;
        obj[col] = val;
      });
      return obj;
    });

  const columnTypes = {};
  columns.forEach((col, i) => {
    columnTypes[col] = classifyColumn(rows, col, worksheet, i, skipDateRows);
  });

  const processedRows = rows.map((row) => {
    const newRow = { ...row };
    columns.forEach((col) => {
      if (columnTypes[col] === "date" && typeof newRow[col] === "number") {
        newRow[col] = excelDateToString(newRow[col]);
      }
    });
    return newRow;
  });

  return { columns, rows: processedRows, columnTypes };
}

export function getTextFrequencies(rows, colName, limit) {
  const freq = {};
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][colName];
    if (val === null || val === undefined || String(val).trim() === "") continue;
    const key = String(val).trim();
    if (!freq[key]) freq[key] = 0;
    freq[key]++;
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 10);

  return sorted.map((entry) => ({ name: entry[0], count: entry[1] }));
}

/**
 * Classify a sheet into one of: aging, weeklyMatrix, tracker, tabular, standard.
 * Rules are generic and work across any workbook structure.
 */
export function classifySheetMode(columns, rows, columnTypes) {
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return "standard";
  }

  // 1. Check for Aging Matrix (Bucket columns like "Less than 30", "30", "60", "More than 90")
  const agingKeywords = ["less than", "more than", "aging", "overdue", "bucket", "outstanding"];
  const matchingAgingCols = columns.filter((col) => {
    const lower = col.toLowerCase();
    const isBracketNumber = /^[0-9]+$/.test(lower.trim()) && ["30", "60", "90", "120", "180"].includes(lower.trim());
    const hasKeyword = agingKeywords.some((kw) => lower.includes(kw));
    return (hasKeyword || isBracketNumber) && columnTypes[col] === "numeric";
  });

  if (matchingAgingCols.length >= 2) {
    return "aging";
  }

  // 2. Check for Weekly Matrix (Chronological pattern columns — MUST have numeric data)
  const weekRegex = /(week|wk|month|qtr|quarter|yr|year|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i;
  const chronoCols = columns.filter((col) => {
    return weekRegex.test(col) && !col.toLowerCase().includes("party") && !col.toLowerCase().includes("client");
  });

  // Require at least 50% of chronological columns to be numeric to classify as weeklyMatrix
  const numericChronoCols = chronoCols.filter((col) => columnTypes[col] === "numeric");
  if (chronoCols.length >= 5 && numericChronoCols.length >= Math.max(3, chronoCols.length * 0.3)) {
    return "weeklyMatrix";
  }

  // 3. Check for Task / Status Tracker
  const trackerKeywords = ["score", "status", "progress", "completion", "result", "action", "remarks", "responsible", "point"];
  const hasTrackerCols = columns.some((col) => trackerKeywords.some((kw) => col.toLowerCase().includes(kw)));
  const hasStatusValues = rows.slice(0, 30).some((row) => {
    return Object.values(row).some((val) => {
      if (typeof val !== "string") return false;
      const lower = val.toLowerCase().trim();
      return ["on time", "late", "done", "pending", "in progress", "completed", "timely", "waiting", "released"].includes(lower);
    });
  });

  if (hasTrackerCols || hasStatusValues) {
    return "tracker";
  }

  // 4. Tabular comparator if multiple numeric columns exist
  const numericCols = columns.filter((col) => columnTypes[col] === "numeric");
  if (numericCols.length >= 2) {
    return "tabular";
  }

  return "standard";
}
