import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { PLAYER_SIZE, RUN_SPEED } from '../sim/tuning.ts'
import { palette } from './palette.ts'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt))

export interface PlayerPose {
  x: number
  y: number
  vx: number
  vy: number
  facing: number
  grounded: boolean
}

// The cyan square from 2022, now a cube. Its eyes follow where it is going.
export class PlayerView {
  readonly group = new Group()
  private readonly body: Group
  private readonly eyes: Group
  private squash = 0
  private stretch = 0
  private blinkAt = 2
  private blinkUntil = 0
  private lookX = 0
  private lookY = 0
  private lean = 0
  private appearedAt = -1
  private readonly geometries = [
    new RoundedBoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE, 3, 0.1),
    new BoxGeometry(0.1, 0.2, 0.04),
  ]
  private readonly materials = [
    // A little glow of its own keeps the cube the bright cyan of 2022 in shade too
    new MeshStandardMaterial({ color: palette.player, emissive: palette.player, emissiveIntensity: 0.22, roughness: 0.45 }),
    new MeshBasicMaterial({ color: palette.eye }),
  ]

  constructor() {
    const [cube, eye] = this.geometries as [RoundedBoxGeometry, BoxGeometry]
    const [skin, ink] = this.materials as [MeshStandardMaterial, MeshBasicMaterial]
    this.body = new Group()
    const mesh = new Mesh(cube, skin)
    mesh.position.y = PLAYER_SIZE / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.eyes = new Group()
    this.eyes.position.set(0, PLAYER_SIZE * 0.62, PLAYER_SIZE / 2 + 0.012)
    for (const x of [-0.13, 0.13]) {
      const e = new Mesh(eye, ink)
      e.position.x = x
      this.eyes.add(e)
    }
    this.body.add(mesh, this.eyes)
    this.group.add(this.body)
  }

  // Strength from 0 to 1, from how hard the cube hit the ground
  land(strength: number) {
    this.squash = Math.max(this.squash, strength)
  }

  jump() {
    this.stretch = 1
  }

  appear(time: number) {
    this.appearedAt = time
    this.squash = 0
    this.stretch = 0
  }

  update(pose: PlayerPose, time: number, dt: number, motion: boolean) {
    this.group.position.set(pose.x, pose.y, 0)

    if (motion) {
      this.squash = Math.max(0, this.squash - dt * 7)
      this.stretch = Math.max(0, this.stretch - dt * 5)
    } else {
      this.squash = 0
      this.stretch = 0
    }
    let sx = 1 + 0.28 * this.squash - 0.16 * this.stretch
    let sy = 1 - 0.24 * this.squash + 0.2 * this.stretch
    if (this.appearedAt >= 0 && motion) {
      const t = clamp((time - this.appearedAt) / 0.22, 0, 1)
      const pop = t < 1 ? 0.6 + 0.4 * Math.sin(t * Math.PI * 0.5) + Math.sin(t * Math.PI) * 0.12 : 1
      sx *= pop
      sy *= pop
    }
    this.body.scale.set(sx, sy, sx)

    // Lean into the run a little
    const leanTarget = motion ? clamp(-pose.vx / RUN_SPEED, -1, 1) * (pose.grounded ? 0.07 : 0.035) : 0
    this.lean = approach(this.lean, leanTarget, 12, dt)
    this.body.rotation.z = this.lean

    // Eyes look where the cube is heading, and up or down with the jump
    const lookX = pose.facing * 0.055 + clamp(pose.vx / RUN_SPEED, -1, 1) * 0.02
    const lookY = clamp(pose.vy * 0.004, -0.06, 0.04)
    this.lookX = approach(this.lookX, lookX, 16, dt)
    this.lookY = approach(this.lookY, lookY, 16, dt)
    this.eyes.position.x = this.lookX
    this.eyes.position.y = PLAYER_SIZE * 0.62 + this.lookY

    if (time > this.blinkAt) {
      this.blinkUntil = time + 0.12
      this.blinkAt = time + 2.5 + Math.random() * 3
    }
    this.eyes.scale.y = time < this.blinkUntil ? 0.2 : 1
  }
}
