const cache = new Map();

export async function fetchCard(name) {
  if (!name) return null;

  const key = name.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(key)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const card = {
      name: data.name,
      artCrop: data.image_uris?.art_crop || data.card_faces?.[0]?.image_uris?.art_crop || '',
      image: data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '',
      colors: data.color_identity || [],
    };
    cache.set(key, card);
    return card;
  } catch {
    return null;
  }
}

const MANA_COLORS = {
  W: { label: 'White', hex: '#f9faf4' },
  U: { label: 'Blue', hex: '#0e68ab' },
  B: { label: 'Black', hex: '#150b00' },
  R: { label: 'Red', hex: '#d3202a' },
  G: { label: 'Green', hex: '#00733e' },
};

export function renderColorPips(colors) {
  if (!colors || colors.length === 0) return '<span class="color-pips colorless"></span>';
  return '<span class="color-pips">' +
    colors.map(c => {
      const info = MANA_COLORS[c];
      return info
        ? `<span class="mana-pip" style="background:${info.hex}" title="${info.label}"></span>`
        : '';
    }).join('') +
    '</span>';
}
