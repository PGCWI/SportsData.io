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
      const [rostersRes, teamsRes] = await Promise.all([
        fetch('/data/' + league + '/rosters.json'),
        fetch('/data/' + league + '/teams.json').catch(() => ({ ok: false }))
      ]);
      
      if (!rostersRes.ok) throw new Error('Rosters not found.');
      let list = await rostersRes.json();
      if (!Array.isArray(list)) list = [];

      const player = list.find(function (p) {
        return p.PlayerID == null ? false : (Number(p.PlayerID) === Number(playerId) || String(p.PlayerID) === String(playerId));
      });

      if (!player) {
        showLoading(false);
        showError('Player not found.');
        return;
      }

      // Load team data for colors
      var team = null;
      if (teamsRes.ok) {
        try {
          var teams = await teamsRes.json();
          if (Array.isArray(teams)) {
            team = teams.find(function (t) {
              return (t.Key === player.Team || t.Team === player.Team || t.TeamID === player.TeamID);
            });
          }
        } catch (e) {}
      }

      // Apply team colors if available
      if (team) {
        applyTeamColors(team);
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
