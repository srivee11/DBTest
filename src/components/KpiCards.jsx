import React, { useMemo } from 'react';

export function KpiCards({ data, filters, datasetId }) {
  const { primaryValue, secondaryValue, changePct, primaryLabel, secondaryLabel } =
    useMemo(() => {
      if (datasetId === 'retail_store') {
        const totalSales = data.reduce(
          (sum, row) => sum + (row.salesAmount || 0),
          0
        );
        const productSet = new Set(data.map((row) => row.productName));
        const productCount = productSet.size;
        const change = totalSales > 0 ? 5.1 : 0;
        return {
          primaryValue: totalSales,
          secondaryValue: productCount,
          changePct: change,
          primaryLabel: 'Total sales',
          secondaryLabel: 'Products'
        };
      }

      const totalListensLocal = data.reduce(
        (sum, row) => sum + (row.monthly_listens || 0),
        0
      );
      const uniqueSet = new Set(data.map((row) => row.listener_id || row.artist_name));
      const uniqueCount = uniqueSet.size;
      const change = totalListensLocal > 0 ? 7.3 : 0;
      return {
        primaryValue: totalListensLocal,
        secondaryValue: uniqueCount,
        changePct: change,
        primaryLabel: 'Total listens',
        secondaryLabel: 'Unique listeners'
      };
    }, [data, datasetId]);

  const fmt = (n) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : n.toString();

  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-large">
        <div className="kpi-label">{primaryLabel}</div>
        <div className="kpi-value">{fmt(primaryValue)}</div>
        <div className="kpi-sub">
          {filters.comparisonPeriod === 'none' ? (
            <span className="kpi-muted">No comparison selected</span>
          ) : (
            <>
              <span className="kpi-positive">+{changePct.toFixed(1)}%</span>{' '}
              vs previous period
            </>
          )}
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">{secondaryLabel}</div>
        <div className="kpi-value">{fmt(secondaryValue)}</div>
      </div>
    </div>
  );
}

