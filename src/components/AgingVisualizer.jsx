import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const chartColors = ["#10b981", "#fbbf24", "#f97316", "#ef4444", "#8b5cf6", "#3b82f6"];

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

const parseNumber = (val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const clean = val.replace(/[^\d.-]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const formatCurrency = (num) => {
  if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + " L";
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

export default function AgingVisualizer({ data, columns, columnTypes }) {
  const partyCol = columns.find((c) => columnTypes[c] === "text") || columns[0];

  const agingKeywords = ["less than", "more than", "aging", "overdue", "bucket", "outstanding"];
  const agingCols = columns.filter((col) => {
    const lower = col.toLowerCase();
    const isBracketNumber = /^[0-9]+$/.test(lower.trim()) && ["30", "60", "90", "120", "180"].includes(lower.trim());
    const hasKeyword = agingKeywords.some((kw) => lower.includes(kw));
    return (hasKeyword || isBracketNumber) && columnTypes[col] === "numeric" && !lower.includes("total");
  });

  const totalCol = columns.find((c) => c.toLowerCase().includes("total") && columnTypes[c] === "numeric") || agingCols[0];

  // Filters
  const [partySearch, setPartySearch] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [topN, setTopN] = useState(10);
  const [selectedBracket, setSelectedBracket] = useState("all");

  // Filtered data
  const filteredData = useMemo(() => {
    let result = data;
    if (partySearch.trim()) {
      const lower = partySearch.toLowerCase();
      result = result.filter((row) => {
        const val = row[partyCol];
        return val && String(val).toLowerCase().includes(lower);
      });
    }
    return result;
  }, [data, partySearch, partyCol]);

  // Bracket totals (from filtered data)
  const bracketTotals = agingCols.map((col) => {
    const sum = filteredData.reduce((acc, row) => acc + parseNumber(row[col]), 0);
    const displayName = col.includes(">") ? col.split(">")[1].trim() : col;
    return { name: displayName, col, value: Math.round(sum) };
  }).filter((b) => b.value > 0);

  const grandTotal = filteredData.reduce((acc, row) => acc + parseNumber(row[totalCol]), 0);

  // Top parties (sorted & limited)
  const sortColumn = selectedBracket !== "all" ? selectedBracket : totalCol;
  const topParties = useMemo(() => {
    return filteredData
      .map((row) => {
        const entry = {
          name: String(row[partyCol] || "Unknown").trim(),
          value: parseNumber(row[sortColumn]),
        };
        if (entry.name.length > 28) entry.name = entry.name.slice(0, 28) + "…";
        return entry;
      })
      .filter((p) => p.name && p.value > 0)
      .sort((a, b) => (sortDir === "desc" ? b.value - a.value : a.value - b.value))
      .slice(0, topN);
  }, [filteredData, partyCol, sortColumn, sortDir, topN]);

  return (
    <div className="aging-visualizer-container">
      {/* KPIs */}
      <div className="stats-strip">
        <div className="stat-card">
          <span className="stat-label">Total Receivables</span>
          <span className="stat-value">{formatCurrency(grandTotal)}</span>
          <span className="stat-subtext">{filteredData.length} parties</span>
        </div>
        {bracketTotals.slice(0, 3).map((b, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-label">{b.name} Bracket</span>
            <span className="stat-value">{formatCurrency(b.value)}</span>
            <span className="stat-subtext">{Math.round((b.value / (grandTotal || 1)) * 100)}% of total</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="visualizer-controls-row">
        <div className="control-group">
          <label className="dropdown-label">🔍 Search Party</label>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search party name…"
            value={partySearch}
            onChange={(e) => setPartySearch(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label className="dropdown-label">Sort Bracket</label>
          <div className="range-selectors">
            <div className="select-container">
              <select value={selectedBracket} onChange={(e) => setSelectedBracket(e.target.value)} className="sheet-select mini-select">
                <option value="all">Total Balance</option>
                {agingCols.map((col) => (
                  <option key={col} value={col}>{col.includes(">") ? col.split(">")[1].trim() : col}</option>
                ))}
              </select>
            </div>
            <button className={`sort-toggle-btn ${sortDir === "desc" ? "active" : ""}`} onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}>
              {sortDir === "desc" ? "↓ High→Low" : "↑ Low→High"}
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="dropdown-label">Show</label>
          <div className="select-container">
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} className="sheet-select mini-select">
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
              <option value={0}>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">🍩 Debt Bracket Distribution</h3>
          <div className="chart-card-body">
            {bracketTotals.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-sub)' }} formatter={(v) => [formatCurrency(v), "Amount"]} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                  <Pie data={bracketTotals} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                    {bracketTotals.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">No bracket data found.</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">📊 {topN > 0 ? `Top ${topN}` : "All"} Parties — {selectedBracket !== "all" ? (selectedBracket.includes(">") ? selectedBracket.split(">")[1].trim() : selectedBracket) : "Total Balance"}</h3>
          <div className="chart-card-body">
            {topParties.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, topParties.length * 30)}>
                <BarChart data={topParties} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-sub)" tickLine={false} tickFormatter={formatCurrency} tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-sub)" tickLine={false} width={140} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-sub)' }} formatter={(v) => [formatCurrency(v), "Outstanding"]} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 5, 5, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">No matching parties found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
