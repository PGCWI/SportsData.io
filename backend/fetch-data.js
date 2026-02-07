/**
 * Fetches current season, teams, and standings from SportsData.io for NBA, NHL, NFL, MLB.
 * Writes JSON to data/{league}/ (league-specific) AND data/ (combined with league field).
 * Run: node backend/fetch-data.js (or npm run fetch)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEAGUES = ['nba', 'nhl', 'nfl', 'mlb'];
const BASE = 'https://api.sportsdata.io/v3';

// In-memory storage for combined data across all leagues
const combinedData = {
  teams: [],
  rosters: [],
  stadiums: [],
  standingsReg: [],
  standingsPost: [],
  standings: [],
  transactions: [],
  seasons: [],
  meta: []
};

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found. Create .env with: key=YOUR_API_KEY');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const line = content.split('\n').find((l) => l.startsWith('key='));
  if (!line) throw new Error('.env must contain key=YOUR_API_KEY');
  return line.replace(/^key=/, '').trim();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} => ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const CURRENT_SEASON_KEYS = ['Season', 'StartYear', 'EndYear', 'Description', 'RegularSeasonStartDate', 'PostSeasonStartDate', 'SeasonType', 'ApiSeason'];

/** Normalize CurrentSeason API response to a consistent object; use null for missing (e.g. NFL returns just a number). */
function normalizeCurrentSeason(raw) {
  const out = Object.fromEntries(CURRENT_SEASON_KEYS.map((k) => [k, null]));
  if (raw === null || raw === undefined) return out;
  if (typeof raw === 'number') {
    out.Season = raw;
    out.ApiSeason = raw;
    return out;
  }
  if (typeof raw !== 'object') return out;
  for (const k of CURRENT_SEASON_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = raw[k];
  }
  return out;
}

/**
 * Fetch current season using the appropriate endpoint for each league.
 * NFL uses different logic: returns upcoming season during offseason, current during season.
 * Other leagues (NBA, NHL, MLB) use CurrentSeason which returns the calendar year.
 */
async function fetchCurrentSeasonForLeague(league, key) {
  const prefix = `${BASE}/${league}/scores/json`;
  const q = `key=${key}`;
  
  let rawSeason;
  
  if (league === 'nfl') {
    // For NFL, use Upcoming season (returns current if in-season, next if offseason)
    try {
      rawSeason = await fetchJson(`${prefix}/UpcomingSeason?${q}`);
      console.log(`  [${league}] Using UpcomingSeason: ${rawSeason}`);
    } catch (e) {
      console.warn(`  [${league}] UpcomingSeason failed, trying CurrentSeason:`, e.message);
      rawSeason = await fetchJson(`${prefix}/CurrentSeason?${q}`);
    }
  } else {
    // NBA, NHL, MLB use CurrentSeason (returns calendar year where majority of season falls)
    rawSeason = await fetchJson(`${prefix}/CurrentSeason?${q}`);
  }
  
  return rawSeason;
}

/**
 * Determine standings parameters based on season type and league.
 * Returns { regParam, postParam, defaultView, shouldFetchPost }
 */
function determineStandingsParams(currentSeason, league) {
  const seasonType = (currentSeason.SeasonType || '').toString().toUpperCase();
  const seasonNum = currentSeason.Season != null ? Number(currentSeason.Season) : null;
  const prevYear = seasonNum != null ? seasonNum - 1 : null;
  
  let regParam = currentSeason.ApiSeason ?? currentSeason.Season;
  let postParam = null;
  let defaultView = 'reg';
  let shouldFetchPost = false; // Only fetch post if it makes sense
  
  // NFL specific logic
  if (league === 'nfl') {
    // NFL returns just a year number (e.g., 2025)
    // Season 2025 spans 2025-2026, playoffs in early 2026
    if (seasonNum != null) {
      regParam = seasonNum; // Use year as-is for regular season
      
      if (seasonType === 'POST') {
        // Currently in playoffs - fetch both, default to playoffs
        postParam = seasonNum + 'POST';
        defaultView = 'post';
        shouldFetchPost = true;
      } else if (seasonType === 'OFF') {
        // Offseason - show last year's playoffs
        postParam = (seasonNum - 1) + 'POST';
        defaultView = 'post';
        shouldFetchPost = true;
      } else {
        // Regular season - only show regular season, no playoffs yet
        postParam = null;
        defaultView = 'reg';
        shouldFetchPost = false;
      }
    }
  } else {
    // NBA, NHL, MLB logic
    if (seasonType === 'OFF' && prevYear != null) {
      // Offseason: show last completed season's playoffs as default
      regParam = prevYear + 'REG';
      postParam = prevYear + 'POST';
      defaultView = 'post';
      shouldFetchPost = true;
    } else if (seasonType === 'POST' && seasonNum != null) {
      // Playoffs: show current playoffs and regular season
      regParam = seasonNum + 'REG';
      postParam = (currentSeason.ApiSeason && String(currentSeason.ApiSeason).includes('POST'))
        ? currentSeason.ApiSeason
        : seasonNum + 'POST';
      defaultView = 'post';
      shouldFetchPost = true;
    } else if (seasonType === 'REG') {
      // Regular season: show current regular season
      regParam = currentSeason.ApiSeason ?? (seasonNum ? seasonNum + 'REG' : null);
      // Try to fetch last year's playoffs for toggle option
      if (prevYear != null) {
        postParam = prevYear + 'POST';
        shouldFetchPost = true;
      }
      defaultView = 'reg';
    } else if (seasonNum != null) {
      // Fallback
      regParam = currentSeason.ApiSeason ?? seasonNum + 'REG';
      postParam = seasonNum + 'POST';
      shouldFetchPost = true;
    }
  }
  
  return { regParam, postParam, defaultView, shouldFetchPost };
}

function dateStringDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function fetchTransactionsForLeague(league, key) {
  const prefix = `${BASE}/${league}/scores/json`;
  const q = `key=${key}`;
  const all = [];
  for (let i = 0; i < 30; i++) {
    const dateStr = dateStringDaysAgo(i);
    try {
      const list = await fetchJson(`${prefix}/TransactionsByDate/${dateStr}?${q}`);
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      arr.forEach((t) => {
        if (t && (t.PlayerID != null || t.Name != null)) all.push({ ...t, league });
      });
    } catch (e) {
      // skip failed days (no data or API difference per league)
    }
  }
  all.sort(function (a, b) {
    const da = a.Date || a.Created || '';
    const db = b.Date || b.Created || '';
    return db.localeCompare(da);
  });
  const dataDir = path.join(ROOT, 'data', league);
  ensureDir(dataDir);
  fs.writeFileSync(path.join(dataDir, 'transactions.json'), JSON.stringify(all, null, 2));
  
  // Add to combined data
  combinedData.transactions.push(...all);
  
  return all.length;
}

function leagueDataExists(league) {
  const dataDir = path.join(ROOT, 'data', league);
  const teamsPath = path.join(dataDir, 'teams.json');
  const rostersPath = path.join(dataDir, 'rosters.json');
  return fs.existsSync(teamsPath) && fs.existsSync(rostersPath);
}

async function fetchLeague(league, key) {
  const dataDir = path.join(ROOT, 'data', league);
  if (leagueDataExists(league)) {
    console.log(`  [${league}] Skipping fetch — data already present (teams.json + rosters.json). Delete files to refresh.`);
    let teamsCount = 0, playersCount = 0;
    try {
      const teams = JSON.parse(fs.readFileSync(path.join(dataDir, 'teams.json'), 'utf8'));
      teamsCount = Array.isArray(teams) ? teams.length : teams ? 1 : 0;
      const rosters = JSON.parse(fs.readFileSync(path.join(dataDir, 'rosters.json'), 'utf8'));
      playersCount = Array.isArray(rosters) ? rosters.length : 0;
      
      // Add existing data to combined data with league field
      if (Array.isArray(teams)) {
        combinedData.teams.push(...teams.map(t => ({ ...t, league })));
      }
      if (Array.isArray(rosters)) {
        combinedData.rosters.push(...rosters.map(r => ({ ...r, league })));
      }
      
      // Try to add other existing data too
      try {
        const stadiums = JSON.parse(fs.readFileSync(path.join(dataDir, 'stadiums.json'), 'utf8'));
        if (Array.isArray(stadiums)) {
          combinedData.stadiums.push(...stadiums.map(s => ({ ...s, league })));
        }
      } catch (_) {}
      
      try {
        const standingsReg = JSON.parse(fs.readFileSync(path.join(dataDir, 'standings_reg.json'), 'utf8'));
        if (Array.isArray(standingsReg)) {
          combinedData.standingsReg.push(...standingsReg.map(s => ({ ...s, league })));
        }
      } catch (_) {}
      
      try {
        const standingsPost = JSON.parse(fs.readFileSync(path.join(dataDir, 'standings_post.json'), 'utf8'));
        if (Array.isArray(standingsPost)) {
          combinedData.standingsPost.push(...standingsPost.map(s => ({ ...s, league })));
        }
      } catch (_) {}
      
      try {
        const standings = JSON.parse(fs.readFileSync(path.join(dataDir, 'standings.json'), 'utf8'));
        if (Array.isArray(standings)) {
          combinedData.standings.push(...standings.map(s => ({ ...s, league })));
        }
      } catch (_) {}
      
      try {
        const season = JSON.parse(fs.readFileSync(path.join(dataDir, 'current_season.json'), 'utf8'));
        if (season) {
          combinedData.seasons.push({ ...season, league });
        }
      } catch (_) {}
      
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'standings_meta.json'), 'utf8'));
        if (meta) {
          combinedData.meta.push({ ...meta, league });
        }
      } catch (_) {}
      
      try {
        const transactions = JSON.parse(fs.readFileSync(path.join(dataDir, 'transactions.json'), 'utf8'));
        if (Array.isArray(transactions)) {
          combinedData.transactions.push(...transactions.map(t => ({ ...t, league })));
        }
      } catch (_) {}
      
    } catch (_) { /* ignore */ }
    return { league, skipped: true, teamsCount, playersCount };
  }

  const prefix = `${BASE}/${league}/scores/json`;
  const q = `key=${key}`;

  const rawSeason = await fetchCurrentSeasonForLeague(league, key);
  const currentSeason = normalizeCurrentSeason(rawSeason);
  const { regParam, postParam, defaultView, shouldFetchPost } = determineStandingsParams(currentSeason, league);
  
  if (!regParam) console.warn(`[${league}] No reg season param`);

  const teams = await fetchJson(`${prefix}/teams?${q}`);
  const teamList = Array.isArray(teams) ? teams : teams ? [teams] : [];
  
  // Add league field to teams
  const teamsWithLeague = teamList.map(t => ({ ...t, league }));
  
  let stadiums = [];
  try {
    stadiums = await fetchJson(`${prefix}/Stadiums?${q}`);
  } catch (e) {
    console.warn(`[${league}] Stadiums failed:`, e.message);
  }
  if (!Array.isArray(stadiums)) stadiums = [];
  
  // Add league field to stadiums
  const stadiumsWithLeague = stadiums.map(s => ({ ...s, league }));

  const teamKeys = [];
  teamList.forEach((t) => {
    const k = t.Key ?? t.Team;
    if (k && typeof k === 'string' && !teamKeys.includes(k)) teamKeys.push(k);
  });
  const allPlayers = [];
  for (const teamKey of teamKeys) {
    try {
      const players = await fetchJson(`${prefix}/Players/${encodeURIComponent(teamKey)}?${q}`);
      const list = Array.isArray(players) ? players : players ? [players] : [];
      list.forEach((p) => {
        if (p && (p.PlayerID != null || p.Name != null)) {
          allPlayers.push({ ...p, Team: p.Team || p.TeamKey || teamKey, league });
        }
      });
    } catch (e) {
      console.warn(`[${league}] Players/${teamKey} failed:`, e.message);
    }
  }

  let standingsReg = [];
  let standingsPost = [];
  try {
    standingsReg = await fetchJson(`${prefix}/Standings/${encodeURIComponent(String(regParam))}?${q}`);
  } catch (e) {
    console.warn(`[${league}] Reg standings failed:`, e.message);
  }
  
  // Only fetch postseason if it makes sense (playoffs happening or last year's playoffs in offseason)
  if (postParam && shouldFetchPost) {
    try {
      standingsPost = await fetchJson(`${prefix}/Standings/${encodeURIComponent(String(postParam))}?${q}`);
    } catch (e) {
      console.warn(`[${league}] Post standings failed:`, e.message);
    }
  }

  const regList = Array.isArray(standingsReg) ? standingsReg : (standingsReg && typeof standingsReg === 'object' ? [standingsReg] : []);
  const postList = Array.isArray(standingsPost) ? standingsPost : (standingsPost && typeof standingsPost === 'object' ? [standingsPost] : []);
  
  // Add league field to standings
  const regListWithLeague = regList.map(s => ({ ...s, league }));
  const postListWithLeague = postList.map(s => ({ ...s, league }));
  const defaultList = defaultView === 'post' && postListWithLeague.length ? postListWithLeague : regListWithLeague;
  
  // Add season with league field
  const seasonWithLeague = { ...currentSeason, league };
  const metaWithLeague = { defaultView, regSeason: String(regParam), postSeason: postParam ? String(postParam) : null, league };

  // Write league-specific files (backwards compatibility)
  ensureDir(dataDir);
  fs.writeFileSync(path.join(dataDir, 'current_season.json'), JSON.stringify(currentSeason, null, 2));
  fs.writeFileSync(path.join(dataDir, 'teams.json'), JSON.stringify(teamList, null, 2));
  fs.writeFileSync(path.join(dataDir, 'stadiums.json'), JSON.stringify(stadiums, null, 2));
  fs.writeFileSync(path.join(dataDir, 'rosters.json'), JSON.stringify(allPlayers.map(p => {
    const { league: _, ...rest } = p;
    return rest;
  }), null, 2));
  fs.writeFileSync(path.join(dataDir, 'standings_reg.json'), JSON.stringify(regList, null, 2));
  fs.writeFileSync(path.join(dataDir, 'standings_post.json'), JSON.stringify(postList, null, 2));
  fs.writeFileSync(path.join(dataDir, 'standings_meta.json'), JSON.stringify({ defaultView, regSeason: String(regParam), postSeason: postParam ? String(postParam) : null }, null, 2));
  fs.writeFileSync(path.join(dataDir, 'standings.json'), JSON.stringify(defaultList.map(s => {
    const { league: _, ...rest } = s;
    return rest;
  }), null, 2));
  
  // Add to combined data
  combinedData.teams.push(...teamsWithLeague);
  combinedData.rosters.push(...allPlayers);
  combinedData.stadiums.push(...stadiumsWithLeague);
  combinedData.standingsReg.push(...regListWithLeague);
  combinedData.standingsPost.push(...postListWithLeague);
  combinedData.standings.push(...defaultList);
  combinedData.seasons.push(seasonWithLeague);
  combinedData.meta.push(metaWithLeague);

  return {
    league,
    season: currentSeason,
    teamsCount: teamList.length,
    playersCount: allPlayers.length,
    stadiumsCount: stadiums.length,
    standingsRegCount: regList.length,
    standingsPostCount: postList.length,
  };
}

async function runFetch() {
  const key = loadEnv();
  console.log('Fetching SportsData.io for:', LEAGUES.join(', '));

  // Reset combined data
  combinedData.teams = [];
  combinedData.rosters = [];
  combinedData.stadiums = [];
  combinedData.standingsReg = [];
  combinedData.standingsPost = [];
  combinedData.standings = [];
  combinedData.transactions = [];
  combinedData.seasons = [];
  combinedData.meta = [];

  for (const league of LEAGUES) {
    try {
      const result = await fetchLeague(league, key);
      if (result.skipped) {
        console.log(`  ${league}: skipped (cached) — ${result.teamsCount} teams, ${result.playersCount} players`);
      } else {
        console.log(`  ${league}: season ${result.season.Description ?? result.season.ApiSeason ?? result.season.Season ?? '—'}, ${result.teamsCount} teams, ${result.playersCount} players, ${result.stadiumsCount} stadiums, reg ${result.standingsRegCount} / post ${result.standingsPostCount} rows`);
      }
    } catch (e) {
      console.error(`  ${league} failed:`, e.message);
    }
  }

  console.log('Fetching transactions (last 30 days) for each league…');
  for (const league of LEAGUES) {
    try {
      const count = await fetchTransactionsForLeague(league, key);
      console.log(`  ${league}: ${count} transactions`);
    } catch (e) {
      console.warn(`  ${league} transactions failed:`, e.message);
    }
  }

  // Sort combined transactions by date
  combinedData.transactions.sort((a, b) => {
    const dateA = a.Date || a.Created || '';
    const dateB = b.Date || b.Created || '';
    return dateB.localeCompare(dateA);
  });

  // Write combined files to data/ root
  const rootDataDir = path.join(ROOT, 'data');
  ensureDir(rootDataDir);
  
  console.log('\nWriting combined data files...');
  fs.writeFileSync(path.join(rootDataDir, 'teams.json'), JSON.stringify(combinedData.teams, null, 2));
  console.log(`  teams.json: ${combinedData.teams.length} teams`);
  
  fs.writeFileSync(path.join(rootDataDir, 'rosters.json'), JSON.stringify(combinedData.rosters, null, 2));
  console.log(`  rosters.json: ${combinedData.rosters.length} players`);
  
  fs.writeFileSync(path.join(rootDataDir, 'stadiums.json'), JSON.stringify(combinedData.stadiums, null, 2));
  console.log(`  stadiums.json: ${combinedData.stadiums.length} stadiums`);
  
  fs.writeFileSync(path.join(rootDataDir, 'standings_reg.json'), JSON.stringify(combinedData.standingsReg, null, 2));
  console.log(`  standings_reg.json: ${combinedData.standingsReg.length} standings`);
  
  fs.writeFileSync(path.join(rootDataDir, 'standings_post.json'), JSON.stringify(combinedData.standingsPost, null, 2));
  console.log(`  standings_post.json: ${combinedData.standingsPost.length} standings`);
  
  fs.writeFileSync(path.join(rootDataDir, 'standings.json'), JSON.stringify(combinedData.standings, null, 2));
  console.log(`  standings.json: ${combinedData.standings.length} standings`);
  
  fs.writeFileSync(path.join(rootDataDir, 'transactions.json'), JSON.stringify(combinedData.transactions, null, 2));
  console.log(`  transactions.json: ${combinedData.transactions.length} transactions`);
  
  fs.writeFileSync(path.join(rootDataDir, 'current_seasons.json'), JSON.stringify(combinedData.seasons, null, 2));
  console.log(`  current_seasons.json: ${combinedData.seasons.length} seasons`);
  
  fs.writeFileSync(path.join(rootDataDir, 'standings_meta.json'), JSON.stringify(combinedData.meta, null, 2));
  console.log(`  standings_meta.json: ${combinedData.meta.length} metadata records`);

  console.log('\nDone. Data written to:');
  console.log('  - data/{league}/ (league-specific files without league field)');
  console.log('  - data/ (combined files with league field)');
}

if (require.main === module) {
  runFetch();
} else {
  module.exports = { runFetch };
}
