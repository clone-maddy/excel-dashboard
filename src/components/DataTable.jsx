import React from "react";

export default function DataTable({ data, columns }) {
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return <p className="chart-empty">No data to display.</p>;
  }

  const displayRows = data.slice(0, 50);

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <h3>📋 Data Preview</h3>
        <span className="data-table-count">Showing {displayRows.length} of {data.length} rows</span>
      </div>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-number-header">#</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx}>
                <td className="row-number">{idx + 1}</td>
                {columns.map((col) => (
                  <td key={col}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
