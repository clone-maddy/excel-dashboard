import React from "react";
import {
  LineChart, BarChart, PieChart, Line, Bar, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const chartColors = ["#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#F44336"];

export default function ChartDashboard({ data, columns, chartType }) {
  if (!data || data.length === 0) return <p>No data to display. Please upload an Excel sheet.</p>;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };
    // Recharts expects numbers for data values
    switch (chartType) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <XAxis dataKey={columns[0]} stroke="#e0e0e0" />
            <YAxis stroke="#e0e0e0" />
            <Tooltip contentStyle={{ backgroundColor: "#222", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Legend />
            {columns.slice(1).map((col, i) => (
              <Bar key={col} dataKey={col} fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case "pie":
        const pieData = data.map((row, idx) => ({
          name: String(row[columns[0]] || `Item ${idx}`),
          value: Number(row[columns[1]]) || 0,
        }));
        return (
          <PieChart>
            <Tooltip contentStyle={{ backgroundColor: "#222", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Legend />
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
              {pieData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            <XAxis dataKey={columns[0]} stroke="#e0e0e0" />
            <YAxis stroke="#e0e0e0" />
            <Tooltip contentStyle={{ backgroundColor: "#222", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Legend />
            {columns.slice(1).map((col, i) => (
              <Line key={col} type="monotone" dataKey={col} stroke={chartColors[i % chartColors.length]} activeDot={{ r: 8 }} />
            ))}
          </LineChart>
        );
    }
  };

  // Perform a small statistical summary/analysis of the columns
  const numericColumns = columns.filter((col) => {
    return data.some((row) => typeof row[col] === "number" || !isNaN(Number(row[col])));
  });

  return (
    <div className="chart-dashboard-container">
      <div className="chart-wrapper" style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
      </div>

      <div className="analysis-summary">
        <h3>💡 Quick Data Analysis</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Rows</span>
            <span className="stat-value">{data.length}</span>
          </div>
          {numericColumns.map((col) => {
            const values = data.map((row) => Number(row[col])).filter((val) => !isNaN(val));
            if (values.length === 0) return null;
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);

            return (
              <div key={col} className="stat-card">
                <span className="stat-label">{col} (Avg)</span>
                <span className="stat-value">{avg.toFixed(2)}</span>
                <span className="stat-subtext">Max: {max.toFixed(2)} | Min: {min.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
