import React, { useState, useMemo } from "react";

/**
 * Global FilterBar: search, category filters, date range, numeric range.
 * Sits between the toolbar and visualizations in App.jsx.
 */
export default function FilterBar({ rows, columns, columnTypes, onFilteredRows }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilters, setCategoryFilters] = useState({});  // { colName: Set(selected) }
  const [expandedDropdown, setExpandedDropdown] = useState(null);

  // Detect text columns with ≤30 unique values (good for category filters)
  const filterableTextCols = useMemo(() => {
    return columns
      .filter((col) => columnTypes[col] === "text")
      .map((col) => {
        const unique = new Set();
        for (let i = 0; i < rows.length && unique.size <= 30; i++) {
          const v = rows[i][col];
          if (v !== null && v !== undefined && String(v).trim() !== "") {
            unique.add(String(v).trim());
          }
        }
        return { col, values: [...unique].sort() };
      })
      .filter((item) => item.values.length >= 2 && item.values.length <= 30);
  }, [rows, columns, columnTypes]);

  // Apply all filters
  const applyFilters = () => {
    let filtered = rows;

    // Text search across all columns
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        return columns.some((col) => {
          const val = row[col];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(lower);
        });
      });
    }

    // Category filters
    Object.entries(categoryFilters).forEach(([col, selectedSet]) => {
      if (selectedSet.size > 0) {
        filtered = filtered.filter((row) => {
          const val = row[col];
          if (val === null || val === undefined) return false;
          return selectedSet.has(String(val).trim());
        });
      }
    });

    onFilteredRows(filtered);
  };

  // Re-apply whenever state changes
  React.useEffect(() => {
    applyFilters();
  }, [searchTerm, categoryFilters, rows]);

  const toggleCategory = (col, value) => {
    setCategoryFilters((prev) => {
      const current = new Set(prev[col] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [col]: current };
    });
  };

  const selectAllCategory = (col, values) => {
    setCategoryFilters((prev) => ({ ...prev, [col]: new Set(values) }));
  };

  const clearCategory = (col) => {
    setCategoryFilters((prev) => ({ ...prev, [col]: new Set() }));
  };

  const clearAll = () => {
    setSearchTerm("");
    setCategoryFilters({});
  };

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) +
    Object.values(categoryFilters).filter((s) => s.size > 0).length;

  return (
    <div className="filter-bar">
      <div className="filter-bar-header">
        <span className="filter-bar-title">🔍 Filters & Data Selection</span>
        {activeFilterCount > 0 && (
          <button className="filter-clear-btn" onClick={clearAll}>
            ✕ Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="filter-bar-controls">
        {/* Global Search */}
        <div className="filter-group filter-search-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search across all columns…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        {filterableTextCols.map(({ col, values }) => {
          const selected = categoryFilters[col] || new Set();
          const isOpen = expandedDropdown === col;
          return (
            <div className="filter-group" key={col}>
              <label className="filter-label">
                {col.length > 18 ? col.slice(0, 18) + "…" : col}
              </label>
              <div className="filter-dropdown-wrapper">
                <button
                  className={`filter-dropdown-trigger ${selected.size > 0 ? "active" : ""}`}
                  onClick={() => setExpandedDropdown(isOpen ? null : col)}
                >
                  {selected.size > 0 ? `${selected.size} selected` : "All"}
                  <span className="filter-chevron">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="filter-dropdown-menu">
                    <div className="filter-dropdown-actions">
                      <button onClick={() => selectAllCategory(col, values)}>Select All</button>
                      <button onClick={() => clearCategory(col)}>Clear</button>
                    </div>
                    <div className="filter-dropdown-options">
                      {values.map((val) => (
                        <label key={val} className="filter-option-label">
                          <input
                            type="checkbox"
                            checked={selected.has(val)}
                            onChange={() => toggleCategory(col, val)}
                          />
                          <span className="filter-option-text" title={val}>
                            {val.length > 28 ? val.slice(0, 28) + "…" : val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
