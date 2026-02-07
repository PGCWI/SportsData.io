(function () {
  const COL_IDS = ['nba', 'nhl', 'nfl', 'mlb'];

  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  let leagueData = {};

  function showLoading(show) {
    loadingEl.classList.toggle('hidden', !show);
  }

  function showError(msg) {
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('hidden', !msg);
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

  function getTeamInfo(teamMap, row) {
    const t = teamMap.byId[row.TeamID] || teamMap.byKey[row.Key] || teamMap.byKey[row.Team];
    // Use FullName if available (from team data), otherwise use Name from standings
    // This handles NFL where standings already have full names like "New England Patriots"
    const displayName = t?.FullName || row.Name || t?.Name || t?.TeamName || row.Key || row.Team || '—';
    const logo = t?.WikipediaLogoUrl || t?.LogoUrl || '';
    return { displayName, logo };
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

  function goToTeamPage(leagueId, rowIndex) {
    window.location.href = 'team.html?league=' + encodeURIComponent(leagueId) + '&index=' + encodeURIComponent(rowIndex);
  }

  function getTeamLogo(teamMap, teamKey, teamId) {
    if (!teamMap) return '';
    const t = teamMap.byId[teamId] || teamMap.byKey[teamKey];
    return t ? (t.WikipediaLogoUrl || t.LogoUrl || '') : '';
  }

  function getTeamStandingsIndex(leagueData, league, teamKey, teamId) {
    const data = leagueData[league];
    if (!data || !data.sorted) return -1;
    const idx = data.sorted.findIndex(function (row) {
      return (teamId != null && row.TeamID === teamId) || (teamKey && (row.Team === teamKey || row.Key === teamKey));
    });
    return idx;
  }

  function formatTransactionDate(tx) {
    const dateStr = tx.Updated || tx.Created || tx.Date || '';
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // Track current page for transactions
  let currentTxPage = 0;
  const TX_PER_PAGE = 12;
  let allTransactions = [];

  function renderTransactionsColumn(transactions, leagueData, page = 0) {
    allTransactions = transactions || [];
    currentTxPage = page;
    
    let html = '<div class="col-inner"><h2 class="col-title">Transactions</h2>';
    if (!allTransactions || !allTransactions.length) {
      html += '<p class="muted">No transactions in the last 30 days.</p></div>';
      return html;
    }
    
    const startIdx = page * TX_PER_PAGE;
    const endIdx = startIdx + TX_PER_PAGE;
    const displayedTransactions = allTransactions.slice(startIdx, endIdx);
    const hasMore = endIdx < allTransactions.length;
    const hasPrev = page > 0;
    
    displayedTransactions.forEach(function (tx) {
      const league = tx.league || 'nfl';
      const teamMap = leagueData[league] ? leagueData[league].teamMap : null;
      const hasFormer = tx.FormerTeamID != null || (tx.FormerTeam != null && tx.FormerTeam !== '');
      const hasNew = tx.TeamID != null || (tx.Team != null && tx.Team !== '');
      const formerLogo = hasFormer ? getTeamLogo(teamMap, tx.FormerTeam, tx.FormerTeamID) : '';
      const teamLogo = hasNew ? getTeamLogo(teamMap, tx.Team, tx.TeamID) : '';
      const formerIndex = getTeamStandingsIndex(leagueData, league, tx.FormerTeam, tx.FormerTeamID);
      const teamIndex = getTeamStandingsIndex(leagueData, league, tx.Team, tx.TeamID);
      const formerTeamHref = formerIndex >= 0 ? ('team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(formerIndex)) : '';
      const teamHref = teamIndex >= 0 ? ('team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(teamIndex)) : '';
      
      const name = tx.Name || '—';
      const playerId = tx.PlayerID != null ? String(tx.PlayerID) : '';
      const playerHref = (league && playerId) ? ('player.html?league=' + encodeURIComponent(league) + '&playerId=' + encodeURIComponent(playerId) + (teamIndex >= 0 ? '&teamIndex=' + encodeURIComponent(teamIndex) : '')) : '';
      
      const note = tx.Note || '';
      const dateTime = formatTransactionDate(tx);
      html += '<div class="tx-card">';
      html += '<div class="tx-logos">';
      if (hasFormer && hasNew) {
        if (formerLogo) {
          if (formerTeamHref) html += '<a class="tx-logo-link" href="' + escapeAttr(formerTeamHref) + '" title="View team">';
          html += '<img class="tx-logo" src="' + escapeAttr(formerLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
          if (formerTeamHref) html += '</a>';
        } else {
          html += '<span class="tx-logo tx-logo--placeholder" aria-hidden="true"></span>';
        }
        html += '<span class="tx-arrow" aria-hidden="true">→</span>';
        if (teamLogo) {
          if (teamHref) html += '<a class="tx-logo-link" href="' + escapeAttr(teamHref) + '" title="View team">';
          html += '<img class="tx-logo" src="' + escapeAttr(teamLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
          if (teamHref) html += '</a>';
        } else {
          html += '<span class="tx-logo tx-logo--placeholder" aria-hidden="true"></span>';
        }
      } else if (hasFormer && formerLogo) {
        if (formerTeamHref) html += '<a class="tx-logo-link" href="' + escapeAttr(formerTeamHref) + '" title="View team">';
        html += '<img class="tx-logo" src="' + escapeAttr(formerLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
        if (formerTeamHref) html += '</a>';
      } else if (hasNew && teamLogo) {
        if (teamHref) html += '<a class="tx-logo-link" href="' + escapeAttr(teamHref) + '" title="View team">';
        html += '<img class="tx-logo" src="' + escapeAttr(teamLogo) + '" alt="" loading="lazy" onerror="this.classList.add(\'tx-logo--broken\')">';
        if (teamHref) html += '</a>';
      }
      html += '</div>';
      
      // Add player name as link if player ID exists
      html += '<div class="tx-name">';
      if (playerHref) {
        html += '<a class="tx-player-link" href="' + escapeAttr(playerHref) + '">' + escapeHtml(name) + '</a>';
      } else {
        html += escapeHtml(name);
      }
      html += '</div>';
      
      if (note) html += '<div class="tx-note">' + escapeHtml(note) + '</div>';
      if (dateTime) html += '<div class="tx-date">' + escapeHtml(dateTime) + '</div>';
      html += '</div>';
    });
    
    // Add pagination controls
    if (hasPrev || hasMore) {
      html += '<div class="tx-pagination">';
      if (hasPrev) {
        html += '<button class="tx-page-btn tx-page-prev" onclick="window.loadTxPage(' + (page - 1) + ')">← Previous</button>';
      }
      html += '<span class="tx-page-info">Showing ' + (startIdx + 1) + '-' + Math.min(endIdx, allTransactions.length) + ' of ' + allTransactions.length + '</span>';
      if (hasMore) {
        html += '<button class="tx-page-btn tx-page-next" onclick="window.loadTxPage(' + (page + 1) + ')">Next →</button>';
      }
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }
  
  // Global function for pagination
  window.loadTxPage = function(page) {
    const colTx = document.getElementById('col-transactions');
    if (colTx) {
      colTx.innerHTML = renderTransactionsColumn(allTransactions, leagueData, page);
    }
  };

  function renderColumn(leagueId, data) {
    const view = data.view === 'post' ? 'post' : 'reg';
    const standings = view === 'post' ? (data.standingsPost || []) : (data.standingsReg || []);
    const teamMap = data.teamMap;
    const label = leagueId.toUpperCase();
    const hasPost = data.standingsPost && data.standingsPost.length > 0;

    const sorted = sortStandings(standings);
    data.sorted = sorted;

    let html = '<div class="col-inner">';
    html += '<h2 class="col-title">' + escapeHtml(label) + '</h2>';
    
    // Toggle: Regular Season | Playoffs
    if (hasPost) {
      html += '<div class="standings-view-pills" role="tablist" aria-label="Season view">';
      html += '<button type="button" class="standings-pill' + (view === 'reg' ? ' standings-pill--active' : '') + '" data-view="reg" aria-pressed="' + (view === 'reg') + '">Regular</button>';
      html += '<button type="button" class="standings-pill' + (view === 'post' ? ' standings-pill--active' : '') + '" data-view="post" aria-pressed="' + (view === 'post') + '">Playoffs</button>';
      html += '</div>';
    }
    
    if (sorted.length === 0) {
      html += '<p class="muted">No standings.</p></div>';
      return html;
    }
    html += '<table class="standings-table compact"><thead><tr><th class="col-rank">#</th><th class="col-team">Team</th><th class="col-wins">W</th></tr></thead><tbody>';
    sorted.forEach((row, i) => {
      const rank = i + 1;
      const info = getTeamInfo(teamMap, row);
      html += '<tr class="standings-row" data-league="' + escapeAttr(leagueId) + '" data-index="' + i + '" role="button" tabindex="0">';
      html += '<td class="col-rank">' + escapeHtml(String(rank)) + '</td>';
      html += '<td class="col-team"><span class="team-cell">';
      if (info.logo) html += '<img class="team-logo-sm" src="' + escapeAttr(info.logo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
      html += '<span class="team-name-sm">' + escapeHtml(info.displayName) + '</span></span></td>';
      html += '<td class="col-wins">' + escapeHtml(String(row.Wins ?? '—')) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function setStandingsView(leagueId, view) {
    const data = leagueData[leagueId];
    if (!data || (view !== 'reg' && view !== 'post')) return;
    if (view === 'post' && (!data.standingsPost || !data.standingsPost.length)) return;
    data.view = view;
    const colEl = document.getElementById('col-' + leagueId);
    if (colEl) {
      colEl.innerHTML = renderColumn(leagueId, data);
      colEl.querySelectorAll('.standings-row').forEach((tr) => {
        tr.addEventListener('click', () => {
          goToTeamPage(tr.getAttribute('data-league'), parseInt(tr.getAttribute('data-index'), 10));
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToTeamPage(tr.getAttribute('data-league'), parseInt(tr.getAttribute('data-index'), 10));
          }
        });
      });
      colEl.querySelectorAll('.standings-pill').forEach((btn) => {
        btn.addEventListener('click', function () {
          setStandingsView(leagueId, this.getAttribute('data-view'));
        });
      });
    }
  }

  async function loadAll() {
    showError('');
    showLoading(true);
    leagueData = {};

    await Promise.all(COL_IDS.map(async (leagueId) => {
      try {
        const [teamsRes, metaRes, regRes, postRes, fallbackRes] = await Promise.all([
          fetch(`/data/${leagueId}/teams.json`).catch(() => ({ ok: false })),
          fetch(`/data/${leagueId}/standings_meta.json`).catch(() => ({ ok: false })),
          fetch(`/data/${leagueId}/standings_reg.json`).catch(() => ({ ok: false })),
          fetch(`/data/${leagueId}/standings_post.json`).catch(() => ({ ok: false })),
          fetch(`/data/${leagueId}/standings.json`).catch(() => ({ ok: false })),
        ]);
        if (!teamsRes.ok) return { leagueId };
        const teams = await teamsRes.json();
        const teamMap = buildTeamMap(teams);
        let meta = null;
        let reg = [];
        let post = [];
        if (metaRes.ok) meta = await metaRes.json();
        if (regRes.ok) reg = parseStandingsList(await regRes.json());
        if (postRes.ok) post = parseStandingsList(await postRes.json());
        if (!reg.length && fallbackRes.ok) reg = parseStandingsList(await fallbackRes.json());
        const defaultView = (meta && meta.defaultView === 'post' && post.length) ? 'post' : 'reg';
        leagueData[leagueId] = { teamMap, standingsReg: reg, standingsPost: post || [], view: defaultView, sorted: null };
        return { leagueId, ok: true };
      } catch (e) {
        return { leagueId, error: e.message };
      }
    }));

    COL_IDS.forEach((id) => {
      const el = document.getElementById('col-' + id);
      if (!el) return;
      const data = leagueData[id];
      el.innerHTML = data ? renderColumn(id, data) : '<div class="col-inner"><p class="muted">No data.</p></div>';
    });

    const txResList = await Promise.all(COL_IDS.map(function (leagueId) {
      return fetch('/data/' + leagueId + '/transactions.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
    }));
    const combined = [];
    txResList.forEach(function (list, i) {
      const leagueId = COL_IDS[i];
      const arr = Array.isArray(list) ? list : [];
      arr.forEach(function (tx) {
        combined.push(Object.assign({ league: leagueId }, tx));
      });
    });
    combined.sort(function (a, b) {
      const ua = a.Updated || a.Created || a.Date || '';
      const ub = b.Updated || b.Created || b.Date || '';
      return ub.localeCompare(ua);
    });
    const colTx = document.getElementById('col-transactions');
    if (colTx) colTx.innerHTML = renderTransactionsColumn(combined, leagueData);

    document.querySelectorAll('.standings-row').forEach((tr) => {
      tr.addEventListener('click', () => {
        goToTeamPage(tr.getAttribute('data-league'), parseInt(tr.getAttribute('data-index'), 10));
      });
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToTeamPage(tr.getAttribute('data-league'), parseInt(tr.getAttribute('data-index'), 10));
        }
      });
    });

    COL_IDS.forEach((id) => {
      const colEl = document.getElementById('col-' + id);
      if (colEl) colEl.querySelectorAll('.standings-pill').forEach((btn) => {
        btn.addEventListener('click', function () {
          setStandingsView(id, this.getAttribute('data-view'));
        });
      });
    });

    const failed = COL_IDS.filter((id) => !leagueData[id]);
    if (failed.length === COL_IDS.length) showError('Failed to load data. Run "npm run fetch" then refresh.');
    else if (failed.length) showError('Some leagues failed: ' + failed.join(', '));
    showLoading(false);
  }

  function initStadiumsModal() {
    const modalEl = document.getElementById('stadiums-modal');
    const btnEl = document.getElementById('stadiums-btn');
    const closeEl = document.getElementById('stadiums-close');
    let map = null;
    let stadiumsData = {};

    async function loadStadiums() {
      const results = await Promise.all(COL_IDS.map(function (leagueId) {
        return Promise.all([
          fetch('/data/' + leagueId + '/stadiums.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
          fetch('/data/' + leagueId + '/teams.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
        ]).then(function (pair) {
          return { league: leagueId, stadiums: pair[0], teams: pair[1] };
        });
      }));
      const byLocation = {};
      results.forEach(function (item) {
        const s = Array.isArray(item.stadiums) ? item.stadiums : [];
        const t = Array.isArray(item.teams) ? item.teams : [];
        const teamsByStadiumId = {};
        t.forEach(function (team) {
          if (team.StadiumID != null) {
            if (!teamsByStadiumId[team.StadiumID]) teamsByStadiumId[team.StadiumID] = [];
            teamsByStadiumId[team.StadiumID].push(team);
          }
        });
        s.forEach(function (stadium) {
          if (stadium.GeoLat != null && stadium.GeoLong != null) {
            const teams = teamsByStadiumId[stadium.StadiumID] || [];
            if (teams.length === 0) return;
            const locKey = stadium.GeoLat.toFixed(6) + ',' + stadium.GeoLong.toFixed(6);
            if (!byLocation[locKey]) {
              byLocation[locKey] = {
                lat: stadium.GeoLat,
                lng: stadium.GeoLong,
                stadium: stadium,
                teams: []
              };
            }
            teams.forEach(function (team) {
              byLocation[locKey].teams.push({ team: team, league: item.league });
            });
          }
        });
      });
      stadiumsData = byLocation;
    }

    function openModal() {
      modalEl.classList.remove('hidden');
      if (!map) {
        map = window.L.map('stadiums-map').setView([39.8283, -98.5795], 4);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        Object.keys(stadiumsData).forEach(function (key) {
          const data = stadiumsData[key];
          const stadium = data.stadium;
          const teams = data.teams;
          const lat = data.lat;
          const lng = data.lng;
          if (!teams || teams.length === 0) return;
          const teamLogos = teams.map(function (item) { return item.team.WikipediaLogoUrl || item.team.LogoUrl || ''; }).filter(Boolean);
          let popupHtml = '<div style="text-align:center;min-width:120px;">';
          popupHtml += '<strong>' + escapeHtml(stadium.Name || 'Stadium') + '</strong><br>';
          popupHtml += '<span style="font-size:0.85em;color:#666;">' + escapeHtml((stadium.City || '') + (stadium.State ? ', ' + stadium.State : '')) + '</span><br>';
          if (teams.length) {
            popupHtml += '<div style="margin-top:0.5em;display:flex;justify-content:center;gap:0.25rem;flex-wrap:wrap;">';
            teams.forEach(function (item) {
              const team = item.team;
              const league = item.league;
              const logo = team.WikipediaLogoUrl || team.LogoUrl || '';
              const teamKey = team.Key || team.Team || '';
              let teamHref = '';
              if (league && teamKey && leagueData[league] && leagueData[league].sorted) {
                const idx = leagueData[league].sorted.findIndex(function (r) {
                  return (team.TeamID != null && r.TeamID === team.TeamID) || (teamKey && (r.Team === teamKey || r.Key === teamKey));
                });
                if (idx >= 0) teamHref = 'team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(idx);
              }
              if (logo) {
                if (teamHref) {
                  popupHtml += '<a href="' + escapeAttr(teamHref) + '" title="View team"><img src="' + escapeAttr(logo) + '" alt="" style="width:28px;height:28px;object-fit:contain;" onerror="this.style.display=\'none\'"></a>';
                } else {
                  popupHtml += '<img src="' + escapeAttr(logo) + '" alt="" style="width:28px;height:28px;object-fit:contain;" onerror="this.style.display=\'none\'">';
                }
              }
            });
            popupHtml += '</div>';
          }
          popupHtml += '</div>';
          if (teamLogos.length > 0) {
            let iconHtml = '<div style="display:flex;gap:2px;align-items:center;justify-content:center;">';
            teams.forEach(function (item) {
              const logo = item.team.WikipediaLogoUrl || item.team.LogoUrl || '';
              if (logo) {
                iconHtml += '<img src="' + escapeAttr(logo) + '" alt="" style="width:' + (teamLogos.length > 1 ? '24px' : '40px') + ';height:' + (teamLogos.length > 1 ? '24px' : '40px') + ';object-fit:contain;display:block;" onerror="this.style.display=\'none\'">';
              }
            });
            iconHtml += '</div>';
            const iconWidth = teamLogos.length > 1 ? (24 * teamLogos.length + 2 * (teamLogos.length - 1)) : 40;
            const icon = window.L.divIcon({
              className: 'stadium-logo-marker',
              html: iconHtml,
              iconSize: [iconWidth, teamLogos.length > 1 ? 24 : 40],
              iconAnchor: [iconWidth / 2, (teamLogos.length > 1 ? 24 : 40) / 2],
              popupAnchor: [0, -(teamLogos.length > 1 ? 12 : 20)]
            });
            window.L.marker([lat, lng], { icon: icon }).addTo(map).bindPopup(popupHtml);
          } else {
            window.L.marker([lat, lng]).addTo(map).bindPopup(popupHtml);
          }
        });
      }
      setTimeout(function () { if (map) map.invalidateSize(); }, 100);
    }

    function closeModal() {
      modalEl.classList.add('hidden');
    }

    if (btnEl) btnEl.addEventListener('click', function () {
      if (Object.keys(stadiumsData).length === 0) {
        loadStadiums().then(openModal);
      } else {
        openModal();
      }
    });
    if (closeEl) closeEl.addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });
  }

  loadAll();
  initStadiumsModal();
})();
