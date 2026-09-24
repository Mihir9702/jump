import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  type Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { type Level, Tile, solidAt, tileAt } from '../sim/level.ts'
import type { World } from '../sim/world.ts'
import { type Random, createRandom, hashString } from '../util/random.ts'
import { palette } from './palette.ts'

// Depth of the blocks along z, in tiles. The player walks along z = 0.
export const SOLID_DEPTH = 3
const ONE_WAY_DEPTH = 2
const LETTER_DEPTH = 1.4

interface Instance {
  position: Vector3
  scale: Vector3
  rotation?: Euler
  color: Color
}

const matrix = new Matrix4()
const quaternion = new Quaternion()
const noRotation = new Euler()
const pointDown = new Euler(Math.PI, 0, 0)
const scratchScale = new Vector3()
const scratchPosition = new Vector3()
const scratchRotation = new Euler()

function instanced(geometry: BufferGeometry, material: Material, items: Instance[], shadows: { cast: boolean; receive: boolean }) {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, items.length))
  mesh.count = items.length
  items.forEach((item, i) => {
    quaternion.setFromEuler(item.rotation ?? noRotation)
    matrix.compose(item.position, quaternion, item.scale)
    mesh.setMatrixAt(i, matrix)
    mesh.setColorAt(i, item.color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.castShadow = shadows.cast
  mesh.receiveShadow = shadows.receive
  mesh.computeBoundingSphere()
  return mesh
}

// A slightly lighter or darker copy of a palette color, for texture without textures
function tint(random: Random, hex: string, amount = 0.04) {
  return new Color(hex).offsetHSL(0, 0, random.range(-amount, amount))
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export class LevelView {
  readonly group = new Group()
  private readonly geometries: BufferGeometry[] = []
  private readonly materials: Material[] = []
  private readonly coins: InstancedMesh | null = null
  private readonly coinPopped: number[]
  private readonly flag: FlagView | null = null
  private readonly checkpoints: CheckpointView[] = []
  private readonly level: Level

  constructor(level: Level) {
    this.level = level
    const random = createRandom(hashString(level.name))
    const box = this.track(new BoxGeometry(1, 1, 1))
    const terrain = this.trackMaterial(new MeshStandardMaterial({ roughness: 0.92 }))
    const decor = this.trackMaterial(new MeshStandardMaterial({ roughness: 0.85, flatShading: true }))

    const dirt: Instance[] = []
    const grass: Instance[] = []
    const small: Instance[] = []
    const cones: Instance[] = []
    const bushes: Instance[] = []
    const letters: Instance[] = []
    const spikes: Instance[] = []

    this.buildSolid(random, dirt, grass)
    this.buildOneWay(random, dirt, grass)
    this.buildLetters(random, letters, grass)
    this.buildSpikes(spikes, small)
    this.buildDecor(random, small, cones, bushes)

    this.group.add(
      instanced(box, terrain, dirt, { cast: true, receive: true }),
      instanced(box, terrain, grass, { cast: true, receive: true }),
      instanced(box, decor, small, { cast: false, receive: true }),
      instanced(this.track(new ConeGeometry(1, 1, 6)), decor, cones, { cast: true, receive: true }),
      instanced(this.track(new IcosahedronGeometry(1, 0)), decor, bushes, { cast: true, receive: true }),
    )
    if (letters.length) {
      const block = this.track(new RoundedBoxGeometry(0.96, 0.96, LETTER_DEPTH, 2, 0.08))
      const material = this.trackMaterial(new MeshStandardMaterial({ roughness: 0.7 }))
      this.group.add(instanced(block, material, letters, { cast: true, receive: true }))
    }
    if (spikes.length) {
      const cone = this.track(new ConeGeometry(0.15, 0.5, 5))
      cone.translate(0, 0.25, 0)
      const material = this.trackMaterial(new MeshStandardMaterial({ roughness: 0.6, flatShading: true }))
      this.group.add(instanced(cone, material, spikes, { cast: true, receive: true }))
    }

    this.coinPopped = level.coins.map(() => -1)
    if (level.coins.length) {
      const coin = this.track(new CylinderGeometry(0.3, 0.3, 0.1, 10))
      coin.rotateX(Math.PI / 2)
      const material = this.trackMaterial(
        new MeshStandardMaterial({
          color: palette.coin,
          emissive: palette.coin,
          emissiveIntensity: 0.28,
          roughness: 0.4,
          metalness: 0.15,
          flatShading: true,
        }),
      )
      this.coins = new InstancedMesh(coin, material, level.coins.length)
      this.coins.castShadow = true
      this.coins.frustumCulled = false
      this.group.add(this.coins)
    }

    if (level.flag) {
      this.flag = new FlagView(level.flag.x, level.flag.y, box, this)
      this.group.add(this.flag.group)
    }
    for (const base of level.checkpoints) {
      const view = new CheckpointView(base.x, base.y, this)
      this.checkpoints.push(view)
      this.group.add(view.group)
    }
  }

  track<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry)
    return geometry
  }

  trackMaterial<T extends Material>(material: T): T {
    this.materials.push(material)
    return material
  }

  private buildSolid(random: Random, dirt: Instance[], grass: Instance[]) {
    const level = this.level
    const half = SOLID_DEPTH / 2
    for (let row = 0; row < level.height; row++) {
      let runStart = -1
      for (let col = 0; col <= level.width; col++) {
        const solid = col < level.width && tileAt(level, col, row) === Tile.Solid
        if (solid) {
          const left = tileAt(level, col - 1, row) === Tile.Solid
          const right = tileAt(level, col + 1, row) === Tile.Solid
          // Blocks show their front face; the ends of a run also show their sides
          const depths = left && right ? [1] : [-1, 0, 1]
          for (const zi of depths) {
            const deep = (col + row + zi) % 2 === 0
            dirt.push({
              position: v(col + 0.5, row + 0.5, zi),
              scale: v(1, 1, 1),
              color: tint(random, deep ? palette.dirtDeep : palette.dirt, 0.025),
            })
          }
        }
        // Grass grows on runs of blocks with open air above
        const exposed = solid && tileAt(level, col, row + 1) !== Tile.Solid
        if (exposed && runStart < 0) runStart = col
        if (!exposed && runStart >= 0) {
          const end = col - 1
          const overhangLeft = tileAt(level, runStart - 1, row) === Tile.Solid ? 0 : 0.07
          const overhangRight = tileAt(level, end + 1, row) === Tile.Solid ? 0 : 0.07
          const x0 = runStart - overhangLeft
          const x1 = end + 1 + overhangRight
          grass.push({
            position: v((x0 + x1) / 2, row + 1 - 0.07, 0),
            scale: v(x1 - x0, 0.26, SOLID_DEPTH + 0.14),
            color: tint(random, palette.grass, 0.02),
          })
          for (let c = runStart; c <= end; c++) this.fringe(random, grass, c, row + 1 - 0.2, half + 0.07)
          runStart = -1
        }
      }
    }
  }

  // Little clumps of grass hanging over the front edge
  private fringe(random: Random, into: Instance[], col: number, y: number, z: number) {
    const count = random.int(1, 3)
    for (let i = 0; i < count; i++) {
      const w = random.range(0.14, 0.3)
      const h = random.range(0.08, 0.24)
      into.push({
        position: v(col + random.range(0.15, 0.85), y - h / 2 + 0.02, z),
        scale: v(w, h, 0.07),
        color: tint(random, random.chance(0.5) ? palette.grass : palette.grassDeep, 0.02),
      })
    }
  }

  private buildOneWay(random: Random, dirt: Instance[], grass: Instance[]) {
    const level = this.level
    for (let row = 0; row < level.height; row++) {
      let runStart = -1
      for (let col = 0; col <= level.width; col++) {
        const oneWay = col < level.width && tileAt(level, col, row) === Tile.OneWay
        if (oneWay) {
          for (const zi of [-0.5, 0.5]) {
            const deep = (col + Math.floor(zi + 1)) % 2 === 0
            dirt.push({
              position: v(col + 0.5, row + 1 - 0.26, zi),
              scale: v(1, 0.24, 1),
              color: tint(random, deep ? palette.dirtDeep : palette.dirt, 0.025),
            })
          }
        }
        if (oneWay && runStart < 0) runStart = col
        if (!oneWay && runStart >= 0) {
          const x0 = runStart - 0.05
          const x1 = col + 0.05
          grass.push({
            position: v((x0 + x1) / 2, row + 1 - 0.05, 0),
            scale: v(x1 - x0, 0.18, ONE_WAY_DEPTH + 0.1),
            color: tint(random, palette.grass, 0.02),
          })
          for (let c = runStart; c < col; c++) this.fringe(random, grass, c, row + 1 - 0.14, ONE_WAY_DEPTH / 2 + 0.06)
          runStart = -1
        }
      }
    }
  }

  // The title letters are built from the 2022 platform tile: checkered earth, grass on top
  private buildLetters(random: Random, letters: Instance[], grass: Instance[]) {
    const level = this.level
    for (let row = 0; row < level.height; row++) {
      let runStart = -1
      for (let col = 0; col <= level.width; col++) {
        const letter = col < level.width && tileAt(level, col, row) === Tile.Letter
        if (letter) {
          const deep = (col + row) % 2 === 0
          letters.push({
            position: v(col + 0.5, row + 0.5, 0),
            scale: v(1, 1, 1),
            color: tint(random, deep ? palette.dirtDeep : palette.dirt, 0.025),
          })
        }
        const exposed = letter && tileAt(level, col, row + 1) !== Tile.Letter
        if (exposed && runStart < 0) runStart = col
        if (!exposed && runStart >= 0) {
          const x0 = runStart + 0.01
          const x1 = col - 0.01
          grass.push({
            position: v((x0 + x1) / 2, row + 1 - 0.07, 0),
            scale: v(x1 - x0, 0.2, LETTER_DEPTH + 0.08),
            color: tint(random, palette.grass, 0.02),
          })
          for (let c = runStart; c < col; c++) this.fringe(random, grass, c, row + 1 - 0.17, LETTER_DEPTH / 2 + 0.05)
          runStart = -1
        }
      }
    }
  }

  private buildSpikes(spikes: Instance[], small: Instance[]) {
    const level = this.level
    const stone = new Color(palette.stone)
    const base = new Color(palette.stone).offsetHSL(0, -0.05, -0.18)
    for (let row = 0; row < level.height; row++) {
      for (let col = 0; col < level.width; col++) {
        const kind = tileAt(level, col, row)
        if (kind !== Tile.SpikeUp && kind !== Tile.SpikeDown) continue
        const up = kind === Tile.SpikeUp
        const y = up ? row : row + 1
        for (const zi of [-0.9, -0.3, 0.3, 0.9]) {
          for (const xi of [0.2, 0.5, 0.8]) {
            spikes.push({
              position: v(col + xi, y, zi),
              scale: v(1, 1, 1),
              // Hanging spikes are the same cone turned upside down
              rotation: up ? undefined : pointDown,
              color: stone,
            })
          }
        }
        small.push({ position: v(col + 0.5, up ? y + 0.03 : y - 0.03, 0), scale: v(1, 0.06, 2.3), color: base })
      }
    }
  }

  private buildDecor(random: Random, small: Instance[], cones: Instance[], bushes: Instance[]) {
    const level = this.level
    const reserved = new Set<number>()
    const reserve = (x: number, y: number) => reserved.add(Math.round(y) * level.width + Math.floor(x))
    reserve(level.spawn.x, level.spawn.y)
    if (level.flag) reserve(level.flag.x, level.flag.y)
    for (const point of level.checkpoints) reserve(point.x, point.y)

    const headroom = (col: number, row: number, height: number) => {
      for (let r = row + 1; r <= row + height; r++) {
        for (let c = col - 1; c <= col + 1; c++) if (tileAt(level, c, r) !== Tile.Empty) return false
      }
      return true
    }

    for (let row = 0; row < level.height; row++) {
      for (let col = 0; col < level.width; col++) {
        if (!solidAt(level, col, row) || tileAt(level, col, row + 1) !== Tile.Empty) continue
        const top = row + 1
        if (reserved.has(top * level.width + col)) continue

        if (random.chance(0.55)) {
          const x = col + random.range(0.2, 0.8)
          const z = random.range(-1.3, 1.3)
          for (let i = random.int(2, 3); i > 0; i--) {
            const h = random.range(0.16, 0.34)
            small.push({
              position: v(x + random.range(-0.08, 0.08), top + h / 2, z + random.range(-0.06, 0.06)),
              scale: v(0.05, h, 0.05),
              rotation: new Euler(0, 0, random.range(-0.3, 0.3)),
              color: tint(random, random.chance(0.6) ? palette.grassDeep : palette.grass),
            })
          }
        }
        if (random.chance(0.08)) {
          const x = col + random.range(0.2, 0.8)
          const z = random.range(-1.2, 1.2)
          small.push({ position: v(x, top + 0.12, z), scale: v(0.035, 0.24, 0.035), color: new Color(palette.grassDeep) })
          small.push({ position: v(x, top + 0.26, z), scale: v(0.11, 0.1, 0.11), color: tint(random, palette.flowerCream) })
        }
        if (random.chance(0.06)) {
          small.push({
            position: v(col + random.range(0.25, 0.75), top + 0.06, random.range(-1.2, 1.2)),
            scale: v(random.range(0.22, 0.38), random.range(0.14, 0.24), random.range(0.2, 0.34)),
            rotation: new Euler(0, random.range(0, Math.PI), 0),
            color: tint(random, palette.stone, 0.06).offsetHSL(0, -0.08, -0.12),
          })
        }
        if (random.chance(0.12)) {
          const r = random.range(0.3, 0.46)
          bushes.push({
            position: v(col + random.range(0.3, 0.7), top + r * 0.55, random.range(-1.3, -0.9)),
            scale: v(r * 1.25, r, r),
            rotation: new Euler(0, random.range(0, Math.PI), 0),
            color: tint(random, palette.bush, 0.05),
          })
        }
        if (random.chance(0.1) && headroom(col, row, 6) && solidAt(level, col - 1, row) && solidAt(level, col + 1, row)) {
          this.tree(random, col + 0.5, top, random.range(-1.25, -0.95), small, cones)
        }
      }
    }
  }

  private tree(random: Random, x: number, y: number, z: number, small: Instance[], cones: Instance[]) {
    const size = random.range(0.85, 1.25)
    small.push({ position: v(x, y + 0.3 * size, z), scale: v(0.18, 0.6 * size, 0.18), color: new Color(palette.bark) })
    const color = tint(random, random.chance(0.5) ? palette.tree : palette.treeDeep, 0.03)
    const tiers = [
      [0.8, 1.3, 0.45],
      [0.62, 1.1, 1.05],
      [0.42, 0.9, 1.6],
    ] as const
    for (const [radius, height, lift] of tiers) {
      cones.push({
        position: v(x, y + (lift + height / 2) * size, z),
        scale: v(radius * size, height * size, radius * size),
        rotation: new Euler(0, random.range(0, Math.PI), 0),
        color,
      })
    }
  }

  // Coins spin and bob, and pop when collected. Flags and checkpoints animate on their own.
  update(time: number, world: World, motion: boolean) {
    const coins = this.coins
    if (coins) {
      const scale = scratchScale
      const position = scratchPosition
      const rotation = scratchRotation
      this.level.coins.forEach((coin, i) => {
        const collected = world.collected[i] ?? false
        if (collected && this.coinPopped[i]! < 0) this.coinPopped[i] = time
        if (!collected) this.coinPopped[i] = -1
        const popped = this.coinPopped[i]!
        const phase = coin.x * 0.7
        const bob = motion ? Math.sin(time * 3 + phase) * 0.08 : 0
        rotation.set(0, motion ? time * 2.4 + phase : 0, 0)
        position.set(coin.x, coin.y + bob, 0)
        let s = 1
        if (popped >= 0) {
          const t = (time - popped) / 0.22
          s = motion ? Math.max(0, 1 + t * 0.6 - t * t * 1.6) : 0
          position.y += motion ? t * 0.5 : 0
          rotation.y += t * 8
        }
        scale.setScalar(s)
        quaternion.setFromEuler(rotation)
        matrix.compose(position, quaternion, scale)
        coins.setMatrixAt(i, matrix)
      })
      coins.instanceMatrix.needsUpdate = true
    }
    this.flag?.update(time, world.finished, motion)
    this.checkpoints.forEach((view, i) => view.update(time, world.checkpoint >= i, motion))
  }

  dispose() {
    this.group.removeFromParent()
    // Instanced meshes own GPU buffers for their per-instance data
    this.group.traverse(object => {
      if (object instanceof InstancedMesh) object.dispose()
    })
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
  }
}

// The goal: a pole with a cloth that runs up to the top when the player reaches it
class FlagView {
  readonly group = new Group()
  private readonly cloth: Mesh<BufferGeometry, MeshStandardMaterial>
  private readonly rest: Float32Array
  private raisedAt = -1

  constructor(x: number, y: number, box: BoxGeometry, owner: LevelView) {
    this.group.position.set(x, y, 0)
    const stone = owner.trackMaterial(new MeshStandardMaterial({ color: palette.stone, roughness: 0.8 }))
    const base = new Mesh(box, stone)
    base.scale.set(0.7, 0.24, 0.7)
    base.position.y = 0.12
    const pole = new Mesh(
      owner.track(new CylinderGeometry(0.06, 0.06, 3.3, 8)),
      owner.trackMaterial(new MeshStandardMaterial({ color: palette.pole, roughness: 0.5 })),
    )
    pole.position.y = 1.65
    const top = new Mesh(
      owner.track(new IcosahedronGeometry(0.15, 0)),
      owner.trackMaterial(new MeshStandardMaterial({ color: palette.coin, roughness: 0.4, flatShading: true })),
    )
    top.position.y = 3.36
    const clothGeometry = owner.track(new PlaneGeometry(1.15, 0.72, 10, 3))
    clothGeometry.translate(0.575 + 0.06, 0, 0)
    this.rest = Float32Array.from(clothGeometry.getAttribute('position').array)
    this.cloth = new Mesh(
      clothGeometry,
      owner.trackMaterial(new MeshStandardMaterial({ color: palette.flag, roughness: 0.75, side: DoubleSide })),
    )
    this.cloth.position.y = 0.75
    for (const mesh of [base, pole, top, this.cloth]) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    this.group.add(base, pole, top, this.cloth)
  }

  update(time: number, reached: boolean, motion: boolean) {
    if (reached && this.raisedAt < 0) this.raisedAt = time
    if (!reached) this.raisedAt = -1
    const t = this.raisedAt < 0 ? 0 : Math.min(1, (time - this.raisedAt) / (motion ? 0.8 : 0.01))
    const eased = 1 - (1 - t) ** 3
    this.cloth.position.y = MathUtils.lerp(0.75, 2.85, eased)

    const position = this.cloth.geometry.getAttribute('position')
    const rest = this.rest
    const amplitude = motion ? 0.07 + 0.06 * eased : 0.02
    for (let i = 0; i < position.count; i++) {
      const x = rest[i * 3]!
      const along = (x - 0.06) / 1.15
      position.setZ(i, Math.sin(x * 5 - time * 6) * amplitude * along)
      position.setY(i, rest[i * 3 + 1]! - along * along * 0.05)
    }
    position.needsUpdate = true
    this.cloth.geometry.computeVertexNormals()
  }
}

// A short post with a pennant that runs up and turns cyan once the player passes it
class CheckpointView {
  readonly group = new Group()
  private readonly pennant: Mesh<BufferGeometry, MeshStandardMaterial>
  private reachedAt = -1
  private readonly idle = new Color(palette.pennant)
  private readonly lit = new Color(palette.player)

  constructor(x: number, y: number, owner: LevelView) {
    this.group.position.set(x, y, -0.2)
    const post = new Mesh(
      owner.track(new CylinderGeometry(0.05, 0.06, 2, 6)),
      owner.trackMaterial(new MeshStandardMaterial({ color: palette.pole, roughness: 0.6 })),
    )
    post.position.y = 1
    const shape = owner.track(new BufferGeometry())
    shape.setAttribute('position', new Float32BufferAttribute([0.05, 0.24, 0, 0.05, -0.24, 0, 0.72, 0, 0], 3))
    shape.computeVertexNormals()
    this.pennant = new Mesh(
      shape,
      owner.trackMaterial(new MeshStandardMaterial({ color: palette.pennant, roughness: 0.7, side: DoubleSide })),
    )
    this.pennant.position.y = 0.55
    post.castShadow = true
    this.pennant.castShadow = true
    this.group.add(post, this.pennant)
  }

  update(time: number, reached: boolean, motion: boolean) {
    if (reached && this.reachedAt < 0) this.reachedAt = time
    if (!reached) this.reachedAt = -1
    const t = this.reachedAt < 0 ? 0 : Math.min(1, (time - this.reachedAt) / (motion ? 0.5 : 0.01))
    const eased = 1 - (1 - t) ** 3
    this.pennant.position.y = MathUtils.lerp(0.55, 1.7, eased)
    this.pennant.material.color.copy(this.idle).lerp(this.lit, eased)
    this.pennant.scale.x = motion ? 1 + Math.sin(time * 5) * 0.06 : 1
  }
}
