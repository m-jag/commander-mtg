import { addPlayer, loadPlayers, recordGame, deleteGame, deletePlayer, updatePlayer, loadGames, loadRemoteData, isRemoteMode, exportData, importData, copyRemoteToLocal, clearAll } from './storage.js';
import { renderLeaderboard } from './leaderboard.js';

const $ = (sel) => document.querySelector(sel);

async function refreshAll() {
  await renderLeaderboard($('#leaderboard'));
  renderPlayerChips();
  renderGameHistory();
}

// --- Add Player ---

function initAddPlayer() {
  const form = $('#add-player-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#player-name-input');
    const name = input.value.trim();
    if (!name) return;

    const player = addPlayer(name);
    if (!player) {
      showToast('Player already exists');
      return;
    }

    const commanderInput = $('#commander-input');
    const deckInput = $('#deck-url-input');
    const commander = commanderInput.value.trim();
    const deckUrl = deckInput.value.trim();
    if (commander || deckUrl) {
      updatePlayer(player.id, { commander, deckUrl });
    }

    input.value = '';
    commanderInput.value = '';
    deckInput.value = '';
    showToast(`Added ${player.name}`);
    refreshAll();
  });
}

// --- Record Game ---

const MAX_PLAYERS = 4;
let selectedPlayerIds = new Set();
let selectedWinnerId = null;

function renderPlayerChips() {
  const players = loadPlayers();
  const container = $('#player-chips');
  const countLabel = $('#player-count');

  if (players.length === 0) {
    container.innerHTML = '<p class="empty-state">Add players first</p>';
    countLabel.textContent = '0 / 4';
    renderWinnerChips();
    return;
  }

  container.innerHTML = players.map(p => {
    const selected = selectedPlayerIds.has(p.id);
    const full = selectedPlayerIds.size >= MAX_PLAYERS;
    const disabled = !selected && full;
    return `
      <button type="button" class="chip ${selected ? 'chip-selected' : ''} ${disabled ? 'chip-disabled' : ''}"
        data-player-id="${p.id}" ${disabled ? 'disabled' : ''}>
        ${escapeHtml(p.name)}
      </button>`;
  }).join('');

  countLabel.textContent = `${selectedPlayerIds.size} / ${MAX_PLAYERS}`;
  countLabel.classList.toggle('count-full', selectedPlayerIds.size >= MAX_PLAYERS);

  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.playerId;
      if (selectedPlayerIds.has(id)) {
        selectedPlayerIds.delete(id);
        if (selectedWinnerId === id) selectedWinnerId = null;
      } else if (selectedPlayerIds.size < MAX_PLAYERS) {
        selectedPlayerIds.add(id);
      }
      renderPlayerChips();
    });
  });

  renderWinnerChips();
}

function renderWinnerChips() {
  const players = loadPlayers();
  const container = $('#winner-chips');

  if (selectedPlayerIds.size === 0) {
    container.innerHTML = '<p class="empty-state">Select players first</p>';
    return;
  }

  const selected = players.filter(p => selectedPlayerIds.has(p.id));

  container.innerHTML = selected.map(p => {
    const isWinner = selectedWinnerId === p.id;
    return `
      <button type="button" class="chip ${isWinner ? 'chip-winner' : ''}"
        data-player-id="${p.id}">
        ${isWinner ? '&#9733; ' : ''}${escapeHtml(p.name)}
      </button>`;
  }).join('');

  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.playerId;
      selectedWinnerId = selectedWinnerId === id ? null : id;
      renderWinnerChips();
    });
  });
}

function resetGameForm() {
  selectedPlayerIds.clear();
  selectedWinnerId = null;
  renderPlayerChips();
}

function initRecordGame() {
  const form = $('#record-game-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (selectedPlayerIds.size < 2) {
      showToast('Select at least 2 players');
      return;
    }
    if (!selectedWinnerId) {
      showToast('Select a winner');
      return;
    }

    const date = $('#game-date').value || undefined;
    recordGame([selectedWinnerId], Array.from(selectedPlayerIds), date);
    showToast('Game recorded!');
    resetGameForm();
    renderLeaderboard($('#leaderboard'));
    renderGameHistory();
  });
}

// --- Game History ---

function renderGameHistory() {
  const games = loadGames();
  const players = loadPlayers();
  const container = $('#game-history');

  if (games.length === 0) {
    container.innerHTML = '<p class="empty-state">No games recorded yet</p>';
    return;
  }

  const playerMap = new Map(players.map(p => [p.id, p.name]));

  const rows = games
    .slice()
    .reverse()
    .map(g => {
      const winner = g.winnerIds.map(id => playerMap.get(id) || 'Unknown').join(', ');
      const participants = g.participantIds.map(id => playerMap.get(id) || 'Unknown').join(', ');
      const date = g.date ? new Date(g.date).toLocaleDateString() : 'N/A';
      const deleteBtn = isRemoteMode() ? '' : `<td><button class="btn-delete" data-game-id="${g.id}" title="Delete game">&times;</button></td>`;
      return `
        <tr>
          <td>${date}</td>
          <td class="player-name">${escapeHtml(winner)}</td>
          <td>${escapeHtml(participants)}</td>
          ${deleteBtn}
        </tr>`;
    })
    .join('');

  container.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Winner</th>
          <th>Players</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteGame(btn.dataset.gameId);
      refreshAll();
    });
  });
}

// --- Manage Players ---

function initManagePlayers() {
  const btn = $('#manage-players-btn');
  const modal = $('#manage-players-modal');

  btn.addEventListener('click', () => {
    renderManagePlayersList();
    modal.showModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  $('#close-manage-modal').addEventListener('click', () => modal.close());
}

function renderManagePlayersList() {
  const players = loadPlayers();
  const container = $('#manage-players-list');

  if (players.length === 0) {
    container.innerHTML = '<p class="empty-state">No players</p>';
    return;
  }

  container.innerHTML = players.map(p => `
    <div class="manage-player-row">
      <div class="manage-player-info">
        <span>${escapeHtml(p.name)}</span>
        <div class="manage-player-fields">
          <input type="text" class="commander-edit" data-player-id="${p.id}"
            value="${escapeHtml(p.commander || '')}" placeholder="Commander name">
          <input type="url" class="deck-url-edit" data-player-id="${p.id}"
            value="${escapeHtml(p.deckUrl || '')}" placeholder="Moxfield URL">
        </div>
      </div>
      <button class="btn-delete" data-player-id="${p.id}" title="Delete player">&times;</button>
    </div>
  `).join('');

  container.querySelectorAll('.commander-edit').forEach(input => {
    input.addEventListener('change', () => {
      updatePlayer(input.dataset.playerId, { commander: input.value.trim() });
      showToast('Commander updated');
      refreshAll();
    });
  });

  container.querySelectorAll('.deck-url-edit').forEach(input => {
    input.addEventListener('change', () => {
      updatePlayer(input.dataset.playerId, { deckUrl: input.value.trim() });
      showToast('Deck link updated');
      refreshAll();
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('.manage-player-row').querySelector('.manage-player-info span').textContent;
      if (confirm(`Delete ${name} and all their games?`)) {
        deletePlayer(btn.dataset.playerId);
        renderManagePlayersList();
        refreshAll();
      }
    });
  });
}

// --- Toast ---

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Remote / Shared Mode ---

function getDataUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('data');
}

function enterReadOnlyMode() {
  document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');

  const banner = document.createElement('div');
  banner.className = 'remote-banner';
  banner.innerHTML = `
    Viewing shared leaderboard
    <button id="load-local-btn" class="btn btn-sm btn-banner">Edit locally</button>
    <a href="${window.location.pathname}">Back to local</a>`;
  document.querySelector('.container').prepend(banner);

  $('#load-local-btn').addEventListener('click', () => {
    if (!confirm('This will copy the shared data into your local storage, replacing any existing local data. Continue?')) return;
    copyRemoteToLocal();
    window.location.href = window.location.pathname;
  });
}

// --- Export / Import ---

function initExportImport() {
  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commander-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  });

  $('#import-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importData(reader.result);
          showToast('Data imported');
          refreshAll();
        } catch {
          showToast('Invalid file format');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

// --- Clear All ---

function initClearAll() {
  $('#clear-all-btn').addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete all players and game history? This cannot be undone.')) return;
    clearAll();
    resetGameForm();
    showToast('All data cleared');
    refreshAll();
  });
}

// --- Init ---

document.addEventListener('DOMContentLoaded', async () => {
  const dataUrl = getDataUrl();

  if (dataUrl) {
    try {
      await loadRemoteData(dataUrl);
      enterReadOnlyMode();
    } catch (e) {
      showToast('Failed to load shared data');
      console.error(e);
    }
  }

  $('#game-date').valueAsDate = new Date();
  initAddPlayer();
  initRecordGame();
  initManagePlayers();
  initExportImport();
  initClearAll();
  refreshAll();
});
