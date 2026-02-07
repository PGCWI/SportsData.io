# Quick Reference: Standardized Data Structure

## League Field Values
- `"nba"` - National Basketball Association
- `"nhl"` - National Hockey League  
- `"nfl"` - National Football League
- `"mlb"` - Major League Baseball

## File Locations

### Combined Files (WITH `league` field)
Location: `data/` (root)

| File | Type | Description |
|------|------|-------------|
| `teams.json` | Array | All teams from all leagues |
| `rosters.json` | Array | All players from all leagues |
| `stadiums.json` | Array | All stadiums/arenas from all leagues |
| `standings.json` | Array | Default standings for all leagues |
| `standings_reg.json` | Array | Regular season standings for all leagues |
| `standings_post.json` | Array | Playoff standings for all leagues |
| `transactions.json` | Array | All recent transactions (sorted by date, newest first) |
| `current_seasons.json` | Array | Current season info for each league |
| `standings_meta.json` | Array | Standings metadata for each league |

### League-Specific Files (WITHOUT `league` field)
Location: `data/{league}/` where `{league}` is nba, nhl, nfl, or mlb

| File | Type | Description |
|------|------|-------------|
| `teams.json` | Array | Teams for this league only |
| `rosters.json` | Array | Players for this league only |
| `stadiums.json` | Array | Stadiums for this league only |
| `standings.json` | Array | Default standings for this league |
| `standings_reg.json` | Array | Regular season standings for this league |
| `standings_post.json` | Array | Playoff standings for this league |
| `transactions.json` | Array | Recent transactions for this league |
| `current_season.json` | Object | Current season info for this league |
| `standings_meta.json` | Object | Standings metadata for this league |

## Data Examples

### Teams
```json
{
  "TeamID": 1,
  "Key": "WAS",
  "Active": true,
  "City": "Washington",
  "Name": "Wizards",
  "Conference": "Eastern",
  "Division": "Southeast",
  "league": "nba"
}
```

### Players (Rosters)
```json
{
  "PlayerID": 20000468,
  "FirstName": "Anthony",
  "LastName": "Davis",
  "Team": "WAS",
  "Position": "C",
  "Height": 82,
  "Weight": 253,
  "league": "nba"
}
```

### Stadiums
```json
{
  "StadiumID": 1,
  "Active": true,
  "Name": "Capital One Arena",
  "City": "Washington",
  "State": "DC",
  "Country": "USA",
  "Capacity": 20290,
  "league": "nba"
}
```

### Standings
```json
{
  "Season": 2026,
  "SeasonType": 1,
  "TeamID": 9,
  "Key": "BOS",
  "City": "Boston",
  "Name": "Celtics",
  "Conference": "Eastern",
  "Division": "Atlantic",
  "Wins": 34,
  "Losses": 18,
  "league": "nba"
}
```

### Transactions
```json
{
  "PlayerID": 20002712,
  "Name": "Dalano Banton",
  "TeamID": 28,
  "Team": "LAC",
  "Type": "Signed",
  "Date": "2026-02-07T00:00:00",
  "league": "nba"
}
```

### Current Seasons
```json
{
  "Season": 2026,
  "StartYear": 2025,
  "EndYear": 2026,
  "Description": "2025-26",
  "RegularSeasonStartDate": "2025-10-21T00:00:00",
  "PostSeasonStartDate": "2026-04-13T00:00:00",
  "SeasonType": "REG",
  "ApiSeason": "2026REG",
  "league": "nba"
}
```

## Filtering Examples

### Filter by League
```javascript
const allTeams = require('./data/teams.json');

// Get only NBA teams
const nbaTeams = allTeams.filter(team => team.league === 'nba');

// Get only NFL teams
const nflTeams = allTeams.filter(team => team.league === 'nfl');

// Get teams from multiple leagues
const basketballAndHockey = allTeams.filter(team => 
  team.league === 'nba' || team.league === 'nhl'
);
```

### Cross-League Queries
```javascript
const allPlayers = require('./data/rosters.json');

// Find all players named "Smith" across all leagues
const allSmiths = allPlayers.filter(p => p.LastName === 'Smith');

// Count players by league
const playerCounts = allPlayers.reduce((acc, player) => {
  acc[player.league] = (acc[player.league] || 0) + 1;
  return acc;
}, {});
// Result: { nba: 450, nhl: 700, nfl: 1700, mlb: 1000 }

// Find all Eastern Conference teams (NBA/NHL)
const easternTeams = require('./data/teams.json')
  .filter(t => t.Conference === 'Eastern');
```

### Advanced Filtering
```javascript
// Get all transactions from last 7 days across all leagues
const transactions = require('./data/transactions.json');
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const recentTransactions = transactions.filter(t => 
  new Date(t.Date) >= sevenDaysAgo
);

// Group transactions by league
const transactionsByLeague = transactions.reduce((acc, t) => {
  if (!acc[t.league]) acc[t.league] = [];
  acc[t.league].push(t);
  return acc;
}, {});

// Get all stadiums in California
const stadiums = require('./data/stadiums.json');
const californiaStadiums = stadiums.filter(s => s.State === 'CA');
console.log(`${californiaStadiums.length} stadiums in California`);
```

## Commands

### Migration (One-time)
```bash
npm run migrate
```
Converts existing league-specific data to combined format with league fields.

### Fetch Fresh Data
```bash
npm run fetch
```
Fetches from SportsData.io API and creates both league-specific and combined files.

### Start Server
```bash
npm start
```
Starts server and refreshes standings (updates both formats).

### Dev Mode
```bash
npm run dev
```
Fetches data then starts server.

## API Access via Server

When server is running (`npm start`), data is accessible at:

### League-Specific
- `http://localhost:3000/data/nba/teams.json`
- `http://localhost:3000/data/nfl/rosters.json`
- `http://localhost:3000/data/mlb/standings.json`

### Combined
- `http://localhost:3000/data/teams.json`
- `http://localhost:3000/data/rosters.json`
- `http://localhost:3000/data/standings.json`
- `http://localhost:3000/data/transactions.json`
- `http://localhost:3000/data/current_seasons.json`

## Notes

- **Backwards Compatibility**: League-specific files remain unchanged for existing applications
- **Combined Files**: New applications should use combined files for cross-league functionality
- **League Field**: Always lowercase: `"nba"`, `"nhl"`, `"nfl"`, `"mlb"`
- **Sorting**: Transactions in combined file are sorted by date (newest first)
- **Arrays vs Objects**: 
  - `current_seasons.json` is an **array** of season objects
  - `current_season.json` (league-specific) is an **object**
  - `standings_meta.json` (combined) is an **array** of meta objects
  - `standings_meta.json` (league-specific) is an **object**
