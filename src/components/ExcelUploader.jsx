import React, { useState } from "react";
import * as XLSX from "xlsx";

/**
 * Reads an Excel file (local or remote URL) and returns an object with `columns` and `rows`.
 * `onDataLoaded` receives the parsed data.
 */
export default function ExcelUploader({ onDataLoaded }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processWorkbook = (workbook, sourceUrl = null) => {
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
    
    if (columns.length === 0) {
      throw new Error("No columns detected in the first sheet.");
    }

    onDataLoaded({ columns, rows, sourceUrl });
    setError(null);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      processWorkbook(workbook, null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to read the local Excel file.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlFetch = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let targetUrl = url.trim();

      // Check if it is a Google Sheets URL
      const gSheetsMatch = targetUrl.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
      if (gSheetsMatch) {
        const sheetId = gSheetsMatch[1];
        targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(
          `Unable to fetch the spreadsheet (HTTP ${response.status}). If using Google Sheets, make sure the sharing settings are set to "Anyone with the link can view".`
        );
      }

      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      processWorkbook(workbook, targetUrl);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to load spreadsheet from the provided URL. Ensure CORS is supported or the file is publicly shared."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-uploader-container">
      <div className="uploader-flex">
        {/* Local File Input */}
        <div className="uploader-block">
          <label className="file-label">
            <span>📂 Choose local file</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          </label>
        </div>

        <div className="uploader-divider">
          <span>OR</span>
        </div>

        {/* Remote URL Input */}
        <form onSubmit={handleUrlFetch} className="uploader-form">
          <div className="url-input-group">
            <input
              type="url"
              className="url-input"
              placeholder="Paste Google Sheets or direct Excel URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="fetch-btn" disabled={loading || !url.trim()}>
              {loading ? "Fetching..." : "Fetch & Load"}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Parsing spreadsheet data...</span>
        </div>
      )}

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <div className="error-message">{error}</div>
        </div>
      )}

      <div className="uploader-tip">
        <span className="tip-icon">💡</span>
        <p>
          <strong>Google Sheets tip:</strong> Click <strong>Share</strong> in the top right, and change settings to <strong>"Anyone with the link can view"</strong> so the dashboard can fetch the data.
        </p>
      </div>
    </div>
  );
}

