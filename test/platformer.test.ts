import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseLevel } from '../src/sim/level.ts'
import { noControls } from '../src/sim/player.ts'
import { CHARACTER_CLASSES } from '../src/sim/classes.ts'
import { STEP } from '../src/sim/tuning.ts'
import { World } from '../src/sim/world.ts'

const training = parseLevel({
  name: 'Training ground',
  map: [
    '                        ',
    '                        ',
    '  P                  F  ',
    '########################',
  ],
})

describe('platformer-only gameplay', () => {
  it('keeps 12 cosmetic heroes but no monster manager or health inventory', () => {
    const world = new World(training)
    assert.equal(CHARACTER_CLASSES.length, 12)
    assert.equal('mobManager' in world, false)
    for (const key of ['hp', 'maxHp', 'mp', 'maxMp', 'attacking', 'redPotions', 'bluePotions']) {
      assert.equal(key in world.player, false, key)
    }
    assert.equal(world.player.characterClass.name, CHARACTER_CLASSES[0]!.name)
  })

  it('has no enemy damage while standing still', () => {
    const world = new World(training)
    for (let i = 0; i < 1200; i++) {
      const event = world.step(noControls(), STEP)
      assert.equal(event.died, false)
      assert.equal(event.goal, false)
    }
    assert.equal(world.falls, 0)
    assert.equal(world.coinCount, 0)
  })

  it('flash jump works without mana, once per takeoff, and resets on landing', () => {
    const world = new World(training)
    const first = world.step({ ...noControls(), jumpPressed: true, jumpHeld: true }, STEP)
    assert.equal(first.jumped, true)
    for (let i = 0; i < 18; i++) {
      world.step({ ...noControls(), jumpHeld: true }, STEP)
    }
    assert.equal(world.player.grounded, false)

    const flash = world.step({ ...noControls(), jumpPressed: true, jumpHeld: true }, STEP)
    assert.equal(flash.flashJumped, true)
    const second = world.step({ ...noControls(), jumpPressed: true, jumpHeld: true }, STEP)
    assert.equal(second.flashJumped, false)

    let landed = false
    for (let i = 0; i < 600; i++) {
      const event = world.step(noControls(), STEP)
      assert.equal(event.died, false)
      if (world.player.grounded) {
        landed = true
        break
      }
    }
    assert.equal(landed, true)

    assert.equal(world.step({ ...noControls(), jumpPressed: true, jumpHeld: true }, STEP).jumped, true)
    for (let i = 0; i < 18; i++) {
      world.step({ ...noControls(), jumpHeld: true }, STEP)
    }
    assert.equal(world.step({ ...noControls(), jumpPressed: true, jumpHeld: true }, STEP).flashJumped, true)
  })
})
