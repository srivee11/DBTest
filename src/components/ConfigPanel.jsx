import React from 'react';

const REGIONS = ['North', 'South', 'East', 'West'];

export function ConfigPanel({ config, onChange }) {
  if (!config) {
    return (
      <div className="panel-root config-panel">
        <div className="panel-header">
          <h2>Configuration</h2>
        </div>
        <div className="panel-empty">
          <p>No configuration yet.</p>
          <p className="panel-hint">Pick a suggested chart to see and tweak its settings.</p>
        </div>
      </div>
    );
  }

  const { filters = {} } = config;

  const handleRegionToggle = (region) => {
    const set = new Set(filters.region || []);
    if (set.has(region)) {
      set.delete(region);
    } else {
      set.add(region);
    }
    onChange({ filters: { ...filters, region: Array.from(set) } });
  };

  const handleTopNChange = (value) => {
    const n = Number(value);
    if (!value) {
      const { topN, ...rest } = filters;
      onChange({ filters: rest });
      return;
    }
    if (Number.isNaN(n)) return;
    onChange({ filters: { ...filters, topN: n } });
  };

  return (
    <div className="panel-root config-panel">
      <div className="panel-header">
        <h2>Configuration</h2>
        <span className="panel-subtitle">Adjust filters and focus areas.</span>
      </div>

      <div className="config-section">
        <h3>Time</h3>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${filters.timeRange === 'this_quarter' ? 'is-selected' : ''}`}
            onClick={() =>
              onChange({
                filters: {
                  ...filters,
                  timeRange: filters.timeRange === 'this_quarter' ? undefined : 'this_quarter'
                }
              })
            }
          >
            This quarter
          </button>
        </div>
      </div>

      <div className="config-section">
        <h3>Regions</h3>
        <div className="chip-row">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`chip ${
                Array.isArray(filters.region) && filters.region.includes(r) ? 'is-selected' : ''
              }`}
              onClick={() => handleRegionToggle(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h3>Focus</h3>
        <label className="field-label" htmlFor="top-n">
          Top N categories/products
        </label>
        <input
          id="top-n"
          className="field-input"
          type="number"
          min="1"
          max="20"
          placeholder="e.g. 5"
          value={filters.topN ?? ''}
          onChange={(e) => handleTopNChange(e.target.value)}
        />
      </div>
    </div>
  );
}

