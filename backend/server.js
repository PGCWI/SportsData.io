/**
 * Serves the frontend (public/) and stored API data (data/) for local development.
 * On startup only (no polling), fetches standings per league using current_season from data/{league}/.
 * Run: node backend/server.js (or npm start)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = path.join(__dirname, '..');
const LEAGUES = ['nba', 'nhl', 'nfl', 'mlb'];
const BASE = 'https://api.sportsdata.io/v3';
const CURRENT_SEASON_KEYS = ['Season', 'StartYear', 'EndYear', 'Description', 'RegularSeasonStartDate', 'PostSeasonStartDate', 'SeasonType', 'ApiSeason'];

/** Normalize to canonical current_season shape; null for missing. Overwrites file on disk if it was malformed. */
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

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const line = content.split('\n').find((l) => l.startsWith('key='));
  if (!line) return null;
  return line.replace(/^key=/, '').trim();
}

async function fetchStandingsOnce(key) {
  for (const league of LEAGUES) {
    try {
      const seasonPath = path.join(ROOT, 'data', league, 'current_season.json');
      if (!fs.existsSync(seasonPath)) {
        console.warn(`[${league}] No current_season.json, skipping standings fetch.`);
        continue;
      }
      const raw = JSON.parse(fs.readFileSync(seasonPath, 'utf8'));
      const currentSeason = normalizeCurrentSeason(raw);
      const needsOverwrite = typeof raw !== 'object' || raw === null || !CURRENT_SEASON_KEYS.every((k) => Object.prototype.hasOwnProperty.call(raw, k));
      if (needsOverwrite) {
        const dataDir = path.join(ROOT, 'data', league);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(seasonPath, JSON.stringify(currentSeason, null, 2));
      }
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
      if (regParam == null) {
        console.warn(`[${league}] No season in current_season.json, skipping.`);
        continue;
      }
      const dataDir = path.join(ROOT, 'data', league);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      let standingsReg = [];
      let standingsPost = [];
      const regUrl = `${BASE}/${league}/scores/json/Standings/${encodeURIComponent(String(regParam))}?key=${key}`;
      const regRes = await fetch(regUrl);
      if (regRes.ok) {
        standingsReg = await regRes.json();
      } else {
        console.warn(`[${league}] Reg standings failed: ${regRes.status}`);
      }
      if (postParam) {
        const postUrl = `${BASE}/${league}/scores/json/Standings/${encodeURIComponent(String(postParam))}?key=${key}`;
        const postRes = await fetch(postUrl);
        if (postRes.ok) {
          standingsPost = await postRes.json();
        } else {
          console.warn(`[${league}] Post standings failed: ${postRes.status}`);
        }
      }
      const regList = Array.isArray(standingsReg) ? standingsReg : (standingsReg && typeof standingsReg === 'object' ? [standingsReg] : []);
      const postList = Array.isArray(standingsPost) ? standingsPost : (standingsPost && typeof standingsPost === 'object' ? [standingsPost] : []);
      fs.writeFileSync(path.join(dataDir, 'standings_reg.json'), JSON.stringify(regList, null, 2));
      fs.writeFileSync(path.join(dataDir, 'standings_post.json'), JSON.stringify(postList, null, 2));
      fs.writeFileSync(path.join(dataDir, 'standings_meta.json'), JSON.stringify({ defaultView, regSeason: String(regParam), postSeason: postParam ? String(postParam) : null }, null, 2));
      const defaultList = defaultView === 'post' && postList.length ? postList : regList;
      fs.writeFileSync(path.join(dataDir, 'standings.json'), JSON.stringify(defaultList, null, 2));
      console.log(`[${league}] Standings updated (reg ${regList.length} / post ${postList.length}, default ${defaultView}).`);
    } catch (e) {
      console.warn(`[${league}] Standings fetch error:`, e.message);
    }
  }
}

app.use(express.static(path.join(ROOT, 'public')));
app.use('/data', express.static(path.join(ROOT, 'data')));

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

(async () => {
  const key = loadEnv();
  if (key) {
    try {
      const { runFetch } = require('./fetch-data');
      await runFetch();
    } catch (e) {
      console.warn('First-time data fetch failed:', e.message);
    }
    await fetchStandingsOnce(key);
  } else {
    console.log('No .env key found; skipping data fetch. Add key=YOUR_API_KEY to .env and restart.');
  }
  app.listen(PORT, () => {
    console.log(`Server at http://localhost:${PORT}`);
  });
})();
