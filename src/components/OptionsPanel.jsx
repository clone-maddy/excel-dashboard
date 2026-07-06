import React from "react";

const chartTypes = [
  { value: "line", label: "📈 Line Chart" },
  { value: "bar", label: "📊 Bar Chart" },
  { value: "pie", label: "🍕 Pie Chart" },
];

export default function OptionsPanel({ columns, selectedColumns, onColumnsChange, selectedChart, onChartChange }) {
  const toggleColumn = (col) => {
    if (selectedColumns.includes(col)) {
      onColumnsChange(selectedColumns.filter((c) => c !== col));
    } else {
      onColumnsChange([...selectedColumns, col]);
    }
  };

  return (
    <div className="options-panel">
      <h2>Configure Visualization</h2>
      
      <div className="options-section">
        <h3>Choose Chart Type</h3>
        <div className="chart-selector">
          {chartTypes.map((c) => (
            <button
              key={c.value}
              className={`selector-btn ${selectedChart === c.value ? "active" : ""}`}
              onClick={() => onChartChange(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="options-section">
        <h3>Select Columns to Plot</h3>
        <p className="subtitle">First selected column is used as the X-Axis</p>
        <div className="columns-grid">
          {columns.map((col) => (
            <label key={col} className={`checkbox-label ${selectedColumns.includes(col) ? "checked" : ""}`}>
              <input
                type="checkbox"
                checked={selectedColumns.includes(col)}
                onChange={() => toggleColumn(col)}
              />
              <span className="checkbox-custom"></span>
              {col}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
