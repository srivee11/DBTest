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
const LINE_COLORS = ['#4f46e5', '#22c55e', '#f97316', '#ec4899', '#0ea5e9', '#a855f7'];
const CHART_EDU_GUIDE = [
  {
    name: 'Bar chart',
    useCase: 'Compare values across categories quickly.',
    description:
      'Bar chart description: Uses rectangular bars where length maps to value, making category comparison straightforward.'
  },
  {
    name: 'Histogram',
    useCase: 'Understand distribution of a continuous variable.',
    description:
      'Histogram description: Groups numeric values into bins to reveal spread, skew, and outliers.'
  },
  {
    name: 'Column chart',
    useCase: 'Compare categories and ranked values in a vertical layout.',
    description:
      'Column chart description: Vertical bars emphasize differences between groups in a familiar format.'
  },
  {
    name: 'Line chart',
    useCase: 'Show trends and directional change over an ordered axis, usually time.',
    description:
      'Line chart description: Connects data points with lines to highlight progression and trend shape.'
  },
  {
    name: 'Pie chart',
    useCase: 'Show part-to-whole composition with a small number of categories.',
    description:
      'Pie chart description: Circular slices represent share of total, useful for high-level proportion views.'
  },
  {
    name: 'KPI chart',
    useCase: 'Track core business metrics at a glance against goals or prior periods.',
    description:
      'KPI chart description: Focused metric cards or indicators surface top-level performance quickly.'
  },
  {
    name: 'Donut chart',
    useCase: 'Show part-to-whole with multiple categories and cleaner labeling space.',
    description:
      'Donut chart description: A pie variant with a center hole that improves readability and visual balance.'
  },
  {
    name: 'Treemap chart',
    useCase: 'Compare hierarchical part-to-whole composition.',
    description:
      'Treemap chart description: Nested rectangles encode category size and hierarchy in compact space.'
  },
  {
    name: 'Pareto chart',
    useCase: 'Identify the few categories driving most of the impact.',
    description:
      'Pareto chart description: Combines descending bars with cumulative line to reveal 80/20 patterns.'
  },
  {
    name: 'Radar chart',
    useCase: 'Compare multiple dimensions for one or more entities.',
    description:
      'Radar chart description: Plots variables on radial axes to reveal profile shape and balance.'
  }
];

export function RetailInsightChart({
  data,
  chartType,
  visualizerEnabled = false,
  activeVisualizerChartType,
  onSelectVisualizerChartType
}) {
  const {
    aggregatedByCategory,
    aggregatedByProduct,
    aggregatedByRegion,
    aggregatedChurnByRegion,
    lineSeries,
    categoriesForLines,
    totalSales,
    totalOrders,
    totalCustomers,
    totalChurn,
    whySeries,
    discoverDeltaCategories,
    kpiDeltas
  } = useMemo(() => {
    const byCategory = new Map();
    const byProduct = new Map();
    const byRegion = new Map();
    const byRegionChurn = new Map();
    const byRegionPrevWeek = new Map();
    const byRegionLastWeek = new Map();
    const byMonthCategory = new Map();
    const byMonthOrders = new Map();
    const byMonthCustomers = new Map();
    const byMonthChurn = new Map();

    let totalSalesAcc = 0;
    let totalOrdersAcc = 0;
    let totalCustomersAcc = 0;
    let totalChurnAcc = 0;

    let latestDateMs = 0;

    data.forEach((row) => {
      const category = row.category || 'Other';
      const productName = row.productName || 'Unknown product';
      const region = row.region || 'Unknown';
      const value = row.salesAmount || 0;
      const churn = row.churnedCustomersLastMonth || 0;
      const orders = row.orders || 0;
      const customers = row.customers || 0;

      totalSalesAcc += value;
      totalOrdersAcc += orders;
      totalCustomersAcc += customers;
      totalChurnAcc += churn;

      byCategory.set(category, (byCategory.get(category) || 0) + value);
      byProduct.set(productName, (byProduct.get(productName) || 0) + value);
      byRegion.set(region, (byRegion.get(region) || 0) + value);
      byRegionChurn.set(region, (byRegionChurn.get(region) || 0) + churn);

      const date = new Date(row.dateSold);
      if (!Number.isNaN(date.getTime())) {
        const time = date.getTime();
        if (time > latestDateMs) latestDateMs = time;
        const monthLabel = MONTH_LABELS[date.getMonth()];
        const key = `${monthLabel}::${category}`;
        byMonthCategory.set(key, (byMonthCategory.get(key) || 0) + value);

        // Track month-level aggregates for KPI deltas
        byMonthOrders.set(monthLabel, (byMonthOrders.get(monthLabel) || 0) + orders);
        byMonthCustomers.set(
          monthLabel,
          (byMonthCustomers.get(monthLabel) || 0) + customers
        );
        byMonthChurn.set(monthLabel, (byMonthChurn.get(monthLabel) || 0) + churn);
      }
    });

    const aggregatedByCategoryArr = Array.from(byCategory.entries())
      .map(([category, sales]) => ({ category, sales }))
      .sort((a, b) => b.sales - a.sales);

    const aggregatedByProductArr = Array.from(byProduct.entries())
      .map(([productName, sales]) => ({ productName, sales }))
      .sort((a, b) => b.sales - a.sales);

    const aggregatedByRegionArr = Array.from(byRegion.entries())
      .map(([region, sales]) => ({ region, sales }))
      .sort((a, b) => b.sales - a.sales);

    const aggregatedChurnByRegionArr = Array.from(byRegionChurn.entries())
      .map(([region, churned]) => ({ region, churned }))
      .sort((a, b) => b.churned - a.churned);

    // pick top 3 categories for line chart
    const topCategories = aggregatedByCategoryArr.slice(0, 3).map((d) => d.category);

    const monthSet = new Set();
    byMonthCategory.forEach((_, key) => {
      const [monthLabel] = key.split('::');
      monthSet.add(monthLabel);
    });
    const monthsOrdered = MONTH_LABELS.filter((m) => monthSet.has(m));

    const lineData = monthsOrdered.map((monthLabel) => {
      const entry = { month: monthLabel };
      topCategories.forEach((cat) => {
        const key = `${monthLabel}::${cat}`;
        entry[cat] = byMonthCategory.get(key) || 0;
      });
      return entry;
    });

    // Build per-region comparison of last week's revenue vs previous week
    let whySeriesLocal = [];
    if (latestDateMs) {
      const MS_IN_DAY = 24 * 60 * 60 * 1000;
      const lastWeekEndMs = latestDateMs;
      const lastWeekStartMs = lastWeekEndMs - 6 * MS_IN_DAY;
      const prevWeekEndMs = lastWeekStartMs - MS_IN_DAY;
      const prevWeekStartMs = prevWeekEndMs - 6 * MS_IN_DAY;

      data.forEach((row) => {
        const d = new Date(row.dateSold);
        if (Number.isNaN(d.getTime())) return;
        const t = d.getTime();
        const amount = row.salesAmount || 0;
        const region = row.region || 'Unknown';

        if (t >= lastWeekStartMs && t <= lastWeekEndMs) {
          byRegionLastWeek.set(region, (byRegionLastWeek.get(region) || 0) + amount);
        } else if (t >= prevWeekStartMs && t <= prevWeekEndMs) {
          byRegionPrevWeek.set(region, (byRegionPrevWeek.get(region) || 0) + amount);
        }
      });

      // One row per region with previous vs last week revenue
      whySeriesLocal = Array.from(
        new Set([...byRegionPrevWeek.keys(), ...byRegionLastWeek.keys()])
      ).map((region) => ({
        region,
        previousWeek: byRegionPrevWeek.get(region) || 0,
        lastWeek: byRegionLastWeek.get(region) || 0
      }));
    }

    // Discover Agent delta by category: compare latest vs previous month in the series
    let discoverDeltaCategoriesLocal = [];
    let kpiDeltasLocal = null;
    if (monthsOrdered.length >= 2) {
      const latestMonthLabel = monthsOrdered[monthsOrdered.length - 1];
      const prevMonthLabel = monthsOrdered[monthsOrdered.length - 2];

      const catsSet = new Set();
      byMonthCategory.forEach((_, key) => {
        const [, category] = key.split('::');
        catsSet.add(category);
      });

      discoverDeltaCategoriesLocal = Array.from(catsSet).map((category) => {
        const latestKey = `${latestMonthLabel}::${category}`;
        const prevKey = `${prevMonthLabel}::${category}`;
        const current = byMonthCategory.get(latestKey) || 0;
        const previous = byMonthCategory.get(prevKey) || 0;
        return {
          category,
          previous,
          current,
          delta: current - previous
        };
      });

      // Keep categories ordered by magnitude of change so the biggest movement is easiest to spot
      discoverDeltaCategoriesLocal.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      // Simple MoM deltas for KPI summary cards
      const latestSales = Array.from(byMonthCategory.entries()).reduce((sum, [key, val]) => {
        const [monthLabel] = key.split('::');
        return monthLabel === latestMonthLabel ? sum + val : sum;
      }, 0);
      const prevSales = Array.from(byMonthCategory.entries()).reduce((sum, [key, val]) => {
        const [monthLabel] = key.split('::');
        return monthLabel === prevMonthLabel ? sum + val : sum;
      }, 0);

      const latestOrders = byMonthOrders.get(latestMonthLabel) || 0;
      const prevOrders = byMonthOrders.get(prevMonthLabel) || 0;
      const latestCustomers = byMonthCustomers.get(latestMonthLabel) || 0;
      const prevCustomers = byMonthCustomers.get(prevMonthLabel) || 0;
      const latestChurn = byMonthChurn.get(latestMonthLabel) || 0;
      const prevChurn = byMonthChurn.get(prevMonthLabel) || 0;

      const pct = (latest, prev) =>
        prev ? Math.round(((latest - prev) / prev) * 100 * 10) / 10 : null;

      kpiDeltasLocal = {
        salesPct: pct(latestSales, prevSales),
        ordersPct: pct(latestOrders, prevOrders),
        customersPct: pct(latestCustomers, prevCustomers),
        churnPct: pct(latestChurn, prevChurn)
      };
    }

    return {
      aggregatedByCategory: aggregatedByCategoryArr,
      aggregatedByProduct: aggregatedByProductArr,
      aggregatedByRegion: aggregatedByRegionArr,
      aggregatedChurnByRegion: aggregatedChurnByRegionArr,
      lineSeries: lineData,
      categoriesForLines: topCategories,
      totalSales: totalSalesAcc,
      totalOrders: totalOrdersAcc,
      totalCustomers: totalCustomersAcc,
      totalChurn: totalChurnAcc,
      whySeries: whySeriesLocal,
      discoverDeltaCategories: discoverDeltaCategoriesLocal,
      kpiDeltas: kpiDeltasLocal
    };
  }, [data]);

  if (!aggregatedByCategory.length) {
    return (
      <div className="panel-root chart-card">
        <div className="panel-header">
          <h2>Sales by category</h2>
        </div>
        <div className="panel-empty">
          No retail data for the current filters. Try broadening the date range.
        </div>
      </div>
    );
  }

  const showVisualizerChips = visualizerEnabled;

  const activeVizType = activeVisualizerChartType ?? chartType ?? 'bar';

  const aggregatedByCategoryShare = useMemo(() => {
    const denom = totalSales || 0;
    if (!denom) return aggregatedByCategory;
    return aggregatedByCategory.map((d) => ({
      category: d.category,
      sharePct: Math.round((d.sales / denom) * 1000) / 10 // 1 decimal place
    }));
  }, [aggregatedByCategory, totalSales]);

  const vizOptions = [
    { id: 'bar', label: 'Bar' },
    { id: 'categoryHBar', label: 'Horizontal bar' },
    { id: 'categoryShareBar', label: '% of sales' },
    { id: 'donut', label: 'Donut chart' }
  ];

  return (
    <div className="panel-root chart-card">
      <div className="panel-header">
        <h2>
          {chartType === 'donut'
            ? 'Category share of sales (donut)'
            : chartType === 'categoryHBar'
            ? 'Sales by product category (horizontal)'
            : chartType === 'categoryShareBar'
            ? 'Sales share by product category (%)'
            : chartType === 'pie'
            ? 'Category share of sales'
            : chartType === 'productBar'
            ? 'Sales by product'
            : chartType === 'regionCore'
            ? 'Sales by region'
            : chartType === 'categoryLine'
            ? 'Sales by product category (line)'
            : chartType === 'line'
            ? 'Sales trend over time'
            : chartType === 'churnByRegion'
            ? 'Churned customers by region (last month)'
            : chartType === 'kpiSummary'
            ? 'Core KPIs for this quarter'
            : chartType === 'discoverDelta'
            ? 'Change in revenue by category vs previous period'
            : 'Sales by product category'}
        </h2>
        <span className="panel-subtitle">
          {chartType === 'churnByRegion'
            ? 'Focusing on customers who churned last month across regions.'
            : chartType === 'regionCore'
            ? 'Focusing on sales across regions in the current view.'
            : chartType === 'kpiSummary'
            ? 'Key performance indicators aggregated for the current filters.'
            : chartType === 'whyRevenue'
            ? 'Comparing revenue by region for last week versus the previous week.'
            : chartType === 'discoverDelta'
            ? 'Comparing current vs previous period revenue by category so you can see which areas drove the change.'
            : chartType === 'categoryHBar'
            ? 'Ranked category sales with categories on the y-axis.'
            : chartType === 'categoryShareBar'
            ? 'Each bar shows the category share of total sales.'
            : chartType === 'categoryLine'
            ? 'Showing category-level sales as a line chart.'
            : chartType === 'donut'
            ? 'Showing category share of total sales (donut view).'
            : chartType === 'pie'
            ? 'Showing category share of total sales.'
            : "Focusing on this quarter's sales across product categories."}
        </span>
      </div>
      {chartType === 'kpiSummary' ? (
        <div className="chart-container">
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-large">
                <span className="kpi-label">Total sales</span>
                <span className="kpi-value">
                  {totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                {kpiDeltas?.salesPct != null && (
                  <span
                    className={`kpi-delta ${
                      kpiDeltas.salesPct >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'
                    }`}
                  >
                    <span className="kpi-delta-icon">
                      {kpiDeltas.salesPct >= 0 ? '▲' : '▼'}
                    </span>
                    {Math.abs(kpiDeltas.salesPct).toFixed(1)}% vs prior month
                  </span>
                )}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-large">
                <span className="kpi-label">Total orders</span>
                <span className="kpi-value">
                  {totalOrders.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                {kpiDeltas?.ordersPct != null && (
                  <span
                    className={`kpi-delta ${
                      kpiDeltas.ordersPct >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'
                    }`}
                  >
                    <span className="kpi-delta-icon">
                      {kpiDeltas.ordersPct >= 0 ? '▲' : '▼'}
                    </span>
                    {Math.abs(kpiDeltas.ordersPct).toFixed(1)}% vs prior month
                  </span>
                )}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-large">
                <span className="kpi-label">Customers</span>
                <span className="kpi-value">
                  {totalCustomers.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                {kpiDeltas?.customersPct != null && (
                  <span
                    className={`kpi-delta ${
                      kpiDeltas.customersPct >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'
                    }`}
                  >
                    <span className="kpi-delta-icon">
                      {kpiDeltas.customersPct >= 0 ? '▲' : '▼'}
                    </span>
                    {Math.abs(kpiDeltas.customersPct).toFixed(1)}% vs prior month
                  </span>
                )}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-large">
                <span className="kpi-label">Churned customers</span>
                <span className="kpi-value">
                  {totalChurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                {kpiDeltas?.churnPct != null && (
                  <span
                    className={`kpi-delta ${
                      // For churn, a decrease is good (green), an increase is bad (red)
                      kpiDeltas.churnPct >= 0 ? 'kpi-delta-down' : 'kpi-delta-up'
                    }`}
                  >
                    <span className="kpi-delta-icon">
                      {kpiDeltas.churnPct >= 0 ? '▲' : '▼'}
                    </span>
                    {Math.abs(kpiDeltas.churnPct).toFixed(1)}% vs prior month
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart
              data={lineSeries}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {categoriesForLines.map((cat, idx) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : chartType === 'categoryLine' ? (
            <LineChart
              data={aggregatedByCategory}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          ) : chartType === 'categoryHBar' ? (
            <BarChart
              data={aggregatedByCategory}
              layout="vertical"
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'categoryShareBar' ? (
            <BarChart
              data={aggregatedByCategoryShare}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={(v) => `${v}%`} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="sharePct"
                name="% of sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'pie' ? (
            <PieChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
              <Tooltip />
              <Legend />
              <Pie
                data={aggregatedByCategory}
                dataKey="sales"
                nameKey="category"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {aggregatedByCategory.map((entry, idx) => (
                  <Cell
                    key={entry.category}
                    fill={`hsl(${(idx * 60) % 360}, 70%, 55%)`}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : chartType === 'donut' ? (
            <PieChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
              <Tooltip />
              <Legend />
              <Pie
                data={aggregatedByCategory}
                dataKey="sales"
                nameKey="category"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {aggregatedByCategory.map((entry, idx) => (
                  <Cell
                    key={entry.category}
                    fill={`hsl(${(idx * 60) % 360}, 70%, 55%)`}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : chartType === 'productBar' ? (
            <BarChart
              data={aggregatedByProduct}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="productName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'churnByRegion' ? (
            <BarChart
              data={aggregatedChurnByRegion}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="churned"
                name="Churned customers"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'whyRevenue' ? (
            <BarChart
              data={whySeries}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="previousWeek"
                name="Week before last"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="lastWeek"
                name="Last week"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'regionCore' ? (
            <BarChart
              data={aggregatedByRegion}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'discoverDelta' ? (
            discoverDeltaCategories.length > 0 ? (
              <BarChart
                data={discoverDeltaCategories}
                margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="previous"
                  name="Previous period"
                  fill="#e5e7eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="current"
                  name="Current period"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <BarChart
                data={aggregatedByCategory}
                margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )
          ) : (
            <BarChart
              data={aggregatedByCategory}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      )}
      <div className="chart-chips-row">
        {showVisualizerChips ? (
          <div className="chart-visualizer-chips" aria-label="Chart visualization options">
            {vizOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chart-visualizer-chip ${
                  activeVizType === opt.id ? 'is-active' : ''
                }`}
                aria-pressed={activeVizType === opt.id}
                onClick={() => onSelectVisualizerChartType?.(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <div className="chart-edu-info">
          <button
            type="button"
            className="chart-edu-info-btn"
            aria-label="Chart education guide"
          >
            i
          </button>
          <div className="chart-edu-tooltip" role="tooltip">
            <div className="chart-edu-title">WHEN TO USE</div>
            {CHART_EDU_GUIDE.map((item) => (
              <div key={item.name} className="chart-edu-item">
                <strong>{item.name}</strong>
                <div>{item.useCase}</div>
                <div>{item.description}</div>
              </div>
            ))}
          </div>
        </div>
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

