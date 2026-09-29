import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createProgress, getLevelRecord, recordLevel, recordWorld } from '../src/progress/progress.ts'
import type { SavedGhost } from '../src/replay/replay.ts'
import type { LevelDefinition } from '../src/worlds/types.ts'

const level: LevelDefinition = {
  id: 'test-world/test-level',
  name: 'Test Level',
  data: { name: 'Test Level', map: [' P F ', '#####'] },
  revision: 'abc123',
  medals: { gold: 20, silver: 30, bronze: 45 },
}

const ghost = (time: number): SavedGhost => ({
  version: 1,
  levelId: level.id,
  levelRevision: level.revision,
  stepRate: 120,
  time,
  replay: '2222',
  splits: [],
})

describe('progress', () => {
  it('only replaces a PB ghost with a faster run', () => {
    const data = createProgress()
    const first = recordLevel(data, level, { time: 30, coins: 10, falls: 2 }, ghost(30))
    assert.equal(first.newBest, true)

    const slower = recordLevel(data, level, { time: 31, coins: 25, falls: 0 }, ghost(31))
    assert.equal(slower.newBest, false)
    assert.equal(slower.record.bestTime, 30)
    assert.equal(slower.record.ghost?.time, 30)
    assert.equal(slower.record.bestCoins, 25)
    assert.equal(slower.record.fewestFalls, 0)

    const faster = recordLevel(data, level, { time: 24, coins: 20, falls: 1 }, ghost(24))
    assert.equal(faster.newBest, true)
    assert.equal(faster.previousBest, 30)
    assert.equal(faster.record.ghost?.time, 24)
    assert.equal(faster.record.medal, 'silver')
  })

  it('keeps the fastest world time', () => {
    const data = createProgress()
    assert.equal(recordWorld(data, 'test-world', 90), true)
    assert.equal(recordWorld(data, 'test-world', 95), false)
    assert.equal(recordWorld(data, 'test-world', 80), true)
    assert.equal(data.worlds['test-world']?.bestTime, 80)
  })

  it('starts a level without a record', () => {
    const data = createProgress()
    assert.deepEqual(getLevelRecord(data, level.id), {
      bestTime: null,
      bestCoins: 0,
      fewestFalls: null,
      medal: null,
      ghost: null,
    })
  })
})
