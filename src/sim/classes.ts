export interface CharacterClass {
  id: string
  name: string
  title: string
  icon: string
  quote: string
  weapon: string
  color: string
  accentColor: string
  glowColor: string
  stats: {
    str: number
    dex: number
    int: number
    luk: number
    hp: number
    mp: number
  }
  accessoryType: 'daggers' | 'rings' | 'visor' | 'armor' | 'prism' | 'hat' | 'crown' | 'shield' | 'horns' | 'ribbons' | 'drums' | 'shaman'
}

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'vesper',
    name: 'Vesper',
    title: 'Starlight Nomad',
    icon: '🌌',
    quote: 'Bending starlight into razor phase daggers across the horizon.',
    weapon: 'Dual Starlight Phase Daggers',
    color: '#6366f1',
    accentColor: '#a5b4fc',
    glowColor: '#818cf8',
    stats: { str: 9, dex: 16, int: 8, luk: 11, hp: 100, mp: 60 },
    accessoryType: 'daggers',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    title: 'Celestial Gyro',
    icon: '🧭',
    quote: 'Harnessing gravitational orbit rings to compress spacetime.',
    weapon: 'Orbiting Astrolabe Rings',
    color: '#eab308',
    accentColor: '#fef08a',
    glowColor: '#fde047',
    stats: { str: 10, dex: 9, int: 15, luk: 8, hp: 110, mp: 80 },
    accessoryType: 'rings',
  },
  {
    id: 'ren',
    name: 'Ren',
    title: 'Shadow Strider',
    icon: '🥷',
    quote: 'Moving silently in the vapor between digital blinks.',
    weapon: 'Smoke Wakizashi & Shuriken',
    color: '#06b6d4',
    accentColor: '#22d3ee',
    glowColor: '#67e8f9',
    stats: { str: 8, dex: 18, int: 5, luk: 14, hp: 95, mp: 50 },
    accessoryType: 'visor',
  },
  {
    id: 'gideon',
    name: 'Gideon',
    title: 'Void Knight',
    icon: '🛡️',
    quote: 'Forged from dark matter, shielding allies with an immortal star core.',
    weapon: 'Dark-Matter Bastion & Greatsword',
    color: '#475569',
    accentColor: '#94a3b8',
    glowColor: '#cbd5e1',
    stats: { str: 18, dex: 8, int: 5, luk: 6, hp: 160, mp: 40 },
    accessoryType: 'armor',
  },
  {
    id: 'iris',
    name: 'Iris',
    title: 'Living Prism',
    icon: '💎',
    quote: 'Refracting sunlight into prismatic spectral laser cascades.',
    weapon: 'Prismatic Focus Lens',
    color: '#ec4899',
    accentColor: '#f472b6',
    glowColor: '#fbcfe8',
    stats: { str: 5, dex: 7, int: 19, luk: 10, hp: 85, mp: 110 },
    accessoryType: 'prism',
  },
  {
    id: 'jin',
    name: 'Jin',
    title: 'Driftwood Ronin',
    icon: '🎋',
    quote: 'Wandering the coastal winds with an ancient weathered blade.',
    weapon: 'Weathered Driftwood Katana',
    color: '#b45309',
    accentColor: '#fde68a',
    glowColor: '#d97706',
    stats: { str: 15, dex: 12, int: 6, luk: 9, hp: 120, mp: 55 },
    accessoryType: 'hat',
  },
  {
    id: 'kallum',
    name: 'Kallum',
    title: 'Abyssal Sovereign',
    icon: '👑',
    quote: 'Commanding abyssal nether-fire beneath an ethereal flame crown.',
    weapon: 'Abyssal Flame Scythe',
    color: '#7c3aed',
    accentColor: '#c084fc',
    glowColor: '#a855f7',
    stats: { str: 10, dex: 8, int: 17, luk: 10, hp: 105, mp: 95 },
    accessoryType: 'crown',
  },
  {
    id: 'valeria',
    name: 'Valeria',
    title: 'Cyber-Valkyrie',
    icon: '⚡',
    quote: 'Descending from the stratosphere with hard-light photon wings.',
    weapon: 'Photon Lance & Hex Shield',
    color: '#2563eb',
    accentColor: '#93c5fd',
    glowColor: '#60a5fa',
    stats: { str: 14, dex: 13, int: 10, luk: 7, hp: 130, mp: 65 },
    accessoryType: 'shield',
  },
  {
    id: 'tor',
    name: 'Tor',
    title: 'Molten Shaman',
    icon: '🌋',
    quote: 'Summoning volcanic basalt and subterranean magma surges.',
    weapon: 'Magma Basalt Totem',
    color: '#ea580c',
    accentColor: '#fed7aa',
    glowColor: '#f97316',
    stats: { str: 16, dex: 6, int: 14, luk: 6, hp: 140, mp: 75 },
    accessoryType: 'shaman',
  },
  {
    id: 'mei',
    name: 'Mei',
    title: 'Ribbon Dancer',
    icon: '🪭',
    quote: 'Dancing gracefully while weaving razor-sharp crimson silk.',
    weapon: 'Razor Silk Ribbon Fans',
    color: '#f43f5e',
    accentColor: '#ffe4e6',
    glowColor: '#fb7185',
    stats: { str: 7, dex: 17, int: 10, luk: 11, hp: 90, mp: 70 },
    accessoryType: 'ribbons',
  },
  {
    id: 'rai',
    name: 'Rai',
    title: 'Thunder Monk',
    icon: '🌩️',
    quote: 'Striking with the cadence of orbiting thunder drums and electric tonfas.',
    weapon: 'Thunder Tonfas & Drums',
    color: '#0284c7',
    accentColor: '#7dd3fc',
    glowColor: '#38bdf8',
    stats: { str: 13, dex: 15, int: 8, luk: 8, hp: 115, mp: 60 },
    accessoryType: 'drums',
  },
  {
    id: 'rowan',
    name: 'Rowan',
    title: 'Horned Warden',
    icon: '🦌',
    quote: 'Guiding wandering souls through elder groves with an enchanted lantern.',
    weapon: 'Thorn Rapier & Spirit Lantern',
    color: '#15803d',
    accentColor: '#86efac',
    glowColor: '#4ade80',
    stats: { str: 11, dex: 12, int: 12, luk: 9, hp: 125, mp: 75 },
    accessoryType: 'horns',
  },
]

export const DEFAULT_CLASS_ID = 'vesper'

export function getCharacterClass(id: string): CharacterClass {
  return CHARACTER_CLASSES.find(c => c.id === id) ?? CHARACTER_CLASSES[0]!
}

const CLASS_STORAGE_KEY = 'jump:selected_class'

export function loadSavedClass(): CharacterClass {
  try {
    const saved = localStorage.getItem(CLASS_STORAGE_KEY)
    if (saved) {
      const found = CHARACTER_CLASSES.find(c => c.id === saved)
      if (found) return found
    }
  } catch {
    // Ignore localStorage issues in private mode
  }
  return CHARACTER_CLASSES[0]!
}

export function saveSelectedClass(id: string): void {
  try {
    localStorage.setItem(CLASS_STORAGE_KEY, id)
  } catch {
    // Ignore
  }
}
