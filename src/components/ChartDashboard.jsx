import React, { useState } from "react";
import { AreaChartSection, BarChartSection, PieChartSection } from "./StandardCharts";
import WeeklyMatrixVisualizer from "./WeeklyMatrixVisualizer";
import AgingVisualizer from "./AgingVisualizer";
import TabularVisualizer from "./TabularVisualizer";
import TextAnalysis from "./TextAnalysis";
import DataDissector from "./DataDissector";
import { classifySheetMode } from "../utils/parseSheet";

export default function ChartDashboard({ data, columns, columnTypes, allColumns }) {
  const [activeTab, setActiveTab] = useState("smart");
  const vizColumns = allColumns || columns;
  const sheetMode = classifySheetMode(vizColumns, data, columnTypes);

  const numericCols = columns.filter((col) => columnTypes[col] === "numeric");
  const textCols = columns.filter((col) => columnTypes[col] === "text");

  console.log(`Detected Sheet Classification: ${sheetMode}`);

  return (
    <div className="dynamic-dashboard-wrapper">
      <div className="dashboard-header-row">
        <div className="sheet-mode-banner">
          <span className="mode-badge">
            {sheetMode === "weeklyMatrix" && "📅 Chronological Matrix Mode"}
            {sheetMode === "aging" && "⚠️ Receivable Aging Risk Analytics"}
            {sheetMode === "tabular" && "📊 Tabular Multi-Metric Comparison"}
            {sheetMode === "tracker" && "📋 Status Tracking Analytics"}
            {sheetMode === "standard" && "⚙️ Standard Data Visualization"}
          </span>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === "smart" ? "active" : ""}`}
            onClick={() => setActiveTab("smart")}
          >
            🎯 Smart Analytics
          </button>
          <button
            className={`dashboard-tab ${activeTab === "dissect" ? "active" : ""}`}
            onClick={() => setActiveTab("dissect")}
          >
            🔬 Custom Data Dissector
          </button>
        </div>
      </div>

      {activeTab === "smart" ? (
        <div className="tab-content-panel">
          {sheetMode === "weeklyMatrix" && (
            <WeeklyMatrixVisualizer data={data} columns={vizColumns} columnTypes={columnTypes} />
          )}

          {sheetMode === "aging" && (
            <AgingVisualizer data={data} columns={vizColumns} columnTypes={columnTypes} />
          )}

          {sheetMode === "tabular" && (
            <TabularVisualizer data={data} columns={vizColumns} columnTypes={columnTypes} />
          )}

          {sheetMode === "tracker" && (
            <div className="tracker-mode-layout">
              <TextAnalysis data={data} columns={vizColumns} columnTypes={columnTypes} />
            </div>
          )}

          {sheetMode === "standard" && (
            <div className="standard-mode-layout">
              {numericCols.length > 0 ? (
                <div className="charts-grid">
                  <div className="chart-card">
                    <h3 className="chart-card-title">📈 Area Chart</h3>
                    <div className="chart-card-body">
                      <AreaChartSection data={data} columns={columns} columnTypes={columnTypes} />
                    </div>
                  </div>
                  <div className="chart-card">
                    <h3 className="chart-card-title">📊 Bar Chart</h3>
                    <div className="chart-card-body">
                      <BarChartSection data={data} columns={columns} columnTypes={columnTypes} />
                    </div>
                  </div>
                  <div className="chart-card chart-card-wide">
                    <h3 className="chart-card-title">🍩 Donut Chart</h3>
                    <div className="chart-card-body">
                      <PieChartSection data={data} columns={columns} columnTypes={columnTypes} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-numeric-banner">
                  <div className="banner-content">
                    <span className="banner-icon">📊</span>
                    <div>
                      <h3>No Numeric Data Detected</h3>
                      <p>This sheet contains text data. The preview table below displays the raw rows.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="tab-content-panel">
          <DataDissector data={data} columns={vizColumns} columnTypes={columnTypes} />
        </div>
      )}
    </div>
  );
}
