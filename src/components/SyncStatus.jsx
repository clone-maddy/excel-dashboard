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
    if (!date) return "—";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="sync-badge">
      <span className={`status-dot ${isSyncing ? "syncing" : syncError ? "error" : "active"}`}></span>
      <span className="sync-badge-text">
        {isSyncing ? "Syncing…" : syncError ? "Error" : `Synced ${formatTime(lastSynced)}`}
      </span>
      <button onClick={onManualSync} className={`sync-mini-btn ${isSyncing ? "spinning" : ""}`} disabled={isSyncing} title="Sync now">🔄</button>
      <label className="switch-container switch-mini">
        <input type="checkbox" checked={autoSync} onChange={(e) => onAutoSyncToggle(e.target.checked)} />
        <span className="switch-slider"></span>
      </label>
    </div>
  );
}
