import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export function ChartCanvas({ config, data }) {
  if (!config) {
    return (
      <div className="panel-root chart-panel">
        <div className="panel-header">
          <h2>Chart</h2>
        </div>
        <div className="panel-empty">
          <p>No chart selected yet.</p>
          <p className="panel-hint">Choose one of the suggestions to see your data.</p>
        </div>
      </div>
    );
  }

  const { chartType, breakdownField } = config;

  // For this prototype, we only implement a grouped bar chart.
  const groupedByCategory = Object.values(
    data.reduce((acc, row) => {
      const key = row[breakdownField] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          label: key,
          sales: 0
        };
      }
      acc[key].sales += Number(row.salesAmount) || 0;
      return acc;
    }, {})
  );

  return (
    <div className="panel-root chart-panel">
      <div className="panel-header">
        <h2>{config.title}</h2>
        <span className="panel-subtitle">{config.subtitle}</span>
      </div>
      <div className="chart-container">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedByCategory} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="panel-empty">
            <p>Chart type not implemented in this prototype.</p>
          </div>
        )}
      </div>
    </div>
  );
}

