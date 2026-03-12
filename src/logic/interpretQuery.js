const KEYWORDS = {
  category: ['category', 'categories'],
  product: ['product', 'sku', 'item'],
  region: ['region', 'country', 'state'],
  quarter: ['this quarter', 'quarter', 'q1', 'q2', 'q3', 'q4'],
  top: ['top', 'best', 'highest']
};

function includesAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

export function interpretQuery(rawText, dataset) {
  const text = rawText.toLowerCase();

  const mentionsCategory = includesAny(text, KEYWORDS.category);
  const mentionsProduct = includesAny(text, KEYWORDS.product);
  const mentionsRegion = includesAny(text, KEYWORDS.region);
  const mentionsQuarter = includesAny(text, KEYWORDS.quarter);
  const mentionsTop = includesAny(text, KEYWORDS.top);

  if (!mentionsCategory && !mentionsProduct && !mentionsRegion) {
    return {
      error: true,
      errorMessage:
        "I couldn't find a clear way to break down your question. Try mentioning product category, product, or region.",
      suggestions: [],
      explanation: ''
    };
  }

  const filters = {};
  if (mentionsQuarter) {
    filters.timeRange = 'this_quarter';
  }
  if (mentionsTop) {
    filters.topN = 5;
  }

  const suggestions = [];

  if (mentionsCategory) {
    suggestions.push({
      id: 'cat-bar',
      isPrimary: true,
      title: 'Sales by product category',
      subtitle: 'Compare total sales by category for the selected time period.',
      metricLabel: 'Total sales',
      breakdownLabel: 'Category',
      filtersLabel: mentionsQuarter ? 'This quarter' : 'All time',
      chartType: 'bar',
      metricField: 'salesAmount',
      breakdownField: 'category',
      filters
    });
  }

  if (mentionsRegion) {
    suggestions.push({
      id: 'region-bar',
      isPrimary: !mentionsCategory,
      title: 'Sales by region',
      subtitle: 'See which regions are driving revenue.',
      metricLabel: 'Total sales',
      breakdownLabel: 'Region',
      filtersLabel: mentionsQuarter ? 'This quarter' : 'All time',
      chartType: 'bar',
      metricField: 'salesAmount',
      breakdownField: 'region',
      filters
    });
  }

  if (mentionsProduct) {
    suggestions.push({
      id: 'product-bar',
      isPrimary: !mentionsCategory && !mentionsRegion,
      title: 'Top products by sales',
      subtitle: 'Identify which SKUs contribute most to revenue.',
      metricLabel: 'Total sales',
      breakdownLabel: 'Product',
      filtersLabel: mentionsQuarter ? 'This quarter' : 'All time',
      chartType: 'bar',
      metricField: 'salesAmount',
      breakdownField: 'productName',
      filters: { ...filters, topN: filters.topN || 10 }
    });
  }

  if (suggestions.length === 0) {
    return {
      error: true,
      errorMessage:
        "I couldn't find a visualization pattern for that question. Try asking about products, categories, or regions.",
      suggestions: [],
      explanation: ''
    };
  }

  return {
    error: false,
    explanation:
      'Based on your question, I picked chart types that compare total sales across categories, regions, or products. You can refine the time range, focus on specific regions, or limit to top performers.',
    suggestions
  };
}

