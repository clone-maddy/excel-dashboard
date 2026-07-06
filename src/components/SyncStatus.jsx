import React from "react";

export default function SyncStatus({
  sourceUrl,
  autoSync,
  onAutoSyncToggle,
  lastSynced,
  isSyncing,
  syncError,
  onManualSync,
}) {
  if (!sourceUrl) return null;

  const formatTime = (date) => {
    if (!date) return "Never";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="options-panel sync-status-panel">
      <h2>🔄 Live Data Sync</h2>
      
      <div className="options-section">
        <div className="sync-status-header">
          <div className="status-indicator">
            <span className={`status-dot ${isSyncing ? "syncing" : syncError ? "error" : "active"}`}></span>
            <span className="status-text">
              {isSyncing ? "Syncing..." : syncError ? "Sync Error" : "Connected"}
            </span>
          </div>
          <button 
            onClick={onManualSync} 
            className={`sync-now-btn ${isSyncing ? "spinning" : ""}`}
            disabled={isSyncing}
            title="Fetch latest data immediately"
          >
            🔄
          </button>
        </div>

        {syncError && (
          <div className="sync-error-banner">
            {syncError}
          </div>
        )}

        <div className="sync-info">
          <span className="info-label">Last Checked:</span>
          <span className="info-value">{formatTime(lastSynced)}</span>
        </div>

        <div className="sync-control">
          <label className="switch-container">
            <input 
              type="checkbox" 
              checked={autoSync} 
              onChange={(e) => onAutoSyncToggle(e.target.checked)} 
            />
            <span className="switch-slider"></span>
            <span className="switch-label">Auto-Sync (10s)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
