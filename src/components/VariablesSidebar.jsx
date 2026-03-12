import React from 'react';

export function VariablesSidebar({ filters, datasetId, onDatasetChange, onExport }) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Variables</h3>
        <div className="sidebar-chips">
          <SidebarChip label="comparison_period" value={filters.comparisonPeriod} />
          <SidebarChip label="date_range" value={filters.dateRange} />
          <SidebarChip
            label="selected_age_groups"
            value={
              filters.ageRange && filters.ageRange.length
                ? filters.ageRange.join(', ')
                : 'All'
            }
          />
          <SidebarChip label="selected_granularity" value={filters.granularity} />
          <SidebarChip label="dataset" value={datasetId} />
        </div>
      </div>
      <div className="sidebar-section">
        <h3>Datasets</h3>
        <div className="sidebar-datasets">
          <div className="sidebar-datasets-row">
            <button
              type="button"
              className={`dataset-pill ${
                datasetId === 'retail_store' ? '' : 'dataset-pill-muted'
              }`}
              onClick={() => onDatasetChange('retail_store')}
            >
              Retail store (demo)
            </button>
            <button
              type="button"
              className={`dataset-pill ${
                datasetId === 'spotify_artist' ? '' : 'dataset-pill-muted'
              }`}
              onClick={() => onDatasetChange('spotify_artist')}
            >
              Spotify artist (demo)
            </button>
          </div>
          <button
            type="button"
            className="btn-secondary sidebar-export-btn"
            onClick={() => onExport && onExport()}
          >
            Export as CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarChip({ label, value }) {
  return (
    <div className="sidebar-chip">
      <span className="sidebar-chip-label">{label}</span>
      <span className="sidebar-chip-value">{String(value || '—')}</span>
    </div>
  );
}

