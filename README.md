# Commander MTG Leaderboard

A static website for tracking Magic: The Gathering Commander game results and player standings within your playgroup.

No backend, no build step, no dependencies — just open and play.

## Features

- **Leaderboard** — Players ranked by wins with win rate, color-coded top 3
- **Commander integration** — Card art avatars and color identity pips via [Scryfall API](https://scryfall.com/docs/api)
- **Deck links** — Link each player's deck on [Moxfield](https://moxfield.com)
- **Game recording** — Select up to 4 players, pick a winner, log the date
- **Game history** — Reverse-chronological log with delete support
- **Player management** — Add, edit, and remove players and their data
- **Export / Import** — Save and load data as JSON files
- **Shared leaderboards** — View a remote JSON file via URL parameter (read-only)
- **Responsive** — Works on desktop and mobile
- **Dark theme** — MTG-inspired purple accent

## Getting Started

ES modules require a server (`file://` won't work). Use any static file server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Sharing Your Leaderboard

1. Use **Export** to download your data as `commander-data.json`
2. Host the JSON file somewhere accessible (e.g. a GitHub repo)
3. Share a link with the `data` query parameter:

```
https://your-site.com?data=https://raw.githubusercontent.com/you/repo/main/commander-data.json
```

Viewers see the leaderboard in read-only mode. They can click **"Edit locally"** to copy the data into their own browser and make changes, then re-export.

## Data Format

Data is stored in `localStorage` as JSON. The export/import format looks like this:

```json
{
  "players": [
    {
      "id": "uuid",
      "name": "Alice",
      "commander": "Atraxa, Praetors' Voice",
      "deckUrl": "https://moxfield.com/decks/...",
      "createdAt": "2026-04-07T00:00:00.000Z"
    }
  ],
  "games": [
    {
      "id": "uuid",
      "winnerIds": ["player-uuid"],
      "participantIds": ["player-uuid", "player-uuid", "player-uuid"],
      "date": "2026-04-07"
    }
  ]
}
```

## Project Structure

```
index.html          Main page
css/styles.css      All styling (CSS custom properties for theming)
js/app.js           Entry point — DOM events, forms, UI orchestration
js/storage.js       Data layer — all localStorage access
js/leaderboard.js   Standings computation and table rendering
js/scryfall.js      Scryfall API integration for card art and colors
```

## Deployment

This is a fully static site. Deploy to any static host:

- [GitHub Pages](https://pages.github.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Netlify](https://www.netlify.com)
- [Vercel](https://vercel.com)

Just point it at the repo — no build command needed.
