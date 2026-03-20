import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlanIcon, DrillIcon, MetricsIcon, SqlIcon, WhyIcon } from './ModeIcons.jsx';
import { RetailInsightChart } from './RetailInsightChart.jsx';
import { SpotifyAssistantChart } from './SpotifyAssistantChart.jsx';

const RETAIL_CATEGORY_QUERY =
  'Which product categories drive most of my revenue this quarter?';
const RETAIL_PRODUCTS_QUERY =
  'Which individual products are my top sellers vs underperformers?';
const RETAIL_TREND_QUERY =
  'How are my sales trending over time by top categories?';
const RETAIL_REGION_QUERY =
  'Which regions over- or under-perform for my core categories?';

// Discover Agent – KPI watcher specific prompts for retail
const RETAIL_DISCOVER_SUGGESTIONS = [
  {
    id: 'retail-discover-kpi-health',
    chartType: 'bar',
    tag: 'KPI HEALTH',
    label: 'Review this month’s core KPIs',
    prompt: 'How are my core KPIs doing this month compared to last month?'
  },
  {
    id: 'retail-discover-revenue-move',
    chartType: 'bar',
    tag: 'ROOT CAUSE',
    label: 'Explain the biggest revenue change',
    prompt: 'Which segment explains the biggest revenue change vs last month?'
  },
  {
    id: 'retail-discover-churn-move',
    chartType: 'churnByRegion',
    tag: 'CHURN',
    label: 'Where is churn spiking?',
    prompt: 'Where are churned customers increasing the most?'
  }
];

const RETAIL_SUGGESTIONS = [
  {
    id: 'retail-bar',
    chartType: 'bar',
    tag: 'RECOMMENDED',
    label: 'Top categories by revenue',
    prompt: RETAIL_CATEGORY_QUERY
  },
  {
    id: 'retail-products',
    chartType: 'productBar',
    tag: 'PRODUCTS',
    label: 'Top vs. low-performing products',
    prompt: RETAIL_PRODUCTS_QUERY
  },
  {
    id: 'retail-line',
    chartType: 'line',
    tag: 'TREND',
    label: 'Category sales over time',
    prompt: RETAIL_TREND_QUERY
  }
];

const SPOTIFY_TOP_TRACKS_QUERY =
  'Which tracks generated the most royalties this quarter?';
const SPOTIFY_AGE_QUERY =
  'How are listens distributed across listener age groups?';
const SPOTIFY_TREND_QUERY =
  'How have total listens changed month over month?';
const SPOTIFY_ROYALTY_TREND_QUERY =
  'How have my total royalties changed over time?';

const SPOTIFY_SUGGESTIONS = [
  {
    id: 'spotify-bar',
    chartType: 'topTracks',
    tag: 'RECOMMENDED',
    label: 'Top tracks by royalties',
    prompt: SPOTIFY_TOP_TRACKS_QUERY
  },
  {
    id: 'spotify-pie',
    chartType: 'ageShare',
    tag: 'AUDIENCE',
    label: 'Listener distribution by age group',
    prompt: SPOTIFY_AGE_QUERY
  },
  {
    id: 'spotify-line',
    chartType: 'listensTrend',
    tag: 'TREND',
    label: 'Month-over-month listens',
    prompt: SPOTIFY_TREND_QUERY
  }
];

const RETAIL_FOLLOW_UPS = [
  'Show me the top products inside this category.',
  'Break this down by region.',
  'Compare this quarter to the last quarter.',
  'Show the underlying transactions for this view.'
];

const SPOTIFY_FOLLOW_UPS = [
  'Filter to a single artist.',
  'Show only explicit tracks.',
  'Compare this month to last month.',
  'Show the underlying listener rows.'
];

// Discover Agent quick follow-ups – focused on changes and drivers
const RETAIL_DISCOVER_FOLLOW_UPS = [
  'What changed most since last month?',
  'Which region explains most of the revenue change?',
  'Which products contributed most to this KPI movement?',
  'Show me a breakdown by category and region for this change.'
];

const CHAT_CACHE = {};

function buildWelcomeMessages() {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      kind: 'text',
      content:
        'Ask about your data in plain language. I’ll suggest charts and summaries you can turn into dashboards.',
      status: 'complete',
      timestamp: new Date().toISOString()
    }
  ];
}

const CHAT_MODES = [
  {
    id: 'plan',
    badge: 'Analyse',
    description: 'Analyse and plan a multi-step workflow.',
    placeholder: 'Help me analyse why revenue dropped last week and outline next steps.',
    icon: PlanIcon,
    iconClass: 'mode-icon-plan'
  },
  {
    id: 'explore',
    badge: 'Drill',
    description: 'Drill into segments and breakdowns.',
    placeholder: 'Drill into customers who churned last month by region.',
    defaultQuestion: 'Drill into customers who churned last month by region.',
    icon: DrillIcon,
    iconClass: 'mode-icon-drill'
  },
  {
    id: 'metrics',
    badge: 'Metrics',
    description: 'Summarize KPIs and trends.',
    placeholder: 'Summarize my core KPIs for this quarter.',
    defaultQuestion: 'Summarize my core KPIs for this quarter.',
    icon: MetricsIcon,
    iconClass: 'mode-icon-metrics'
  },
  {
    id: 'probe',
    badge: 'Why',
    description: 'Probe into changes and anomalies.',
    placeholder: 'Why did revenue drop last week compared to the week before?',
    defaultQuestion: 'Why did revenue drop last week compared to the week before?',
    icon: WhyIcon,
    iconClass: 'mode-icon-why'
  }
];

function buildSpotifyAnswer(question, rows) {
  if (!rows || !rows.length) {
    return "I couldn't find any rows in the current view. Try widening your date range or clearing filters.";
  }

  const q = question.toLowerCase();

  if (q.includes('royalties') || q.includes('generated the most')) {
    const sorted = [...rows].sort(
      (a, b) => (b.revenue_from_royalties || 0) - (a.revenue_from_royalties || 0)
    );
    const top = sorted.slice(0, 5);
    const total = top.reduce(
      (sum, r) => sum + (r.revenue_from_royalties || 0),
      0
    );

    const bullets = top
      .map(
        (r, idx) =>
          `${idx + 1}. ${r.track_name} – ${r.artist_name} (${r.revenue_from_royalties?.toLocaleString(
            undefined,
            { maximumFractionDigits: 0 }
          )} in royalties)`
      )
      .join('\n');

    return [
      'Here are the tracks generating the most royalty revenue in the current view:',
      '',
      bullets,
      '',
      `Together, these top ${top.length} tracks generated approximately ${total.toLocaleString(
        undefined,
        { maximumFractionDigits: 0 }
      )} in royalties.`
    ].join('\n');
  }

  if (q.includes('age group') || q.includes('age')) {
    return 'Here is the listener distribution by age group for the current view, visualized as a bar chart so you can quickly compare segments.';
  }

  if (q.includes('month') || q.includes('over time')) {
    const byMonth = rows.reduce((acc, r) => {
      if (!r.date_released) return acc;
      const monthKey = r.date_released.slice(0, 7);
      const listens = r.monthly_listens || 0;
      acc[monthKey] = (acc[monthKey] || 0) + listens;
      return acc;
    }, {});

    const ordered = Object.entries(byMonth).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const bullets = ordered
      .map(([month, value]) => `${month}: ${value.toLocaleString()} listens`)
      .join('\n');

    if (!bullets) {
      return "I couldn't find enough date information to build a month-over-month view. Try broadening your filters.";
    }

    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const trend =
      last[1] > first[1]
        ? 'up'
        : last[1] < first[1]
        ? 'down'
        : 'flat';

    return [
      'Here is a month-over-month view of total listens in the current filters:',
      '',
      bullets,
      '',
      `Overall, listens trend ${trend} between ${first[0]} and ${last[0]}.`
    ].join('\n');
  }

  return "Here's a conceptual answer based on the current filters. For this MVP, try one of the default questions above to see a more tailored, data-aware response.";
}

function buildRetailAnswer(question, rows) {
  if (!rows || !rows.length) {
    return "I couldn't find any rows in the current view. Try widening your date range or clearing filters.";
  }

  const q = question.toLowerCase();

  if (q.includes('category') || q.includes('categories')) {
    const byCategory = rows.reduce((acc, r) => {
      const key = r.category || 'Unknown';
      acc[key] = (acc[key] || 0) + (r.salesAmount || 0);
      return acc;
    }, {});

    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    const bullets = entries
      .map(([cat, value]) => {
        const share = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${cat}: ${value.toLocaleString()} sales (${share}% of total)`;
      })
      .join('\n');

    return [
      'Here are the product categories contributing most to sales in the current view:',
      '',
      bullets
    ].join('\n');
  }

  if (q.includes('trend') || q.includes('over time') || q.includes('month')) {
    const byMonth = rows.reduce((acc, r) => {
      if (!r.dateSold) return acc;
      const monthKey = r.dateSold.slice(0, 7);
      const amount = r.salesAmount || 0;
      acc[monthKey] = (acc[monthKey] || 0) + amount;
      return acc;
    }, {});

    const ordered = Object.entries(byMonth).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const bullets = ordered
      .map(([month, value]) => `${month}: ${value.toLocaleString()} sales`)
      .join('\n');

    if (!bullets) {
      return "I couldn't find enough date information to show a sales trend over time. Try broadening your filters.";
    }

    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const trend =
      last[1] > first[1]
        ? 'up'
        : last[1] < first[1]
        ? 'down'
        : 'flat';

    return [
      'Here is a month-over-month view of total sales in the current filters:',
      '',
      bullets,
      '',
      `Overall, sales trend ${trend} between ${first[0]} and ${last[0]}.`
    ].join('\n');
  }

  return "Here's a conceptual answer based on the current filters. For this MVP, try asking about sales by category or sales trends over time.";
}

function buildAnswer(datasetId, question, rows) {
  if (datasetId === 'retail_store') {
    return buildRetailAnswer(question, rows);
  }
  return buildSpotifyAnswer(question, rows);
}

export function DataChatPanel({
  datasetId,
  data,
  enableModes = false,
  titleSuffix,
  titleOverride,
  subtitleOverride,
  badgeLabel,
  variant,
  cacheKey,
  enableChartVisualizer = false
}) {
  const resolvedCacheKey = cacheKey ?? datasetId;

  const [input, setInput] = useState(
    () => CHAT_CACHE[resolvedCacheKey]?.input ?? ''
  );
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(
    () => CHAT_CACHE[resolvedCacheKey]?.selectedSuggestionId ?? 'spotify-bar'
  );
  const [chartType, setChartType] = useState(
    () => CHAT_CACHE[resolvedCacheKey]?.chartType ?? 'topTracks'
  );
  const [messages, setMessages] = useState(() => {
    const cached = CHAT_CACHE[resolvedCacheKey]?.messages;
    if (cached && cached.length) return cached;
    const isRetailInit = datasetId === 'retail_store';
    const isDiscoverInit = variant === 'discover';
    // For Discover Agent V3, start with an empty stream until the agent runs.
    return isRetailInit && isDiscoverInit ? [] : buildWelcomeMessages();
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModeId, setActiveModeId] = useState(
    () => CHAT_CACHE[resolvedCacheKey]?.activeModeId ?? 'plan'
  );
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const scrollRef = useRef(null);

  const activeRows = useMemo(() => data || [], [data]);

  const isRetail = datasetId === 'retail_store';
  const isDiscoverAgent = variant === 'discover';
  const suggestions = isRetail
    ? isDiscoverAgent
      ? RETAIL_DISCOVER_SUGGESTIONS
      : RETAIL_SUGGESTIONS
    : SPOTIFY_SUGGESTIONS;
  const basePlaceholder = isRetail
    ? RETAIL_REGION_QUERY
    : SPOTIFY_ROYALTY_TREND_QUERY;
  const activeMode =
    CHAT_MODES.find((m) => m.id === activeModeId) || CHAT_MODES[0];
  const activeModeLabel = `${activeMode.badge} mode`;
  const placeholderText = enableModes ? activeModeLabel : basePlaceholder;

  // Discover Agent state
  const [discoverSelectedKpis, setDiscoverSelectedKpis] = useState([
    'revenue',
    'orders'
  ]);
  const [discoverSchedule, setDiscoverSchedule] = useState('monthly');
  // discoverStatus: idle | preparing | monitoring
  const [discoverStatus, setDiscoverStatus] = useState('idle');
  const [discoverStep, setDiscoverStep] = useState(0);
  const [discoverElapsedSec, setDiscoverElapsedSec] = useState(0);
  const [discoverHasAnomaly, setDiscoverHasAnomaly] = useState(false);
  const [discoverShouldPulse, setDiscoverShouldPulse] = useState(false);
  const [discoverAnomalyCount, setDiscoverAnomalyCount] = useState(0);
  const [isDiscoverChatCollapsed, setIsDiscoverChatCollapsed] = useState(false);

  const shouldCollapseDiscoverChat = isRetail && isDiscoverAgent && isDiscoverChatCollapsed;

  const handleVisualizerSelect = (baseMessage, nextChartType) => {
    if (!enableChartVisualizer) return;
    if (!isRetail) return;
    if (!nextChartType) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `viz-${baseMessage.id}-${nextChartType}-${Date.now()}`,
        role: 'assistant',
        kind: 'retailChart',
        chartType: nextChartType,
        content: baseMessage.content,
        status: 'complete',
        timestamp: new Date().toISOString()
      }
    ]);

    setChartType(nextChartType);
  };

  useEffect(() => {
    const cached = CHAT_CACHE[resolvedCacheKey];

    if (cached) {
      setInput(cached.input ?? '');
      setSelectedSuggestionId(
        cached.selectedSuggestionId ?? (isRetail ? 'retail-bar' : 'spotify-bar')
      );
      setChartType(cached.chartType ?? (isRetail ? 'bar' : 'topTracks'));
      setMessages(
        cached.messages && cached.messages.length
          ? cached.messages
          : isRetail && isDiscoverAgent
          ? []
          : buildWelcomeMessages()
      );
      setActiveModeId(cached.activeModeId ?? 'plan');
    } else {
      setInput('');
      setSelectedSuggestionId(isRetail ? 'retail-bar' : 'spotify-bar');
      setChartType(isRetail ? 'bar' : 'topTracks');
      setMessages(isRetail && isDiscoverAgent ? [] : buildWelcomeMessages());
      setActiveModeId('plan');
    }

    setIsModeMenuOpen(false);
    setIsDiscoverChatCollapsed(false);
  }, [resolvedCacheKey, datasetId, isRetail]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    CHAT_CACHE[resolvedCacheKey] = {
      input,
      selectedSuggestionId,
      chartType,
      messages,
      activeModeId
    };
  }, [resolvedCacheKey, input, selectedSuggestionId, chartType, messages, activeModeId]);

  const toggleDiscoverKpi = (kpi) => {
    setDiscoverSelectedKpis((prev) =>
      prev.includes(kpi) ? prev.filter((k) => k !== kpi) : [...prev, kpi]
    );
  };

  const stopDiscoverAgent = () => {
    if (!isRetail || !isDiscoverAgent) return;
    setDiscoverStatus('idle');
    setDiscoverStep(0);
    setDiscoverElapsedSec(0);
    setDiscoverHasAnomaly(false);
    setDiscoverShouldPulse(false);
    setDiscoverAnomalyCount(0);
    setIsDiscoverChatCollapsed(false);
  };

  const runDiscoverAgent = () => {
    if (!isRetail || !isDiscoverAgent || discoverStatus === 'preparing') return;
    if (!discoverSelectedKpis.length) {
      // simple guard: require at least one KPI
      setDiscoverSelectedKpis(['revenue']);
    }

    // Reset monitor state
    setDiscoverStatus('preparing');
    setDiscoverStep(1);
    setDiscoverElapsedSec(0);
    setDiscoverHasAnomaly(false);
    setDiscoverShouldPulse(false);
    setDiscoverAnomalyCount(0);

    const kpiLabel = discoverSelectedKpis.join(', ');
    const scheduleLabel =
      discoverSchedule === 'hourly'
        ? 'hourly'
        : discoverSchedule === 'daily'
        ? 'daily'
        : 'monthly';

    const introMessage = {
      id: `a-discover-intro-${Date.now()}`,
      role: 'assistant',
      kind: 'text',
      content: `I’m running the Discover Agent for ${kpiLabel} on a ${scheduleLabel} schedule, using the current retail dataset to learn what “normal” looks like and then search for meaningful changes.`,
      status: 'complete',
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, introMessage]);

    // Step 2 after short delay: scanning for changes
    window.setTimeout(() => {
      setDiscoverStep(2);
    }, 900);

    // After preparation, start monitoring state (radar + timer)
    window.setTimeout(() => {
      setDiscoverStep(3);
      setDiscoverStatus('monitoring');
      setDiscoverElapsedSec(0);
    }, 1900);
  };

  function computeDiscoverInsight(rows) {
    if (!rows || !rows.length) {
      return {
        story:
          "I couldn’t find enough retail data in the current view to learn normal ranges. Try widening your filters."
      };
    }

    const withDates = rows.filter((r) => r.dateSold);
    if (!withDates.length) {
      return {
        story:
          "I couldn’t find date information for these rows, so I can’t compare against the previous period yet."
      };
    }

    // Build simple month key as YYYY-MM to avoid ambiguity.
    const monthTotals = new Map();
    const byMonthCategory = new Map();
    const byMonthCategoryRegion = new Map();
    const byMonthCategoryRegionProduct = new Map();

    withDates.forEach((r) => {
      const monthKey = r.dateSold.slice(0, 7);
      const amount = r.salesAmount || 0;
      const category = r.category || 'Other';
      const region = r.region || 'Unknown';
      const product = r.productName || 'Unknown product';

      monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + amount);

      const catKey = `${monthKey}::${category}`;
      byMonthCategory.set(catKey, (byMonthCategory.get(catKey) || 0) + amount);

      const catRegionKey = `${monthKey}::${category}::${region}`;
      byMonthCategoryRegion.set(
        catRegionKey,
        (byMonthCategoryRegion.get(catRegionKey) || 0) + amount
      );

      const fullKey = `${monthKey}::${category}::${region}::${product}`;
      byMonthCategoryRegionProduct.set(
        fullKey,
        (byMonthCategoryRegionProduct.get(fullKey) || 0) + amount
      );
    });

    const monthKeys = Array.from(monthTotals.keys()).sort();
    if (monthKeys.length < 2) {
      return {
        story:
          "I need at least two months of data to compare KPI changes. Try expanding the date range."
      };
    }

    const latestMonth = monthKeys[monthKeys.length - 1];
    const prevMonth = monthKeys[monthKeys.length - 2];

    const latestTotal = monthTotals.get(latestMonth) || 0;
    const prevTotal = monthTotals.get(prevMonth) || 0;

    if (!prevTotal) {
      return {
        story:
          "I couldn’t compute a meaningful percentage change because the previous period has almost no revenue."
      };
    }

    const overallDelta = latestTotal - prevTotal;
    const overallChangePct = (overallDelta / prevTotal) * 100;

    // Find category contributing most to delta
    const catDeltas = [];
    byMonthCategory.forEach((value, key) => {
      const [monthKey, category] = key.split('::');
      if (monthKey !== latestMonth && monthKey !== prevMonth) return;

      const latestKey = `${latestMonth}::${category}`;
      const prevKey = `${prevMonth}::${category}`;
      const cur = byMonthCategory.get(latestKey) || 0;
      const prev = byMonthCategory.get(prevKey) || 0;
      const delta = cur - prev;

      if (!catDeltas.find((c) => c.category === category)) {
        catDeltas.push({ category, delta });
      }
    });

    catDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const topCategory = catDeltas[0];

    let topRegion = null;
    let topProduct = null;

    if (topCategory) {
      const regionDeltas = [];
      byMonthCategoryRegion.forEach((value, key) => {
        const [monthKey, category, region] = key.split('::');
        if (category !== topCategory.category) return;
        if (monthKey !== latestMonth && monthKey !== prevMonth) return;

        const latestKey = `${latestMonth}::${category}::${region}`;
        const prevKey = `${prevMonth}::${category}::${region}`;
        const cur = byMonthCategoryRegion.get(latestKey) || 0;
        const prev = byMonthCategoryRegion.get(prevKey) || 0;
        const delta = cur - prev;
        if (!regionDeltas.find((r) => r.region === region)) {
          regionDeltas.push({ region, delta });
        }
      });

      regionDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      topRegion = regionDeltas[0];

      if (topRegion) {
        const productDeltas = [];
        byMonthCategoryRegionProduct.forEach((value, key) => {
          const [monthKey, category, region, product] = key.split('::');
          if (
            category !== topCategory.category ||
            region !== topRegion.region ||
            (monthKey !== latestMonth && monthKey !== prevMonth)
          ) {
            return;
          }

          const latestKey = `${latestMonth}::${category}::${region}::${product}`;
          const prevKey = `${prevMonth}::${category}::${region}::${product}`;
          const cur = byMonthCategoryRegionProduct.get(latestKey) || 0;
          const prevVal = byMonthCategoryRegionProduct.get(prevKey) || 0;
          const delta = cur - prevVal;
          if (!productDeltas.find((p) => p.product === product)) {
            productDeltas.push({ product, delta });
          }
        });

        productDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        topProduct = productDeltas[0];
      }
    }

    const safeOverallDelta = overallDelta === 0 ? 1 : overallDelta;
    const mainCategoryShare = topCategory
      ? Math.round((Math.abs(topCategory.delta) / Math.abs(safeOverallDelta)) * 100)
      : 0;
    const overallPctRounded = Math.round(overallChangePct * 10) / 10;

    const direction = overallChangePct >= 0 ? 'up' : 'down';

    let story = `Revenue is ${direction} ${Math.abs(
      overallPctRounded
    ).toFixed(1)}% between ${prevMonth} and ${latestMonth}.`;

    if (topCategory && topRegion && topProduct) {
      story += ` Around ${mainCategoryShare}% of this change comes from ${topCategory.category} in the ${topRegion.region} region, mainly the Sports Shorts line.`;
    } else if (topCategory && topRegion) {
      story += ` Most of the movement is from ${topCategory.category} in the ${topRegion.region} region.`;
    } else if (topCategory) {
      story += ` The largest contribution comes from the ${topCategory.category} category.`;
    }

    story += ' I’ve broken down the change by category so you can see which areas moved the most.';

    return { story };
  }

  // Timer effect for monitoring state
  useEffect(() => {
    if (discoverStatus !== 'monitoring') return;
    const id = window.setInterval(() => {
      setDiscoverElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [discoverStatus]);

  // After 8 seconds of monitoring, trigger anomaly insight once
  useEffect(() => {
    if (!isRetail || !isDiscoverAgent) return;
    if (discoverStatus !== 'monitoring') return;
    if (discoverHasAnomaly) return;
    if (discoverElapsedSec < 8) return;

    setDiscoverHasAnomaly(true);
    setDiscoverAnomalyCount((prev) => prev + 1);
    setDiscoverShouldPulse(true);

    const insight = computeDiscoverInsight(activeRows);
    const thinkingId = `a-discover-thinking-${Date.now()}`;
    const thinkingMessage = {
      id: thinkingId,
      role: 'assistant',
      kind: 'status',
      content: null,
      status: 'thinking',
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    window.setTimeout(() => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                kind: 'retailChart',
                chartType: 'discoverDelta',
                content: insight.story,
                status: 'complete'
              }
            : m
        );

        const uiMessage = {
          id: `discover-ui-${Date.now()}`,
          role: 'assistant',
          kind: 'discoverUI',
          content: null,
          status: 'complete',
          timestamp: new Date().toISOString()
        };

        return [...updated, uiMessage];
      });

      // allow the radar blip to pulse once, then settle
      window.setTimeout(() => {
        setDiscoverShouldPulse(false);
      }, 520);
    }, 1200);
  }, [
    activeRows,
    discoverElapsedSec,
    discoverHasAnomaly,
    discoverStatus,
    isDiscoverAgent,
    isRetail,
    setMessages
  ]);

  const handleSubmit = (questionText) => {
    const trimmed = (questionText ?? input).trim();
    if (!trimmed || isSubmitting) return;

    const lower = trimmed.toLowerCase();
    const isModeDefaultQuestion =
      enableModes &&
      activeMode?.defaultQuestion &&
      lower === activeMode.defaultQuestion.toLowerCase();
    const isAgeQuestion = lower.includes('age group') || lower.includes('age ');
    const isRegionCoreQuery =
      isRetail && lower === RETAIL_REGION_QUERY.toLowerCase();
    const isSpotifyFourth =
      !isRetail && lower === SPOTIFY_ROYALTY_TREND_QUERY.toLowerCase();

    if (!isRetail && isAgeQuestion) {
      setSelectedSuggestionId('spotify-pie');
      setChartType('ageShare');
    }

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      kind: 'text',
      content: trimmed,
      status: 'complete',
      timestamp: new Date().toISOString()
    };

    const thinkingId = `a-thinking-${Date.now()}`;
    const thinkingMessage = {
      id: thinkingId,
      role: 'assistant',
      kind: 'status',
      content: null,
      status: 'thinking',
      timestamp: new Date().toISOString()
    };

    setIsSubmitting(true);
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    window.setTimeout(() => {
      if (enableModes && isModeDefaultQuestion) {
        // Mode-specific chart answers
        if (!isRetail) {
          // Spotify dataset
          let chartTypeForAnswer = 'topTracks';
          let spotifyText;

          if (activeModeId === 'explore') {
            chartTypeForAnswer = 'ageShare';
            spotifyText =
              'Here is a drill-down view of listeners segmented by age group for the current filters.';
          } else if (activeModeId === 'metrics') {
            chartTypeForAnswer = 'listensTrend';
            spotifyText =
              'Here is a 30-day trend of total listens so you can scan your core KPIs over time.';
          } else if (activeModeId === 'probe') {
            chartTypeForAnswer = 'listensTrend';
            spotifyText =
              'Here is how your listens evolve over the last two weeks so you can see when the drop occurred.';
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    kind: 'spotifyChart',
                    chartType: chartTypeForAnswer,
                    content: spotifyText,
                    status: 'complete'
                  }
                : m
            )
          );
        } else {
          // Retail dataset
          let chartTypeForAnswer = 'bar';
          let retailText;

          if (activeModeId === 'explore') {
            chartTypeForAnswer = 'churnByRegion';
            retailText =
              'Here is a bar chart of churned customers by region for last month so you can see where churn is concentrated.';
          } else if (activeModeId === 'metrics') {
            chartTypeForAnswer = 'kpiSummary';
            retailText =
              'Here is a KPI summary for this quarter, including total sales, orders, customers, and churned customers.';
          } else if (activeModeId === 'probe') {
            chartTypeForAnswer = 'whyRevenue';
            retailText =
              'Here is how total revenue last week compares to the previous week so you can see the size of the drop.';
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    kind: 'retailChart',
                    chartType: chartTypeForAnswer,
                    content: retailText,
                    status: 'complete'
                  }
                : m
            )
          );
        }

        setIsSubmitting(false);
        return;
      }

      if (!isRetail) {
        const spotifySuggestion = SPOTIFY_SUGGESTIONS.find(
          (s) => s.prompt.toLowerCase() === lower
        );
        const isSpotifyChartQuery =
          isAgeQuestion || !!spotifySuggestion || isSpotifyFourth;

        if (isSpotifyChartQuery) {
          const chartTypeForAnswer = isAgeQuestion
            ? 'ageShare'
            : spotifySuggestion?.chartType || 'listensTrend';

          let spotifyText;
          if (chartTypeForAnswer === 'topTracks') {
            spotifyText =
              'Here are the tracks generating the most royalties in the current view.';
          } else if (chartTypeForAnswer === 'ageShare') {
            spotifyText =
              'Here is the listener distribution by age group for the current view, visualized as a bar chart.';
          } else if (isSpotifyFourth) {
            spotifyText =
              'Here is how your total royalties evolve over time based on the current filters.';
          } else {
            spotifyText =
              'Here is how your total listens change over time in the current view.';
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    kind: 'spotifyChart',
                    chartType: chartTypeForAnswer,
                    content: spotifyText,
                    status: 'complete'
                  }
                : m
            )
          );
        } else {
          const answerText = buildAnswer(datasetId, trimmed, activeRows);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    kind: 'text',
                    content: answerText,
                    status: 'complete'
                  }
                : m
            )
          );
        }
      } else if (isRetail) {
        const retailSuggestion = RETAIL_SUGGESTIONS.find(
          (s) => s.prompt.toLowerCase() === trimmed.toLowerCase()
        );

        // Discover Agent specific mapping for follow-ups and suggestion cards
        let discoverChartType = null;
        let discoverText = null;
        if (isDiscoverAgent) {
          if (
            lower ===
            'how are my core kpis doing this month compared to last month?'
          ) {
            discoverChartType = 'kpiSummary';
            discoverText =
              'Here is a KPI summary comparing this month to the previous month so you can see how core metrics are moving together.';
          } else if (
            lower ===
            'which segment explains the biggest revenue change vs last month?'
          ) {
            discoverChartType = 'discoverDelta';
            discoverText =
              'Here is the change in revenue by category compared to last month so you can see which segment explains the biggest move.';
          } else if (lower === 'where are churned customers increasing the most?') {
            discoverChartType = 'churnByRegion';
            discoverText =
              'Here is a view of churned customers by region so you can see where churn is spiking the most.';
          } else if (lower === 'what changed most since last month?') {
            discoverChartType = 'discoverDelta';
            discoverText =
              'Here is the change in revenue by category compared to last month so you can quickly see what moved the most.';
          } else if (
            lower === 'which region explains most of the revenue change?'
          ) {
            discoverChartType = 'regionCore';
            discoverText =
              'Here is how revenue changed by region so you can see which region explains most of the movement.';
          } else if (
            lower === 'which products contributed most to this kpi movement?'
          ) {
            discoverChartType = 'productBar';
            discoverText =
              'Here are the products contributing most to the revenue movement in the current view.';
          } else if (
            lower === 'show me a breakdown by category and region for this change.'
          ) {
            discoverChartType = 'regionCore';
            discoverText =
              'Here is a regional breakdown for your core categories so you can see where performance changed the most.';
          }
        }

        const chartTypeForAnswer =
          discoverChartType ||
          (isRegionCoreQuery ? 'regionCore' : retailSuggestion?.chartType || 'bar');

        let retailText;
        if (discoverText) {
          retailText = discoverText;
        } else if (chartTypeForAnswer === 'productBar') {
          retailText =
            'Here are your top-selling and lower-performing products based on sales in the current view.';
        } else if (chartTypeForAnswer === 'line') {
          retailText =
            'Here is how sales for your top categories trend over time in the current view.';
        } else if (chartTypeForAnswer === 'regionCore') {
          retailText =
            'Here is how your core categories perform across regions so you can spot over- and under-performance.';
        } else {
          retailText =
            'Here are the product categories contributing most to revenue in the current view.';
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  kind: 'retailChart',
                  chartType: chartTypeForAnswer,
                  content: retailText,
                  status: 'complete'
                }
              : m
          )
        );
      }
      setIsSubmitting(false);
    }, 2200);
  };

  const handleSuggestionClick = (sugg) => {
    setSelectedSuggestionId(sugg.id);
    setChartType(sugg.chartType);
    handleSubmit(sugg.prompt);
  };

  const handleFollowUpClick = (prompt) => {
    handleSubmit(prompt);
  };

  const handleKeyDown = (e) => {
    if (isRetail && e.key === 'Tab' && !e.shiftKey && !input.trim()) {
      e.preventDefault();
      setInput(RETAIL_REGION_QUERY);
      return;
    }

    if (!isRetail && e.key === 'Tab' && !e.shiftKey && !input.trim()) {
      e.preventDefault();
      setInput(enableModes ? activeMode.placeholder : SPOTIFY_ROYALTY_TREND_QUERY);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="panel-root chat-panel">
      <div className="chat-header">
        <div>
          <h2>
            {titleOverride || 'Chat with DataBrain'}
            {titleSuffix ? ` ${titleSuffix}` : ''}
          </h2>
          <span className="panel-subtitle">
            {subtitleOverride ??
              'Ask questions in natural language. I’ll turn them into queries and friendly summaries.'}
          </span>
        </div>
        <div className="chat-header-right">
          {badgeLabel && <div className="chat-badge-beta">{badgeLabel}</div>}
          {isRetail && isDiscoverAgent && (
            <button
              type="button"
              className="discover-chat-toggle"
              onClick={() => setIsDiscoverChatCollapsed((v) => !v)}
              aria-label={
                isDiscoverChatCollapsed
                  ? 'Expand Discover Agent chat'
                  : 'Collapse Discover Agent chat'
              }
            >
              <span
                className={
                  'discover-chat-toggle-icon' +
                  (isDiscoverChatCollapsed ? ' is-collapsed' : '')
                }
              />
            </button>
          )}
        </div>
      </div>

      {isRetail && isDiscoverAgent && (
        <div className="discover-controls">
          <div className="discover-row">
            <div className="discover-group">
              <span className="discover-label">KPIs to monitor</span>
              <div className="discover-kpi-chips">
                {[
                  { id: 'revenue', label: 'Revenue' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'margin', label: 'Margin' },
                  { id: 'churn', label: 'Churn' }
                ].map((kpi) => (
                  <button
                    key={kpi.id}
                    type="button"
                    className={`pill discover-kpi-pill ${
                      discoverSelectedKpis.includes(kpi.id) ? 'pill-selected' : 'pill-outline'
                    }`}
                    onClick={() => toggleDiscoverKpi(kpi.id)}
                  >
                    {kpi.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="discover-group">
              <span className="discover-label">Schedule</span>
              <div className="discover-schedule-chips">
                {[
                  { id: 'hourly', label: 'Hourly' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'monthly', label: 'Monthly' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pill discover-schedule-pill ${
                      discoverSchedule === opt.id ? 'pill-selected' : 'pill-outline'
                    }`}
                    onClick={() => setDiscoverSchedule(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="discover-actions">
              <button
                type="button"
                className="btn-primary discover-run-btn"
                onClick={runDiscoverAgent}
                disabled={discoverStatus === 'preparing'}
              >
                {discoverStatus === 'preparing' ? 'Preparing…' : 'Run agent'}
              </button>
              <span className="discover-hint">
                Simulated run on sample retail data – no real warehouse connected.
              </span>
            </div>
          </div>
          {discoverStatus === 'preparing' && (
            <div className="discover-stepper">
              <div className="discover-step">
                <span
                  className={`discover-dot ${
                    discoverStep >= 1 ? 'discover-dot-complete' : 'discover-dot-idle'
                  }`}
                />
                <span>Learning normal ranges for selected KPIs…</span>
              </div>
              <div className="discover-step">
                <span
                  className={`discover-dot ${
                    discoverStep >= 2 ? 'discover-dot-complete' : 'discover-dot-idle'
                  }`}
                />
                <span>Scanning for significant drops and spikes vs previous period…</span>
              </div>
              <div className="discover-step">
                <span
                  className={`discover-dot ${
                    discoverStep >= 3 ? 'discover-dot-complete' : 'discover-dot-active'
                  }`}
                />
                <span>Running root-cause analysis by region, category and product…</span>
              </div>
            </div>
          )}
          {discoverStatus === 'monitoring' && (
            <div className="discover-monitor">
              <div className="discover-monitor-left">
                <div
                  className={`discover-radar ${
                    discoverHasAnomaly ? 'discover-radar-has-blip' : ''
                  }`}
                >
                  <div className="discover-radar-sweep" />
                  {discoverHasAnomaly && (
                    <div
                      className={
                        'discover-radar-blip' +
                        (discoverShouldPulse ? ' discover-radar-blip-pulse' : '')
                      }
                    />
                  )}
                </div>
                <div className="discover-monitor-text">
                  <div className="discover-monitor-title">
                    Agent is monitoring
                    {discoverAnomalyCount > 0 && (
                      <span className="discover-anomaly-pill">
                        {discoverAnomalyCount} Anomaly detected
                      </span>
                    )}
                  </div>
                  <div className="discover-monitor-sub">
                    Tracking {discoverSelectedKpis.join(', ')} on a {discoverSchedule} basis.
                  </div>
                </div>
              </div>
              <div className="discover-monitor-timer">
                <span>
                  Running for {Math.floor(discoverElapsedSec / 60)}:
                  {(discoverElapsedSec % 60).toString().padStart(2, '0')} min
                </span>
                <button
                  type="button"
                  className="discover-stop-btn"
                  onClick={stopDiscoverAgent}
                >
                  <span className="discover-stop-icon" />
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {shouldCollapseDiscoverChat && (
        <div className="discover-chat-collapsed-hint">
          <span>Chat collapsed</span>
        </div>
      )}

      <div
        className="chat-stream"
        ref={scrollRef}
        style={{ display: shouldCollapseDiscoverChat ? 'none' : undefined }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-row chat-row-${m.role}`}
          >
            {m.role === 'assistant' && (
              <div className="chat-avatar">
                <span className="chat-avatar-mark">DB</span>
              </div>
            )}
            <div
              className={
                m.role === 'assistant'
                  ? `chat-bubble chat-bubble-assistant${
                      m.kind === 'retailChart' && m.chartType === 'discoverDelta'
                        ? ' chat-bubble-anomaly'
                        : ''
                    }`
                  : 'chat-bubble chat-bubble-user'
              }
            >
              {m.role === 'assistant' && (
                <div className="chat-name">DataBrain</div>
              )}
              {m.role === 'user' && <div className="chat-name">You</div>}

              {m.id === 'welcome' && !isDiscoverAgent ? (
                <>
                  <p className="chat-text">
                    Ask anything about this dataset. Here are a few starting points tailored
                    to the current domain.
                  </p>
                  <div className="chat-suggestions-row">
                    {suggestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        className={`assistant-suggestion chat-suggestion-pill ${
                          selectedSuggestionId === q.id ? 'is-selected' : ''
                        }`}
                        onClick={() => handleSuggestionClick(q)}
                      >
                        <span className="assistant-tag">{q.tag}</span>
                        <span className="assistant-title">{q.label}</span>
                      </button>
                    ))}
                  </div>
                  {!isRetail && (
                    <div className="chat-chart-region">
                      <SpotifyAssistantChart data={activeRows} chartType={chartType} />
                    </div>
                  )}
                  <div className="chat-followups">
                    <span className="chat-followups-label">Quick follow-ups</span>
                    <div className="chat-followups-chips">
                      {(
                        isRetail
                          ? isDiscoverAgent
                            ? RETAIL_DISCOVER_FOLLOW_UPS
                            : RETAIL_FOLLOW_UPS
                          : SPOTIFY_FOLLOW_UPS
                      ).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="pill pill-outline chat-followup-pill"
                          onClick={() => handleFollowUpClick(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : m.kind === 'discoverUI' ? (
                <>
                  <p className="chat-text">
                    Here are a few angles you can probe now that the Discover Agent has
                    surfaced a meaningful change.
                  </p>
                  <div className="chat-suggestions-row">
                    {suggestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        className={`assistant-suggestion chat-suggestion-pill ${
                          selectedSuggestionId === q.id ? 'is-selected' : ''
                        }`}
                        onClick={() => handleSuggestionClick(q)}
                      >
                        <span className="assistant-tag">{q.tag}</span>
                        <span className="assistant-title">{q.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="chat-followups">
                    <span className="chat-followups-label">Quick follow-ups</span>
                    <div className="chat-followups-chips">
                      {(
                        isRetail
                          ? isDiscoverAgent
                            ? RETAIL_DISCOVER_FOLLOW_UPS
                            : RETAIL_FOLLOW_UPS
                          : SPOTIFY_FOLLOW_UPS
                      ).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="pill pill-outline chat-followup-pill"
                          onClick={() => handleFollowUpClick(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : m.status === 'thinking' ? (
                <div className="chat-status-stack">
                  <div className="chat-status-row">
                    <span className="chat-status-dot is-complete" />
                    <span>Gathering data</span>
                  </div>
                  <div className="chat-status-row">
                    <span className="chat-status-dot is-complete" />
                    <span>Analyzing query</span>
                  </div>
                  <div className="chat-status-row">
                    <span className="chat-status-dot is-active" />
                    <span>Converting query to SQL…</span>
                  </div>
                </div>
              ) : m.kind === 'ageChart' ? (
                <>
                  <p className="chat-text">{m.content}</p>
                  <div className="chat-chart-region">
                    <SpotifyAssistantChart data={activeRows} chartType="ageShare" />
                  </div>
                </>
              ) : m.kind === 'spotifyChart' ? (
                <>
                  <p className="chat-text">{m.content}</p>
                  <div className="chat-chart-region">
                    <SpotifyAssistantChart
                      data={activeRows}
                      chartType={m.chartType || 'topTracks'}
                    />
                  </div>
                </>
              ) : m.kind === 'retailChart' ? (
                <>
                  <p className="chat-text">{m.content}</p>
                  <div className="chat-chart-region">
                    <RetailInsightChart
                      data={activeRows}
                      chartType={m.chartType || 'bar'}
                      visualizerEnabled={enableChartVisualizer}
                      activeVisualizerChartType={m.chartType || 'bar'}
                      onSelectVisualizerChartType={(nextType) =>
                        handleVisualizerSelect(m, nextType)
                      }
                    />
                  </div>
                </>
              ) : (
                <pre className="chat-text">{m.content}</pre>
              )}
            </div>
          </div>
        ))}
      </div>

      {enableModes ? (
        <div
          className="mode-footer"
          style={{ display: shouldCollapseDiscoverChat ? 'none' : undefined }}
        >
          {isModeMenuOpen && (
            <div className="mode-menu">
              {CHAT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-menu-item mode-menu-item-${mode.id} ${
                    activeModeId === mode.id ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setActiveModeId(mode.id);
                    setIsModeMenuOpen(false);
                    if (mode.id === 'plan') {
                      setInput('');
                    } else if (mode.defaultQuestion) {
                      setInput(mode.defaultQuestion);
                    } else {
                      setInput('');
                    }
                  }}
                >
                  <div className="mode-menu-title-row">
                    <span className={`mode-menu-icon ${mode.iconClass || ''}`}>
                      <mode.icon />
                    </span>
                    <span className="mode-menu-title">{mode.badge} mode</span>
                  </div>
                  <div className="mode-menu-desc">{mode.description}</div>
                </button>
              ))}
            </div>
          )}
          <div className="chat-input-row mode-input-row">
            <div className="mode-input-shell">
              <textarea
                className="assistant-input chat-input mode-chat-input"
                placeholder={placeholderText}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <div className="mode-input-actions">
                <button
                  type="button"
                  className={`btn-secondary mode-plan-btn mode-plan-btn-${activeMode.id}`}
                  onClick={() => setIsModeMenuOpen((open) => !open)}
                >
                  <span className={`mode-menu-icon ${activeMode.iconClass || ''}`}>
                    <activeMode.icon />
                  </span>
                  <span>{activeModeLabel}</span>
                </button>
                <button
                  type="button"
                  className="btn-primary chat-send-btn chat-send-btn-inline"
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isSubmitting}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="chat-input-row"
          style={{ display: shouldCollapseDiscoverChat ? 'none' : undefined }}
        >
          <textarea
            className="assistant-input chat-input"
            placeholder={placeholderText}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            type="button"
            className="btn-primary chat-send-btn"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isSubmitting}
          >
            Send
          </button>
        </div>
      )}
    </section>
  );
}

