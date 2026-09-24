import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { type LevelData, parseLevel } from '../src/sim/level.ts'
import { type Controls, Support, noControls } from '../src/sim/player.ts'
import { COYOTE_TIME, RUN_SPEED, STEP } from '../src/sim/tuning.ts'
import { World } from '../src/sim/world.ts'

const sandbox = (map: string[]): LevelData => ({ name: 'test', kind: 'title', map })

type Held = Partial<Pick<Controls, 'left' | 'right' | 'jumpHeld'>> & { down?: boolean }

// Feeds held buttons to a world one step at a time and turns them into presses,
// the way the real input layer does
class Driver {
  world: World
  peak: number
  private jump = false
  private down = false

  constructor(data: LevelData) {
    this.world = new World(parseLevel(data))
    this.peak = this.world.player.y
  }

  run(seconds: number, held: (t: number) => Held = () => ({})) {
    const steps = Math.round(seconds / STEP)
    for (let i = 0; i < steps; i++) this.step(held(i * STEP))
  }

  step(held: Held = {}) {
    const jump = held.jumpHeld ?? false
    const down = held.down ?? false
    const controls: Controls = {
      ...noControls(),
      left: held.left ?? false,
      right: held.right ?? false,
      jumpHeld: jump,
      jumpPressed: jump && !this.jump,
      downPressed: down && !this.down,
    }
    this.jump = jump
    this.down = down
    const events = this.world.step(controls, STEP)
    this.peak = Math.max(this.peak, this.world.player.y)
    return events
  }
}

// A flat floor with lots of headroom; the player stands at y = 1
const flat = sandbox([
  ...Array.from({ length: 10 }, () => '                              '),
  '  P                           ',
  '##############################',
])

describe('ported feel', () => {
  it('a held jump rises about four tiles', () => {
    const d = new Driver(flat)
    d.run(1, () => ({ jumpHeld: true }))
    const height = d.peak - 1
    assert.ok(height > 3.95 && height < 4.15, `jump height ${height}`)
  })

  it('releasing jump early makes a short hop', () => {
    const tap = new Driver(flat)
    tap.run(1, t => ({ jumpHeld: t < STEP }))
    const medium = new Driver(flat)
    medium.run(1, t => ({ jumpHeld: t < 0.1 }))
    assert.ok(tap.peak - 1 < 1.2, `tap height ${tap.peak - 1}`)
    assert.ok(medium.peak > tap.peak && medium.peak - 1 < 3, `medium hop ${medium.peak - 1}`)
  })

  it('reaches top speed in about a tenth of a second and stops quickly', () => {
    const d = new Driver(flat)
    d.run(0.12, () => ({ right: true }))
    assert.equal(d.world.player.vx, RUN_SPEED)
    d.run(0.1)
    assert.equal(d.world.player.vx, 0)
  })

  it('air control is softer than ground control', () => {
    const d = new Driver(flat)
    d.run(0.05, () => ({ jumpHeld: true }))
    d.run(0.05, () => ({ jumpHeld: true, right: true }))
    const vx = d.world.player.vx
    assert.ok(vx > 0 && vx < RUN_SPEED * 0.6, `vx ${vx}`)
  })
})

describe('grace periods', () => {
  // A ledge at y = 6 with nothing below it
  const ledge = sandbox([
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '    P               ',
    '#######             ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
  ])

  function jumpAfterLeavingLedge(delay: number) {
    const d = new Driver(ledge)
    while (d.world.player.grounded) d.step({ right: true })
    d.run(delay, () => ({ right: true }))
    d.run(0.02, () => ({ right: true, jumpHeld: true }))
    return d.world.player.vy
  }

  it('jumping just after running off a ledge still works (coyote time)', () => {
    const vy = jumpAfterLeavingLedge(COYOTE_TIME * 0.5)
    assert.ok(vy > 10, `vy ${vy}`)
  })

  it('jumping well after leaving a ledge does nothing', () => {
    const vy = jumpAfterLeavingLedge(COYOTE_TIME + 0.05)
    assert.ok(vy < 0, `vy ${vy}`)
  })

  it('pressing jump just before landing jumps on touchdown (jump buffer)', () => {
    const d = new Driver(flat)
    d.run(0.2, () => ({ jumpHeld: true }))
    while (!(d.world.player.vy < 0 && d.world.player.y < 1.5)) d.step()
    assert.equal(d.world.player.grounded, false)
    let jumped = false
    for (let i = 0; i < 30; i++) jumped = d.step({ jumpHeld: true }).jumped || jumped
    assert.ok(jumped, 'the buffered jump fired')
  })
})

describe('platforms', () => {
  // A one-way platform with its top at y = 4, three tiles above the floor
  const tower = sandbox([
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '   ====   ',
    '          ',
    '    P     ',
    '##########',
  ])

  it('one-way platforms can be jumped through from below and landed on', () => {
    const d = new Driver(tower)
    d.run(1.2, t => ({ jumpHeld: t < 0.5 }))
    assert.equal(d.world.player.grounded, true)
    assert.equal(d.world.player.support, Support.OneWay)
    assert.ok(Math.abs(d.world.player.y - 4) < 1e-6, `y ${d.world.player.y}`)
  })

  it('pressing down drops through a one-way platform', () => {
    const d = new Driver(tower)
    d.run(1.2, t => ({ jumpHeld: t < 0.5 }))
    d.run(0.6, t => ({ down: t < 0.05 }))
    assert.equal(d.world.player.support, Support.Solid)
    assert.ok(Math.abs(d.world.player.y - 1) < 1e-6, `y ${d.world.player.y}`)
  })

  it('pressing down on solid ground does nothing', () => {
    const d = new Driver(flat)
    d.run(0.3, t => ({ down: t < 0.05 }))
    assert.equal(d.world.player.grounded, true)
    assert.ok(Math.abs(d.world.player.y - 1) < 1e-6)
  })

  it('solid ceilings stop a jump', () => {
    const d = new Driver(sandbox(['          ', '##########', '          ', '    P     ', '##########']))
    let bonked = false
    for (let i = 0; i < 60; i++) {
      bonked = d.step({ jumpHeld: true }).bonked || bonked
      assert.ok(d.world.player.y + 0.8 <= 3 + 1e-6)
    }
    assert.ok(bonked)
  })

  it('walls stop the player', () => {
    const d = new Driver(sandbox(['          ', '      #   ', '  P   #   ', '##########']))
    d.run(1, () => ({ right: true }))
    assert.ok(Math.abs(d.world.player.x - 5.6) < 1e-6, `x ${d.world.player.x}`)
  })

  it('a jump that clips a ceiling corner slides past it', () => {
    // The ceiling block ends at x = 5; the cube starts with its left edge 0.2 under it
    const d = new Driver(sandbox(['          ', '          ', '#####     ', '          ', '     P    ', '##########']))
    d.world.player.x = 5.2
    let bonked = false
    for (let i = 0; i < 40; i++) bonked = d.step({ jumpHeld: true }).bonked || bonked
    assert.equal(bonked, false)
    assert.ok(d.world.player.y > 3, `y ${d.world.player.y}`)
  })
})

describe('world', () => {
  const course: LevelData = {
    name: 'course',
    map: ['                    ', '                    ', '  P  o  ^     F     ', '####################'],
  }

  it('collects coins, dies on spikes and respawns with the coins back', () => {
    const d = new Driver(course)
    let died = false
    for (let i = 0; i < 240 && !died; i++) died = d.step({ right: true }).died
    assert.ok(died, 'hit the spikes')
    assert.equal(d.world.coinCount, 1)
    d.world.respawn()
    assert.equal(d.world.coinCount, 0)
    assert.equal(d.world.falls, 1)
    assert.equal(d.world.player.x, 2.5)
  })

  it('reaching the flag finishes the level', () => {
    const d = new Driver({ ...course, map: course.map.map(row => row.replace('^', ' ')) })
    for (let i = 0; i < 360 && !d.world.finished; i++) d.step({ right: true })
    assert.ok(d.world.finished)
  })

  it('falling off the map ends the attempt', () => {
    const d = new Driver(sandbox(['   ', ' P ', '   ']))
    let died = false
    for (let i = 0; i < 240 && !died; i++) died = d.step().died
    assert.ok(died)
  })

  // A high ledge over a bottomless gap, and lower ground further on
  const heights = sandbox([
    '                                        ',
    '  P                                     ',
    '#####                                   ',
    ...Array.from({ length: 14 }, () => '                                        '),
    '                        ################',
    '                                        ',
  ])

  it('a fall into a gap ends as soon as nothing is left to land on', () => {
    const d = new Driver(heights)
    let steps = 0
    let died = false
    while (d.world.player.grounded) d.step({ right: true })
    while (!died && steps < 240) {
      died = d.step({ right: true }).died
      steps++
    }
    assert.ok(died)
    assert.ok(steps * STEP < 0.4, `fell for ${(steps * STEP).toFixed(2)} s`)
  })

  it('a long drop onto lower ground is not a fall', () => {
    const d = new Driver(heights)
    d.world.player.x = 23.5
    d.world.player.y = 16
    let died = false
    for (let i = 0; i < 240; i++) died = d.step({ right: true }).died || died
    assert.equal(died, false)
    assert.ok(d.world.player.grounded && d.world.player.y === 2)
  })
})
