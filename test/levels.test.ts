import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, it } from 'node:test'
import { type Level, type LevelData, type Point, parseLevel, platformAt, solidAt } from '../src/sim/level.ts'
import { reachCoin, solveLevel } from '../tools/solver.ts'

const dir = new URL('../src/levels/', import.meta.url)
const read = (file: string) => JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as LevelData
// Levels are played in file name order: 1-meadow.json, 2-ridge.json, ...
const files = readdirSync(dir)
  .filter(file => /^\d+-.+\.json$/.test(file))
  .sort()

const standsOnGround = (level: Level, point: Point) => {
  const col = Math.floor(point.x)
  const row = Math.round(point.y) - 1
  return solidAt(level, col, row) || platformAt(level, col, row)
}

describe('level files', () => {
  it('there are three levels and a title screen', () => {
    assert.equal(files.length, 3)
    assert.equal(parseLevel(read('title.json')).kind, 'title')
  })

  for (const file of ['title.json', ...files]) {
    it(`${file} is a tidy map`, () => {
      const data = read(file)
      const width = data.map[0]!.length
      data.map.forEach((row, i) => assert.equal(row.length, width, `line ${i + 1} is ${row.length} wide`))
      const level = parseLevel(data)
      assert.ok(standsOnGround(level, level.spawn), 'the player starts on the ground')
      for (const point of level.checkpoints) assert.ok(standsOnGround(level, point), 'checkpoint on ground')
      if (level.flag) assert.ok(standsOnGround(level, level.flag), 'the flag stands on the ground')
    })
  }
})

// These searches use the real physics with presses no shorter than 50 ms, so they also
// show that the levels do not need frame-perfect taps
describe('every level can be finished and every coin reached', () => {
  for (const file of files) {
    it(file, () => {
      const level = parseLevel(read(file))
      const route = solveLevel(level, { tapSteps: 6 })
      assert.ok(route, `no route to the flag in ${file}`)
      const missing = level.coins.filter(coin => !reachCoin(level, route, coin))
      assert.deepEqual(missing, [], 'unreachable coins')
    })
  }
})
