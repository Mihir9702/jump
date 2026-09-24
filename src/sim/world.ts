import { type Level, type Point, Tile, tileAt } from './level.ts'
import {
  type Controls,
  type Player,
  type StepEvents,
  createPlayer,
  createStepEvents,
  stepPlayer,
} from './player.ts'
import { FALL_LIMIT, PLAYER_HALF, PLAYER_SIZE } from './tuning.ts'

export interface WorldEvents extends StepEvents {
  // Indices into level.coins picked up this step
  coins: number[]
  // Index into level.checkpoints reached this step, or -1
  checkpoint: number
  died: boolean
  goal: boolean
}

// Spikes are a little smaller than their tile so near misses stay near misses
const SPIKE_INSET = 0.14
const SPIKE_HEIGHT = 0.5

export function touchesSpikes(level: Level, p: Player): boolean {
  const left = p.x - PLAYER_HALF
  const right = p.x + PLAYER_HALF
  const bottom = p.y
  const top = p.y + PLAYER_SIZE
  for (let c = Math.floor(left); c <= Math.floor(right); c++) {
    for (let r = Math.floor(bottom); r <= Math.floor(top); r++) {
      const kind = tileAt(level, c, r)
      if (kind !== Tile.SpikeUp && kind !== Tile.SpikeDown) continue
      const x0 = c + SPIKE_INSET
      const x1 = c + 1 - SPIKE_INSET
      const y0 = kind === Tile.SpikeUp ? r : r + 1 - SPIKE_HEIGHT
      const y1 = kind === Tile.SpikeUp ? r + SPIKE_HEIGHT : r + 1
      if (right > x0 && left < x1 && top > y0 && bottom < y1) return true
    }
  }
  return false
}

// A fall is over once the cube is FALL_LIMIT below every surface it could still land on.
// Surfaces more than FALL_REACH columns away are out of reach: even a drop the full height
// of a map lasts under a second, which is about eight tiles of running.
const FALL_REACH = 9

export function fallLine(level: Level, x: number): number {
  const col = Math.floor(x)
  let lowest = Infinity
  for (let c = Math.max(0, col - FALL_REACH); c <= Math.min(level.width - 1, col + FALL_REACH); c++) {
    lowest = Math.min(lowest, level.lowestSurface[c]!)
  }
  return (lowest === Infinity ? 0 : lowest) - FALL_LIMIT
}

export const isDead = (level: Level, p: Player) => p.y < fallLine(level, p.x) || touchesSpikes(level, p)

// Flag poles and checkpoint posts are tall, thin triggers standing on `base`
const touchesPole = (p: Player, base: Point, height: number) =>
  Math.abs(p.x - base.x) < 0.55 && p.y < base.y + height && p.y + PLAYER_SIZE > base.y

export const touchesFlag = (level: Level, p: Player) =>
  level.flag !== null && touchesPole(p, level.flag, 3.2)

export const touchesCheckpoint = (p: Player, base: Point) => touchesPole(p, base, 2.2)

export function touchesCoin(p: Player, coin: Point): boolean {
  return (
    Math.abs(p.x - coin.x) < PLAYER_SIZE * 0.75 &&
    Math.abs(p.y + PLAYER_HALF - coin.y) < PLAYER_SIZE * 0.85
  )
}

// One attempt at a level: the player, the coins still out there, and the clock
export class World {
  readonly level: Level
  player: Player
  collected: boolean[]
  coinCount = 0
  // Seconds spent in this level, falls included
  time = 0
  falls = 0
  finished = false
  // Index of the last checkpoint reached, or -1
  checkpoint = -1
  // Coins that stay collected after a fall: the ones picked up before the last checkpoint
  private banked: boolean[]
  readonly events: WorldEvents = {
    ...createStepEvents(),
    coins: [],
    checkpoint: -1,
    died: false,
    goal: false,
  }

  constructor(level: Level) {
    this.level = level
    this.player = createPlayer(level.spawn.x, level.spawn.y)
    this.collected = level.coins.map(() => false)
    this.banked = [...this.collected]
  }

  get restartPoint(): Point {
    return this.level.checkpoints[this.checkpoint] ?? this.level.spawn
  }

  // Back to the last checkpoint after a fall, with the coins picked up since then put
  // back. The clock keeps running.
  respawn() {
    const from = this.restartPoint
    this.player = createPlayer(from.x, from.y)
    this.collected = [...this.banked]
    this.coinCount = this.collected.filter(Boolean).length
    this.falls += 1
  }

  step(input: Controls, dt: number): WorldEvents {
    const events = this.events
    events.jumped = false
    events.landed = 0
    events.dropped = false
    events.bonked = false
    events.coins.length = 0
    events.checkpoint = -1
    events.died = false
    events.goal = false

    if (!this.finished) this.time += dt
    const p = this.player
    stepPlayer(p, input, this.level, dt, events)

    this.level.coins.forEach((coin, i) => {
      if (this.collected[i] || !touchesCoin(p, coin)) return
      this.collected[i] = true
      this.coinCount += 1
      events.coins.push(i)
    })

    this.level.checkpoints.forEach((base, i) => {
      if (i <= this.checkpoint || !touchesCheckpoint(p, base)) return
      this.checkpoint = i
      this.banked = [...this.collected]
      events.checkpoint = i
    })

    if (!this.finished && touchesFlag(this.level, p)) {
      this.finished = true
      events.goal = true
    }

    events.died = isDead(this.level, p)
    return events
  }
}
