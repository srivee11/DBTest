## DataBrain – Spotify Artist Dashboard Prototype

This is a front-end–only React prototype of a **Spotify-style artist analytics dashboard** for DataBrain.

It is inspired by modern music analytics UIs and demonstrates how an artist or label could explore performance with **date filters, audience breakdowns, KPIs, and a track table**, all driven from a local JSON dataset (no backend).

### What’s included

- **Filters bar** for date range, comparison period, granularity, and audience age ranges.
- **KPI cards** showing total listens and unique listeners for the current selection.
- **Donut chart** of unique listeners by age group using `recharts`.
- **Tracks table** with sortable columns (track name, release date, duration, revenue, explicit flag, artist name) and its own scroll area.
- **Variables & datasets sidebar** mirroring selected variables and showing active dataset context.
- **Dummy Spotify-style data** loaded from `src/data/spotify_artist.json`.

### Tech stack

- React 18
- Vite
- Recharts (for chart rendering)

### Getting started

From the project root:

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL in your browser.

### How to use the prototype

- Use the **Date range** pills to toggle between last 30 days, last 12 months, and all time.
- Add one or more **Audience age ranges** and see the KPIs, chart, and table update to match.
- Sort the **Your tracks** table by clicking on a column header; click again to reverse sort order.
- Watch the **Variables** section in the right sidebar reflect your current filter choices.

### Notes & limitations

- All logic runs in the browser; there is **no backend** or real Spotify data.
- Some values like “vs previous period” are synthetic and meant only to illustrate the UI behavior.

