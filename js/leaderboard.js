import { loadPlayers, loadGames } from './storage.js';
import { fetchCard, renderColorPips } from './scryfall.js';

export function getStandings() {
  const players = loadPlayers();
  const games = loadGames();

  const stats = new Map();

  for (const player of players) {
    stats.set(player.id, {
      id: player.id,
      name: player.name,
      deckUrl: player.deckUrl || '',
      commander: player.commander || '',
      wins: 0,
      losses: 0,
      games: 0,
    });
  }

  for (const game of games) {
    for (const pid of game.participantIds) {
      const entry = stats.get(pid);
      if (!entry) continue;
      entry.games++;
      if (game.winnerIds.includes(pid)) {
        entry.wins++;
      } else {
        entry.losses++;
      }
    }
  }

  return Array.from(stats.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aRate = a.games ? a.wins / a.games : 0;
    const bRate = b.games ? b.wins / b.games : 0;
    if (bRate !== aRate) return bRate - aRate;
    return a.name.localeCompare(b.name);
  });
}

export async function renderLeaderboard(container) {
  const standings = getStandings();

  if (standings.length === 0) {
    container.innerHTML = '<p class="empty-state">No players yet. Add some players to get started!</p>';
    return;
  }

  const cardData = await Promise.all(
    standings.map(s => s.commander ? fetchCard(s.commander) : Promise.resolve(null))
  );

  const rows = standings.map((s, i) => {
    const winRate = s.games > 0 ? ((s.wins / s.games) * 100).toFixed(0) : '0';
    const card = cardData[i];

    const avatar = card?.artCrop
      ? `<div class="commander-avatar" style="background-image:url('${card.artCrop}')"></div>`
      : '<div class="commander-avatar commander-avatar-empty"></div>';

    const colorPips = card ? renderColorPips(card.colors) : '';

    const commanderName = card
      ? `<span class="commander-name">${escapeHtml(card.name)}</span>`
      : s.commander
        ? `<span class="commander-name">${escapeHtml(s.commander)}</span>`
        : '';

    const deckLink = s.deckUrl
      ? `<a href="${escapeHtml(s.deckUrl)}" target="_blank" rel="noopener" class="deck-link" title="View deck on Moxfield">Deck</a>`
      : '';

    return `
      <tr>
        <td class="rank">${i + 1}</td>
        <td class="player-cell">
          ${avatar}
          <div class="player-info">
            <span class="player-name">${escapeHtml(s.name)}</span>
            <div class="player-meta">
              ${colorPips}${commanderName}${deckLink ? ' ' + deckLink : ''}
            </div>
          </div>
        </td>
        <td>${s.wins}</td>
        <td>${s.losses}</td>
        <td>${s.games}</td>
        <td>${winRate}%</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Games</th>
          <th>Win %</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
