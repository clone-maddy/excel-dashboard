import React, { useState } from "react";
import ExcelUploader from "./ExcelUploader";

export default function ProjectSourcesPanel({
  project,
  onAddSource,
  onDeleteSource,
  onToggleSheet,
  onSyncAll,
  isSyncingAll
}) {
  const [showUploader, setShowUploader] = useState(false);

  const handleDataLoaded = ({ workbook, sourceUrl, fileBlob, fileName }) => {
    onAddSource({
      workbook,
      sourceUrl,
      fileBlob,
      fileName
    });
    setShowUploader(false); // Collapse after adding
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const hasUrlSources = project.sources.some(s => s.type === "url");

  return (
    <div className="project-sources-panel">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <h2 className="project-panel-title">⚡ {project.name} Data Sources</h2>
          <span className="sources-count-badge">{project.sources.length} sheets</span>
        </div>
        <div className="panel-actions">
          {hasUrlSources && (
            <button
              onClick={onSyncAll}
              className={`sync-all-btn ${isSyncingAll ? "spinning" : ""}`}
              disabled={isSyncingAll || project.sources.length === 0}
              title="Refresh all remote URLs"
            >
              🔄 {isSyncingAll ? "Refreshing..." : "Refresh Remote Sheets"}
            </button>
          )}
          <button
            className={`toggle-uploader-btn ${showUploader ? "active" : ""}`}
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? "✕ Close Uploader" : "+ Add Sheet to Project"}
          </button>
        </div>
      </div>

      {/* Collapsible Uploader Box */}
      {showUploader && (
        <div className="uploader-drawer animate-slide-down">
          <h3 className="uploader-drawer-title">Add new Local Spreadsheet or URL to merge</h3>
          <ExcelUploader onDataLoaded={handleDataLoaded} />
        </div>
      )}

      {/* Sources list */}
      <div className="sources-list">
        {project.sources.length === 0 ? (
          <div className="empty-sources-banner">
            <span className="banner-icon">📥</span>
            <h3>No data sources in this project yet</h3>
            <p>Upload a local Excel file or paste a Google Sheets/URL link above to begin analyzing.</p>
            <button className="add-first-btn" onClick={() => setShowUploader(true)}>
              + Add Your First Sheet
            </button>
          </div>
        ) : (
          <div className="sources-grid">
            {project.sources.map((src) => {
              const isUrl = src.type === "url";
              const isError = src.syncError;
              const sheets = src.sheetNames || [];
              const selected = src.selectedSheets || [];

              return (
                <div key={src.id} className={`source-card ${isUrl ? "url-card" : "file-card"} ${isError ? "has-error" : ""}`}>
                  <div className="source-card-header">
                    <div className="source-meta">
                      <span className="source-type-icon">{isUrl ? "🌐" : "📁"}</span>
                      <div className="source-name-details">
                        <span className="source-name" title={src.name}>{src.name}</span>
                        {isUrl && <span className="source-url-text" title={src.url}>{src.url}</span>}
                      </div>
                    </div>
                    <button
                      className="remove-source-btn"
                      onClick={() => {
                        if (confirm(`Remove "${src.name}" from project?`)) {
                          onDeleteSource(src.id);
                        }
                      }}
                      title="Remove source from project"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Worksheet selector pills */}
                  <div className="source-sheets-selector">
                    <span className="selector-label">Select sheets to merge:</span>
                    <div className="sheet-pills-container">
                      {sheets.map((sheetName) => {
                        const isSel = selected.includes(sheetName);
                        return (
                          <button
                            key={sheetName}
                            className={`sheet-pill ${isSel ? "active" : ""}`}
                            onClick={() => onToggleSheet(src.id, sheetName)}
                            title={`Toggle sheet ${sheetName}`}
                          >
                            📄 {sheetName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card footer details */}
                  <div className="source-card-footer">
                    <span className="sync-time">
                      Updated: {formatTime(src.lastSynced)}
                    </span>
                    {isUrl && (
                      <span className={`sync-status-badge ${isError ? "error" : "success"}`}>
                        {isError ? "⚠️ Sync Error" : "✓ Connected"}
                      </span>
                    )}
                  </div>
                  {isError && (
                    <div className="source-error-msg">
                      Error: {src.syncError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
