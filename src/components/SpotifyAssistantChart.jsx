import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#4f46e5', '#22c55e', '#f97316', '#ec4899', '#0ea5e9', '#a855f7'];

export function SpotifyAssistantChart({ data, chartType }) {
  const { topTracks, ageShare, listensTrend } = useMemo(() => {
    const byTrack = new Map();
    const byAge = new Map();
    const byMonth = new Map();

    data.forEach((row) => {
      const track = row.track_name || 'Unknown track';
      const royalties = row.revenue_from_royalties || 0;
      byTrack.set(track, (byTrack.get(track) || 0) + royalties);

      const age = row.age_group || 'Unknown';
      const listeners = row.unique_listeners || 0;
      byAge.set(age, (byAge.get(age) || 0) + listeners);

      const d = new Date(row.date_released);
      if (!Number.isNaN(d.getTime())) {
        const monthLabel = MONTH_LABELS[d.getMonth()];
        const listens = row.monthly_listens || 0;
        byMonth.set(monthLabel, (byMonth.get(monthLabel) || 0) + listens);
      }
    });

    const topTracksArr = Array.from(byTrack.entries())
      .map(([track, royalties]) => ({ track, royalties }))
      .sort((a, b) => b.royalties - a.royalties)
      .slice(0, 5);

    const ageShareArr = Array.from(byAge.entries()).map(([age, value]) => ({
      age,
      value
    }));

    const listensTrendArr = MONTH_LABELS.filter((m) => byMonth.has(m)).map(
      (month) => ({
        month,
        listens: byMonth.get(month)
      })
    );

    return { topTracks: topTracksArr, ageShare: ageShareArr, listensTrend: listensTrendArr };
  }, [data]);

  if (!data || !data.length) {
    return (
      <div className="panel-root chart-card">
        <div className="panel-header">
          <h2>Spotify insights</h2>
        </div>
        <div className="panel-empty">
          No Spotify data for the current filters. Try broadening the date or age range.
        </div>
      </div>
    );
  }

  let content;
  let title;
  let subtitle;

  if (chartType === 'ageShare') {
    title = 'Listener distribution by age group';
    subtitle = 'Bar chart view of unique listeners across age segments.';
    content = (
      <BarChart
        data={ageShare}
        margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="age" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="value"
          name="Unique listeners"
          fill="#4f46e5"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    );
  } else if (chartType === 'listensTrend') {
    title = 'Month-over-month listens';
    subtitle = 'How total listens change over recent months.';
    content = (
      <LineChart data={listensTrend}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="listens"
          name="Total listens"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    );
  } else {
    // default to top tracks bar – vertical bars like retail reference
    title = 'Top tracks by royalties';
    subtitle = 'Tracks with the highest royalty revenue for the current period.';
    content = (
      <BarChart
        data={topTracks}
        margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="track" tick={{ fontSize: 11 }} />
        <YAxis type="number" domain={[0, 'dataMax']} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="royalties"
          name="Royalties"
          fill="#4f46e5"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    );
  }

  return (
    <div className="panel-root chart-card">
      <div className="panel-header">
        <h2>{title}</h2>
        <span className="panel-subtitle">{subtitle}</span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {content}
        </ResponsiveContainer>
      </div>
      <div className="chart-actions">
        <div className="chart-actions-left">
          <button type="button" className="chart-action-btn">
            Save
          </button>
          <button type="button" className="chart-action-btn">
            Charts
          </button>
          <button type="button" className="chart-action-btn">
            Appearances
          </button>
        </div>
        <div className="chart-actions-right">
          <span className="chart-toggle-label">Show Data</span>
          <button type="button" className="chart-toggle">
            <span className="chart-toggle-thumb" />
          </button>
          <button type="button" className="chart-sql-btn">
            <span className="chart-sql-icon">SQL</span>
          </button>
        </div>
      </div>
    </div>
  );
}

