(function () {
  const LEAGUES = ['nba', 'nhl', 'nfl', 'mlb'];
  const loadingEl = document.getElementById('transactions-loading');
  const errorEl = document.getElementById('transactions-error');
  const contentEl = document.getElementById('transactions-content');
  const tabs = document.querySelectorAll('.transactions-tab');
  let allTransactions = [];

  function showLoading(show) {
    if (loadingEl) loadingEl.classList.toggle('hidden', !show);
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg || '';
      errorEl.classList.toggle('hidden', !msg);
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function formatDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function renderTable(list) {
    if (!list || !list.length) {
      return '<p class="muted">No transactions in the last 30 days.</p>';
    }
    let html = '<div class="transactions-table-wrap"><table class="transactions-table"><thead><tr>';
    html += '<th>Date</th><th>League</th><th>Name</th><th>Type</th><th>Team</th><th>Former team</th><th>Note</th>';
    html += '</tr></thead><tbody>';
    list.forEach(function (t) {
      const date = formatDate(t.Date || t.Created);
      const league = t.league || '';
      const leagueLabel = league ? league.toUpperCase() : '—';
      const name = t.Name || '—';
      const type = t.Type || '—';
      const team = t.Team || '—';
      const former = t.FormerTeam || '—';
      const note = t.Note || '';
      const playerId = t.PlayerID != null ? String(t.PlayerID) : '';
      const playerHref = (league && playerId) ? ('player.html?league=' + encodeURIComponent(league) + '&playerId=' + encodeURIComponent(playerId)) : '';
      html += '<tr>';
      html += '<td>' + escapeHtml(date) + '</td>';
      html += '<td>' + escapeHtml(leagueLabel) + '</td>';
      html += '<td>';
      if (playerHref) {
        html += '<a class="transactions-player-link" href="' + escapeAttr(playerHref) + '">' + escapeHtml(name) + '</a>';
      } else {
        html += escapeHtml(name);
      }
      html += '</td>';
      html += '<td>' + escapeHtml(type) + '</td>';
      html += '<td>' + escapeHtml(team) + '</td>';
      html += '<td>' + escapeHtml(former) + '</td>';
      html += '<td class="transactions-note">' + escapeHtml(note) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function setActiveTab(league) {
    tabs.forEach(function (btn) {
      const isActive = btn.getAttribute('data-league') === league;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  }

  function applyFilter(leagueFilter) {
    const filtered = leagueFilter === 'all'
      ? allTransactions
      : allTransactions.filter(function (t) { return t.league === leagueFilter; });
    contentEl.innerHTML = renderTable(filtered);
    contentEl.classList.remove('hidden');
  }

  async function loadAll() {
    showError('');
    showLoading(true);
    contentEl.classList.add('hidden');

    try {
      const txResList = await Promise.all(LEAGUES.map(function (leagueId) {
        return fetch('/data/' + leagueId + '/transactions.json')
          .then(function (r) { return r.ok ? r.json() : []; })
          .catch(function () { return []; });
      }));
      const combined = [];
      txResList.forEach(function (list, i) {
        const leagueId = LEAGUES[i];
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
      allTransactions = combined;
    } catch (e) {
      showError('Failed to load transactions: ' + (e.message || 'Unknown error'));
    }
    showLoading(false);
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const leagueFilter = btn.getAttribute('data-league');
      setActiveTab(leagueFilter);
      applyFilter(leagueFilter);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const leagueParam = (params.get('league') || '').toLowerCase();
  const initialFilter = (leagueParam === 'all' || LEAGUES.includes(leagueParam)) ? leagueParam : 'all';

  loadAll().then(function () {
    setActiveTab(initialFilter);
    applyFilter(initialFilter);
  });
})();
