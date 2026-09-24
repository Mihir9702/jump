// Finds a way through a level using the real game physics, so tests can prove that every
// level can be finished and every coin can be reached. It searches over short held-button
// moves (weighted A*), treating positions and speeds that round to the same values as the
// same state. Routes are exact: replaying `steps` from the level start reproduces them.
import type { Level, Point } from '../src/sim/level.ts'
import {
  type Controls,
  type Player,
  Support,
  createPlayer,
  createStepEvents,
  stepPlayer,
} from '../src/sim/player.ts'
import { RUN_SPEED, STEP } from '../src/sim/tuning.ts'
import { isDead, touchesCheckpoint, touchesCoin, touchesFlag } from '../src/sim/world.ts'

// Buttons held during one simulation step
export interface Held {
  left: boolean
  right: boolean
  jump: boolean
  down: boolean
}

type Jump = 'none' | 'tap' | 'hold'
interface Move {
  dir: -1 | 0 | 1
  jump: Jump
  drop: boolean
}

// Simulation steps per move: 1/20 s
const MOVE_STEPS = 6

interface Node {
  p: Player
  jumpHeld: boolean
  steps: number
  f: number
  parent: Node | null
  move: Move | null
  // Steps of `move` actually taken; shorter than MOVE_STEPS when the target was reached
  taken: number
}

class Heap {
  private items: Node[] = []
  get size() {
    return this.items.length
  }
  push(node: Node) {
    const a = this.items
    a.push(node)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (a[parent]!.f <= a[i]!.f) break
      ;[a[parent], a[i]] = [a[i]!, a[parent]!]
      i = parent
    }
  }
  pop(): Node | undefined {
    const a = this.items
    const top = a[0]
    const last = a.pop()
    if (a.length > 0 && last) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let smallest = i
        if (l < a.length && a[l]!.f < a[smallest]!.f) smallest = l
        if (r < a.length && a[r]!.f < a[smallest]!.f) smallest = r
        if (smallest === i) break
        ;[a[smallest], a[i]] = [a[i]!, a[smallest]!]
        i = smallest
      }
    }
    return top
  }
}

// A tap holds jump for the first `tap` steps of its move; longer presses are chains of holds
function heldFor(move: Move, index: number, tap: number): Held {
  return {
    left: move.dir < 0,
    right: move.dir > 0,
    jump: move.jump === 'hold' || (move.jump === 'tap' && index < tap),
    down: move.drop && index === 0,
  }
}

function movesFrom(p: Player): Move[] {
  const moves: Move[] = []
  const jumps: Jump[] = p.grounded || p.coyote > 0 ? ['none', 'tap', 'hold'] : ['none', 'hold']
  for (const dir of [1, 0, -1] as const) {
    for (const jump of jumps) moves.push({ dir, jump, drop: false })
    if (p.grounded && p.support === Support.OneWay) moves.push({ dir, jump: 'none', drop: true })
  }
  return moves
}

export interface Start {
  p: Player
  jumpHeld: boolean
}

export interface Solution {
  steps: Held[]
  seconds: number
  expanded: number
  // The player at the start of every move along the route
  states: Start[]
  end: Start
}

export interface SolveOptions {
  // Stop searching after this many expanded states
  limit?: number
  // Greed of the search: higher is faster but finds slower routes
  weight?: number
  // States closer than 1/resolution tiles count as the same state
  resolution?: number
  // How many steps the shortest jump press lasts, at most one move (6 steps, 50 ms).
  // The default of 2 steps is quicker than people can tap.
  tapSteps?: number
  start?: Start
}

export function solve(
  level: Level,
  target: Point,
  reached: (p: Player) => boolean,
  options: SolveOptions = {},
): Solution | null {
  const limit = options.limit ?? 400_000
  const weight = options.weight ?? 3
  const resolution = options.resolution ?? 4
  const tap = Math.min(options.tapSteps ?? 2, MOVE_STEPS)
  const start = options.start ?? { p: createPlayer(level.spawn.x, level.spawn.y), jumpHeld: false }
  const events = createStepEvents()
  const seen = new Map<string, number>()
  const open = new Heap()
  // Rough time to the target, in steps: running across, plus about a jump per four tiles
  // of height. It overestimates on purpose to keep the search moving toward the target.
  const estimate = (p: Player) => {
    const across = Math.max(0, Math.abs(target.x - p.x) - 0.5) / RUN_SPEED
    const up = Math.max(0, target.y - 0.5 - p.y) * 0.12
    return ((across + up) / STEP) * weight
  }

  const root: Node = {
    p: { ...start.p },
    jumpHeld: start.jumpHeld,
    steps: 0,
    f: 0,
    parent: null,
    move: null,
    taken: 0,
  }
  if (reached(root.p)) return finish(root, 0, tap)
  open.push(root)
  let expanded = 0

  while (open.size > 0 && expanded < limit) {
    const node = open.pop()!
    expanded++
    for (const move of movesFrom(node.p)) {
      const p = { ...node.p }
      let jumpHeld = node.jumpHeld
      let taken = 0
      let done = false
      let dead = false
      while (taken < MOVE_STEPS) {
        const held = heldFor(move, taken, tap)
        const controls: Controls = {
          left: held.left,
          right: held.right,
          jumpHeld: held.jump,
          jumpPressed: held.jump && !jumpHeld,
          downPressed: held.down,
        }
        jumpHeld = held.jump
        stepPlayer(p, controls, level, STEP, events)
        taken++
        if (isDead(level, p)) {
          dead = true
          break
        }
        if (reached(p)) {
          done = true
          break
        }
      }
      if (dead) continue
      const child: Node = {
        p,
        jumpHeld,
        steps: node.steps + taken,
        f: 0,
        parent: node,
        move,
        taken,
      }
      if (done) return finish(child, expanded, tap)

      const key = [
        Math.round(p.x * resolution),
        Math.round(p.y * resolution),
        Math.round(p.vx / 3),
        Math.round(p.vy / 4),
        p.grounded ? 1 : 0,
        p.canCut && jumpHeld ? 1 : 0,
      ].join()
      const best = seen.get(key)
      if (best !== undefined && best <= child.steps) continue
      seen.set(key, child.steps)
      child.f = child.steps + estimate(p)
      open.push(child)
    }
  }
  return null
}

function finish(node: Node, expanded: number, tap: number): Solution {
  const chain: Node[] = []
  for (let n: Node | null = node; n; n = n.parent) chain.push(n)
  chain.reverse()
  const steps: Held[] = []
  const states: Start[] = []
  for (const n of chain) {
    if (n.move) for (let i = 0; i < n.taken; i++) steps.push(heldFor(n.move, i, tap))
    states.push({ p: n.p, jumpHeld: n.jumpHeld })
  }
  return {
    steps,
    seconds: steps.length * STEP,
    expanded,
    states,
    end: { p: { ...node.p }, jumpHeld: node.jumpHeld },
  }
}

// A full route from the start to the flag, going through each checkpoint in turn so that
// every search stays small
export function solveLevel(level: Level, options: SolveOptions = {}): Solution | null {
  if (!level.flag) return null
  const flag = level.flag
  const legs: [Point, (p: Player) => boolean][] = [
    ...level.checkpoints.map(
      (base): [Point, (p: Player) => boolean] => [base, p => touchesCheckpoint(p, base)],
    ),
    [flag, p => touchesFlag(level, p)],
  ]
  let start: Start = { p: createPlayer(level.spawn.x, level.spawn.y), jumpHeld: false }
  const route: Solution = { steps: [], seconds: 0, expanded: 0, states: [], end: start }
  for (const [target, reached] of legs) {
    const leg = solve(level, target, reached, { ...options, start })
    if (!leg) return null
    route.steps.push(...leg.steps)
    route.states.push(...leg.states)
    route.expanded += leg.expanded
    start = leg.end
  }
  route.seconds = route.steps.length * STEP
  route.end = start
  return route
}

// Tries to reach a coin from the route states nearest to it
export function reachCoin(level: Level, route: Solution, coin: Point): Solution | null {
  const distance = (s: Start) => Math.hypot(s.p.x - coin.x, s.p.y - coin.y)
  const nearest = [...route.states]
    .sort((a, b) => distance(a) - distance(b))
    .filter((s, i, list) => i === 0 || Math.abs(s.p.x - list[i - 1]!.p.x) > 1)
    .slice(0, 3)
  for (const start of nearest) {
    const found = solve(level, coin, q => touchesCoin(q, coin), {
      start,
      limit: 150_000,
    })
    if (found) return found
  }
  return null
}

// Compact text form for replaying a route in the browser: one hex digit per step holding
// a bit mask of the buttons (1 left, 2 right, 4 jump, 8 down)
export const encodeSteps = (steps: Held[]) =>
  steps
    .map(h => ((h.left ? 1 : 0) | (h.right ? 2 : 0) | (h.jump ? 4 : 0) | (h.down ? 8 : 0)).toString(16))
    .join('')
