import React, { useMemo, useState } from 'react';
import datasets from './data/spotify_artist.json';
import { TopBar } from './components/TopBar.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { KpiCards } from './components/KpiCards.jsx';
import { AgeDonutChart } from './components/AgeDonutChart.jsx';
import { DataChatPanel } from './components/DataChatPanel.jsx';
import { TracksTable } from './components/TracksTable.jsx';
import { VariablesSidebar } from './components/VariablesSidebar.jsx';
import { applyFilters } from './logic/applyFilters.js';

export default function App() {
  const [filters, setFilters] = useState({
    dateRange: 'last_12_months',
    comparisonPeriod: 'previous_period',
    granularity: 'month',
    ageRange: []
  });
  const [datasetId, setDatasetId] = useState('retail_store');

  const activeDataset = datasets[datasetId];
  const rawRows = activeDataset?.rows || [];

  const spotifyRows = datasets.spotify_artist.rows;
  const retailRows = datasets.retail_store.rows;

  const spotifyFiltered = useMemo(
    () => applyFilters(spotifyRows, filters, 'spotify_artist'),
    [spotifyRows, filters]
  );

  const retailFiltered = useMemo(
    () => applyFilters(retailRows, filters, 'retail_store'),
    [retailRows, filters]
  );

  const filteredData = useMemo(
    () => (datasetId === 'retail_store' ? retailFiltered : spotifyFiltered),
    [datasetId, retailFiltered, spotifyFiltered]
  );

  const handleExport = () => {
    const baseDataset = datasets[datasetId];
    const baseRows = baseDataset?.rows || [];
    const rowsToExport = applyFilters(baseRows, filters, datasetId);
    if (!rowsToExport || !rowsToExport.length) return;

    let columns;
    if (datasetId === 'retail_store') {
      columns = datasets.retail_store.columns;
    } else {
      // derive columns from spotify rows to avoid mismatch
      const colSet = new Set();
      rowsToExport.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (key !== 'id') colSet.add(key);
        });
      });
      columns = Array.from(colSet);
    }

    const header = columns.join(',');
    const lines = rowsToExport.map((row) =>
      columns
        .map((col) => {
          const raw = row[col] ?? '';
          const value =
            typeof raw === 'string'
              ? `"${raw.replace(/"/g, '""')}"`
              : String(raw);
          return value;
        })
        .join(',')
    );

    const csvContent = [header, ...lines].join('\n');

    // create a unique filename per export to avoid overwriting
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '_')
      .slice(0, 15);
    const filename = `databrain_${datasetId}_${timestamp}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-root">
      <TopBar />
      <main className="app-main dashboard-layout">
        <div className="dashboard-main">
          <div className="controls-band">
            <FilterBar filters={filters} onChange={setFilters} />
            {/* Space reserved for future header actions (Save view, Share, etc.) */}
            <div className="controls-actions" />
          </div>
          <div className="kpi-band">
            <KpiCards data={filteredData} filters={filters} datasetId={datasetId} />
          </div>
          <DataChatPanel datasetId={datasetId} data={filteredData} titleSuffix="(V1)" />
          <DataChatPanel
            datasetId={datasetId}
            data={filteredData}
            enableModes
            titleSuffix="(V2)"
          />
          <DataChatPanel
            datasetId={datasetId}
            data={filteredData}
            titleOverride="Discover Agent"
            subtitleOverride="Discover Agent – continuously monitors your KPIs and automatically drills into segments when something moves."
            variant="discover"
          />
          <div className="dashboard-grid">
            <section className="grid-table">
              <TracksTable data={filteredData} datasetId={datasetId} />
            </section>
            <section className="grid-chart">
              <AgeDonutChart data={filteredData} datasetId={datasetId} />
            </section>
          </div>
        </div>
        <aside className="dashboard-sidebar">
          <VariablesSidebar
            filters={filters}
            datasetId={datasetId}
            onDatasetChange={setDatasetId}
            onExport={handleExport}
          />
        </aside>
      </main>
    </div>
  );
}
