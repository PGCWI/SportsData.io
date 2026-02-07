(function () {
  const loadingEl = document.getElementById('team-loading');
  const errorEl = document.getElementById('team-error');
  const bannerEl = document.getElementById('team-banner');

  function getParams() {
    const params = new URLSearchParams(window.location.search);
    const league = (params.get('league') || '').toLowerCase();
    const index = parseInt(params.get('index'), 10);
    return { league, index: isNaN(index) ? -1 : index };
  }

  function showLoading(show) {
    if (loadingEl) loadingEl.classList.toggle('hidden', !show);
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg || '';
      errorEl.classList.toggle('hidden', !msg);
    }
  }

  function showBanner(show) {
    if (bannerEl) bannerEl.classList.toggle('hidden', !show);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function buildTeamMap(teams) {
    const list = Array.isArray(teams) ? teams : (teams ? [teams] : []);
    const byId = {};
    const byKey = {};
    list.forEach((t) => {
      if (t.TeamID != null) byId[t.TeamID] = t;
      if (t.Key != null) byKey[t.Key] = t;
      if (t.Team != null) byKey[t.Team] = t;
    });
    return { byId, byKey };
  }

  function getFullTeam(teamMap, row) {
    return teamMap.byId[row.TeamID] || teamMap.byKey[row.Key] || teamMap.byKey[row.Team] || null;
  }

  function getTeamInfo(teamMap, row) {
    const t = getFullTeam(teamMap, row);
    const name = row.Name ?? t?.Name ?? t?.TeamName ?? row.Key ?? row.Team ?? '—';
    const city = row.City ?? t?.City ?? '';
    const displayName = (t && t.FullName) ? t.FullName : (city ? (city + ' ' + name).trim() : name);
    const logo = t?.WikipediaLogoUrl || t?.LogoUrl || '';
    return { displayName, logo };
  }

  var TEAM_DETAIL_KEYS = [
    { key: 'FullName', label: 'Full name' },
    { key: 'League', label: 'League' },
    { key: 'Conference', label: 'Conference' },
    { key: 'Division', label: 'Division' },
    { key: 'HeadCoach', label: 'Head coach' },
    { key: 'HittingCoach', label: 'Hitting coach' },
    { key: 'PitchingCoach', label: 'Pitching coach' },
    { key: 'OffensiveCoordinator', label: 'Offensive coordinator' },
    { key: 'DefensiveCoordinator', label: 'Defensive coordinator' },
    { key: 'SpecialTeamsCoach', label: 'Special teams coach' },
    { key: 'OffensiveScheme', label: 'Offensive scheme' },
    { key: 'DefensiveScheme', label: 'Defensive scheme' },
    { key: 'ByeWeek', label: 'Bye week' }
  ];

  var COLOR_KEYS = ['PrimaryColor', 'SecondaryColor', 'TertiaryColor', 'QuaternaryColor'];

  var SKIP_KEYS = {
    TeamID: true, Key: true, GlobalTeamID: true, LeagueID: true, NbaDotComTeamID: true,
    PlayerID: true, StadiumID: true, StadiumDetails: true,
    WikipediaLogoUrl: true, WikipediaWordMarkUrl: true, LogoUrl: true,
    AverageDraftPosition: true, AverageDraftPositionPPR: true, AverageDraftPosition2QB: true, AverageDraftPositionDynasty: true,
    DraftKingsName: true, DraftKingsPlayerID: true, FanDuelName: true, FanDuelPlayerID: true,
    FantasyDraftName: true, FantasyDraftPlayerID: true, YahooName: true, YahooPlayerID: true,
    City: true, Name: true, Active: true,
    PrimaryColor: true, SecondaryColor: true, TertiaryColor: true, QuaternaryColor: true
  };

  function isSkipKey(key) {
    if (SKIP_KEYS[key]) return true;
    if (key.indexOf('Upcoming') === 0) return true;
    return false;
  }

  function hexDisplay(hex) {
    if (hex == null || typeof hex !== 'string') return '';
    var s = hex.replace(/^#/, '').trim();
    return s ? '#' + s : '';
  }

  function formatValue(val, key) {
    if (val == null) return null;
    if (key === 'Active') return val ? 'Yes' : 'No';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  function getStatValue(row, col) {
    if (col === 'PCT') {
      const v = row.Percentage != null ? row.Percentage : row.PCT;
      return v != null && typeof v === 'number' ? v.toFixed(3) : '—';
    }
    return '—';
  }

  function parseStandingsList(raw) {
    let list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length && list[0] && typeof list[0] !== 'object') list = [];
    return list;
  }

  function sortStandings(standings) {
    const hasPoints = standings.length > 0 && standings.some(function (r) { return r.Points != null && typeof r.Points === 'number'; });
    return standings.slice().sort(function (a, b) {
      if (hasPoints) {
        const pA = a.Points != null && typeof a.Points === 'number' ? a.Points : -1;
        const pB = b.Points != null && typeof b.Points === 'number' ? b.Points : -1;
        if (pB !== pA) return pB - pA;
      }
      const wA = a.Wins != null ? a.Wins : -1;
      const wB = b.Wins != null ? b.Wins : -1;
      if (wB !== wA) return wB - wA;
      const lA = a.Losses != null ? a.Losses : 999;
      const lB = b.Losses != null ? b.Losses : 999;
      if (lA !== lB) return lA - lB;
      return String(a.Name ?? a.Key ?? a.Team ?? '').localeCompare(b.Name ?? b.Key ?? b.Team ?? '');
    });
  }

  function buildDetailRows(row, team, rank) {
    var rows = [];
    rows.push({ label: 'Rank', value: String(rank) });
    var fromRow = [
      { label: 'Wins', value: row.Wins },
      { label: 'Losses', value: row.Losses },
      { label: 'OT', value: row.OvertimeLosses },
      { label: 'Ties', value: row.Ties },
      { label: 'Pct', value: getStatValue(row, 'PCT') },
      { label: 'Points', value: row.Points },
      { label: 'Conference', value: row.League ?? row.Conference },
      { label: 'Division', value: row.Division },
      { label: 'GB', value: row.GamesBack ?? row.GamesBehind },
      { label: 'Streak', value: row.StreakDescription ?? row.Streak }
    ];
    fromRow.forEach(function (item) {
      if (item.value != null && item.value !== '') rows.push({ label: item.label, value: formatValue(item.value, null) });
    });

    if (team) {
      TEAM_DETAIL_KEYS.forEach(function (item) {
        var val = team[item.key];
        if (val == null || val === '') return;
        var str = formatValue(val, item.key);
        var already = rows.some(function (r) { return r.label === item.label && r.value === str; });
        if (!already) rows.push({ label: item.label, value: str });
      });

      Object.keys(team).forEach(function (key) {
        if (isSkipKey(key)) return;
        if (TEAM_DETAIL_KEYS.some(function (d) { return d.key === key; })) return;
        if (COLOR_KEYS.indexOf(key) >= 0) return;
        var val = team[key];
        if (val == null || (typeof val === 'object' && !Array.isArray(val))) return;
        var label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).trim();
        rows.push({ label: label, value: formatValue(val, key) });
      });
    }
    return rows;
  }

  function buildStadiumById(stadiums) {
    var byId = {};
    if (!Array.isArray(stadiums)) return byId;
    stadiums.forEach(function (s) {
      if (s && s.StadiumID != null) byId[s.StadiumID] = s;
    });
    return byId;
  }

  function getStadiumForTeam(team, stadiumById) {
    if (!team) return null;
    if (team.StadiumDetails && typeof team.StadiumDetails === 'object') {
      var sd = team.StadiumDetails;
      return {
        Name: sd.Name,
        Address: sd.Address,
        City: sd.City,
        State: sd.State,
        Zip: sd.Zip,
        Country: sd.Country,
        Capacity: sd.Capacity,
        Type: sd.Type,
        Surface: sd.Surface,
        PlayingSurface: sd.PlayingSurface,
        GeoLat: sd.GeoLat,
        GeoLong: sd.GeoLong
      };
    }
    if (team.StadiumID != null && stadiumById[team.StadiumID]) return stadiumById[team.StadiumID];
    return null;
  }

  function hasStadiumCoords(stadium) {
    return stadium && stadium.GeoLat != null && stadium.GeoLong != null &&
      typeof stadium.GeoLat === 'number' && typeof stadium.GeoLong === 'number';
  }

  function initStadiumMap(stadium) {
    if (!hasStadiumCoords(stadium)) return;
    var el = document.getElementById('stadium-map');
    if (!el || typeof window.L === 'undefined') return;
    var lat = Number(stadium.GeoLat);
    var lng = Number(stadium.GeoLong);
    if (isNaN(lat) || isNaN(lng)) return;
    try {
      var map = window.L.map('stadium-map').setView([lat, lng], 16);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      window.L.marker([lat, lng]).addTo(map);
    } catch (e) { /* Leaflet not loaded */ }
  }

  function renderStadiumCard(stadium) {
    if (!stadium || (!stadium.Name && !stadium.City)) return '';
    var surfaceVal = stadium.PlayingSurface != null ? stadium.PlayingSurface : stadium.Surface;
    var fields = [
      { key: 'Name', label: 'Name' },
      { key: 'City', label: 'City' },
      { key: 'State', label: 'State' },
      { key: 'Country', label: 'Country' },
      { key: 'Address', label: 'Address' },
      { key: 'Surface', label: 'Surface', value: surfaceVal },
      { key: 'Type', label: 'Type' },
      { key: 'Capacity', label: 'Capacity' }
    ];
    var html = '<div class="stadium-details-card"><h3 class="stadium-card-title">Stadium Details</h3><dl class="stadium-card-details">';
    fields.forEach(function (f) {
      var val = f.value !== undefined ? f.value : stadium[f.key];
      if (val == null || val === '') return;
      html += '<div class="stadium-card-row"><dt>' + escapeHtml(f.label) + '</dt><dd>' + escapeHtml(String(val)) + '</dd></div>';
    });
    html += '</dl></div>';
    return html;
  }

  function renderStadiumSection(stadium) {
    if (!stadium || (!stadium.Name && !stadium.City)) return '';
    var hasMap = hasStadiumCoords(stadium);
    var html = '<div class="stadium-section' + (hasMap ? '' : ' stadium-section--no-map') + '">';
    html += renderStadiumCard(stadium);
    if (hasMap) {
      html += '<div class="stadium-map-wrap"><div id="stadium-map" class="stadium-map"></div></div>';
    }
    html += '</div>';
    return html;
  }

  function getTeamKey(row, team) {
    return row.Team || row.Key || (team && (team.Team || team.Key)) || '';
  }

  function getTeamLogo(teamMap, teamKey, teamId) {
    if (!teamMap) return '';
    var t = teamMap.byId[teamId] || teamMap.byKey[teamKey];
    return t ? (t.WikipediaLogoUrl || t.LogoUrl || '') : '';
  }

  function getTeamStandingsIndexFromSorted(sorted, teamKey, teamId) {
    if (!sorted || !sorted.length) return -1;
    for (var i = 0; i < sorted.length; i++) {
      var row = sorted[i];
      if ((teamId != null && row.TeamID === teamId) || (teamKey && (row.Team === teamKey || row.Key === teamKey))) return i;
    }
    return -1;
  }

  function formatTransactionDate(tx) {
    var dateStr = tx.Updated || tx.Created || tx.Date || '';
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function renderTeamTransactionsSection(transactions, league, teamMap, sorted) {
    if (!transactions || !transactions.length) {
      return '<div class="team-transactions-section"><h3 class="team-transactions-title">Team transactions</h3><p class="muted">No transactions in the last 30 days.</p></div>';
    }
    var html = '<div class="team-transactions-section"><h3 class="team-transactions-title">Team transactions</h3><div class="team-transactions-list">';
    transactions.forEach(function (tx) {
      var hasFormer = tx.FormerTeamID != null || (tx.FormerTeam != null && tx.FormerTeam !== '');
      var hasNew = tx.TeamID != null || (tx.Team != null && tx.Team !== '');
      var formerLogo = hasFormer ? getTeamLogo(teamMap, tx.FormerTeam, tx.FormerTeamID) : '';
      var teamLogo = hasNew ? getTeamLogo(teamMap, tx.Team, tx.TeamID) : '';
      var formerIdx = getTeamStandingsIndexFromSorted(sorted, tx.FormerTeam, tx.FormerTeamID);
      var teamIdx = getTeamStandingsIndexFromSorted(sorted, tx.Team, tx.TeamID);
      var formerHref = formerIdx >= 0 ? ('team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(formerIdx)) : '';
      var teamHref = teamIdx >= 0 ? ('team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(teamIdx)) : '';
      var name = tx.Name || '—';
      var note = tx.Note || '';
      var playerId = tx.PlayerID != null ? String(tx.PlayerID) : '';
      var playerHref = (league && playerId) ? ('player.html?league=' + encodeURIComponent(league) + '&playerId=' + encodeURIComponent(playerId) + '&teamIndex=' + encodeURIComponent(getParams().index)) : '';
      var dateTime = formatTransactionDate(tx);
      html += '<div class="team-tx-card">';
      html += '<div class="team-tx-logos">';
      if (hasFormer && hasNew) {
        if (formerLogo) {
          if (formerHref) html += '<a class="team-tx-logo-link" href="' + escapeAttr(formerHref) + '" title="View team">';
          html += '<img class="team-tx-logo" src="' + escapeAttr(formerLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
          if (formerHref) html += '</a>';
        } else {
          html += '<span class="team-tx-logo team-tx-logo--placeholder"></span>';
        }
        html += '<span class="team-tx-arrow">→</span>';
        if (teamLogo) {
          if (teamHref) html += '<a class="team-tx-logo-link" href="' + escapeAttr(teamHref) + '" title="View team">';
          html += '<img class="team-tx-logo" src="' + escapeAttr(teamLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
          if (teamHref) html += '</a>';
        } else {
          html += '<span class="team-tx-logo team-tx-logo--placeholder"></span>';
        }
      } else if (hasFormer && formerLogo) {
        if (formerHref) html += '<a class="team-tx-logo-link" href="' + escapeAttr(formerHref) + '" title="View team">';
        html += '<img class="team-tx-logo" src="' + escapeAttr(formerLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
        if (formerHref) html += '</a>';
      } else if (hasNew && teamLogo) {
        if (teamHref) html += '<a class="team-tx-logo-link" href="' + escapeAttr(teamHref) + '" title="View team">';
        html += '<img class="team-tx-logo" src="' + escapeAttr(teamLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
        if (teamHref) html += '</a>';
      }
      html += '</div>';
      html += '<div class="team-tx-name">';
      if (playerHref) html += '<a class="team-tx-player-link" href="' + escapeAttr(playerHref) + '">' + escapeHtml(name) + '</a>';
      else html += escapeHtml(name);
      html += '</div>';
      if (note) html += '<div class="team-tx-note">' + escapeHtml(note) + '</div>';
      if (dateTime) html += '<div class="team-tx-date">' + escapeHtml(dateTime) + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function getPlayerName(p) {
    if (p.Name) return p.Name;
    var first = p.FirstName || '';
    var last = p.LastName || '';
    return (first + ' ' + last).trim() || '—';
  }

  function getPlayerJersey(p) {
    if (p.Jersey != null && p.Jersey !== '') return p.Jersey;
    if (p.Number != null && p.Number !== '') return p.Number;
    return null;
  }

  function rosterStatusOrder(s) {
    if (s == null || s === '') return 4;
    var u = String(s).toLowerCase();
    if (u === 'active') return 0;
    if (u.indexOf('injured') !== -1 || u === 'ir') return 1;
    if (u.indexOf('minor') !== -1) return 2;
    return 3;
  }

  function sortRoster(players) {
    return (players || []).slice().sort(function (a, b) {
      var oa = rosterStatusOrder(a.Status);
      var ob = rosterStatusOrder(b.Status);
      if (oa !== ob) return oa - ob;
      var ja = getPlayerJersey(a);
      var jb = getPlayerJersey(b);
      var na = ja != null && ja !== '' ? Number(ja) : 9999;
      var nb = jb != null && jb !== '' ? Number(jb) : 9999;
      return na - nb;
    });
  }

  function renderRosterSection(players, league) {
    if (!players || !players.length) return '';
    var sorted = sortRoster(players);
    var html = '<div class="roster-section"><h3 class="roster-title">Roster</h3><div class="roster-grid">';
    sorted.forEach(function (p) {
      var name = getPlayerName(p);
      var status = p.Status != null ? String(p.Status) : '';
      var position = p.Position != null ? String(p.Position) : '';
      var posCat = p.PositionCategory != null ? String(p.PositionCategory) : '';
      var jersey = getPlayerJersey(p);
      var playerId = p.PlayerID != null ? p.PlayerID : '';
      var teamIndex = getParams().index;
      var href = 'player.html?league=' + encodeURIComponent(league) + '&playerId=' + encodeURIComponent(String(playerId));
      if (teamIndex >= 0) href += '&teamIndex=' + encodeURIComponent(String(teamIndex));
      html += '<a class="roster-card" href="' + escapeAttr(href) + '">';
      html += '<div class="roster-card-body">';
      html += '<span class="roster-card-name">' + escapeHtml(name) + '</span>';
      if (status) html += '<span class="roster-card-status">' + escapeHtml(status) + '</span>';
      if (position || posCat) {
        html += '<span class="roster-card-position">' + escapeHtml(posCat ? posCat + ' · ' + position : position) + '</span>';
      }
      if (jersey != null && jersey !== '') html += '<span class="roster-card-jersey">#' + escapeHtml(String(jersey)) + '</span>';
      html += '</div></a>';
    });
    html += '</div></div>';
    return html;
  }

  function renderBanner(leagueId, row, teamMap, rank) {
    var info = getTeamInfo(teamMap, row);
    var team = getFullTeam(teamMap, row);
    var details = buildDetailRows(row, team, rank);

    // Apply team colors to page
    applyTeamColors(team);

    var html = '<div class="team-header-inner">';
    html += '<h2 class="team-header-title">Team Details</h2>';
    html += '<div class="team-header-bar">';
    if (info.logo) html += '<img class="team-banner-logo" src="' + escapeAttr(info.logo) + '" alt="" onerror="this.style.display=\'none\'">';
    html += '<span class="team-banner-name">' + escapeHtml(info.displayName) + '</span>';
    html += '<span class="team-banner-league">' + escapeHtml(leagueId.toUpperCase()) + '</span>';
    html += '</div>';
    html += '<dl class="team-banner-details">';
    details.forEach(function (d) {
      html += '<div class="team-banner-row">';
      html += '<dt>' + escapeHtml(d.label) + '</dt>';
      if (d.type === 'color') {
        html += '<dd class="team-banner-value-color"><span class="color-swatch" style="background-color:' + escapeAttr(d.hex) + '"></span><span class="color-hex">' + escapeHtml(d.hex) + '</span></dd>';
      } else {
        html += '<dd>' + escapeHtml(d.value) + '</dd>';
      }
      html += '</div>';
    });
    html += '</dl></div>';
    return html;
  }

  function normalizeHex(hex) {
    if (hex == null || typeof hex !== 'string') return null;
    var s = hex.replace(/^#/, '').trim().toUpperCase();
    if (!s || !/^[0-9A-F]{6}$/.test(s)) return null;
    return '#' + s;
  }

  function hexToRgb(hex) {
    var normalized = normalizeHex(hex);
    if (!normalized) return null;
    var r = parseInt(normalized.slice(1, 3), 16);
    var g = parseInt(normalized.slice(3, 5), 16);
    var b = parseInt(normalized.slice(5, 7), 16);
    return { r: r, g: g, b: b };
  }

  function getLuminance(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function isLightColor(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return true;
    return getLuminance(rgb) > 0.5;
  }

  function applyTeamColors(team) {
    if (!team) return;
    
    var primary = normalizeHex(team.PrimaryColor);
    var secondary = normalizeHex(team.SecondaryColor);
    var tertiary = normalizeHex(team.TertiaryColor);
    var quaternary = normalizeHex(team.QuaternaryColor);
    
    if (!primary && !secondary && !tertiary) return;

    // Use PRIMARY as main color, secondary/tertiary as accents
    var mainColor = primary;
    var accentColor = secondary || tertiary;
    var highlightColor = tertiary || secondary;
    
    if (!mainColor) return;

    var root = document.documentElement;
    var mainRgb = hexToRgb(mainColor);
    var accentRgb = accentColor ? hexToRgb(accentColor) : mainRgb;
    var highlightRgb = highlightColor ? hexToRgb(highlightColor) : mainRgb;
    
    if (mainRgb) {
      // Set main theme colors with transparency variations
      root.style.setProperty('--team-primary', mainColor);
      root.style.setProperty('--team-primary-rgb', mainRgb.r + ', ' + mainRgb.g + ', ' + mainRgb.b);
      root.style.setProperty('--team-primary-light', 'rgba(' + mainRgb.r + ', ' + mainRgb.g + ', ' + mainRgb.b + ', 0.1)');
      root.style.setProperty('--team-primary-medium', 'rgba(' + mainRgb.r + ', ' + mainRgb.g + ', ' + mainRgb.b + ', 0.15)');
      
      // Use quaternary as text color if available, otherwise calculate based on luminance
      var textColor = quaternary || (isLightColor(mainColor) ? '#24292f' : '#ffffff');
      root.style.setProperty('--team-text', textColor);
      
      // Set quaternary for other text elements
      if (quaternary) {
        root.style.setProperty('--team-quaternary', quaternary);
        var quaternaryRgb = hexToRgb(quaternary);
        if (quaternaryRgb) {
          root.style.setProperty('--team-quaternary-rgb', quaternaryRgb.r + ', ' + quaternaryRgb.g + ', ' + quaternaryRgb.b);
        }
      }
    }
    
    if (accentRgb) {
      root.style.setProperty('--team-accent', accentColor);
      root.style.setProperty('--team-accent-rgb', accentRgb.r + ', ' + accentRgb.g + ', ' + accentRgb.b);
      root.style.setProperty('--team-accent-light', 'rgba(' + accentRgb.r + ', ' + accentRgb.g + ', ' + accentRgb.b + ', 0.08)');
    }
    
    if (highlightRgb) {
      root.style.setProperty('--team-highlight', highlightColor);
      root.style.setProperty('--team-highlight-rgb', highlightRgb.r + ', ' + highlightRgb.g + ', ' + highlightRgb.b);
      root.style.setProperty('--team-highlight-light', 'rgba(' + highlightRgb.r + ', ' + highlightRgb.g + ', ' + highlightRgb.b + ', 0.06)');
    }
    
    // Apply themed class to body for CSS targeting
    document.body.classList.add('team-themed');
  }

  async function loadTeam() {
    const { league, index } = getParams();
    const validLeagues = ['nba', 'nhl', 'nfl', 'mlb'];
    if (!validLeagues.includes(league) || index < 0) {
      showLoading(false);
      showError('Invalid team. Use the standings page and click a team.');
      return;
    }

    showError('');
    showLoading(true);
    showBanner(false);

    try {
      const [teamsRes, metaRes, regRes, postRes, fallbackRes, stadiumsRes, rostersRes, transactionsRes] = await Promise.all([
        fetch('/data/' + league + '/teams.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/standings_meta.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/standings_reg.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/standings_post.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/standings.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/stadiums.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/rosters.json').catch(() => ({ ok: false })),
        fetch('/data/' + league + '/transactions.json').catch(() => ({ ok: false }))
      ]);

      if (!teamsRes.ok) {
        showLoading(false);
        showError('Could not load team data.');
        return;
      }

      const teams = await teamsRes.json();
      const teamMap = buildTeamMap(teams);
      var stadiums = [];
      if (stadiumsRes.ok) {
        try { stadiums = await stadiumsRes.json(); } catch (e) {}
        if (!Array.isArray(stadiums)) stadiums = [];
      }
      var stadiumById = buildStadiumById(stadiums);
      var allPlayers = [];
      if (rostersRes.ok) {
        try { allPlayers = await rostersRes.json(); } catch (e) {}
        if (!Array.isArray(allPlayers)) allPlayers = [];
      }
      var allTransactions = [];
      if (transactionsRes && transactionsRes.ok) {
        try { allTransactions = await transactionsRes.json(); } catch (e) {}
        if (!Array.isArray(allTransactions)) allTransactions = [];
      }
      let meta = null;
      let reg = [];
      let post = [];
      if (metaRes.ok) meta = await metaRes.json();
      if (regRes.ok) reg = parseStandingsList(await regRes.json());
      if (postRes.ok) post = parseStandingsList(await postRes.json());
      let standings = reg;
      if (meta && meta.defaultView === 'post' && post.length) standings = post;
      else if (!reg.length && fallbackRes.ok) standings = parseStandingsList(await fallbackRes.json());

      const sorted = sortStandings(standings);

      const row = sorted[index];
      if (!row) {
        showLoading(false);
        showError('Team not found.');
        return;
      }

      var team = getFullTeam(teamMap, row);
      var stadium = getStadiumForTeam(team, stadiumById);

      document.title = (getTeamInfo(teamMap, row).displayName) + ' – SportsData.io';
      bannerEl.innerHTML = renderBanner(league, row, teamMap, index + 1);
      showBanner(true);

      var stadiumWrap = document.getElementById('team-stadium-wrap');
      if (stadiumWrap) {
        if (stadium && (stadium.Name || stadium.City)) {
          stadiumWrap.innerHTML = renderStadiumSection(stadium);
          stadiumWrap.classList.remove('hidden');
          if (hasStadiumCoords(stadium)) {
            setTimeout(function () { initStadiumMap(stadium); }, 100);
          }
        } else {
          stadiumWrap.innerHTML = '';
          stadiumWrap.classList.add('hidden');
        }
      }

      var teamKey = getTeamKey(row, team);
      var rosterWrap = document.getElementById('team-roster-wrap');
      if (rosterWrap) {
        var teamPlayers = teamKey ? allPlayers.filter(function (p) { 
          // Filter by team
          if (p.Team !== teamKey && p.TeamKey !== teamKey) return false;
          // Only show specific statuses
          var status = p.Status != null ? String(p.Status) : '';
          var allowedStatuses = ['Active', 'Injured Reserve', 'Suspended', 'Suspended List'];
          return allowedStatuses.indexOf(status) !== -1;
        }) : [];
        if (teamPlayers.length) {
          rosterWrap.innerHTML = renderRosterSection(teamPlayers, league);
          rosterWrap.classList.remove('hidden');
        } else {
          rosterWrap.innerHTML = '';
          rosterWrap.classList.add('hidden');
        }
      }

      var teamTransactions = teamKey
        ? allTransactions.filter(function (tx) { return tx.Team === teamKey || tx.FormerTeam === teamKey; })
        : [];
      teamTransactions.sort(function (a, b) {
        var ua = a.Updated || a.Created || a.Date || '';
        var ub = b.Updated || b.Created || b.Date || '';
        return ub.localeCompare(ua);
      });
      var transactionsWrap = document.getElementById('team-transactions-wrap');
      if (transactionsWrap) {
        transactionsWrap.innerHTML = renderTeamTransactionsSection(teamTransactions, league, teamMap, sorted);
        transactionsWrap.classList.remove('hidden');
      }
    } catch (e) {
      showError('Failed to load: ' + (e.message || 'Unknown error'));
    }
    showLoading(false);
  }

  loadTeam();
})();
