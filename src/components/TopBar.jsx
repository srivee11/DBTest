import React from 'react';

export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">DB</div>
        <div className="topbar-title-group">
          <span className="topbar-title">[Example] Spotify artist dashboard</span>
          <div className="topbar-pills">
            <button type="button" className="pill pill-outline">
              View as all artists
            </button>
            <button type="button" className="pill pill-outline">
              Light theme
            </button>
            <button type="button" className="pill pill-outline">
              Preview
            </button>
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <button type="button" className="btn-ghost">
          Save version
        </button>
        <button type="button" className="btn-primary">
          Publish
        </button>
        <button type="button" className="btn-ai">
          Ask AI
        </button>
      </div>
    </header>
  );
}

