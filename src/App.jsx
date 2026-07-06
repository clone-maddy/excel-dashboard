import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import ExcelUploader from "./components/ExcelUploader";
import ChartDashboard from "./components/ChartDashboard";
import OptionsPanel from "./components/OptionsPanel";
import SyncStatus from "./components/SyncStatus";
import "./index.css";

function App() {
  const [excelData, setExcelData] = useState(null);
  const [selectedChart, setSelectedChart] = useState("line");
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Live Sync States
  const [sourceUrl, setSourceUrl] = useState(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleDataLoaded = (data) => {
    setExcelData(data);
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
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        throw new Error("No worksheets found in this workbook.");
      }
      const worksheet = workbook.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (json.length === 0) {
        throw new Error("The worksheet appears to be empty.");
      }
      const columns = json[0];
      const rows = json.slice(1).map((r) => {
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = r[i] !== undefined ? r[i] : null;
        });
        return obj;
      });

      setExcelData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          columns,
          rows,
        };
      });
      setLastSynced(new Date());
      setSyncError(null);
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncError(err.message || "Failed to update spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!sourceUrl || !autoSync) return;

    const interval = setInterval(() => {
      syncData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [sourceUrl, autoSync]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Excel Dashboard</h1>
        <button className="theme-toggle" onClick={() => document.body.classList.toggle('dark')}>Toggle Dark</button>
      </header>
      <main className="app-main">
        <section className="uploader-section">
          <ExcelUploader onDataLoaded={handleDataLoaded} />
        </section>
        {excelData && (
          <section className="dashboard-section">
            <div className="sidebar-panels">
              <OptionsPanel
                columns={excelData.columns}
                selectedColumns={selectedColumns}
                onColumnsChange={setSelectedColumns}
                selectedChart={selectedChart}
                onChartChange={setSelectedChart}
              />
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
            <ChartDashboard
              data={excelData.rows}
              columns={selectedColumns.length ? selectedColumns : excelData.columns}
              chartType={selectedChart}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
