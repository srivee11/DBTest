import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#0ea5e9', '#a855f7'];

export function AgeDonutChart({ data, datasetId }) {
  const chartData = useMemo(() => {
    const map = new Map();
    data.forEach((row) => {
      const key =
        datasetId === 'retail_store'
          ? row.category || 'Other'
          : row.age_group || 'Unknown';
      const value =
        datasetId === 'retail_store'
          ? row.salesAmount || 0
          : row.monthly_listens || 0;
      map.set(key, (map.get(key) || 0) + value);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [data]);

  return (
    <div className="panel-root chart-card">
      <div className="panel-header">
        <h2>
          {datasetId === 'retail_store'
            ? 'Sales by category'
            : 'Unique listeners by age group'}
        </h2>
      </div>
      <div className="chart-container">
        {chartData.length === 0 ? (
          <div className="panel-empty">
            No data for the current filters. Try broadening the date or age range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={32} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

