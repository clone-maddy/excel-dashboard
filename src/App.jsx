import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import ExcelUploader from "./components/ExcelUploader";
import ChartDashboard from "./components/ChartDashboard";
import OptionsPanel from "./components/OptionsPanel";
import SyncStatus from "./components/SyncStatus";
import DataTable from "./components/DataTable";
import FilterBar from "./components/FilterBar";
import ProjectsSidebar from "./components/ProjectsSidebar";
import ProjectSourcesPanel from "./components/ProjectSourcesPanel";
import { parseSheetData, mergeParsedSheets } from "./utils/parseSheet";
import { getProjects, saveProject, deleteProject } from "./utils/projectDB";
import "./index.css";

function App() {
  const [excelData, setExcelData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [isDark, setIsDark] = useState(true);

  // Sandbox Mode state
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const selectedSheetRef = useRef("");

  const [sourceUrl, setSourceUrl] = useState(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Projects State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Filtered data state
  const [filteredRows, setFilteredRows] = useState(null);

  // Load projects and last active project on mount
  useEffect(() => {
    getProjects()
      .then((projs) => {
        setProjects(projs);
        const lastActiveId = localStorage.getItem("lastActiveProjectId");
        if (lastActiveId) {
          const found = projs.find((p) => p.id === lastActiveId);
          if (found) {
            setActiveProject(found);
            loadProjectData(found);
          }
        }
      })
      .catch((err) => console.error("Could not fetch projects from DB:", err));
  }, []);

  // Background auto-refresh for URL sources in active project
  useEffect(() => {
    if (!activeProject) return;
    const hasUrls = activeProject.sources.some((s) => s.type === "url");
    if (!hasUrls) return;

    const interval = setInterval(() => {
      loadProjectData(activeProject, true); // Silent background fetch
    }, 45000); // 45 seconds interval for background refresh

    return () => clearInterval(interval);
  }, [activeProject]);

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

  // Sandbox mode data loader
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

  // Sandbox mode sync
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

  // --- Project Mode Operations ---

  const loadProjectData = async (proj, silent = false) => {
    if (!proj) return;
    if (!silent) setProjectLoading(true);

    try {
      const parsedSheets = [];
      const updatedSources = [...proj.sources];
      let hasUpdates = false;

      for (let i = 0; i < updatedSources.length; i++) {
        const src = updatedSources[i];
        let workbookObj = null;

        if (src.type === "url") {
          try {
            const response = await fetch(src.url);
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            const buffer = await response.arrayBuffer();
            workbookObj = XLSX.read(buffer, { type: "array" });
            
            src.fileData = new Blob([buffer]);
            src.sheetNames = workbookObj.SheetNames;
            src.lastSynced = Date.now();
            src.syncError = null;
            hasUpdates = true;
          } catch (e) {
            console.warn(`Sync failed for URL source "${src.name}":`, e);
            src.syncError = e.message || "Network error fetching spreadsheet.";
            hasUpdates = true;

            // Load cached version if available
            if (src.fileData) {
              const arrayBuffer = await src.fileData.arrayBuffer();
              workbookObj = XLSX.read(arrayBuffer, { type: "array" });
            }
          }
        } else {
          // Local file: read stored Blob from IndexedDB
          if (src.fileData) {
            try {
              const arrayBuffer = await src.fileData.arrayBuffer();
              workbookObj = XLSX.read(arrayBuffer, { type: "array" });
            } catch (err) {
              console.error(`Failed to read stored file "${src.name}":`, err);
            }
          }
        }

        if (workbookObj) {
          // Verify selected sheets
          const availableSheets = workbookObj.SheetNames || [];
          let activeSheets = src.selectedSheets || [];
          
          // Filter sheets that actually exist in workbook
          activeSheets = activeSheets.filter(name => availableSheets.includes(name));
          
          // Default to first sheet if nothing selected
          if (activeSheets.length === 0 && availableSheets.length > 0) {
            activeSheets = [availableSheets[0]];
            src.selectedSheets = activeSheets;
            hasUpdates = true;
          }

          // Parse and add each selected sheet
          activeSheets.forEach((sheetName) => {
            const parsed = parseSheetData(workbookObj, sheetName);
            if (parsed) {
              parsedSheets.push(parsed);
            }
          });
        }
      }

      // Save updated project schema with any auto-sync details or defaults back to IndexedDB
      if (hasUpdates) {
        const updatedProj = { ...proj, sources: updatedSources, updatedAt: Date.now() };
        await saveProject(updatedProj);
        setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
        setActiveProject(updatedProj);
      }

      if (parsedSheets.length > 0) {
        const merged = mergeParsedSheets(parsedSheets);
        setExcelData(merged);
      } else {
        setExcelData(null);
      }
      setFilteredRows(null);
      setSelectedColumns([]);
    } catch (err) {
      console.error("Error loading project data:", err);
    } finally {
      if (!silent) setProjectLoading(false);
    }
  };

  const handleAddSourceToProject = async ({ workbook: newWb, sourceUrl: newUrl, fileBlob, fileName }) => {
    if (!activeProject) return;

    const sourceId = "src_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    const newSource = {
      id: sourceId,
      name: fileName,
      type: newUrl ? "url" : "file",
      url: newUrl || "",
      fileData: fileBlob,
      lastSynced: Date.now(),
      sheetNames: newWb.SheetNames || [],
      selectedSheets: [newWb.SheetNames[0] || ""],
      syncError: null
    };

    const updatedProject = {
      ...activeProject,
      updatedAt: Date.now(),
      sources: [...activeProject.sources, newSource]
    };

    await saveProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setActiveProject(updatedProject);

    await loadProjectData(updatedProject);
  };

  const handleDeleteSource = async (sourceId) => {
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      sources: activeProject.sources.filter((s) => s.id !== sourceId),
      updatedAt: Date.now()
    };

    await saveProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setActiveProject(updatedProject);

    await loadProjectData(updatedProject);
  };

  const handleToggleSheet = async (sourceId, sheetName) => {
    if (!activeProject) return;

    const updatedSources = activeProject.sources.map((src) => {
      if (src.id === sourceId) {
        const currentSel = src.selectedSheets || [];
        let nextSel;
        if (currentSel.includes(sheetName)) {
          nextSel = currentSel.length === 1 ? currentSel : currentSel.filter((s) => s !== sheetName);
        } else {
          nextSel = [...currentSel, sheetName];
        }
        return { ...src, selectedSheets: nextSel };
      }
      return src;
    });

    const updatedProject = {
      ...activeProject,
      sources: updatedSources,
      updatedAt: Date.now()
    };

    await saveProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setActiveProject(updatedProject);

    await loadProjectData(updatedProject);
  };

  const handleSyncAll = async () => {
    if (!activeProject) return;
    setIsSyncingAll(true);
    await loadProjectData(activeProject, false);
    setIsSyncingAll(false);
  };

  const handleCreateProject = async (name) => {
    const newProj = {
      id: "proj_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sources: []
    };

    await saveProject(newProj);
    setProjects((prev) => [...prev, newProj]);
    setActiveProject(newProj);
    localStorage.setItem("lastActiveProjectId", newProj.id);

    await loadProjectData(newProj);
  };

  const handleDeleteProject = async (id) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));

    if (activeProject && activeProject.id === id) {
      setActiveProject(null);
      localStorage.removeItem("lastActiveProjectId");
      setExcelData(null);
      setFilteredRows(null);
      setSelectedColumns([]);
    }
  };

  const handleRenameProject = async (id, newName) => {
    const targetProj = projects.find((p) => p.id === id);
    if (!targetProj) return;

    const updatedProj = { ...targetProj, name: newName, updatedAt: Date.now() };
    await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === id ? updatedProj : p)));

    if (activeProject && activeProject.id === id) {
      setActiveProject(updatedProj);
    }
  };

  const handleSelectProject = (id) => {
    const found = projects.find((p) => p.id === id);
    if (found) {
      setActiveProject(found);
      localStorage.setItem("lastActiveProjectId", id);
      loadProjectData(found);
    }
  };

  const handleSelectSandbox = () => {
    setActiveProject(null);
    localStorage.removeItem("lastActiveProjectId");
    setExcelData(null);
    setFilteredRows(null);
    setSelectedColumns([]);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setSourceUrl(null);
  };

  // --- Derived Calculations ---

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

  useEffect(() => {
    if (!sourceUrl || !autoSync) return;
    const interval = setInterval(() => { syncData(true); }, 10000);
    return () => clearInterval(interval);
  }, [sourceUrl, autoSync]);

  return (
    <div className={`app-wrapper ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <ProjectsSidebar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onSelectSandbox={handleSelectSandbox}
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <button
              className="sidebar-trigger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Workspace Sidebar"
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <h1 className="header-title">📊 Excel Dashboard</h1>
            {activeProject ? (
              <span className="active-project-badge">
                Project: <strong>{activeProject.name}</strong>
              </span>
            ) : (
              <span className="active-project-badge sandbox">
                🧪 Sandbox Mode
              </span>
            )}
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </header>

        {projectLoading && (
          <div className="project-loading-overlay">
            <div className="spinner"></div>
            <span>Loading and merging project workspace...</span>
          </div>
        )}

        <main className="app-main">
          {activeProject ? (
            <ProjectSourcesPanel
              project={activeProject}
              onAddSource={handleAddSourceToProject}
              onDeleteSource={handleDeleteSource}
              onToggleSheet={handleToggleSheet}
              onSyncAll={handleSyncAll}
              isSyncingAll={isSyncingAll}
            />
          ) : (
            <section className="uploader-section">
              <ExcelUploader onDataLoaded={handleDataLoaded} />
            </section>
          )}

          {excelData && excelData.columns.length > 0 ? (
            <>
              <section className="dashboard-toolbar">
                <div className="toolbar-left">
                  {!activeProject && sheetNames.length > 1 && (
                    <div className="select-container toolbar-select">
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="sheet-select"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>📄 {name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!activeProject && sheetNames.length <= 1 && selectedSheet && (
                    <span className="toolbar-sheet-name">📄 {selectedSheet}</span>
                  )}
                  {activeProject && (
                    <span className="toolbar-sheet-name">📊 Merged Project Data</span>
                  )}
                  <span className="toolbar-col-badge">
                    {numericCols.length > 0 && <span className="badge badge-numeric">{numericCols.length} numeric</span>}
                    {textCols.length > 0 && <span className="badge badge-text">{textCols.length} text</span>}
                    {dateCols.length > 0 && <span className="badge badge-date">{dateCols.length} date</span>}
                  </span>
                </div>
                <div className="toolbar-right">
                  {!activeProject && sourceUrl && (
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

              <ChartDashboard
                data={activeRows}
                columns={columns}
                columnTypes={columnTypes}
                allColumns={excelData.columns}
              />

              <section className="table-section">
                <DataTable data={activeRows} columns={excelData.columns} />
              </section>
            </>
          ) : (
            activeProject && activeProject.sources.length > 0 && (
              <div className="no-data-loaded-banner">
                <div className="banner-content">
                  <span className="banner-icon">⚠️</span>
                  <h3>No worksheets parsed</h3>
                  <p>Make sure at least one worksheet is checked in the data sources panel above to load data.</p>
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

