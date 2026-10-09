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
