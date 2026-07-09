import React from "react";

export default function OptionsPanel({ columns, selectedColumns, onColumnsChange }) {
  const toggleColumn = (col) => {
    if (selectedColumns.includes(col)) {
      onColumnsChange(selectedColumns.filter((c) => c !== col));
    } else {
      onColumnsChange([...selectedColumns, col]);
    }
  };

  return (
    <div className="column-picker">
      <h3>🎯 Select Columns to Plot</h3>
      <p className="subtitle">First selected column = X-Axis</p>
      <div className="columns-grid">
        {columns.map((col, idx) => (
          <label key={`col-${idx}`} className={`checkbox-label ${selectedColumns.includes(col) ? "checked" : ""}`}>
            <input type="checkbox" checked={selectedColumns.includes(col)} onChange={() => toggleColumn(col)} />
            <span className="checkbox-custom"></span>
            {col}
          </label>
        ))}
      </div>
    </div>
  );
}
