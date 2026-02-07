# SportsData.io – Standings & Teams

Front-end and back-end for viewing **current season**, **teams** (with logos), **regular-season and playoff standings**, and **NFL playoff bracket** for **NBA**, **NHL**, **NFL**, and **MLB** using [SportsData.io](https://sportsdata.io) v3 API.

## Setup

1. **API key**  
   Create a `.env` in the project root with your SportsData.io key:
   ```env
   key=YOUR_API_KEY
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Fetch data**  
   Pulls current season, teams, and **both** regular-season and postseason standings for all four leagues:
   ```bash
   npm run fetch
   ```

4. **Start the app**  
   Serves the frontend and the stored data at `http://localhost:3000`. On startup the server also refreshes standings once (no polling):
   ```bash
   npm start
   ```

   Or use **run.bat** (Windows): installs deps, runs fetch, then starts the server.

## What gets stored

After `npm run fetch` (or server startup with a valid `.env` key), each league has its own folder under `data/`:

| File | Description |
|------|-------------|
| `current_season.json` | Current season info (Season, SeasonType, ApiSeason, dates). Normalized so e.g. NFL’s numeric response becomes a full object with nulls where missing. |
| `teams.json` | Team list (name, city, division, conference/league, logo URL, colors). |
| `standings_reg.json` | **Regular-season** standings for the appropriate season (e.g. 2025REG or 2025 for NFL). |
| `standings_post.json` | **Postseason** standings when available (e.g. 2025POST). Fetched when SeasonType is OFF/POST/REG or when API only returns a year (e.g. NFL). |
| `standings_meta.json` | `defaultView` (`reg` or `post`), `regSeason`, `postSeason` — used by the frontend to show the right view and labels. |
| `standings.json` | Copy of the **default** view (reg or post) for backward compatibility. |

Leagues: `nba`, `nhl`, `nfl`, `mlb`.

## Frontend behavior

- **One page, all four leagues** in a grid (4 columns → 2 → 1 by width). Each league is a card.
- **Regular season | Playoffs** pills when both reg and post data exist. Default is post when season is OFF/POST and post data exists, otherwise reg.
- **NFL Playoffs**: **Bracket** view (seeds 1–7 per conference, Wild Card matchups) built from reg standings, plus **Standings** tab for playoff standings when available.
- **League | Conference** pills: “League” = entire league; then one pill per conference (e.g. AFC, NFC or Eastern, Western or AL, NL). Conference and division order are fixed per league (see `LEAGUE_CONFIG` in `app.js`).
- **Divisions** checkbox: when on, division sub-headers appear in the standings table; when off, a single flat table for the selected scope.
- **Season label** and **Playoffs** badge when showing postseason data.
- Team cell: color dot (from teams), logo, and full name (e.g. “Sacramento Kings”). Stats: Wins, Losses, OT/Ties, Pct, GB, Strk, Rank; columns adapt by league.

## Backend logic

- **fetch-data.js**  
  - Calls `CurrentSeason`, then derives `regParam` and `postParam` from `SeasonType` and `Season`.  
  - OFF → prior year REG + prior year POST, default view post.  
  - POST → current REG + current POST, default post.  
  - REG → current REG + prior year POST.  
  - If `SeasonType` is missing (e.g. NFL returns only a year), still requests **postParam = Season + 'POST'** so e.g. 2025POST is fetched.  
  - Writes all of the above JSON files.

- **server.js**  
  - Serves `public/` and `data/`.  
  - On startup, reads each league’s `current_season.json`, normalizes it if needed (and overwrites file if malformed), then uses the **same** reg/post param logic to fetch and write `standings_reg.json`, `standings_post.json`, `standings_meta.json`, and `standings.json`.  
  - No polling; one-time refresh per start.

## Project layout

- **Backend**
  - `backend/fetch-data.js` – Fetches CurrentSeason, teams, Standings (reg + post); normalizes season; writes all `data/{league}/` files.
  - `backend/server.js` – Express server; serves `public/` and `data/`; one-time standings refresh on startup using same season/reg/post logic.

- **Frontend**
  - `public/index.html` – Shell: header, main area for league cards, loading/error.
  - `public/css/style.css` – Layout (grid, cards, table, bracket, pills, division toggle).
  - `public/js/app.js` – Loads `/data/{league}/current_season.json`, `teams.json`, `standings_meta.json`, `standings_reg.json`, `standings_post.json` (with fallback to `standings.json`). Renders cards, reg/post and bracket/standings views, conference filter, division toggle; uses `LEAGUE_CONFIG` for conference/division keys and sort order.

## API endpoints used

For each league (`nba`, `nhl`, `nfl`, `mlb`):

- `GET .../v3/{league}/scores/json/CurrentSeason?key=...`
- `GET .../v3/{league}/scores/json/teams?key=...`
- `GET .../v3/{league}/scores/json/Standings/{param}?key=...`  

`param` is reg (e.g. `2026REG`, `2025`) or post (e.g. `2025POST`) as derived above.
