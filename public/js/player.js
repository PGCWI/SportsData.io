(function () {
  const contentEl = document.getElementById('player-content');
  const loadingEl = document.getElementById('player-loading');
  const errorEl = document.getElementById('player-error');
  const backLinkEl = document.getElementById('player-back-link');

  function getParams() {
    const params = new URLSearchParams(window.location.search);
    const league = (params.get('league') || '').toLowerCase();
    const playerIdRaw = params.get('playerId');
    const teamIndex = params.get('teamIndex');
    let playerId = null;
    if (playerIdRaw != null && playerIdRaw !== '') {
      const n = parseInt(playerIdRaw, 10);
      playerId = isNaN(n) ? playerIdRaw : n;
    }
    return { league, playerId, teamIndex: teamIndex != null && teamIndex !== '' ? teamIndex : null };
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

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function getPlayerDisplayName(p) {
    if (p.Name) return p.Name;
    var first = (p.FirstName || '').trim();
    var last = (p.LastName || '').trim();
    return [first, last].filter(Boolean).join(' ') || '—';
  }

  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }

  function formatFieldKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, function (s) { return s.toUpperCase(); })
      .trim();
  }

  function formatFieldValue(val) {
    if (val == null) return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object' && !Array.isArray(val)) return JSON.stringify(val);
    return String(val);
  }

  var SKIP_KEYS = { LatestNews: true, PlayerSeason: true };

  function renderPlayerPage(player, league, teamIndex) {
    var name = getPlayerDisplayName(player);
    var backHref = (teamIndex != null && league)
      ? 'team.html?league=' + encodeURIComponent(league) + '&index=' + encodeURIComponent(teamIndex)
      : 'index.html';
    if (backLinkEl) backLinkEl.setAttribute('href', backHref);

    var metaParts = [];
    if (player.Status) metaParts.push(player.Status);
    if (player.Position) metaParts.push(player.Position);
    if (player.PositionCategory && player.PositionCategory !== player.Position) metaParts.push(player.PositionCategory);
    if (player.Team) metaParts.push(player.Team);
    var metaStr = metaParts.join(' · ');

    var html = '<div class="player-header">';
    html += '<div class="player-header-info">';
    html += '<h2>' + escapeHtml(name) + '</h2>';
    if (metaStr) html += '<p class="player-meta">' + escapeHtml(metaStr) + '</p>';
    html += '</div></div>';

    var keys = Object.keys(player).filter(function (k) {
      if (SKIP_KEYS[k]) return false;
      return hasValue(player[k]);
    }).sort(function (a, b) {
      var order = ['PlayerID', 'Status', 'Team', 'Jersey', 'Number', 'Position', 'PositionCategory', 'FirstName', 'LastName', 'Name', 'Height', 'Weight', 'BirthDate', 'College', 'Experience'];
      var ai = order.indexOf(a);
      var bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

    html += '<div class="player-details-card"><h3>All data</h3><dl class="player-details-list">';
    keys.forEach(function (key) {
      var val = player[key];
      var displayVal = formatFieldValue(val);
      if (key.toLowerCase().indexOf('url') !== -1 && displayVal && displayVal.indexOf('http') === 0) {
        displayVal = '<a href="' + escapeAttr(displayVal) + '" target="_blank" rel="noopener">' + escapeHtml(displayVal) + '</a>';
      } else {
        displayVal = escapeHtml(displayVal);
      }
      html += '<div class="player-detail-row"><dt>' + escapeHtml(formatFieldKey(key)) + '</dt><dd>' + displayVal + '</dd></div>';
    });
    html += '</dl></div>';

    return html;
  }

  async function loadPlayer() {
    const { league, playerId, teamIndex } = getParams();
    if (!league || playerId == null) {
      showLoading(false);
      showError('Missing league or player.');
      return;
    }

    showLoading(true);
    if (errorEl) errorEl.classList.add('hidden');
    if (contentEl) contentEl.classList.add('hidden');

    try {
      const res = await fetch('/data/' + league + '/rosters.json');
      if (!res.ok) throw new Error('Rosters not found.');
      let list = await res.json();
      if (!Array.isArray(list)) list = [];

      const player = list.find(function (p) {
        return p.PlayerID == null ? false : (Number(p.PlayerID) === Number(playerId) || String(p.PlayerID) === String(playerId));
      });

      if (!player) {
        showLoading(false);
        showError('Player not found.');
        return;
      }

      document.title = getPlayerDisplayName(player) + ' – SportsData.io';
      contentEl.innerHTML = renderPlayerPage(player, league, teamIndex);
      contentEl.classList.remove('hidden');
    } catch (e) {
      showError('Failed to load: ' + (e.message || 'Unknown error'));
    }
    showLoading(false);
  }

  loadPlayer();
})();
