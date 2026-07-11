import React, { useState } from "react";
import * as XLSX from "xlsx";

/**
 * Reads an Excel file (local file upload, drag-and-drop, or remote URL) and returns an object with `columns` and `rows`.
 * `onDataLoaded` receives the parsed data.
 */
export default function ExcelUploader({ onDataLoaded }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const processWorkbook = (workbook, sourceUrl = null, fileBlob = null, fileName = "") => {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No worksheets found in this workbook.");
    }
    onDataLoaded({ workbook, sourceUrl, fileBlob, fileName });
    setError(null);
  };

  const handleFileProcess = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      processWorkbook(workbook, null, file, file.name);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to read the Excel file.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file extension
      const extension = file.name.split(".").pop().toLowerCase();
      if (extension === "xlsx" || extension === "xls") {
        handleFileProcess(file);
      } else {
        setError("Invalid file format. Please upload an Excel sheet (.xlsx, .xls).");
      }
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
      
      let fileName = "Google Sheet";
      if (!targetUrl.includes("docs.google.com")) {
        try {
          const parsedUrl = new URL(targetUrl);
          fileName = parsedUrl.pathname.split("/").pop() || "Remote Excel";
        } catch {
          fileName = "Remote Excel";
        }
      }
      processWorkbook(workbook, targetUrl, new Blob([buffer]), fileName);
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
        {/* Drag and Drop Zone */}
        <div
          className={`uploader-block drag-drop-zone ${dragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="file-label-zone">
            <div className="uploader-icon-container">
              <svg
                className="uploader-icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <span className="file-label-text">
              {dragging ? "Drop your sheet here!" : "Drag & Drop spreadsheet or browse"}
            </span>
            <span className="file-label-subtext">Supports .xlsx, .xls files</span>
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

