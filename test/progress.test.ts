import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compatibleGhost,
  createProgress,
  getLevelRecord,
  recordLevel,
  recordWorld,
  sanitizeProgress,
} from '../src/progress/progress.ts'
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

describe('saved progress validation', () => {
  it('preserves valid personal bests, coins and compatible ghosts', () => {
    const data = createProgress()
    recordLevel(data, level, { time: 18, coins: 4, falls: 1 }, {
      ...ghost(18),
      splits: [null, 9.5],
    })
    recordWorld(data, 'test-world', 50)

    // Simulate JSON persistence, including the sparse checkpoint entry.
    const restored = sanitizeProgress(JSON.parse(JSON.stringify(data)) as unknown)
    assert.deepEqual(restored, data)
    assert.deepEqual(compatibleGhost(restored!.levels[level.id]!, level)?.splits, [null, 9.5])
  })

  it('keeps good fields but rejects malformed personal bests and ghost frames', () => {
    const restored = sanitizeProgress({
      version: 1,
      levels: {
        [level.id]: {
          bestTime: 24,
          bestCoins: 5,
          fewestFalls: 0,
          medal: 'silver',
          ghost: { ...ghost(24), replay: '2!' },
        },
        'test-world/broken': {
          bestTime: 'oops',
          bestCoins: -1,
          fewestFalls: -5,
          medal: 'gold',
          ghost: 'invalid',
        },
      },
      worlds: {
        'test-world': { bestTime: 'oops' },
        'another-world': { bestTime: 59 },
      },
    })

    assert.ok(restored)
    assert.deepEqual(restored.levels[level.id], {
      bestTime: 24, bestCoins: 5, fewestFalls: 0, medal: 'silver', ghost: null,
    })
    assert.deepEqual(restored.levels['test-world/broken'], {
      bestTime: null, bestCoins: 0, fewestFalls: null, medal: null, ghost: null,
    })
    assert.equal(restored.worlds['test-world']?.bestTime, null)
    assert.equal(restored.worlds['another-world']?.bestTime, 59)
  })

  it('never loads invalid ghosts even when their metadata matches the level', () => {
    const data = createProgress()
    data.levels[level.id] = {
      bestTime: 12,
      bestCoins: 0,
      fewestFalls: 0,
      medal: 'gold',
      ghost: { ...ghost(12), replay: '!' },
    }
    assert.equal(compatibleGhost(data.levels[level.id]!, level), null)
  })

  it('rejects incompatible outer schemas without trusting arbitrary objects', () => {
    assert.equal(sanitizeProgress({version: 99, levels: {}, worlds: {}}), null)
    assert.equal(sanitizeProgress({version: 1, levels: [], worlds: {}}), null)
    assert.equal(sanitizeProgress(null), null)
  })
})
