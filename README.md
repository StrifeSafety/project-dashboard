# Project Dashboard

A client-side project management dashboard built with plain HTML, CSS, and JavaScript.

## Quick Start

1. Open the project folder in VS Code
2. Install the **Live Server** extension (if not already installed)
3. Right-click `index.html` → **Open with Live Server**
4. The app opens in your browser at `http://localhost:5500`

Alternatively, just open `index.html` directly in any browser.

## File Structure

```
project-dashboard/
  index.html                 # Main HTML shell
  css/
    main.css                 # Design tokens, reset, nav, buttons, toast
    components.css           # Badges, tables, cards, modals, forms
    layouts.css              # Sidebar, briefing page, gantt, calendar
    responsive.css           # Tablet + mobile breakpoints
  js/
    state.js                 # Centralised app state (AppState) + tab config
    storage.js               # localStorage persistence + seed data
    utils.js                 # Shared helpers, badge builders, formatters
    router.js                # Tab switching, content routing
    app.js                   # Bootstrap, event binding, init
    renderers/
      dashboard.js           # Dashboard KPIs + Chart.js integration
      projects.js            # Project cards, kanban lifecycle
      documents.js           # Document grid + phase grouping
      tasks.js               # Task planner, milestones, kanban views
      budgets.js             # Budget table + KPIs
      stakeholders.js        # Stakeholder cards + table
      meetings.js            # Meeting cards list
      statistics.js          # Statistics & KPI overview
      projectBriefing.js     # Full project briefing: hero, gantt, calendar, team, budget
    components/
      modal.js               # Overlay, detail view, add/edit forms, CRUD
      toast.js               # Toast notifications
      sidebar.js             # Project/status filter sidebar
      subnav.js              # Sub-tab navigation
      toolbar.js             # Export CSV
  assets/                    # (placeholder for future static assets)
```

## Architecture Notes

- **No build step required** — plain browser-compatible JS
- **No framework** — vanilla HTML/CSS/JS
- **State** is managed via the `AppState` object in `state.js`
- **Data** persists in `localStorage` under the key `pd_data`
- **Chart.js** loaded from CDN for the dashboard task chart
- **Responsive** down to 480px mobile with sidebar toggle

## Data

On first load, the app seeds demo data (6 projects, 22 tasks, 18 documents, etc.).
Data is stored in `localStorage` and survives page reloads.
To reset: open browser DevTools → Console → `localStorage.removeItem('pd_data')` → refresh.

## Responsive Behaviour

- **Desktop (>1024px):** Full sidebar + content layout
- **Tablet (768–1024px):** Narrower sidebar, single-column grids
- **Mobile (<768px):** Sidebar slides in via toggle button, tables scroll horizontally
- **Small Mobile (<480px):** Nav tabs collapse to hamburger menu
