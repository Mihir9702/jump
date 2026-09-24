import { BoxGeometry, Color, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { palette } from './palette.ts'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  spin: number
  life: number
  ttl: number
  size: number
  gravity: number
}

const CAPACITY = 320
const matrix = new Matrix4()
const quaternion = new Quaternion()
const euler = new Euler()
const position = new Vector3()
const scale = new Vector3()
const hidden = new Matrix4().makeScale(0, 0, 0)
const moving = new Color()

// Little voxel bits: dust when landing, sparks from coins, confetti at the flag.
// With reduced motion, fewer of them.
export class Particles {
  readonly mesh: InstancedMesh
  private readonly items: Particle[] = []
  private readonly colors = {
    dust: new Color(palette.stone),
    coin: new Color(palette.coin),
    player: new Color(palette.player),
    confetti: [palette.flag, palette.coin, palette.player, palette.letter].map(hex => new Color(hex)),
  }
  reduced = false

  constructor() {
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ roughness: 0.8 }), CAPACITY)
    this.mesh.frustumCulled = false
    for (let i = 0; i < CAPACITY; i++) {
      this.mesh.setMatrixAt(i, hidden)
      this.mesh.setColorAt(i, this.colors.dust)
    }
  }

  private add(p: Omit<Particle, 'life'>, color: Color) {
    if (this.items.length >= CAPACITY) return
    const index = this.items.length
    this.items.push({ ...p, life: p.ttl })
    this.mesh.setColorAt(index, color)
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  // Puffs to both sides of where the cube landed
  dust(x: number, y: number, strength: number) {
    if (this.reduced) return
    const count = Math.round(2 + strength * 4)
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        this.add(
          {
            x: x + side * 0.3,
            y: y + 0.05,
            z: (Math.random() - 0.5) * 0.9,
            vx: side * (1.2 + Math.random() * 2.2) * (0.5 + strength),
            vy: 0.6 + Math.random() * 1.4,
            vz: (Math.random() - 0.5) * 1.2,
            spin: (Math.random() - 0.5) * 8,
            ttl: 0.3 + Math.random() * 0.2,
            size: 0.07 + Math.random() * 0.06,
            gravity: 5,
          },
          this.colors.dust,
        )
      }
    }
  }

  burst(x: number, y: number, kind: 'coin' | 'player') {
    const count = this.reduced ? 4 : 10
    const color = this.colors[kind]
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
      const speed = 3.2 + Math.random() * 1.8
      this.add(
        {
          x,
          y,
          z: 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: (Math.random() - 0.5) * 2,
          spin: (Math.random() - 0.5) * 10,
          ttl: 0.35 + Math.random() * 0.2,
          size: 0.1,
          gravity: 12,
        },
        color,
      )
    }
  }

  confetti(x: number, y: number) {
    const count = this.reduced ? 12 : 48
    for (let i = 0; i < count; i++) {
      this.add(
        {
          x: x + (Math.random() - 0.5) * 0.6,
          y: y + Math.random() * 0.4,
          z: (Math.random() - 0.5) * 1.2,
          vx: (Math.random() - 0.5) * 7,
          vy: 5 + Math.random() * 6,
          vz: (Math.random() - 0.5) * 3,
          spin: (Math.random() - 0.5) * 14,
          ttl: 1.1 + Math.random() * 0.7,
          size: 0.09 + Math.random() * 0.05,
          gravity: 9,
        },
        this.colors.confetti[i % this.colors.confetti.length]!,
      )
    }
  }

  clear() {
    this.items.length = 0
    for (let i = 0; i < CAPACITY; i++) this.mesh.setMatrixAt(i, hidden)
    this.mesh.instanceMatrix.needsUpdate = true
  }

  update(dt: number) {
    const items = this.items
    let write = 0
    for (let read = 0; read < items.length; read++) {
      const p = items[read]!
      p.life -= dt
      if (p.life <= 0) continue
      p.vy -= p.gravity * dt
      p.vx *= 1 - Math.min(1, dt * 1.5)
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (write !== read) {
        items[write] = p
        this.mesh.getColorAt(read, moving)
        this.mesh.setColorAt(write, moving)
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
      }
      const s = p.size * Math.min(1, (p.life / p.ttl) * 2)
      euler.set(p.spin * p.life, p.spin * p.life * 0.7, 0)
      quaternion.setFromEuler(euler)
      matrix.compose(position.set(p.x, p.y, p.z), quaternion, scale.set(s, s, s))
      this.mesh.setMatrixAt(write, matrix)
      write++
    }
    for (let i = write; i < items.length; i++) this.mesh.setMatrixAt(i, hidden)
    items.length = write
    this.mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as MeshStandardMaterial).dispose()
  }
}
