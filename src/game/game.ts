import { Sfx } from '../audio/sfx.ts'
import { Input } from '../input/input.ts'
import { levels, titleLevel } from '../levels/index.ts'
import { Backdrop } from '../render/backdrop.ts'
import { CameraRig } from '../render/cameraRig.ts'
import { LevelView } from '../render/levelView.ts'
import { Particles } from '../render/particles.ts'
import { PlayerView } from '../render/playerView.ts'
import { type Framing, Stage } from '../render/stage.ts'
import { type HintId, type Level, parseLevel } from '../sim/level.ts'
import { type Controls, noControls } from '../sim/player.ts'
import { MAX_FALL, PLAYER_HALF, STEP } from '../sim/tuning.ts'
import { World } from '../sim/world.ts'
import { type LevelResult, Ui } from '../ui/ui.ts'
import { prefs } from '../util/prefs.ts'

type State = 'title' | 'playing' | 'paused' | 'cleared' | 'won' | 'changing'

const LEVEL_FRAMING: Framing = { minWidth: 17, minHeight: 13, portraitMinWidth: 13 }
const TITLE_FRAMING: Framing = { minWidth: 31, minHeight: 15, portraitMinWidth: 28 }
// The title camera stays at one height; a little lower on tall screens so the logo sits
// above the start panel
const titleHeight = (aspect: number) => (aspect < 1 ? 5 : 6)
// How long the flag celebration runs before the results card appears
const CLEAR_DELAY = 1.1

export interface GameOptions {
  debug: boolean
}

// A recorded run for tests: one entry per simulation step
interface Replay {
  steps: { left: boolean; right: boolean; jump: boolean; down: boolean }[]
  index: number
  jump: boolean
  down: boolean
}

export class Game {
  private readonly stage: Stage
  private readonly input = new Input()
  private readonly ui: Ui
  private readonly sfx = new Sfx(prefs.sound)
  private readonly rig = new CameraRig()
  private readonly particles = new Particles()
  private readonly playerView = new PlayerView()
  private readonly backdrop: Backdrop
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private levelView: LevelView | null = null
  private world!: World
  private levelIndex = -1
  private results: LevelResult[] = []
  private state: State = 'title'
  private resumeState: State = 'playing'
  private accumulator = 0
  private clock = 0
  private last = 0
  private finishedAt = -1
  private cardShown = false
  private previousX = 0
  private previousY = 0
  private redraw = true
  private replay: Replay | null = null

  constructor(canvas: HTMLCanvasElement, options: GameOptions) {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    this.stage = new Stage(canvas, { shadowMapSize: coarse ? 1024 : 2048, adaptive: !options.debug })
    this.backdrop = new Backdrop(this.stage.scene)
    this.stage.scene.add(this.particles.mesh, this.playerView.group)
    this.particles.reduced = this.reducedMotion.matches
    this.reducedMotion.addEventListener('change', () => {
      this.particles.reduced = this.reducedMotion.matches
    })

    this.ui = new Ui(
      {
        play: () => this.startRun(),
        pause: () => this.pause(),
        resume: () => this.resume(),
        restart: () => this.change(() => this.loadLevel(this.levelIndex)),
        quit: () => this.change(() => this.loadTitle()),
        next: () => this.nextLevel(),
        again: () => this.startRun(),
        title: () => this.change(() => this.loadTitle()),
        toggleSound: () => this.toggleSound(),
      },
      this.input,
    )
    this.ui.setSound(this.sfx.enabled)
    this.input.onDeviceChange = device => this.ui.setDevice(device)
    // Phones and tablets start with touch controls and touch wording
    if (coarse) this.input.setDevice('touch')

    // Audio may only start after someone interacts with the page. Touch screens count a
    // tap as that interaction when the finger lifts, so listen for both ends.
    const unlock = () => this.sfx.unlock()
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('pointerup', unlock)
    window.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') this.ui.enableTouch()
    })

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause()
        this.sfx.suspend()
        this.input.releaseAll()
      } else {
        this.sfx.resume()
        this.last = performance.now()
        this.redraw = true
      }
    })
    window.addEventListener('blur', () => this.pause())

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      this.stage.resize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)))
      if (this.levelIndex < 0) this.rig.lockHeight(titleHeight(this.stage.aspect))
      this.redraw = true
    }
    new ResizeObserver(resize).observe(canvas)
    resize()

    this.loadTitle()
    if (options.debug) this.exposeDebugHooks()
  }

  start() {
    this.last = performance.now()
    requestAnimationFrame(this.loop)
  }

  private get motion() {
    return !this.reducedMotion.matches
  }

  private readonly loop = (now: number) => {
    requestAnimationFrame(this.loop)
    const dt = Math.min(0.25, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.input.poll()
    this.handleActions()

    // The world stands still while paused and while a scene change fades in
    if (this.state === 'paused' || this.state === 'changing') {
      if (this.redraw) this.draw(1, 0)
      this.redraw = false
      return
    }
    this.clock += dt
    this.accumulator += dt
    let first = true
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP
      this.step(first)
      first = false
    }
    this.afterSteps()
    this.draw(this.accumulator / STEP, dt)
    this.stage.adapt(dt)
  }

  // Menu keys, pause and other one-off presses. Whatever this frame does not use is
  // dropped, except jump and down, which the next simulation step takes.
  private handleActions() {
    const input = this.input
    if (input.take('mute')) this.toggleSound()
    switch (this.state) {
      case 'title':
        if (input.take('start')) this.startRun()
        break
      case 'playing':
        if (input.take('pause')) this.pause()
        else if (input.take('restart')) this.restartInPlace()
        break
      case 'paused':
        if (input.take('pause') || input.take('back')) this.resume()
        else this.navigateMenu()
        break
      case 'cleared':
      case 'won':
        if (this.cardShown) this.navigateMenu()
        break
    }
    input.keepOnly('jump', 'down')
  }

  private navigateMenu() {
    const input = this.input
    if (input.take('navUp') || input.take('navLeft')) this.ui.moveFocus(-1)
    if (input.take('navDown') || input.take('navRight')) this.ui.moveFocus(1)
    if (input.take('confirm')) this.ui.activateFocused()
  }

  private controls(first: boolean): Controls {
    const replay = this.replay
    if (replay && this.state === 'playing') {
      const held = replay.steps[replay.index++]
      if (held) {
        const controls: Controls = {
          left: held.left,
          right: held.right,
          jumpHeld: held.jump,
          jumpPressed: held.jump && !replay.jump,
          downPressed: held.down && !replay.down,
        }
        replay.jump = held.jump
        replay.down = held.down
        return controls
      }
      this.replay = null
    }
    if (this.state !== 'playing' && this.state !== 'title') return noControls()
    const held = this.input.held()
    return {
      left: held.left,
      right: held.right,
      jumpHeld: held.jump,
      jumpPressed: first && this.input.take('jump'),
      downPressed: first && this.input.take('down'),
    }
  }

  private step(first: boolean) {
    const world = this.world
    const player = world.player
    this.previousX = player.x
    this.previousY = player.y
    const events = world.step(this.controls(first), STEP)
    const p = world.player

    if (events.jumped) {
      this.playerView.jump()
      this.sfx.play('jump')
    }
    if (events.landed > 0) {
      const strength = Math.min(1, events.landed / (MAX_FALL * 0.6))
      if (strength >= 0.2) {
        this.playerView.land(strength)
        this.particles.dust(p.x, p.y, strength)
        this.sfx.play('land', strength)
      }
    }
    if (events.dropped) this.sfx.play('drop')
    if (events.bonked) this.sfx.play('bonk')
    for (const index of events.coins) {
      const coin = world.level.coins[index]!
      this.particles.burst(coin.x, coin.y, 'coin')
      this.sfx.play('coin')
    }
    if (events.checkpoint >= 0) this.sfx.play('checkpoint')
    if (events.goal) this.reachGoal()
    if (events.died) this.fall()
    this.rig.step(world.player, this.stage, STEP, !this.motion)
  }

  private afterSteps() {
    const world = this.world
    if (this.state === 'playing' || this.state === 'cleared') {
      this.ui.setCoins(world.coinCount, world.level.coins.length)
      this.ui.setTime(world.time)
    }
    if (this.state === 'playing') this.ui.setHint(this.hintFor(world.level, world.player.x))
    if (this.state === 'cleared' && !this.cardShown && this.clock - this.finishedAt > CLEAR_DELAY) {
      this.cardShown = true
      const last = this.levelIndex === levels.length - 1
      if (last) this.showResults()
      else this.ui.showClear(this.results[this.levelIndex]!, last)
    }
  }

  private hintFor(level: Level, x: number): string | null {
    const hint = level.hints.find(h => x >= h.x - 3 && x <= h.x + 9)
    return hint ? hintText(hint.id, this.input.device) : null
  }

  private draw(alpha: number, dt: number) {
    const p = this.world.player
    const x = this.previousX + (p.x - this.previousX) * alpha
    const y = this.previousY + (p.y - this.previousY) * alpha
    const [cameraX, cameraY] = this.rig.interpolated(alpha)
    this.stage.lookAt(cameraX, cameraY)
    this.backdrop.update(cameraX, cameraY, this.stage.aspect, dt, this.motion)
    this.playerView.update(
      { x, y, vx: p.vx, vy: p.vy, facing: p.facing, grounded: p.grounded },
      this.clock,
      dt,
      this.motion,
    )
    this.levelView?.update(this.clock, this.world, this.motion)
    this.particles.update(dt)
    this.stage.render()
  }

  private setWorld(level: Level) {
    this.levelView?.dispose()
    this.world = new World(level)
    this.levelView = new LevelView(level)
    this.stage.scene.add(this.levelView.group)
    // Compile every material now, behind the fade, rather than the first time each one
    // scrolls into view mid-jump
    this.stage.renderer.compile(this.stage.scene, this.stage.camera)
    this.particles.clear()
    this.previousX = this.world.player.x
    this.previousY = this.world.player.y
    this.playerView.appear(this.clock)
    this.accumulator = 0
    this.finishedAt = -1
    this.cardShown = false
    this.replay = null
    this.input.clear()
    this.redraw = true
  }

  private loadTitle() {
    const level = parseLevel(titleLevel)
    this.levelIndex = -1
    this.setWorld(level)
    this.stage.setFraming(TITLE_FRAMING)
    this.rig.follow(level, this.world.player, this.stage, titleHeight(this.stage.aspect))
    this.state = 'title'
    this.ui.hideBanner()
    this.ui.show('title')
  }

  private loadLevel(index: number) {
    const level = parseLevel(levels[index]!)
    this.levelIndex = index
    this.setWorld(level)
    this.stage.setFraming(LEVEL_FRAMING)
    this.rig.follow(level, this.world.player, this.stage)
    this.state = 'playing'
    this.ui.setLevel(index + 1, levels.length, level.name, level.coins.length)
    this.ui.show('playing')
    this.ui.showBanner(level.name)
  }

  // Runs a scene change behind a quick fade, ignoring input meanwhile
  private change(apply: () => void) {
    if (this.state === 'changing') return
    this.resumeState = this.state
    this.state = 'changing'
    void this.ui.fade(() => {
      this.state = this.resumeState
      apply()
    })
  }

  private startRun() {
    this.results = []
    this.change(() => this.loadLevel(0))
  }

  private nextLevel() {
    const next = this.levelIndex + 1
    if (next >= levels.length) this.showResults()
    else this.change(() => this.loadLevel(next))
  }

  // R restarts the level on the spot, no fade
  private restartInPlace() {
    this.loadLevel(this.levelIndex)
    this.ui.hideBanner()
  }

  private pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.releaseAll()
    this.input.clear()
    this.ui.show('paused')
    this.redraw = true
  }

  private resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.input.clear()
    this.last = performance.now()
    this.ui.show('playing')
  }

  private fall() {
    const p = this.world.player
    this.particles.burst(p.x, Math.max(p.y, -1) + PLAYER_HALF, 'player')
    this.sfx.play('fall')
    this.world.respawn()
    this.previousX = this.world.player.x
    this.previousY = this.world.player.y
    this.rig.snap(this.world.player, this.stage)
    this.playerView.appear(this.clock)
  }

  private reachGoal() {
    const world = this.world
    const flag = world.level.flag
    this.state = 'cleared'
    this.finishedAt = this.clock
    this.cardShown = false
    if (flag) this.particles.confetti(flag.x, flag.y + 3.2)
    this.sfx.play('flag')
    this.ui.setHint(null)
    this.results[this.levelIndex] = {
      name: world.level.name,
      time: world.time,
      coins: world.coinCount,
      total: world.level.coins.length,
      falls: world.falls,
    }
  }

  private showResults() {
    this.state = 'won'
    this.cardShown = true
    const results = this.results.filter(Boolean)
    const total = results.reduce((sum, r) => sum + r.time, 0)
    const best = prefs.best
    const complete = results.length === levels.length
    const newBest = complete && (best === null || total < best)
    if (newBest) prefs.best = total
    this.ui.showWin(results, newBest ? total : best, newBest)
  }

  private toggleSound() {
    const on = !this.sfx.enabled
    this.sfx.enabled = on
    prefs.sound = on
    this.ui.setSound(on)
    if (on) {
      this.sfx.unlock()
      this.sfx.play('click')
    }
  }

  // Test hooks, only with ?debug in the address
  private exposeDebugHooks() {
    const game = this
    Object.assign(window, {
      __jump: {
        get state() {
          const p = game.world.player
          return {
            state: game.state,
            level: game.levelIndex,
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            grounded: p.grounded,
            coins: game.world.coinCount,
            falls: game.world.falls,
            time: game.world.time,
            checkpoint: game.world.checkpoint,
            screen: game.ui.current,
          }
        },
        // Starts a level right away and optionally plays a recorded route through it
        play(index: number, route?: string) {
          game.results = []
          game.loadLevel(index)
          if (route) this.replay(route)
        },
        // Plays a recorded route through the current level from its start. A route is a
        // string of hex digits, one per step: 1 left, 2 right, 4 jump, 8 down.
        replay(route: string) {
          const steps = [...route].map(c => {
            const bits = parseInt(c, 16)
            return { left: (bits & 1) > 0, right: (bits & 2) > 0, jump: (bits & 4) > 0, down: (bits & 8) > 0 }
          })
          game.replay = { steps, index: 0, jump: false, down: false }
        },
        teleport(x: number, y: number) {
          const p = game.world.player
          p.x = x
          p.y = y
          p.vx = 0
          p.vy = 0
          game.previousX = x
          game.previousY = y
          game.rig.snap(p, game.stage)
        },
      },
    })
  }
}

const hintText = (id: HintId, device: string) => {
  switch (id) {
    case 'through':
      return 'Thin platforms let you jump up through them'
    case 'hold':
      return 'Tap jump for a short hop, hold it to go higher'
    case 'drop':
      if (device === 'touch') return 'Tap the down button to drop through'
      if (device === 'gamepad') return 'Press down to drop through'
      return 'Press S or ↓ to drop through'
  }
}
