import { progress } from '../progress/storage.ts'
import { GhostView } from '../render/ghostView.ts'
import { ReplayPlayback, ReplayRecorder, type SavedGhost } from './replay.ts'
import type { Controls } from '../sim/player.ts'
import { STEP } from '../sim/tuning.ts'
import { World } from '../sim/world.ts'
import type { Level } from '../sim/level.ts'
import type { LevelDefinition } from '../worlds/worlds.ts'
import type { LevelResultInput, RecordOutcome } from '../progress/progress.ts'
import { prefs } from '../util/prefs.ts'

export class GhostRace {
  readonly view = new GhostView()
  private definition: LevelDefinition | null = null
  private level: Level | null = null
  private recorder = new ReplayRecorder()
  private splits: number[] = []
  private ghostData: SavedGhost | null = null
  private ghostWorld: World | null = null
  private playback: ReplayPlayback | null = null
  private previousX = 0
  private previousY = 0
  private lastOutcome: RecordOutcome | null = null

  get enabled() {
    return prefs.ghost
  }

  get outcome() {
    return this.lastOutcome
  }

  get frameCount() {
    return this.recorder.length
  }

  begin(definition: LevelDefinition, level: Level) {
    this.definition = definition
    this.level = level
    this.recorder = new ReplayRecorder()
    this.splits = []
    this.lastOutcome = null
    this.disableGhost()
    if (this.enabled) this.setupGhost(0)
  }

  stop() {
    this.definition = null
    this.level = null
    this.recorder = new ReplayRecorder()
    this.splits = []
    this.lastOutcome = null
    this.disableGhost()
  }

  record(control: Controls) {
    this.recorder.push(control)
  }

  step() {
    const ghost = this.ghostWorld
    const playback = this.playback
    if (!ghost || !playback || !this.view.group.visible) return

    const control = playback.next()
    if (!control) {
      this.playback = null
      return
    }

    this.previousX = ghost.player.x
    this.previousY = ghost.player.y
    const events = ghost.step(control, STEP)
    if (events.died) {
      ghost.respawn()
      this.previousX = ghost.player.x
      this.previousY = ghost.player.y
    }
    if (events.goal) this.playback = null
  }

  checkpoint(index: number, liveTime: number): number | null {
    this.splits[index] = liveTime
    const saved = this.ghostData?.splits[index]
    return saved === undefined || !Number.isFinite(saved) ? null : liveTime - saved
  }

  finish(result: LevelResultInput): RecordOutcome {
    const definition = this.definition
    if (!definition) throw new Error('Cannot finish a ghost race without a level definition')

    const ghost: SavedGhost = {
      version: 1,
      levelId: definition.id,
      levelRevision: definition.revision,
      stepRate: 120,
      time: result.time,
      replay: this.recorder.finish(),
      splits: [...this.splits],
    }
    this.lastOutcome = progress.recordLevel(definition, result, ghost)
    return this.lastOutcome
  }

  draw(alpha: number) {
    const ghost = this.ghostWorld
    if (!ghost || !this.view.group.visible) return
    const player = ghost.player
    this.view.update({
      x: this.previousX + (player.x - this.previousX) * alpha,
      y: this.previousY + (player.y - this.previousY) * alpha,
      vx: player.vx,
      vy: player.vy,
      facing: player.facing,
      grounded: player.grounded,
    })
  }

  toggle(): boolean {
    prefs.ghost = !prefs.ghost
    if (!prefs.ghost) {
      this.disableGhost()
      return false
    }
    if (this.definition && this.level) this.setupGhost(this.recorder.length)
    return true
  }

  debugState() {
    const player = this.ghostWorld?.player
    return player
      ? { x: player.x, y: player.y, vx: player.vx, vy: player.vy, finished: this.playback === null }
      : null
  }

  private setupGhost(skipFrames: number) {
    const definition = this.definition
    const level = this.level
    if (!definition || !level) return

    const data = progress.ghost(definition)
    if (!data) return

    const ghost = new World(level)
    const playback = new ReplayPlayback(data.replay)
    let active = true
    for (let i = 0; i < skipFrames && active; i++) {
      const control = playback.next()
      if (!control) break
      const events = ghost.step(control, STEP)
      if (events.died) ghost.respawn()
      if (events.goal) active = false
    }

    this.ghostData = data
    this.ghostWorld = ghost
    this.playback = active && !playback.finished ? playback : null
    this.previousX = ghost.player.x
    this.previousY = ghost.player.y
    this.view.group.visible = true
    this.view.update({
      x: ghost.player.x,
      y: ghost.player.y,
      vx: ghost.player.vx,
      vy: ghost.player.vy,
      facing: ghost.player.facing,
      grounded: ghost.player.grounded,
    })
  }

  private disableGhost() {
    this.view.group.visible = false
    this.ghostData = null
    this.ghostWorld = null
    this.playback = null
  }
}
