/**
 * Migrates existing league-specific data to combined files with league fields.
 * Adds "league" field to all records and combines files across leagues.
 * Run: node backend/migrate-data.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEAGUES = ['nba', 'nhl', 'nfl', 'mlb'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`Failed to read ${filePath}:`, e.message);
    return null;
  }
}

function addLeagueField(data, league) {
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, league }));
  } else if (data && typeof data === 'object') {
    return { ...data, league };
  }
  return data;
}

async function migrateData() {
  console.log('Starting data migration...\n');
  
  const dataDir = path.join(ROOT, 'data');
  ensureDir(dataDir);

  // Combine teams
  console.log('Migrating teams.json...');
  const allTeams = [];
  for (const league of LEAGUES) {
    const teamsPath = path.join(dataDir, league, 'teams.json');
    const teams = readJsonFile(teamsPath);
    if (teams) {
      const teamsWithLeague = addLeagueField(teams, league);
      allTeams.push(...teamsWithLeague);
      console.log(`  ${league}: ${teamsWithLeague.length} teams`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'teams.json'), JSON.stringify(allTeams, null, 2));
  console.log(`  Combined: ${allTeams.length} teams\n`);

  // Combine rosters
  console.log('Migrating rosters.json...');
  const allRosters = [];
  for (const league of LEAGUES) {
    const rostersPath = path.join(dataDir, league, 'rosters.json');
    const rosters = readJsonFile(rostersPath);
    if (rosters) {
      const rostersWithLeague = addLeagueField(rosters, league);
      allRosters.push(...rostersWithLeague);
      console.log(`  ${league}: ${rostersWithLeague.length} players`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'rosters.json'), JSON.stringify(allRosters, null, 2));
  console.log(`  Combined: ${allRosters.length} players\n`);

  // Combine stadiums
  console.log('Migrating stadiums.json...');
  const allStadiums = [];
  for (const league of LEAGUES) {
    const stadiumsPath = path.join(dataDir, league, 'stadiums.json');
    const stadiums = readJsonFile(stadiumsPath);
    if (stadiums) {
      const stadiumsWithLeague = addLeagueField(stadiums, league);
      allStadiums.push(...stadiumsWithLeague);
      console.log(`  ${league}: ${stadiumsWithLeague.length} stadiums`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'stadiums.json'), JSON.stringify(allStadiums, null, 2));
  console.log(`  Combined: ${allStadiums.length} stadiums\n`);

  // Combine standings (regular season)
  console.log('Migrating standings_reg.json...');
  const allStandingsReg = [];
  for (const league of LEAGUES) {
    const standingsPath = path.join(dataDir, league, 'standings_reg.json');
    const standings = readJsonFile(standingsPath);
    if (standings) {
      const standingsWithLeague = addLeagueField(standings, league);
      allStandingsReg.push(...standingsWithLeague);
      console.log(`  ${league}: ${standingsWithLeague.length} standings`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'standings_reg.json'), JSON.stringify(allStandingsReg, null, 2));
  console.log(`  Combined: ${allStandingsReg.length} standings\n`);

  // Combine standings (post season)
  console.log('Migrating standings_post.json...');
  const allStandingsPost = [];
  for (const league of LEAGUES) {
    const standingsPath = path.join(dataDir, league, 'standings_post.json');
    const standings = readJsonFile(standingsPath);
    if (standings) {
      const standingsWithLeague = addLeagueField(standings, league);
      allStandingsPost.push(...standingsWithLeague);
      console.log(`  ${league}: ${standingsWithLeague.length} standings`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'standings_post.json'), JSON.stringify(allStandingsPost, null, 2));
  console.log(`  Combined: ${allStandingsPost.length} standings\n`);

  // Combine standings (default view)
  console.log('Migrating standings.json...');
  const allStandings = [];
  for (const league of LEAGUES) {
    const standingsPath = path.join(dataDir, league, 'standings.json');
    const standings = readJsonFile(standingsPath);
    if (standings) {
      const standingsWithLeague = addLeagueField(standings, league);
      allStandings.push(...standingsWithLeague);
      console.log(`  ${league}: ${standingsWithLeague.length} standings`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'standings.json'), JSON.stringify(allStandings, null, 2));
  console.log(`  Combined: ${allStandings.length} standings\n`);

  // Combine transactions
  console.log('Migrating transactions.json...');
  const allTransactions = [];
  for (const league of LEAGUES) {
    const transactionsPath = path.join(dataDir, league, 'transactions.json');
    const transactions = readJsonFile(transactionsPath);
    if (transactions) {
      const transactionsWithLeague = addLeagueField(transactions, league);
      allTransactions.push(...transactionsWithLeague);
      console.log(`  ${league}: ${transactionsWithLeague.length} transactions`);
    }
  }
  // Sort transactions by date (newest first)
  allTransactions.sort((a, b) => {
    const dateA = a.Date || a.Created || '';
    const dateB = b.Date || b.Created || '';
    return dateB.localeCompare(dateA);
  });
  fs.writeFileSync(path.join(dataDir, 'transactions.json'), JSON.stringify(allTransactions, null, 2));
  console.log(`  Combined: ${allTransactions.length} transactions\n`);

  // Combine current seasons
  console.log('Migrating current_season.json to current_seasons.json...');
  const allSeasons = [];
  for (const league of LEAGUES) {
    const seasonPath = path.join(dataDir, league, 'current_season.json');
    const season = readJsonFile(seasonPath);
    if (season) {
      const seasonWithLeague = addLeagueField(season, league);
      allSeasons.push(seasonWithLeague);
      console.log(`  ${league}: season ${seasonWithLeague.Season || 'unknown'}`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'current_seasons.json'), JSON.stringify(allSeasons, null, 2));
  console.log(`  Combined: ${allSeasons.length} seasons\n`);

  // Combine standings metadata
  console.log('Migrating standings_meta.json...');
  const allMeta = [];
  for (const league of LEAGUES) {
    const metaPath = path.join(dataDir, league, 'standings_meta.json');
    const meta = readJsonFile(metaPath);
    if (meta) {
      const metaWithLeague = addLeagueField(meta, league);
      allMeta.push(metaWithLeague);
      console.log(`  ${league}: default view ${meta.defaultView}`);
    }
  }
  fs.writeFileSync(path.join(dataDir, 'standings_meta.json'), JSON.stringify(allMeta, null, 2));
  console.log(`  Combined: ${allMeta.length} metadata records\n`);

  console.log('✓ Migration complete!');
  console.log('\nCombined files created in data/:');
  console.log('  - teams.json');
  console.log('  - rosters.json');
  console.log('  - stadiums.json');
  console.log('  - standings.json');
  console.log('  - standings_reg.json');
  console.log('  - standings_post.json');
  console.log('  - transactions.json');
  console.log('  - current_seasons.json');
  console.log('  - standings_meta.json');
  console.log('\nOriginal league-specific files in data/{league}/ are preserved.');
}

if (require.main === module) {
  migrateData();
} else {
  module.exports = { migrateData };
}
