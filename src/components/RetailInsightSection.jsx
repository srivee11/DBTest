import React, { useState } from 'react';
import { KpiCards } from './KpiCards.jsx';
import { TracksTable } from './TracksTable.jsx';
import { RetailInsightChart } from './RetailInsightChart.jsx';

const DEFAULT_QUESTION =
  'Which product categories are driving sales this quarter?';

export function RetailInsightSection({ data, filters }) {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [activeChartType, setActiveChartType] = useState('bar');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('bar-primary');

  const suggestions = [
    {
      id: 'bar-primary',
      chartType: 'bar',
      title: 'Ranked bar chart by category',
      reason: 'Best for comparing categories side by side in one period.',
      tag: 'Recommended'
    },
    {
      id: 'pie-share',
      chartType: 'pie',
      title: 'Share of sales by category',
      reason: 'Helpful when you care about contribution to the whole.',
      tag: 'Share of total'
    },
    {
      id: 'line-trend',
      chartType: 'line',
      title: 'Trend of category sales over time',
      reason: 'Use when you want to see movement over time.',
      tag: 'Trend'
    }
  ];

  const handleSuggestionClick = (s) => {
    setSelectedSuggestionId(s.id);
    setActiveChartType(s.chartType);
  };

  const handleBestViewClick = () => {
    setQuestion(DEFAULT_QUESTION);
    setSelectedSuggestionId('bar-primary');
    setActiveChartType('bar');
  };

  return (
    <div className="section2-grid">
      <section className="grid-kpis">
        <KpiCards data={data} filters={filters} datasetId="retail_store" />
        <div className="drill-card">
          <div className="drill-text">
            <h3>Not sure which chart to use?</h3>
            <p>
              We’ll pick a sensible view to show which categories drive sales this
              quarter.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={handleBestViewClick}>
            Show me which categories drive this
          </button>
        </div>
      </section>

      <section className="grid-chart">
        <div className="assistant-panel">
          <div className="assistant-header">
            <h3>Ask about your retail data</h3>
            <p>Describe what you want to understand. We’ll suggest chart types.</p>
          </div>
          <div className="assistant-body">
            <textarea
              className="assistant-input"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="assistant-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`assistant-suggestion ${
                    selectedSuggestionId === s.id ? 'is-selected' : ''
                  }`}
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.tag && <span className="assistant-tag">{s.tag}</span>}
                  <span className="assistant-title">{s.title}</span>
                  <span className="assistant-reason">{s.reason}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <RetailInsightChart data={data} chartType={activeChartType} />
      </section>

      <section className="grid-table">
        <TracksTable data={data} datasetId="retail_store" />
      </section>
    </div>
  );
}

