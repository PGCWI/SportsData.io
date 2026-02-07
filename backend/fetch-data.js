/**
 * Fetches current season, teams, and standings from SportsData.io for NBA, NHL, NFL, MLB.
 * Writes JSON to data/{league}/ for use by the frontend.
 * Run: node backend/fetch-data.js (or npm run fetch)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEAGUES = ['nba', 'nhl', 'nfl', 'mlb'];
const BASE = 'https://api.sportsdata.io/v3';

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
        if (t && (t.PlayerID != null || t.Name != null)) all.push(t);
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
    } catch (_) { /* ignore */ }
    return { league, skipped: true, teamsCount, playersCount };
  }

  const prefix = `${BASE}/${league}/scores/json`;
  const q = `key=${key}`;

  const rawSeason = await fetchJson(`${prefix}/CurrentSeason?${q}`);
  const currentSeason = normalizeCurrentSeason(rawSeason);
  const seasonType = (currentSeason.SeasonType || '').toString().toUpperCase();
  const seasonNum = currentSeason.Season != null ? Number(currentSeason.Season) : null;
  const prevYear = seasonNum != null ? seasonNum - 1 : null;

  let regParam = currentSeason.ApiSeason ?? currentSeason.Season ?? currentSeason.SeasonYear;
  let postParam = null;
  let defaultView = 'reg';
  if (seasonType === 'OFF' && prevYear != null) {
    regParam = prevYear + 'REG';
    postParam = prevYear + 'POST';
    defaultView = 'post';
  } else if (seasonType === 'POST' && seasonNum != null) {
    regParam = seasonNum + 'REG';
    postParam = (currentSeason.ApiSeason && String(currentSeason.ApiSeason).includes('POST'))
      ? currentSeason.ApiSeason
      : seasonNum + 'POST';
    defaultView = 'post';
  } else if (seasonType === 'REG' && prevYear != null) {
    postParam = prevYear + 'POST';
  }
  if (postParam == null && seasonNum != null) {
    postParam = seasonNum + 'POST';
  }
  if (!regParam) console.warn(`[${league}] No reg season param`);

  const teams = await fetchJson(`${prefix}/teams?${q}`);
  const teamList = Array.isArray(teams) ? teams : teams ? [teams] : [];
  let stadiums = [];
  try {
    stadiums = await fetchJson(`${prefix}/Stadiums?${q}`);
  } catch (e) {
    console.warn(`[${league}] Stadiums failed:`, e.message);
  }
  if (!Array.isArray(stadiums)) stadiums = [];

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
          allPlayers.push({ ...p, Team: p.Team || p.TeamKey || teamKey });
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
  if (postParam) {
    try {
      standingsPost = await fetchJson(`${prefix}/Standings/${encodeURIComponent(String(postParam))}?${q}`);
    } catch (e) {
      console.warn(`[${league}] Post standings failed:`, e.message);
    }
  }

  ensureDir(dataDir);
  fs.writeFileSync(path.join(dataDir, 'current_season.json'), JSON.stringify(currentSeason, null, 2));
  fs.writeFileSync(path.join(dataDir, 'teams.json'), JSON.stringify(teamList, null, 2));
  fs.writeFileSync(path.join(dataDir, 'stadiums.json'), JSON.stringify(stadiums, null, 2));
  fs.writeFileSync(path.join(dataDir, 'rosters.json'), JSON.stringify(allPlayers, null, 2));
  const regList = Array.isArray(standingsReg) ? standingsReg : (standingsReg && typeof standingsReg === 'object' ? [standingsReg] : []);
  const postList = Array.isArray(standingsPost) ? standingsPost : (standingsPost && typeof standingsPost === 'object' ? [standingsPost] : []);
  fs.writeFileSync(path.join(dataDir, 'standings_reg.json'), JSON.stringify(regList, null, 2));
  fs.writeFileSync(path.join(dataDir, 'standings_post.json'), JSON.stringify(postList, null, 2));
  const meta = { defaultView, regSeason: String(regParam), postSeason: postParam ? String(postParam) : null };
  fs.writeFileSync(path.join(dataDir, 'standings_meta.json'), JSON.stringify(meta, null, 2));
  const defaultList = defaultView === 'post' && postList.length ? postList : regList;
  fs.writeFileSync(path.join(dataDir, 'standings.json'), JSON.stringify(defaultList, null, 2));

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

  console.log('Done. Data written to data/{league}/');
}

if (require.main === module) {
  runFetch();
} else {
  module.exports = { runFetch };
}
