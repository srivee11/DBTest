import React, { useMemo, useState } from 'react';
import { SuggestedChartsPanel } from './SuggestedChartsPanel.jsx';
import { ChartCanvas } from './ChartCanvas.jsx';
import { ConfigPanel } from './ConfigPanel.jsx';
import { interpretQuery } from '../logic/interpretQuery.js';

const EXAMPLE_QUERIES = [
  'Which product categories drove sales this quarter?',
  'Show me sales by region for last month.',
  'Which products sold the most this week?'
];

export function AiWorkspace({ dataset }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [error, setError] = useState(null);

  const hasData = Array.isArray(dataset) && dataset.length > 0;

  const handleSubmit = (valueFromChip) => {
    const text = typeof valueFromChip === 'string' ? valueFromChip : input.trim();
    if (!text) return;
    if (!hasData) {
      setError('No data loaded. Please ensure the sales JSON is available.');
      return;
    }

    setError(null);
    const userMessage = { id: Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);

    // Simulate AI interpretation locally.
    const result = interpretQuery(text, dataset);

    if (result.error) {
      setIsThinking(false);
      setSuggestions([]);
      setSelectedConfig(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: result.errorMessage || 'I could not understand that request.',
          type: 'error'
        }
      ]);
      setError(result.errorMessage || 'Try rephrasing your question or specifying a metric.');
      return;
    }

    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      text: result.explanation,
      type: 'analysis'
    };

    setSuggestions(result.suggestions);
    setSelectedConfig(result.suggestions[0] || null);
    setMessages((prev) => [...prev, aiMessage]);
    setIsThinking(false);
    setInput('');
  };

  const handleSuggestionSelect = (config) => {
    setSelectedConfig(config);
  };

  const handleConfigChange = (partial) => {
    setSelectedConfig((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const currentFilteredData = useMemo(() => {
    if (!selectedConfig) return [];
    const { filters } = selectedConfig;
    let rows = dataset;
    if (filters?.timeRange === 'this_quarter') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      rows = rows.filter((r) => new Date(r.dateSold) >= start);
    }
    if (filters?.region && filters.region.length > 0) {
      rows = rows.filter((r) => filters.region.includes(r.region));
    }
    if (filters?.topN) {
      // top N by category or product
      const field = selectedConfig.breakdownField || 'category';
      const totals = new Map();
      rows.forEach((r) => {
        const key = r[field];
        const value = Number(r.salesAmount) || 0;
        totals.set(key, (totals.get(key) || 0) + value);
      });
      const topKeys = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, filters.topN)
        .map(([key]) => key);
      rows = rows.filter((r) => topKeys.includes(r[field]));
    }
    return rows;
  }, [dataset, selectedConfig]);

  return (
    <div className="workspace-root">
      <section className="workspace-hero">
        <div className="workspace-hero-text">
          <h1>Chat with your retail data.</h1>
          <p>
            Describe what you want to understand in plain language, and let DataBrain recommend the
            right visualization.
          </p>
          <div className="workspace-dataset-pill">
            <span className="pill-label">Dataset</span>
            <span className="pill-value">Retail Sales – Demo JSON</span>
          </div>
        </div>
        <div className="workspace-hero-stats">
          <div className="stat-card">
            <span className="stat-label">Rows</span>
            <span className="stat-value">{hasData ? dataset.length : '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fields</span>
            <span className="stat-value">5</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Time to first chart</span>
            <span className="stat-value">Under 30s</span>
          </div>
        </div>
      </section>

      <section className="workspace-main">
        <div className="workspace-column workspace-chat">
          <div className="panel-header">
            <h2>Conversation</h2>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask a question about your data to get started.</p>
                <div className="chat-examples">
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      className="example-chip"
                      type="button"
                      onClick={() => handleSubmit(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-message chat-message-${m.role} ${
                  m.type === 'error' ? 'chat-message-error' : ''
                }`}
              >
                <span className="chat-role">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                <p>{m.text}</p>
              </div>
            ))}
            {isThinking && (
              <div className="chat-message chat-message-assistant is-loading">
                <span className="chat-role">Assistant</span>
                <p>Thinking about the best way to visualize this…</p>
                <div className="dot-loader">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
          <div className="chat-input-row">
            <textarea
              rows={2}
              className="chat-input"
              placeholder="Ask anything, e.g. “Which product categories drove sales this quarter?”"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              className="btn-primary chat-submit"
              type="button"
              disabled={!input.trim() || isThinking}
              onClick={() => handleSubmit()}
            >
              Ask
            </button>
          </div>
          {error && <div className="inline-error">{error}</div>}
        </div>

        <div className="workspace-column workspace-suggestions">
          <SuggestedChartsPanel
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            selectedId={selectedConfig?.id}
          />
        </div>

        <div className="workspace-column workspace-chart">
          <ChartCanvas config={selectedConfig} data={currentFilteredData} />
          <ConfigPanel config={selectedConfig} onChange={handleConfigChange} />
        </div>
      </section>
    </div>
  );
}

