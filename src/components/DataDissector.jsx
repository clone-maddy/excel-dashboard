import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#6366f1","#06b6d4","#10b981","#f43f5e","#f59e0b","#8b5cf6","#ec4899","#0ea5e9","#84cc16","#f97316"];

const AGG = {
  sum:   (v) => v.reduce((a, b) => a + b, 0),
  avg:   (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
  count: (v) => v.length,
  max:   (v) => Math.max(...v),
  min:   (v) => Math.min(...v),
};

const parseNum = (val) => {
  if (typeof val === "number" && isFinite(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.-]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
};

const fmt = (num, aggFn) => {
  if (num === null || num === undefined || isNaN(num)) return "—";
  if (aggFn === "count") return num.toLocaleString();
  const abs = Math.abs(num);
  if (abs >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (abs >= 100000)   return (num / 100000).toFixed(2) + " L";
  if (abs >= 1000)     return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const TIP_STYLE = {
  backgroundColor: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#f8fafc",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  fontSize: "0.82rem",
  padding: "8px 12px",
};

export default function DataDissector({ data, columns, columnTypes }) {
  const textCols  = columns.filter(c => columnTypes[c] === "text");
  const numCols   = columns.filter(c => columnTypes[c] === "numeric");

  // Best default dimension: first text col with 2-40 unique values
  const bestDim = useMemo(() => {
    for (const col of textCols) {
      const u = new Set(data.map(r => r[col]).filter(v => v != null && String(v).trim() !== ""));
      if (u.size >= 2 && u.size <= 40) return col;
    }
    return textCols[0] || null;
  }, [data, textCols]);

  const [dim,    setDim]    = useState(bestDim);
  const [metric, setMetric] = useState(numCols[0] || null);
  const [aggFn,  setAggFn]  = useState("sum");
  const [chart,  setChart]  = useState("hbar");
  const [secDim, setSecDim] = useState("");
  const [topN,   setTopN]   = useState(15);
  const [showTbl, setShowTbl] = useState(true);

  // Primary grouped data
  const grouped = useMemo(() => {
    if (!dim || !metric) return [];
    const map = {};
    data.forEach(row => {
      const key = row[dim] != null ? String(row[dim]).trim() : "";
      if (!key) return;
      if (!map[key]) map[key] = [];
      const n = parseNum(row[metric]);
      if (n !== null) map[key].push(n);
    });
    const aggFnFn = AGG[aggFn] || AGG.sum;
    return Object.entries(map)
      .map(([name, vals]) => ({ name, value: aggFnFn(vals), count: vals.length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN > 0 ? topN : undefined);
  }, [data, dim, metric, aggFn, topN]);

  // Stacked secondary breakdown
  const stacked = useMemo(() => {
    if (!dim || !metric || !secDim || secDim === dim) return null;
    const map = {};
    const secVals = new Set();
    data.forEach(row => {
      const key = row[dim] != null ? String(row[dim]).trim() : "";
      const sk  = row[secDim] != null ? String(row[secDim]).trim() : "Other";
      if (!key) return;
      if (!map[key]) map[key] = {};
      if (!map[key][sk]) map[key][sk] = [];
      const n = parseNum(row[metric]);
      if (n !== null) { map[key][sk].push(n); secVals.add(sk); }
    });
    const aggFnFn = AGG[aggFn] || AGG.sum;
    const sVals = [...secVals].slice(0, 8);
    const rows = Object.entries(map).map(([name, subs]) => {
      const pt = { name };
      sVals.forEach(sv => { pt[sv] = subs[sv] ? aggFnFn(subs[sv]) : 0; });
      pt._total = sVals.reduce((s, sv) => s + (pt[sv] || 0), 0);
      return pt;
    }).sort((a, b) => b._total - a._total).slice(0, topN > 0 ? topN : undefined);
    return { rows, sVals };
  }, [data, dim, metric, secDim, aggFn, topN]);

  if (!dim || !metric) {
    return <p className="chart-empty">No groupable columns found. Need at least one text and one numeric column.</p>;
  }

  const grandTotal = grouped.reduce((s, r) => s + r.value, 0);
  const top = grouped[0];
  const isStack = !!stacked;

  const renderChart = () => {
    const chartData = isStack ? stacked.rows : grouped;

    if (chart === "pie") {
      return (
        <ResponsiveContainer width="100%" height={380}>
          <PieChart>
            <Tooltip contentStyle={TIP_STYLE} formatter={(v) => [fmt(v, aggFn), metric]} />
            <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
            <Pie data={grouped} dataKey="value" nameKey="name" innerRadius={75} outerRadius={140} paddingAngle={2} label={({ name, percent }) => `${name.slice(0,12)} ${(percent*100).toFixed(1)}%`} labelLine={false}>
              {grouped.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chart === "hbar") {
      const h = Math.max(320, chartData.length * 38);
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" stroke="var(--text-sub)" tickLine={false} tickFormatter={v => fmt(v, aggFn)} tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="name" stroke="var(--text-sub)" tickLine={false} width={160} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={TIP_STYLE} formatter={(v, n) => [fmt(v, aggFn), n === "value" ? metric : n]} />
            {isStack && <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "0.78rem" }} />}
            {isStack
              ? stacked.sVals.map((sv, i) => <Bar key={sv} dataKey={sv} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === stacked.sVals.length - 1 ? [0,4,4,0] : undefined} />)
              : <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={28}>{grouped.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
            }
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // vbar
    return (
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 65 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 9, angle: -35, textAnchor: "end" }} interval={0} />
          <YAxis stroke="var(--text-sub)" tickLine={false} tickFormatter={v => fmt(v, aggFn)} tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={TIP_STYLE} formatter={(v, n) => [fmt(v, aggFn), n === "value" ? metric : n]} />
          {isStack && <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "0.78rem" }} />}
          {isStack
            ? stacked.sVals.map((sv, i) => <Bar key={sv} dataKey={sv} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === stacked.sVals.length - 1 ? [4,4,0,0] : undefined} />)
            : <Bar dataKey="value" radius={[5,5,0,0]} maxBarSize={40}>{grouped.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
          }
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="data-dissector">
      <div className="dissector-header">
        <span className="dissector-title">🔬 Data Dissector</span>
        <span className="dissector-subtitle">Group, slice, and aggregate any dimension</span>
      </div>

      {/* Controls Grid */}
      <div className="dissector-controls">
        <div className="dissector-ctrl">
          <label className="filter-label">Group By</label>
          <div className="select-container">
            <select value={dim} onChange={e => setDim(e.target.value)} className="sheet-select">
              {textCols.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        </div>

        <div className="dissector-ctrl">
          <label className="filter-label">Metric</label>
          <div className="select-container">
            <select value={metric} onChange={e => setMetric(e.target.value)} className="sheet-select">
              {numCols.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        </div>

        <div className="dissector-ctrl">
          <label className="filter-label">Aggregate</label>
          <div className="select-container">
            <select value={aggFn} onChange={e => setAggFn(e.target.value)} className="sheet-select">
              <option value="sum">∑ Sum</option>
              <option value="avg">⌀ Average</option>
              <option value="count"># Count</option>
              <option value="max">↑ Max</option>
              <option value="min">↓ Min</option>
            </select>
          </div>
        </div>

        <div className="dissector-ctrl">
          <label className="filter-label">Stack / Split By</label>
          <div className="select-container">
            <select value={secDim} onChange={e => setSecDim(e.target.value)} className="sheet-select">
              <option value="">— None —</option>
              {textCols.filter(c => c !== dim).map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        </div>

        <div className="dissector-ctrl">
          <label className="filter-label">Show</label>
          <div className="select-container">
            <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="sheet-select">
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
              <option value={0}>All</option>
            </select>
          </div>
        </div>

        <div className="dissector-ctrl">
          <label className="filter-label">Chart</label>
          <div className="chart-type-pills">
            {[["hbar","━ H.Bar"],["vbar","▐ V.Bar"],["pie","◉ Pie"]].map(([v, l]) => (
              <button key={v} className={`chart-type-pill ${chart === v ? "active" : ""}`} onClick={() => setChart(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stats-strip mini-stats">
        <div className="stat-card">
          <span className="stat-label">Groups</span>
          <span className="stat-value">{grouped.length}</span>
          <span className="stat-subtext">Unique {dim.length > 18 ? dim.slice(0,18)+"…" : dim}</span>
        </div>
        {top && (
          <div className="stat-card">
            <span className="stat-label">🏆 Top</span>
            <span className="stat-value">{fmt(top.value, aggFn)}</span>
            <span className="stat-subtext">{top.name.length > 22 ? top.name.slice(0,22)+"…" : top.name}</span>
          </div>
        )}
        {aggFn !== "count" && (
          <div className="stat-card">
            <span className="stat-label">Grand {aggFn === "avg" ? "Avg" : "Total"}</span>
            <span className="stat-value">{fmt(aggFn === "avg" ? grandTotal / (grouped.length || 1) : grandTotal, aggFn)}</span>
            <span className="stat-subtext">Across all groups</span>
          </div>
        )}
        {top && grandTotal > 0 && aggFn === "sum" && (
          <div className="stat-card">
            <span className="stat-label">Top Share</span>
            <span className="stat-value">{((top.value / grandTotal) * 100).toFixed(1)}%</span>
            <span className="stat-subtext">{top.name.length > 16 ? top.name.slice(0,16)+"…" : top.name}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="chart-card chart-card-wide">
        <h3 className="chart-card-title">
          {aggFn.charAt(0).toUpperCase()+aggFn.slice(1)} of <em>{metric}</em> by <em>{dim}</em>
          {secDim && secDim !== dim ? <> ▸ <em>{secDim}</em></> : null}
          {topN > 0 ? <span className="chart-title-badge">Top {topN}</span> : null}
        </h3>
        <div className="chart-card-body">{renderChart()}</div>
      </div>

      {/* Results Table */}
      <div className="dissector-table-card">
        <button className="dissector-table-toggle" onClick={() => setShowTbl(t => !t)}>
          <span>📋 Grouped Results Table ({grouped.length} groups)</span>
          <span className="filter-chevron">{showTbl ? "▲" : "▼"}</span>
        </button>
        {showTbl && (
          <div className="dissector-table-scroll">
            <table className="dissector-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{dim}</th>
                  <th>{aggFn.toUpperCase()} of {metric}</th>
                  <th>Records</th>
                  <th>Share %</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row, i) => (
                  <tr key={i} className={i === 0 ? "top-row" : ""}>
                    <td>{i + 1}</td>
                    <td className="dim-cell">{row.name}</td>
                    <td className="num-cell">{fmt(row.value, aggFn)}</td>
                    <td className="num-cell">{row.count}</td>
                    <td className="num-cell share-cell">
                      {grandTotal > 0 && aggFn === "sum" ? (
                        <>
                          <span className="share-bar" style={{ width: `${(row.value / grandTotal) * 100}%`, background: COLORS[i % COLORS.length] }} />
                          {((row.value / grandTotal) * 100).toFixed(1)}%
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
