/**
 * Returns the appropriate emoji character for an animal species.
 * Used in Leaflet map markers and other HTML-rendered contexts.
 */
export function getSpeciesEmoji(species) {
  const map = {
    'Camel': '🐪',
    'Goat': '🐐',
    'Sheep': '🐑',
    'Cow': '🐄',
    'Dog': '🐕',
    'Horse': '🐴',
    'Donkey': '🫏',
    'Chicken': '🐔',
    'Duck': '🦆',
    'Rabbit': '🐇',
  };
  return map[species] || '🐪';
}

/**
 * Returns the Material Symbols icon name for an animal species.
 * Used in React components that render <MaterialSymbol icon={...}>.
 */
export function getSpeciesMaterialIcon(species) {
  const map = {
    'Camel': 'camel',
    'Goat': 'goat',
    'Sheep': 'sheep',
    'Cow': 'cow',
    'Dog': 'dog',
    'Horse': 'horse',
    'Donkey': 'donkey',
    'Chicken': 'chicken',
    'Duck': 'duck',
    'Rabbit': 'rabbit',
  };
  return map[species] || 'pets';
}
