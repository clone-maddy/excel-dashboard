import React, { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

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

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "—";
  if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + " L";
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toFixed(2);
};

const parseVal = (rawVal) => {
  if (typeof rawVal === "number") return rawVal;
  if (typeof rawVal === "string") {
    const clean = rawVal.replace(/[^\d.-]/g, "");
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  }
  return null;
};

export default function WeeklyMatrixVisualizer({ data, columns, columnTypes }) {
  const labelCol = columns.find((c) => columnTypes[c] === "text") || columns[0];

  const weekRegex = /(week|wk|month|qtr|quarter|yr|year|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i;
  const chronoCols = columns.filter((col) => {
    return weekRegex.test(col) && !col.toLowerCase().includes("party") && !col.toLowerCase().includes("client");
  });

  const rowLabels = useMemo(() => {
    return data.map((row, idx) => {
      const val = row[labelCol];
      return {
        label: val !== null && val !== undefined && String(val).trim() !== "" ? String(val).trim() : `Row ${idx + 1}`,
        index: idx,
      };
    }).filter((item) => item.label);
  }, [data, labelCol]);

  // State: selected rows (multi-compare), week range
  const [selectedRows, setSelectedRows] = useState([0]);
  const [weekStart, setWeekStart] = useState(0);
  const [weekEnd, setWeekEnd] = useState(Math.min(chronoCols.length - 1, 14));

  if (chronoCols.length === 0) {
    return <p className="chart-empty">No chronological columns detected for Weekly Matrix view.</p>;
  }

  // Clamp week range
  const startIdx = Math.max(0, Math.min(weekStart, chronoCols.length - 1));
  const endIdx = Math.max(startIdx, Math.min(weekEnd, chronoCols.length - 1));
  const visibleCols = chronoCols.slice(startIdx, endIdx + 1);

  // Build chart data with multiple series
  const chartData = visibleCols.map((col) => {
    const point = { week: col };
    selectedRows.forEach((rowIdx) => {
      const row = data[rowIdx];
      if (row) {
        const label = rowLabels.find((r) => r.index === rowIdx)?.label || `Row ${rowIdx}`;
        point[label] = parseVal(row[col]);
      }
    });
    return point;
  });

  const seriesNames = selectedRows.map((idx) => rowLabels.find((r) => r.index === idx)?.label || `Row ${idx}`);

  // KPI stats for the first selected row
  const primaryRow = data[selectedRows[0]];
  const primaryValues = primaryRow ? visibleCols.map((col) => parseVal(primaryRow[col])).filter((v) => v !== null) : [];
  const total = primaryValues.reduce((a, b) => a + b, 0);
  const avg = primaryValues.length > 0 ? total / primaryValues.length : 0;
  const maxVal = primaryValues.length > 0 ? Math.max(...primaryValues) : 0;

  const toggleRow = (idx) => {
    setSelectedRows((prev) => {
      if (prev.includes(idx)) {
        return prev.length > 1 ? prev.filter((r) => r !== idx) : prev;
      }
      return prev.length < 5 ? [...prev, idx] : prev;
    });
  };

  return (
    <div className="weekly-matrix-container">
      {/* Controls Row */}
      <div className="visualizer-controls-row">
        <div className="control-group">
          <label className="dropdown-label">📊 Metrics to Plot (max 5)</label>
          <div className="select-container">
            <select
              value=""
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (!isNaN(idx)) toggleRow(idx);
              }}
              className="sheet-select row-metric-select"
            >
              <option value="" disabled>+ Add metric…</option>
              {rowLabels.filter((item) => !selectedRows.includes(item.index)).map((item) => (
                <option key={item.index} value={item.index}>📈 {item.label}</option>
              ))}
            </select>
          </div>
          <div className="selected-tags">
            {selectedRows.map((idx) => {
              const label = rowLabels.find((r) => r.index === idx)?.label || `Row ${idx}`;
              return (
                <span key={idx} className="metric-tag">
                  {label}
                  {selectedRows.length > 1 && (
                    <button className="tag-remove" onClick={() => toggleRow(idx)}>✕</button>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="control-group">
          <label className="dropdown-label">📅 Week Range ({visibleCols.length} periods)</label>
          <div className="range-selectors">
            <div className="select-container">
              <select value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value))} className="sheet-select mini-select">
                {chronoCols.map((col, i) => (
                  <option key={i} value={i}>From: {col}</option>
                ))}
              </select>
            </div>
            <span className="range-arrow">→</span>
            <div className="select-container">
              <select value={weekEnd} onChange={(e) => setWeekEnd(Number(e.target.value))} className="sheet-select mini-select">
                {chronoCols.map((col, i) => (
                  <option key={i} value={i} disabled={i < weekStart}>To: {col}</option>
                ))}
              </select>
            </div>
            <button className="filter-clear-btn mini-btn" onClick={() => { setWeekStart(0); setWeekEnd(chronoCols.length - 1); }}>All</button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="stats-strip mini-stats">
        <div className="stat-card">
          <span className="stat-label">Period Total</span>
          <span className="stat-value">{formatNumber(total)}</span>
          <span className="stat-subtext">{visibleCols.length} periods summed</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Period Average</span>
          <span className="stat-value">{formatNumber(avg)}</span>
          <span className="stat-subtext">Mean per period</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peak Value</span>
          <span className="stat-value">{formatNumber(maxVal)}</span>
          <span className="stat-subtext">Maximum in range</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Visible Periods</span>
          <span className="stat-value">{visibleCols.length}</span>
          <span className="stat-subtext">of {chronoCols.length} total</span>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-card chart-card-wide">
        <h3 className="chart-card-title">
          📈 {selectedRows.length > 1 ? "Multi-Metric Comparison" : `Trend — ${seriesNames[0]}`}
        </h3>
        <div className="chart-card-body">
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                {seriesNames.map((name, i) => (
                  <linearGradient key={`grad-wk-${i}`} id={`grad-wk-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 9 }} tickFormatter={formatNumber} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-sub)' }} formatter={(v, name) => [v !== null ? v.toLocaleString() : "N/A", name]} />
              {seriesNames.length > 1 && <Legend verticalAlign="top" height={36} />}
              {seriesNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#grad-wk-${i})`}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
