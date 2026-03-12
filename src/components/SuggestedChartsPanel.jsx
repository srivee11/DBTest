import React from 'react';

export function SuggestedChartsPanel({ suggestions, selectedId, onSelect }) {
  return (
    <div className="panel-root">
      <div className="panel-header">
        <h2>Suggestions</h2>
        <span className="panel-subtitle">
          Pick a starting point. You can always refine later.
        </span>
      </div>
      {suggestions.length === 0 ? (
        <div className="panel-empty">
          <p>No suggestions yet.</p>
          <p className="panel-hint">Ask a question in the conversation panel to see options.</p>
        </div>
      ) : (
        <div className="suggestion-grid">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`suggestion-card ${selectedId === s.id ? 'is-selected' : ''}`}
              onClick={() => onSelect(s)}
            >
              {s.isPrimary && <span className="suggestion-badge">Recommended</span>}
              <div className="suggestion-chart-thumb suggestion-chart-thumb--bar">
                <div className="thumb-bar thumb-bar-1" />
                <div className="thumb-bar thumb-bar-2" />
                <div className="thumb-bar thumb-bar-3" />
              </div>
              <div className="suggestion-content">
                <h3>{s.title}</h3>
                <p>{s.subtitle}</p>
                <dl className="suggestion-meta">
                  <div>
                    <dt>Metric</dt>
                    <dd>{s.metricLabel}</dd>
                  </div>
                  <div>
                    <dt>Breakdown</dt>
                    <dd>{s.breakdownLabel}</dd>
                  </div>
                  {s.filtersLabel && (
                    <div>
                      <dt>Filters</dt>
                      <dd>{s.filtersLabel}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

