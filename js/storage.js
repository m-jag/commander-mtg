let remoteData = null;

export function isRemoteMode() {
  return remoteData !== null;
}

export async function loadRemoteData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch data: ${res.status}`);
  remoteData = await res.json();
  if (!remoteData.players) remoteData.players = [];
  if (!remoteData.games) remoteData.games = [];
}

export function exportData() {
  return JSON.stringify({
    players: loadPlayers(),
    games: loadGames(),
  }, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!data.players || !data.games) throw new Error('Invalid data format');
  savePlayers(data.players);
  saveGames(data.games);
}

export function copyRemoteToLocal() {
  if (!remoteData) return;
  savePlayers(remoteData.players);
  saveGames(remoteData.games);
  remoteData = null;
}

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

const STORAGE_KEYS = {
  PLAYERS: 'cmdr_players',
  GAMES: 'cmdr_games',
};

export function loadPlayers() {
  if (remoteData) return remoteData.players;
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  return data ? JSON.parse(data) : [];
}

export function savePlayers(players) {
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
}

export function loadGames() {
  if (remoteData) return remoteData.games;
  const data = localStorage.getItem(STORAGE_KEYS.GAMES);
  return data ? JSON.parse(data) : [];
}

export function saveGames(games) {
  localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
}

export function addPlayer(name) {
  const players = loadPlayers();
  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return null;
  }
  const player = {
    id: generateId(),
    name: name.trim(),
    deckUrl: '',
    createdAt: new Date().toISOString(),
  };
  players.push(player);
  savePlayers(players);
  return player;
}

export function recordGame(winnerIds, participantIds, date) {
  const games = loadGames();
  const game = {
    id: generateId(),
    winnerIds,
    participantIds,
    date: date || new Date().toISOString(),
  };
  games.push(game);
  saveGames(games);
  return game;
}

export function deleteGame(gameId) {
  const games = loadGames().filter(g => g.id !== gameId);
  saveGames(games);
}

export function updatePlayer(playerId, updates) {
  const players = loadPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return null;
  Object.assign(player, updates);
  savePlayers(players);
  return player;
}

export function clearAll() {
  savePlayers([]);
  saveGames([]);
}

export function deletePlayer(playerId) {
  const players = loadPlayers().filter(p => p.id !== playerId);
  savePlayers(players);
  const games = loadGames().filter(
    g => !g.participantIds.includes(playerId)
  );
  saveGames(games);
}
