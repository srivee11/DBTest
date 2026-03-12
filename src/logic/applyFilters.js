export function applyFilters(data, filters, datasetId) {
  let rows = data;

  if (filters.dateRange === 'last_12_months') {
    const now = new Date();
    const past = new Date(now);
    past.setFullYear(now.getFullYear() - 1);
    rows = rows.filter((r) => {
      const field = datasetId === 'retail_store' ? r.dateSold : r.date_released;
      const d = new Date(field);
      return d >= past && d <= now;
    });
  } else if (filters.dateRange === 'last_30_days') {
    const now = new Date();
    const past = new Date(now);
    past.setDate(now.getDate() - 30);
    rows = rows.filter((r) => {
      const field = datasetId === 'retail_store' ? r.dateSold : r.date_released;
      const d = new Date(field);
      return d >= past && d <= now;
    });
  }

  if (datasetId === 'spotify_artist') {
    if (filters.ageRange && filters.ageRange.length > 0) {
      rows = rows.filter((r) => filters.ageRange.includes(r.age_group));
    }
  }

  return rows;
}

