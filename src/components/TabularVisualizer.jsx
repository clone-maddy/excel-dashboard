
import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const chartColors = ["#6366f1", "#06b6d4", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6", "#ec4899"];

const tooltipStyle = {
  backgroundColor: "var(--card-bg)",
  border: "1px solid var(--panel-border)",
  borderRadius: "12px",
  color: "var(--text-main)",
  backdropFilter: "blur(16px)",
  boxShadow: "var(--shadow)",
  fontSize: "0.82rem",
  padding: "8px 12px",
};

export default function TabularVisualizer({ data, columns, columnTypes }) {
  const textCols = columns.filter((col) => columnTypes[col] === "text");
  const numericCols = columns.filter((col) => columnTypes[col] === "numeric");

  const [activeXCol, setActiveXCol] = useState(textCols[0] || columns[0]);
  const [selectedYCols, setSelectedYCols] = useState(numericCols.slice(0, 3));

  if (numericCols.length === 0) {
    return <p className="chart-empty">No numeric data columns found to compare.</p>;
  }

  const parseNumber = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const clean = val.replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Compute sums for the KPIs
  const computeColSum = (col) => {
    return data.reduce((acc, row) => acc + parseNumber(row[col]), 0);
  };

  const computeColAvg = (col) => {
    const vals = data.map(row => parseNumber(row[col])).filter(v => v !== 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  // Build comparative chart data (limit to first 15 rows to keep it readable)
  const chartData = data.slice(0, 15).map((row, idx) => {
    const point = {
      name: String(row[activeXCol] || `Item ${idx + 1}`).trim()
    };
    selectedYCols.forEach(col => {
      point[col] = parseNumber(row[col]);
    });
    return point;
  });

  const handleYToggle = (col) => {
    if (selectedYCols.includes(col)) {
      if (selectedYCols.length > 1) {
        setSelectedYCols(selectedYCols.filter(c => c !== col));
      }
    } else {
      setSelectedYCols([...selectedYCols, col]);
    }
  };

  const formatValue = (num) => {
    if (Math.abs(num) >= 10000000) {
      return (num / 10000000).toFixed(2) + " Cr";
    }
    if (Math.abs(num) >= 100000) {
      return (num / 100000).toFixed(2) + " Lacs";
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + " K";
    }
    return num.toLocaleString();
  };

  return (
    <div className="tabular-visualizer-container">
      {/* Dynamic KPIs for selected Y columns */}
      <div className="stats-strip">
        {numericCols.slice(0, 4).map((col, idx) => {
          const isMargin = col.toLowerCase().includes("margin") || col.toLowerCase().includes("%") || col.toLowerCase().includes("gp");
          const value = isMargin ? computeColAvg(col) : computeColSum(col);
          const valStr = isMargin ? value.toFixed(2) + "%" : formatValue(value);
          return (
            <div className="stat-card" key={col}>
              <span className="stat-label">{col}</span>
              <span className="stat-value">{valStr}</span>
              <span className="stat-subtext">{isMargin ? "Average of non-zero rows" : "Sum of all rows"}</span>
            </div>
          );
        })}
      </div>

      {/* Control selectors */}
      <div className="visualizer-controls-row">
        {textCols.length > 1 && (
          <div className="control-group">
            <label className="dropdown-label">Label Column (X-Axis)</label>
            <div className="select-container">
              <select value={activeXCol} onChange={(e) => setActiveXCol(e.target.value)} className="sheet-select">
                {textCols.map(col => (
                  <option key={col} value={col}>🏷️ {col}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="control-group">
          <label className="dropdown-label">Metrics to Compare</label>
          <div className="checkbox-options-row">
            {numericCols.slice(0, 8).map(col => (
              <label key={col} className={`checkbox-label ${selectedYCols.includes(col) ? "checked" : ""}`}>
                <input type="checkbox" checked={selectedYCols.includes(col)} onChange={() => handleYToggle(col)} />
                <span className="checkbox-custom"></span>
                {col}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Comparative chart card */}
      <div className="chart-card chart-card-wide">
        <h3 className="chart-card-title">📊 Multi-Metric Comparison (Top 15 Records)</h3>
        <div className="chart-card-body">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 9 }} />
              <YAxis stroke="var(--text-sub)" tickLine={false} tickFormatter={v => formatValue(v)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-sub)' }} formatter={v => [v.toLocaleString(), ""]} />
              <Legend verticalAlign="top" height={36} />
              {selectedYCols.map((col, idx) => (
                <Bar key={col} dataKey={col} fill={chartColors[idx % chartColors.length]} radius={[4, 4, 0, 0]} maxBarSize={32} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
