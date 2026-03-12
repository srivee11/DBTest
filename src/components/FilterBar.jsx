import React from 'react';

const DATE_RANGES = [
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_12_months', label: 'Last 12 months' },
  { id: 'all_time', label: 'All time' }
];

const COMPARISON = [
  { id: 'previous_period', label: 'Previous period' },
  { id: 'none', label: 'No comparison' }
];

const GRANULARITY = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' }
];

const AGE_RANGES = ['13–17', '18–24', '25–34', '35–44', '45–54', '55+'];

export function FilterBar({ filters, onChange }) {
  const update = (partial) => onChange({ ...filters, ...partial });

  return (
    <div className="filterbar">
      <FilterGroup label="Date range">
        {DATE_RANGES.map((opt) => (
          <FilterPill
            key={opt.id}
            active={filters.dateRange === opt.id}
            onClick={() => update({ dateRange: opt.id })}
          >
            {opt.label}
          </FilterPill>
        ))}
      </FilterGroup>

      <FilterGroup label="Comparison period">
        {COMPARISON.map((opt) => (
          <FilterPill
            key={opt.id}
            active={filters.comparisonPeriod === opt.id}
            onClick={() => update({ comparisonPeriod: opt.id })}
          >
            {opt.label}
          </FilterPill>
        ))}
      </FilterGroup>

      <FilterGroup label="Granularity">
        {GRANULARITY.map((opt) => (
          <FilterPill
            key={opt.id}
            active={filters.granularity === opt.id}
            onClick={() => update({ granularity: opt.id })}
          >
            {opt.label}
          </FilterPill>
        ))}
      </FilterGroup>

      <FilterGroup label="Audience age range">
        <select
          className="filter-select"
          value=""
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return;
            if (filters.ageRange.includes(value)) return;
            update({ ageRange: [...filters.ageRange, value] });
          }}
        >
          <option value="">Select values…</option>
          {AGE_RANGES.map((age) => (
            <option key={age} value={age}>
              {age}
            </option>
          ))}
        </select>
        <div className="filter-chips">
          {filters.ageRange.map((age) => (
            <button
              key={age}
              type="button"
              className="pill pill-selected"
              onClick={() =>
                update({ ageRange: filters.ageRange.filter((a) => a !== age) })
              }
            >
              {age}
              <span className="pill-close">×</span>
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="filter-group">
      <div className="filter-label">{label}</div>
      <div className="filter-controls">{children}</div>
    </div>
  );
}

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`pill ${active ? 'pill-selected' : 'pill-outline'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

