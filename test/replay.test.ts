import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ReplayPlayback, ReplayRecorder, decodeControl, encodeControl } from '../src/replay/replay.ts'
import { type LevelData, parseLevel } from '../src/sim/level.ts'
import { type Controls, noControls } from '../src/sim/player.ts'
import { STEP } from '../src/sim/tuning.ts'
import { World } from '../src/sim/world.ts'

const levelData: LevelData = {
  name: 'replay-test',
  map: [
    '                    ',
    '                    ',
    '  P    o        F   ',
    '####################',
  ],
}

describe('replays', () => {
  it('round-trips every control bit exactly', () => {
    for (let bits = 0; bits < 32; bits++) {
      const control: Controls = {
        left: (bits & 1) !== 0,
        right: (bits & 2) !== 0,
        jumpHeld: (bits & 4) !== 0,
        jumpPressed: (bits & 8) !== 0,
        downPressed: (bits & 16) !== 0,
      }
      assert.deepEqual(decodeControl(encodeControl(control)), control)
    }
  })

  it('replaying recorded controls reproduces the world state', () => {
    const live = new World(parseLevel(levelData))
    const recorder = new ReplayRecorder()
    let jumpHeld = false
    for (let i = 0; i < 360 && !live.finished; i++) {
      const jump = i >= 35 && i < 70
      const control: Controls = {
        ...noControls(),
        right: true,
        jumpHeld: jump,
        jumpPressed: jump && !jumpHeld,
      }
      jumpHeld = jump
      recorder.push(control)
      const events = live.step(control, STEP)
      if (events.died) live.respawn()
    }

    const ghost = new World(parseLevel(levelData))
    const playback = new ReplayPlayback(recorder.finish())
    while (!playback.finished) {
      const control = playback.next()
      assert.ok(control)
      const events = ghost.step(control, STEP)
      if (events.died) ghost.respawn()
    }

    assert.equal(ghost.finished, live.finished)
    assert.equal(ghost.coinCount, live.coinCount)
    assert.equal(ghost.falls, live.falls)
    assert.ok(Math.abs(ghost.time - live.time) < 1e-9)
    assert.ok(Math.abs(ghost.player.x - live.player.x) < 1e-9)
    assert.ok(Math.abs(ghost.player.y - live.player.y) < 1e-9)
  })

  it('an independently simulated ghost cannot change the live world', () => {
    const level = parseLevel(levelData)
    const live = new World(level)
    const ghost = new World(level)
    for (let i = 0; i < 120; i++) {
      const events = ghost.step({ ...noControls(), right: true }, STEP)
      if (events.died) ghost.respawn()
    }
    assert.equal(live.coinCount, 0)
    assert.equal(live.falls, 0)
    assert.equal(live.player.x, level.spawn.x)
  })
})
