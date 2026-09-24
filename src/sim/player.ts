import { type Level, platformAt, solidAt } from './level.ts'
import {
  AIR_ACCEL,
  AIR_FRICTION,
  CORNER_NUDGE,
  COYOTE_TIME,
  DROP_BUFFER,
  DROP_TIME,
  GRAVITY,
  GROUND_ACCEL,
  GROUND_FRICTION,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_SPEED,
  MAX_FALL,
  PLAYER_HALF,
  PLAYER_SIZE,
  RUN_SPEED,
} from './tuning.ts'

// What the player asks for during one simulation step
export interface Controls {
  left: boolean
  right: boolean
  jumpHeld: boolean
  // Edges: true only on the step after the button went down
  jumpPressed: boolean
  downPressed: boolean
}

export const Support = { None: 0, Solid: 1, OneWay: 2 } as const
export type SupportKind = (typeof Support)[keyof typeof Support]

export interface Player {
  // Bottom center of the cube, in tiles. y points up.
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  grounded: boolean
  support: SupportKind
  coyote: number
  buffer: number
  dropBuffer: number
  dropUntil: number
  canCut: boolean
  clock: number
}

// Things that happened during a step, for sound, particles and animation
export interface StepEvents {
  jumped: boolean
  // Downward speed at the moment of landing, 0 when the player did not land
  landed: number
  dropped: boolean
  bonked: boolean
}

export const noControls = (): Controls => ({
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  downPressed: false,
})

export const createStepEvents = (): StepEvents => ({
  jumped: false,
  landed: 0,
  dropped: false,
  bonked: false,
})

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    support: Support.Solid,
    coyote: 0,
    buffer: 0,
    dropBuffer: 0,
    dropUntil: 0,
    canCut: false,
    clock: 0,
  }
}

// Keeps edge checks from treating "touching" as "overlapping"
const EPS = 1e-4

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function stepPlayer(
  p: Player,
  input: Controls,
  level: Level,
  dt: number,
  events: StepEvents,
): void {
  p.clock += dt

  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (direction !== 0) {
    const accel = p.grounded ? GROUND_ACCEL : AIR_ACCEL
    p.vx = clamp(p.vx + direction * accel * dt, -RUN_SPEED, RUN_SPEED)
    p.facing = direction > 0 ? 1 : -1
  } else {
    const friction = (p.grounded ? GROUND_FRICTION : AIR_FRICTION) * dt
    p.vx = Math.abs(p.vx) <= friction ? 0 : p.vx - Math.sign(p.vx) * friction
  }

  if (input.jumpPressed) p.buffer = JUMP_BUFFER
  if (input.downPressed) p.dropBuffer = DROP_BUFFER

  p.coyote = p.grounded ? COYOTE_TIME : Math.max(0, p.coyote - dt)
  p.buffer = Math.max(0, p.buffer - dt)
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = JUMP_SPEED
    p.grounded = false
    p.support = Support.None
    p.coyote = 0
    p.buffer = 0
    p.canCut = true
    events.jumped = true
  }
  // Letting go of jump early makes a shorter hop
  if (p.canCut && !input.jumpHeld && p.vy > 0) {
    p.vy *= JUMP_CUT
    p.canCut = false
  }
  if (p.vy <= 0) p.canCut = false

  p.dropBuffer = Math.max(0, p.dropBuffer - dt)
  if (p.dropBuffer > 0 && p.grounded && p.support === Support.OneWay) {
    p.dropUntil = p.clock + DROP_TIME
    p.grounded = false
    p.support = Support.None
    p.coyote = 0
    p.dropBuffer = 0
    events.dropped = true
  }

  p.vy = Math.max(p.vy - GRAVITY * dt, -MAX_FALL)
  const wasGrounded = p.grounded
  const impact = -p.vy

  moveX(p, level, p.vx * dt)
  moveY(p, level, p.vy * dt, events)

  if (p.grounded && !wasGrounded) events.landed = impact
}

// Whether a player box standing at (x, y) would overlap any solid tile
export function boxHitsSolid(level: Level, x: number, y: number): boolean {
  const c0 = Math.floor(x - PLAYER_HALF + EPS)
  const c1 = Math.floor(x + PLAYER_HALF - EPS)
  const r0 = Math.floor(y + EPS)
  const r1 = Math.floor(y + PLAYER_SIZE - EPS)
  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) if (solidAt(level, c, r)) return true
  }
  return false
}

function moveX(p: Player, level: Level, dx: number) {
  if (dx === 0) return
  p.x += dx
  const r0 = Math.floor(p.y + EPS)
  const r1 = Math.floor(p.y + PLAYER_SIZE - EPS)
  if (dx > 0) {
    const col = Math.floor(p.x + PLAYER_HALF - EPS)
    for (let r = r0; r <= r1; r++) {
      if (solidAt(level, col, r)) {
        p.x = col - PLAYER_HALF
        p.vx = 0
        return
      }
    }
  } else {
    const col = Math.floor(p.x - PLAYER_HALF + EPS)
    for (let r = r0; r <= r1; r++) {
      if (solidAt(level, col, r)) {
        p.x = col + 1 + PLAYER_HALF
        p.vx = 0
        return
      }
    }
  }
}

function moveY(p: Player, level: Level, dy: number, events: StepEvents) {
  const previousBottom = p.y
  p.y += dy
  p.grounded = false
  p.support = Support.None
  const c0 = Math.floor(p.x - PLAYER_HALF + EPS)
  const c1 = Math.floor(p.x + PLAYER_HALF - EPS)

  if (dy <= 0) {
    // Only catch the player when it falls onto a surface from above
    const row = Math.floor(p.y - EPS)
    const dropping = p.clock < p.dropUntil
    let solid = false
    let platform = false
    for (let c = c0; c <= c1; c++) {
      if (solidAt(level, c, row)) solid = true
      else if (!dropping && platformAt(level, c, row) && previousBottom >= row + 1 - EPS) {
        platform = true
      }
    }
    if (solid || platform) {
      p.y = row + 1
      p.vy = 0
      p.grounded = true
      p.support = solid ? Support.Solid : Support.OneWay
    }
    return
  }

  if (dy > 0) {
    const row = Math.floor(p.y + PLAYER_SIZE - EPS)
    const leftHit = solidAt(level, c0, row)
    const rightHit = c1 !== c0 && solidAt(level, c1, row)
    if (!leftHit && !rightHit) return

    // Clipped a corner: slide around it instead of stopping the jump
    if (leftHit !== rightHit) {
      const shift = leftHit ? c0 + 1 - (p.x - PLAYER_HALF) : -(p.x + PLAYER_HALF - c1)
      if (Math.abs(shift) <= CORNER_NUDGE) {
        const x = p.x + shift + Math.sign(shift) * EPS
        if (!boxHitsSolid(level, x, p.y)) {
          p.x = x
          return
        }
      }
    }
    p.y = row - PLAYER_SIZE
    p.vy = 0
    p.canCut = false
    events.bonked = true
  }
}
