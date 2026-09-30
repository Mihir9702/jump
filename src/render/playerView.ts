import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { CharacterClass } from '../sim/classes.ts'
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

// The cyan square from 2022, now customizable across all 12 hero classes in 2.5D.
export class PlayerView {
  readonly group = new Group()
  private readonly body: Group
  private readonly eyes: Group
  private readonly accessoryGroup = new Group()
  private readonly skinMaterial: MeshStandardMaterial
  private currentClassId = ''
  private squash = 0
  private stretch = 0
  private blinkAt = 2
  private blinkUntil = 0
  private lookX = 0
  private lookY = 0
  private lean = 0
  private appearedAt = -1
  private readonly geometries = [
    new RoundedBoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE, 3, 0.12),
    new BoxGeometry(0.11, 0.22, 0.04),
    new BoxGeometry(0.045, 0.08, 0.045),
  ]

  constructor() {
    const [cube, eye, catchlight] = this.geometries as [RoundedBoxGeometry, BoxGeometry, BoxGeometry]
    this.skinMaterial = new MeshStandardMaterial({
      color: palette.player,
      emissive: palette.player,
      emissiveIntensity: 0.16,
      roughness: 0.28,
      metalness: 0.05,
    })
    const ink = new MeshBasicMaterial({ color: palette.eye })
    const shine = new MeshBasicMaterial({ color: '#ffffff' })

    this.body = new Group()
    const mesh = new Mesh(cube, this.skinMaterial)
    mesh.position.y = PLAYER_SIZE / 2
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.eyes = new Group()
    this.eyes.position.set(0, PLAYER_SIZE * 0.62, PLAYER_SIZE / 2 + 0.012)
    for (const x of [-0.13, 0.13]) {
      const e = new Mesh(eye, ink)
      e.position.x = x
      const pupil = new Mesh(catchlight, shine)
      pupil.position.set(x + 0.025, 0.05, 0.01)
      this.eyes.add(e, pupil)
    }

    this.accessoryGroup.position.set(0, PLAYER_SIZE / 2, 0)
    this.body.add(mesh, this.eyes, this.accessoryGroup)
    this.group.add(this.body)
  }

  setClass(heroClass: CharacterClass) {
    if (this.currentClassId === heroClass.id) return
    this.currentClassId = heroClass.id

    this.skinMaterial.color.set(heroClass.color)
    this.skinMaterial.emissive.set(heroClass.glowColor)
    this.skinMaterial.emissiveIntensity = 0.2

    // Clear existing accessory meshes
    while (this.accessoryGroup.children.length > 0) {
      const child = this.accessoryGroup.children[0]!
      this.accessoryGroup.remove(child)
    }

    const accentMat = new MeshStandardMaterial({
      color: heroClass.accentColor,
      emissive: heroClass.glowColor,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.3,
    })

    switch (heroClass.accessoryType) {
      case 'rings': {
        // Atlas orbiting gyro ring
        const ring = new Mesh(new TorusGeometry(PLAYER_SIZE * 0.75, 0.04, 8, 24), accentMat)
        ring.rotation.x = Math.PI / 3
        this.accessoryGroup.add(ring)
        break
      }
      case 'visor': {
        // Ren sleek cyan visor across eyes
        const visor = new Mesh(new BoxGeometry(PLAYER_SIZE * 0.85, 0.09, 0.05), accentMat)
        visor.position.set(0, PLAYER_SIZE * 0.12, PLAYER_SIZE / 2 + 0.02)
        this.accessoryGroup.add(visor)
        break
      }
      case 'crown': {
        // Kallum ethereal flame crown
        const crown = new Mesh(new ConeGeometry(0.18, 0.32, 4), accentMat)
        crown.position.set(0, PLAYER_SIZE / 2 + 0.18, 0)
        crown.rotation.y = Math.PI / 4
        this.accessoryGroup.add(crown)
        break
      }
      case 'hat': {
        // Jin driftwood conical straw hat
        const hat = new Mesh(new ConeGeometry(PLAYER_SIZE * 0.8, 0.22, 16), accentMat)
        hat.position.set(0, PLAYER_SIZE / 2 + 0.12, 0)
        this.accessoryGroup.add(hat)
        break
      }
      case 'horns': {
        // Rowan stag horns / antlers
        for (const dir of [-1, 1]) {
          const horn = new Mesh(new CylinderGeometry(0.02, 0.05, 0.35, 6), accentMat)
          horn.position.set(dir * 0.22, PLAYER_SIZE / 2 + 0.18, 0)
          horn.rotation.z = dir * -0.45
          this.accessoryGroup.add(horn)
        }
        break
      }
      case 'daggers': {
        // Vesper floating starlight phase daggers
        for (const dir of [-1, 1]) {
          const blade = new Mesh(new BoxGeometry(0.06, 0.4, 0.06), accentMat)
          blade.position.set(dir * (PLAYER_SIZE / 2 + 0.16), 0, 0)
          blade.rotation.z = dir * 0.3
          this.accessoryGroup.add(blade)
        }
        break
      }
      case 'prism': {
        // Iris floating diamond prism
        const prism = new Mesh(new OctahedronGeometry(0.2, 0), accentMat)
        prism.position.set(0, PLAYER_SIZE / 2 + 0.25, 0)
        this.accessoryGroup.add(prism)
        break
      }
      case 'armor': {
        // Gideon dark-matter shoulder pauldrons
        for (const dir of [-1, 1]) {
          const pauldron = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), accentMat)
          pauldron.position.set(dir * (PLAYER_SIZE / 2 + 0.08), PLAYER_SIZE * 0.2, 0)
          this.accessoryGroup.add(pauldron)
        }
        break
      }
      case 'shield': {
        // Valeria hex hardlight shield
        const shield = new Mesh(new CylinderGeometry(0.28, 0.28, 0.05, 6), accentMat)
        shield.position.set(-PLAYER_SIZE / 2 - 0.12, 0, 0)
        shield.rotation.z = Math.PI / 2
        this.accessoryGroup.add(shield)
        break
      }
      case 'shaman': {
        // Tor volcanic molten crest
        const magmaCrest = new Mesh(new OctahedronGeometry(0.16, 0), accentMat)
        magmaCrest.position.set(0, PLAYER_SIZE / 2 + 0.15, 0)
        this.accessoryGroup.add(magmaCrest)
        break
      }
      case 'drums': {
        // Rai thunder drums
        for (const dir of [-1, 1]) {
          const drum = new Mesh(new CylinderGeometry(0.12, 0.12, 0.08, 12), accentMat)
          drum.position.set(dir * (PLAYER_SIZE / 2 + 0.16), 0.15, -0.05)
          drum.rotation.x = Math.PI / 2
          this.accessoryGroup.add(drum)
        }
        break
      }
      case 'ribbons': {
        // Mei floating silk ribbons
        for (const dir of [-1, 1]) {
          const ribbon = new Mesh(new BoxGeometry(0.04, 0.45, 0.12), accentMat)
          ribbon.position.set(dir * (PLAYER_SIZE / 2 + 0.12), -0.08, -0.1)
          ribbon.rotation.z = dir * 0.25
          this.accessoryGroup.add(ribbon)
        }
        break
      }
    }
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

    if (this.currentClassId === 'atlas') {
      this.accessoryGroup.rotation.y += dt * 3
      this.accessoryGroup.rotation.z = Math.sin(time * 2) * 0.2
    } else if (this.currentClassId === 'iris') {
      this.accessoryGroup.rotation.y += dt * 2
      this.accessoryGroup.rotation.x = Math.sin(time * 3) * 0.2
    } else if (this.currentClassId === 'kallum') {
      this.accessoryGroup.position.y = PLAYER_SIZE / 2 + Math.sin(time * 4) * 0.04
    }

    if (time > this.blinkAt) {
      this.blinkUntil = time + 0.12
      this.blinkAt = time + 2.5 + Math.random() * 3
    }
    this.eyes.scale.y = time < this.blinkUntil ? 0.2 : 1
  }
}
