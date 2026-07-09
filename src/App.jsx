import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import ExcelUploader from "./components/ExcelUploader";
import ChartDashboard from "./components/ChartDashboard";
import OptionsPanel from "./components/OptionsPanel";
import SyncStatus from "./components/SyncStatus";
import DataTable from "./components/DataTable";
import FilterBar from "./components/FilterBar";
import { parseSheetData } from "./utils/parseSheet";
import "./index.css";

function App() {
  const [excelData, setExcelData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [isDark, setIsDark] = useState(true);

  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const selectedSheetRef = useRef("");

  const [sourceUrl, setSourceUrl] = useState(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Filtered data state
  const [filteredRows, setFilteredRows] = useState(null);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.remove("light");
      } else {
        document.body.classList.add("light");
      }
      return next;
    });
  };

  const handleDataLoaded = (data) => {
    const wb = data.workbook;
    setWorkbook(wb);
    const sheets = wb.SheetNames || [];
    setSheetNames(sheets);
    const initialSheet = sheets[0] || "";
    setSelectedSheet(initialSheet);
    selectedSheetRef.current = initialSheet;

    const parsed = parseSheetData(wb, initialSheet);
    window.parsedExcelData = parsed;
    window.workbook = wb;
    setExcelData(parsed);
    setFilteredRows(null);
    setSelectedColumns([]);

    setSourceUrl(data.sourceUrl);
    setLastSynced(data.sourceUrl ? new Date() : null);
    setSyncError(null);
    setAutoSync(!!data.sourceUrl);
  };

  const syncData = async (silent = false) => {
    if (!sourceUrl) return;
    if (!silent) setIsSyncing(true);

    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Sync failed (HTTP ${response.status})`);
      }
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      setWorkbook(wb);
      const sheets = wb.SheetNames || [];
      setSheetNames(sheets);

      const currentSheet = selectedSheetRef.current;
      const sheetToLoad = sheets.includes(currentSheet) ? currentSheet : (sheets[0] || "");
      setSelectedSheet(sheetToLoad);
      selectedSheetRef.current = sheetToLoad;

      const parsed = parseSheetData(wb, sheetToLoad);
      window.parsedExcelData = parsed;
      window.workbook = wb;
      setExcelData(parsed);
      setFilteredRows(null);
      setLastSynced(new Date());
      setSyncError(null);
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncError(err.message || "Failed to update spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    selectedSheetRef.current = sheetName;
    const parsed = parseSheetData(workbook, sheetName);
    window.parsedExcelData = parsed;
    setExcelData(parsed);
    setFilteredRows(null);
    setSelectedColumns([]);
  };

  useEffect(() => {
    if (!sourceUrl || !autoSync) return;
    const interval = setInterval(() => { syncData(true); }, 10000);
    return () => clearInterval(interval);
  }, [sourceUrl, autoSync]);

  const columnTypes = excelData ? (excelData.columnTypes || {}) : {};
  const numericCols = excelData ? excelData.columns.filter((col) => columnTypes[col] === "numeric") : [];
  const textCols = excelData ? excelData.columns.filter((col) => columnTypes[col] === "text") : [];
  const dateCols = excelData ? excelData.columns.filter((col) => columnTypes[col] === "date") : [];

  const getDefaultColumns = () => {
    if (!excelData) return [];
    if (selectedColumns.length) return selectedColumns;
    const xCol = textCols.length > 0 ? textCols[0] : (dateCols.length > 0 ? dateCols[0] : excelData.columns[0]);
    const yCols = numericCols.filter((c) => c !== xCol).slice(0, 5);
    if (yCols.length === 0) return excelData.columns.slice(0, 6);
    return [xCol, ...yCols];
  };

  const columns = getDefaultColumns();

  // Use filtered rows if available, otherwise use all rows
  const activeRows = filteredRows !== null ? filteredRows : (excelData ? excelData.rows : []);

  const computeStats = () => {
    if (!excelData || !excelData.rows.length) return [];
    const stats = [];

    const totalRows = excelData.rows.length;
    const showingRows = activeRows.length;
    const isFiltered = filteredRows !== null && showingRows !== totalRows;

    stats.push({
      label: "Records",
      value: isFiltered ? `${showingRows} / ${totalRows}` : totalRows,
      icon: "📋",
      sub: isFiltered ? "Filtered results" : "Total loaded",
    });
    stats.push({
      label: "Columns",
      value: excelData.columns.length,
      icon: "📊",
      sub: `${numericCols.length} numeric · ${textCols.length} text · ${dateCols.length} date`,
    });

    numericCols.slice(0, 3).forEach((col) => {
      const values = activeRows.map((row) => Number(row[col])).filter((val) => !isNaN(val));
      if (values.length === 0) return;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      stats.push({
        label: col.length > 20 ? col.slice(0, 20) + "…" : col,
        value: avg >= 1000 ? (avg / 1000).toFixed(1) + "K" : avg.toFixed(2),
        icon: "📈",
        sub: `Max: ${Math.max(...values).toLocaleString()} · Min: ${Math.min(...values).toLocaleString()}`,
      });
    });

    textCols.slice(0, 1).forEach((col) => {
      const unique = new Set();
      const freq = {};
      let mostCommon = "";
      activeRows.forEach((row) => {
        const val = row[col];
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          const key = String(val).trim();
          unique.add(key);
          if (!freq[key]) freq[key] = 0;
          freq[key]++;
        }
      });
      let maxFreq = 0;
      Object.entries(freq).forEach(([k, v]) => {
        if (v > maxFreq) { maxFreq = v; mostCommon = k; }
      });
      stats.push({
        label: col.length > 20 ? col.slice(0, 20) + "…" : col,
        value: unique.size,
        icon: "📝",
        sub: `Unique values · Top: ${mostCommon.length > 18 ? mostCommon.slice(0, 18) + "…" : mostCommon}`,
      });
    });

    return stats;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📊 Excel Dashboard</h1>
        <button className="theme-toggle" onClick={toggleTheme} title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {isDark ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="app-main">
        <section className="uploader-section">
          <ExcelUploader onDataLoaded={handleDataLoaded} />
        </section>

        {excelData && excelData.columns.length > 0 && (
          <>
            <section className="dashboard-toolbar">
              <div className="toolbar-left">
                {sheetNames.length > 1 && (
                  <div className="select-container toolbar-select">
                    <select value={selectedSheet} onChange={(e) => handleSheetChange(e.target.value)} className="sheet-select">
                      {sheetNames.map((name) => (
                        <option key={name} value={name}>📄 {name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {sheetNames.length <= 1 && selectedSheet && (
                  <span className="toolbar-sheet-name">📄 {selectedSheet}</span>
                )}
                <span className="toolbar-col-badge">
                  {numericCols.length > 0 && <span className="badge badge-numeric">{numericCols.length} numeric</span>}
                  {textCols.length > 0 && <span className="badge badge-text">{textCols.length} text</span>}
                  {dateCols.length > 0 && <span className="badge badge-date">{dateCols.length} date</span>}
                </span>
              </div>
              <div className="toolbar-right">
                {sourceUrl && (
                  <SyncStatus
                    sourceUrl={sourceUrl}
                    autoSync={autoSync}
                    onAutoSyncToggle={setAutoSync}
                    lastSynced={lastSynced}
                    isSyncing={isSyncing}
                    syncError={syncError}
                    onManualSync={() => syncData(false)}
                  />
                )}
              </div>
            </section>

            {/* Global Filter Bar */}
            <section className="filter-bar-section">
              <FilterBar
                rows={excelData.rows}
                columns={excelData.columns}
                columnTypes={columnTypes}
                onFilteredRows={setFilteredRows}
              />
            </section>

            <section className="stats-strip">
              {computeStats().map((s, i) => (
                <div className="stat-card" key={i}>
                  <span className="stat-icon">{s.icon}</span>
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-subtext">{s.sub}</span>
                </div>
              ))}
            </section>

            <section className="column-picker-section">
              <OptionsPanel
                columns={excelData.columns}
                selectedColumns={selectedColumns}
                onColumnsChange={setSelectedColumns}
                columnTypes={columnTypes}
              />
            </section>

            <ChartDashboard data={activeRows} columns={columns} columnTypes={columnTypes} allColumns={excelData.columns} />

            <section className="table-section">
              <DataTable data={activeRows} columns={excelData.columns} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
