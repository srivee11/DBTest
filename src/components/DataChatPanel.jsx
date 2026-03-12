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

export function DataChatPanel({ datasetId, data, enableModes = false }) {
  const [input, setInput] = useState(() => CHAT_CACHE[datasetId]?.input ?? '');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(
    () => CHAT_CACHE[datasetId]?.selectedSuggestionId ?? 'spotify-bar'
  );
  const [chartType, setChartType] = useState(
    () => CHAT_CACHE[datasetId]?.chartType ?? 'topTracks'
  );
  const [messages, setMessages] = useState(() => {
    const cached = CHAT_CACHE[datasetId]?.messages;
    return cached && cached.length ? cached : buildWelcomeMessages();
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModeId, setActiveModeId] = useState(
    () => CHAT_CACHE[datasetId]?.activeModeId ?? 'plan'
  );
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const scrollRef = useRef(null);

  const activeRows = useMemo(() => data || [], [data]);

  const isRetail = datasetId === 'retail_store';
  const suggestions = isRetail ? RETAIL_SUGGESTIONS : SPOTIFY_SUGGESTIONS;
  const basePlaceholder = isRetail
    ? RETAIL_REGION_QUERY
    : SPOTIFY_ROYALTY_TREND_QUERY;
  const activeMode =
    CHAT_MODES.find((m) => m.id === activeModeId) || CHAT_MODES[0];
  const activeModeLabel = `${activeMode.badge} mode`;
  const placeholderText = enableModes ? activeModeLabel : basePlaceholder;

  useEffect(() => {
    const cached = CHAT_CACHE[datasetId];

    if (cached) {
      setInput(cached.input ?? '');
      setSelectedSuggestionId(
        cached.selectedSuggestionId ?? (isRetail ? 'retail-bar' : 'spotify-bar')
      );
      setChartType(cached.chartType ?? (isRetail ? 'bar' : 'topTracks'));
      setMessages(
        cached.messages && cached.messages.length ? cached.messages : buildWelcomeMessages()
      );
      setActiveModeId(cached.activeModeId ?? 'plan');
    } else {
      setInput('');
      setSelectedSuggestionId(isRetail ? 'retail-bar' : 'spotify-bar');
      setChartType(isRetail ? 'bar' : 'topTracks');
      setMessages(buildWelcomeMessages());
      setActiveModeId('plan');
    }

    setIsModeMenuOpen(false);
  }, [datasetId, isRetail]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    CHAT_CACHE[datasetId] = {
      input,
      selectedSuggestionId,
      chartType,
      messages,
      activeModeId
    };
  }, [datasetId, input, selectedSuggestionId, chartType, messages, activeModeId]);

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
        const chartTypeForAnswer = isRegionCoreQuery
          ? 'regionCore'
          : retailSuggestion?.chartType || 'bar';

        let retailText;
        if (chartTypeForAnswer === 'productBar') {
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
          <h2>Chat with DataBrain</h2>
          <span className="panel-subtitle">
            Ask questions in natural language. I’ll turn them into queries and friendly summaries.
          </span>
        </div>
        <div className="chat-badge-beta">NLP · Beta</div>
      </div>

      <div className="chat-stream" ref={scrollRef}>
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
                  ? 'chat-bubble chat-bubble-assistant'
                  : 'chat-bubble chat-bubble-user'
              }
            >
              {m.role === 'assistant' && (
                <div className="chat-name">DataBrain</div>
              )}
              {m.role === 'user' && <div className="chat-name">You</div>}

              {m.id === 'welcome' ? (
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
                      {(isRetail ? RETAIL_FOLLOW_UPS : SPOTIFY_FOLLOW_UPS).map((f) => (
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
        <div className="mode-footer">
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
        <div className="chat-input-row">
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

