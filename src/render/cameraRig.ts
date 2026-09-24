import type { Level } from '../sim/level.ts'
import type { Player } from '../sim/player.ts'

// How far ahead of the cube the camera looks, and how quickly it swings over (per second)
const LOOK_AHEAD = 2.4
const LOOK_RATE = 2.2
const FOLLOW_X = 6
const FOLLOW_Y = 4
// The camera centres this far above the ground the cube last stood on
const LIFT = 1.7
// While airborne the camera only moves up once the cube rises this far above that ground
const AIR_WINDOW = 3.2

const clamp = (value: number, min: number, max: number) =>
  min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value))

export interface View {
  halfWidth: number
  halfHeight: number
}

// A smoothed follow camera stepped with the simulation, so it can be interpolated too
export class CameraRig {
  x = 0
  y = 0
  previousX = 0
  previousY = 0
  private lookAhead = 0
  private anchor = 0
  private level: Level | null = null
  private lockedY: number | null = null

  // Follows the player around a level. With lockedY the camera keeps that height and
  // only pans sideways, which is how the title screen works.
  follow(level: Level, player: Player, view: View, lockedY: number | null = null) {
    this.level = level
    this.lockedY = lockedY
    this.snap(player, view)
  }

  lockHeight(y: number | null) {
    this.lockedY = y
  }

  // Jump straight to the player, for level starts and restarts
  snap(player: Player, view: View) {
    this.anchor = player.y
    this.lookAhead = player.facing * LOOK_AHEAD * 0.5
    const [x, y] = this.target(player, view)
    this.x = this.previousX = x
    this.y = this.previousY = y
  }

  step(player: Player, view: View, dt: number, reducedMotion: boolean) {
    this.previousX = this.x
    this.previousY = this.y

    const reach = LOOK_AHEAD * (reducedMotion ? 0.3 : 1)
    if (Math.abs(player.vx) > 0.5) {
      const goal = Math.sign(player.vx) * reach
      this.lookAhead += (goal - this.lookAhead) * (1 - Math.exp(-LOOK_RATE * dt))
    }
    // Platform snapping: follow the height of the ground, not every jump
    const airWindow = reducedMotion ? AIR_WINDOW + 1 : AIR_WINDOW
    if (player.grounded) this.anchor = player.y
    else this.anchor = Math.min(player.y, Math.max(this.anchor, player.y - airWindow))

    const [x, y] = this.target(player, view)
    this.x += (x - this.x) * (1 - Math.exp(-FOLLOW_X * dt))
    this.y += (y - this.y) * (1 - Math.exp(-FOLLOW_Y * dt))
  }

  private target(player: Player, view: View): [number, number] {
    const level = this.level
    let x = player.x + this.lookAhead
    let y = this.lockedY ?? this.anchor + LIFT
    if (level) {
      x = clamp(x, view.halfWidth - 1, level.width + 1 - view.halfWidth)
      if (this.lockedY === null) y = clamp(y, view.halfHeight - 2.5, level.height + 1.5 - view.halfHeight)
    }
    return [x, y]
  }

  interpolated(alpha: number): [number, number] {
    return [
      this.previousX + (this.x - this.previousX) * alpha,
      this.previousY + (this.y - this.previousY) * alpha,
    ]
  }
}
