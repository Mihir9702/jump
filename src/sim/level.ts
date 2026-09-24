// Levels are hand-drawn ASCII maps stored as JSON (see src/levels). This module turns a map
// into a tile grid that the simulation and the renderer both read.
//
// Legend
//   ' ' or '.'  empty
//   '#'         solid ground
//   '='         one-way platform: jump up through it, land on top, press down to drop
//   'L'         letter block (title screen): a full block that behaves like a one-way platform
//   'o'         coin
//   'P'         player start, standing on the bottom of this cell
//   'F'         goal flag, standing on the bottom of this cell
//   'C'         checkpoint: after a fall the player restarts here instead of at 'P'
//   '^'         spikes on the floor of this cell
//   'v'         spikes hanging from the ceiling of this cell

export const Tile = {
  Empty: 0,
  Solid: 1,
  OneWay: 2,
  Letter: 3,
  SpikeUp: 4,
  SpikeDown: 5,
} as const
export type TileKind = (typeof Tile)[keyof typeof Tile]

const hintIds = ['through', 'hold', 'drop'] as const
export type HintId = (typeof hintIds)[number]

export interface LevelData {
  name: string
  kind?: 'title' | 'level'
  map: string[]
  hints?: { x: number; id: HintId }[]
}

export interface Point {
  x: number
  y: number
}

export interface Level {
  name: string
  kind: 'title' | 'level'
  width: number
  height: number
  // One entry per cell, row-major, row 0 is the bottom row of the map
  tiles: Uint8Array
  spawn: Point
  flag: Point | null
  // Where the checkpoint posts stand, left to right
  checkpoints: Point[]
  // Coin centers
  coins: Point[]
  hints: { x: number; id: HintId }[]
}

const symbols: Record<string, TileKind> = {
  ' ': Tile.Empty,
  '.': Tile.Empty,
  o: Tile.Empty,
  P: Tile.Empty,
  F: Tile.Empty,
  C: Tile.Empty,
  '#': Tile.Solid,
  '=': Tile.OneWay,
  L: Tile.Letter,
  '^': Tile.SpikeUp,
  v: Tile.SpikeDown,
}

export function parseLevel(data: LevelData): Level {
  const height = data.map.length
  const width = Math.max(...data.map.map(row => row.length))
  if (height === 0 || width === 0) throw new Error(`${data.name}: the map is empty`)

  const tiles = new Uint8Array(width * height)
  const coins: Point[] = []
  const checkpoints: Point[] = []
  let spawn: Point | null = null
  let flag: Point | null = null

  data.map.forEach((line, r) => {
    const row = height - 1 - r
    for (let col = 0; col < width; col++) {
      const symbol = line[col] ?? ' '
      const kind = symbols[symbol]
      if (kind === undefined) {
        throw new Error(`${data.name}: unknown symbol "${symbol}" at column ${col}, line ${r + 1}`)
      }
      tiles[row * width + col] = kind
      if (symbol === 'o') coins.push({ x: col + 0.5, y: row + 0.5 })
      if (symbol === 'C') checkpoints.push({ x: col + 0.5, y: row })
      if (symbol === 'P') {
        if (spawn) throw new Error(`${data.name}: more than one player start`)
        spawn = { x: col + 0.5, y: row }
      }
      if (symbol === 'F') {
        if (flag) throw new Error(`${data.name}: more than one flag`)
        flag = { x: col + 0.5, y: row }
      }
    }
  })

  if (!spawn) throw new Error(`${data.name}: the map has no player start (P)`)
  const kind = data.kind ?? 'level'
  if (kind === 'level' && !flag) throw new Error(`${data.name}: the map has no flag (F)`)
  for (const hint of data.hints ?? []) {
    if (!hintIds.includes(hint.id)) throw new Error(`${data.name}: unknown hint "${hint.id}"`)
  }

  return {
    name: data.name,
    kind,
    width,
    height,
    tiles,
    spawn,
    flag,
    checkpoints: checkpoints.sort((a, b) => a.x - b.x),
    coins,
    hints: data.hints ?? [],
  }
}

export function tileAt(level: Level, col: number, row: number): TileKind {
  if (col < 0 || col >= level.width || row < 0 || row >= level.height) return Tile.Empty
  return level.tiles[row * level.width + col] as TileKind
}

// The sides of the map are walls; above and below it is open air
export function solidAt(level: Level, col: number, row: number): boolean {
  if (col < 0 || col >= level.width) return true
  return tileAt(level, col, row) === Tile.Solid
}

// A one-way surface is the top of a platform, or the exposed top of a letter block
export function platformAt(level: Level, col: number, row: number): boolean {
  const kind = tileAt(level, col, row)
  if (kind === Tile.OneWay) return true
  return kind === Tile.Letter && tileAt(level, col, row + 1) !== Tile.Letter
}
