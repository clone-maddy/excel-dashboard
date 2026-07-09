import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getTextFrequencies } from "../utils/parseSheet";

const barColors = ["#6366f1", "#06b6d4", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#a855f7"];

const tooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#f8fafc",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  fontSize: "0.82rem",
  padding: "8px 12px",
};

export default function TextAnalysis({ data, columns, columnTypes }) {
  const textCols = columns.filter((col) => columnTypes[col] === "text");
  const [activeCol, setActiveCol] = useState(textCols[0] || "");

  if (textCols.length === 0) return null;

  const freqData = activeCol ? getTextFrequencies(data, activeCol, 10) : [];
  const maxLen = 25;

  return (
    <div className="text-analysis">
      <div className="text-analysis-header">
        <h3>📝 Text Frequency Analysis</h3>
        <div className="select-container">
          <select value={activeCol} onChange={(e) => setActiveCol(e.target.value)} className="sheet-select">
            {textCols.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      </div>

      {freqData.length > 0 ? (
        <div className="text-analysis-body">
          <ResponsiveContainer width="100%" height={Math.max(200, freqData.length * 38)}>
            <BarChart data={freqData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                stroke="var(--text-sub)"
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.length > maxLen ? v.slice(0, maxLen) + "…" : v}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {freqData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="freq-table">
            {freqData.map((item, i) => (
              <div key={i} className="freq-row">
                <span className="freq-dot" style={{ background: barColors[i % barColors.length] }}></span>
                <span className="freq-name" title={item.name}>{item.name}</span>
                <span className="freq-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="chart-empty">No text data found for this column.</p>
      )}
    </div>
  );
}
