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
   Pulls current season, teams, rosters, stadiums, and **both** regular-season and postseason standings for all four leagues.  
   Data is stored in both league-specific folders and combined files with `league` field:
   ```bash
   npm run fetch
   ```
   
   **Migration:** If you have existing data, run this first to convert to new format:
   ```bash
   npm run migrate
   ```

4. **Start the app**  
   Serves the frontend and the stored data at `http://localhost:3000`. On startup the server also refreshes standings once (no polling):
   ```bash
   npm start
   ```

   Or use **run.bat** (Windows): installs deps, runs fetch, then starts the server.

## What gets stored

After `npm run fetch` (or server startup with a valid `.env` key), data is stored in two locations:

### League-specific folders (`data/{league}/`)

Each league (nba, nhl, nfl, mlb) has its own folder with files **without** the `league` field (for backwards compatibility):

| File | Description |
|------|-------------|
| `current_season.json` | Current season info (Season, SeasonType, ApiSeason, dates). Normalized so e.g. NFL's numeric response becomes a full object with nulls where missing. |
| `teams.json` | Team list (name, city, division, conference/league, logo URL, colors). |
| `rosters.json` | Player rosters for all teams in the league. |
| `stadiums.json` | Stadium/arena information. |
| `standings_reg.json` | **Regular-season** standings for the appropriate season (e.g. 2025REG or 2025 for NFL). |
| `standings_post.json` | **Postseason** standings when available (e.g. 2025POST). Fetched when SeasonType is OFF/POST/REG or when API only returns a year (e.g. NFL). |
| `standings_meta.json` | `defaultView` (`reg` or `post`), `regSeason`, `postSeason` — used by the frontend to show the right view and labels. |
| `standings.json` | Copy of the **default** view (reg or post) for backward compatibility. |
| `transactions.json` | Recent player transactions (last 30 days). |

### Combined files (`data/`)

All leagues are combined into single files at the root data directory **with** the `league` field added to every record:

| File | Description |
|------|-------------|
| `teams.json` | All teams from all leagues with `league: "nba"/"nhl"/"nfl"/"mlb"` field. |
| `rosters.json` | All players from all leagues with `league` field. |
| `stadiums.json` | All stadiums from all leagues with `league` field. |
| `standings.json` | Default standings view for all leagues with `league` field. |
| `standings_reg.json` | Regular season standings for all leagues with `league` field. |
| `standings_post.json` | Playoff standings for all leagues with `league` field. |
| `standings_meta.json` | Metadata array with one object per league (includes `league` field). |
| `transactions.json` | All transactions from all leagues with `league` field, sorted by date. |
| `current_seasons.json` | Array of season objects, one per league (includes `league` field). |

## Frontend behavior

- **One page, all four leagues** in a grid (4 columns → 2 → 1 by width). Each league is a card.
- **Regular season | Playoffs** pills when both reg and post data exist. Default is post when season is OFF/POST and post data exists, otherwise reg.
- **NFL Playoffs**: **Bracket** view (seeds 1–7 per conference, Wild Card matchups) built from reg standings, plus **Standings** tab for playoff standings when available.
- **League | Conference** pills: "League" = entire league; then one pill per conference (e.g. AFC, NFC or Eastern, Western or AL, NL). Conference and division order are fixed per league (see `LEAGUE_CONFIG` in `app.js`).
- **Divisions** checkbox: when on, division sub-headers appear in the standings table; when off, a single flat table for the selected scope.
- **Season label** and **Playoffs** badge when showing postseason data.
- Team cell: color dot (from teams), logo, and full name (e.g. "Sacramento Kings"). Stats: Wins, Losses, OT/Ties, Pct, GB, Strk, Rank; columns adapt by league.
- **Team color theming**: Team and player pages dynamically apply the team's official colors (secondary/tertiary) for a comfortable, branded experience with smart contrast detection.

## Backend logic

- **fetch-data.js**  
  - Calls `CurrentSeason`, then derives `regParam` and `postParam` from `SeasonType` and `Season`.  
  - OFF → prior year REG + prior year POST, default view post.  
  - POST → current REG + current POST, default post.  
  - REG → current REG + prior year POST.  
  - If `SeasonType` is missing (e.g. NFL returns only a year), still requests **postParam = Season + 'POST'** so e.g. 2025POST is fetched.  
  - Writes all JSON files to both `data/{league}/` (without league field) and `data/` (combined with league field).
  - Also fetches rosters, stadiums, and transactions (last 30 days).

- **server.js**  
  - Serves `public/` and `data/`.  
  - On startup, reads each league's `current_season.json`, normalizes it if needed (and overwrites file if malformed), then uses the **same** reg/post param logic to fetch and write `standings_reg.json`, `standings_post.json`, `standings_meta.json`, and `standings.json`.  
  - Updates both league-specific files and combined files with league field.
  - No polling; one-time refresh per start.

- **migrate-data.js**  
  - Migrates existing league-specific data to combined format.
  - Adds `league` field to all records and writes combined files to `data/`.
  - Run with `npm run migrate`.

## Project layout

- **Backend**
  - `backend/fetch-data.js` – Fetches CurrentSeason, teams, rosters, stadiums, Standings (reg + post), transactions; normalizes season; writes both league-specific and combined files.
  - `backend/server.js` – Express server; serves `public/` and `data/`; one-time standings refresh on startup using same season/reg/post logic.
  - `backend/migrate-data.js` – Migrates existing data to combined format with league fields.

- **Frontend**
  - `public/index.html` – Shell: header, main area for league cards, loading/error.
  - `public/css/style.css` – Layout (grid, cards, table, bracket, pills, division toggle).
  - `public/js/app.js` – Loads `/data/{league}/current_season.json`, `teams.json`, `standings_meta.json`, `standings_reg.json`, `standings_post.json` (with fallback to `standings.json`). Renders cards, reg/post and bracket/standings views, conference filter, division toggle; uses `LEAGUE_CONFIG` for conference/division keys and sort order.

## API endpoints used

For each league (`nba`, `nhl`, `nfl`, `mlb`):

- `GET .../v3/{league}/scores/json/CurrentSeason?key=...`
- `GET .../v3/{league}/scores/json/teams?key=...`
- `GET .../v3/{league}/scores/json/Players/{teamKey}?key=...`
- `GET .../v3/{league}/scores/json/Stadiums?key=...`
- `GET .../v3/{league}/scores/json/Standings/{param}?key=...`  
- `GET .../v3/{league}/scores/json/TransactionsByDate/{date}?key=...`

`param` is reg (e.g. `2026REG`, `2025`) or post (e.g. `2025POST`) as derived above.

## Data Standardization

All data is now standardized with a `league` field across all four sports leagues. This enables:

- **Cross-league queries**: Query all teams, players, or standings across all leagues
- **Unified data structure**: Single source of truth for each data type
- **Easy filtering**: Filter by league using the `league` field (`"nba"`, `"nhl"`, `"nfl"`, `"mlb"`)
- **Backwards compatibility**: League-specific folders still exist for existing applications

Example combined data structure:

```json
{
  "TeamID": 1,
  "Key": "WAS",
  "City": "Washington",
  "Name": "Wizards",
  "league": "nba"
}
```
