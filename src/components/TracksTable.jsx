import React, { useMemo, useState } from 'react';

export function TracksTable({ data, datasetId }) {
  const [sortBy, setSortBy] = useState('track_name');
  const [sortDir, setSortDir] = useState('asc');

  const columns =
    datasetId === 'retail_store'
      ? [
          { id: 'productName', label: 'Product name' },
          { id: 'category', label: 'Category' },
          { id: 'salesAmount', label: 'Sales amount' },
          { id: 'dateSold', label: 'Date sold' },
          { id: 'region', label: 'Region' }
        ]
      : [
          { id: 'track_name', label: 'Track name' },
          { id: 'date_released', label: 'Date released' },
          { id: 'duration_minutes', label: 'Duration (min)' },
          { id: 'revenue_from_royalties', label: 'Revenue from royalties' },
          { id: 'genre', label: 'Genre' },
          { id: 'artist_name', label: 'Artist name' }
        ];

  const sortedRows = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }, [data, sortBy, sortDir]);

  const toggleSort = (id) => {
    if (sortBy !== id) {
      setSortBy(id);
      setSortDir('asc');
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  const tableTitle = datasetId === 'retail_store' ? 'Retail data' : 'Spotify tracks';
  const emptyMessage =
    datasetId === 'retail_store'
      ? 'No retail data matches the current filters. Try adjusting date or region.'
      : 'No Spotify data matches the current filters. Try adjusting date or audience range.';

  return (
    <div className="panel-root table-card">
      <div className="panel-header">
        <h2>{tableTitle}</h2>
      </div>
      <div className="table-wrapper">
        {sortedRows.length === 0 ? (
          <div className="panel-empty">
            {emptyMessage}
          </div>
        ) : (
          <table className="tracks-table">
            <thead>
              <tr>
              {columns.map((col) => (
                  <th key={col.id} onClick={() => toggleSort(col.id)}>
                    {col.label}
                    {sortBy === col.id && (
                      <span className="sort-indicator">
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) =>
                datasetId === 'retail_store' ? (
                  <tr key={row.id}>
                    <td>{row.productName}</td>
                    <td>{row.category}</td>
                    <td>
                      {row.salesAmount?.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      })}
                    </td>
                    <td>{row.dateSold}</td>
                    <td>{row.region}</td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>{row.track_name}</td>
                    <td>{row.date_released}</td>
                    <td>{row.duration_minutes}</td>
                    <td>
                      {row.revenue_from_royalties?.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      })}
                    </td>
                    <td>{row.genre}</td>
                    <td>{row.artist_name}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

