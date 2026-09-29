import { progress } from '../progress/storage.ts'
import { findLevel, sunsetValley, type LevelDefinition, type WorldDefinition } from '../worlds/worlds.ts'

export type RunMode = 'world' | 'level'

export class RunSession {
  world: WorldDefinition = sunsetValley
  mode: RunMode = 'world'

  get solo() {
    return this.mode === 'level'
  }

  selectWorld(world: WorldDefinition) {
    this.world = world
  }

  startWorld(world: WorldDefinition = this.world) {
    this.world = world
    this.mode = 'world'
  }

  startLevel(id: string): number | null {
    const found = findLevel(id)
    if (!found) return null
    this.world = found.world
    this.mode = 'level'
    return found.index
  }

  level(index: number): LevelDefinition {
    const level = this.world.levels[index]
    if (!level) throw new Error(`Missing level ${index} in ${this.world.id}`)
    return level
  }

  get count() {
    return this.world.levels.length
  }

  isLast(index: number) {
    return index === this.count - 1
  }

  next(index: number): number | null {
    if (this.solo) return index
    const next = index + 1
    return next < this.count ? next : null
  }

  finishWorld(results: readonly { time: number }[]) {
    const total = results.reduce((sum, result) => sum + result.time, 0)
    const newBest = progress.recordWorld(this.world.id, total)
    return { newBest, best: progress.world(this.world.id).bestTime }
  }
}
