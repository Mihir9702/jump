import {
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { type Random, createRandom } from '../util/random.ts'
import { palette } from './palette.ts'
import { FOV, PITCH } from './stage.ts'

// The backdrop is laid out for a camera centred at this height, about where the first
// level is played. Parallax moves it naturally from there.
const REFERENCE_Y = 6
const REFERENCE_DISTANCE = 32

// World height that appears at a fraction of the screen height (0 bottom, 1 top) for a
// layer at depth z, seen from the reference camera
function screenY(fraction: number, z: number) {
  const pitch = MathUtils.degToRad(PITCH)
  const cameraY = REFERENCE_Y + Math.sin(pitch) * REFERENCE_DISTANCE
  const cameraZ = Math.cos(pitch) * REFERENCE_DISTANCE
  const angle = -pitch + (fraction - 0.5) * MathUtils.degToRad(FOV)
  return cameraY + Math.tan(angle) * (cameraZ - z)
}

const BOTTOM = -400

// A filled silhouette under a ridge line, as plain triangles with vertex colors
class ShapeBuilder {
  positions: number[] = []
  colors: number[] = []

  triangle(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, color: Color) {
    this.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    for (let i = 0; i < 3; i++) this.colors.push(color.r, color.g, color.b)
  }

  // Fill from a ridge line down to the bottom of the world
  ridge(points: Vector2[], z: number, color: Color) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!
      const b = points[i + 1]!
      this.triangle(a.x, a.y, z, a.x, BOTTOM, z, b.x, BOTTOM, z, color)
      this.triangle(a.x, a.y, z, b.x, BOTTOM, z, b.x, b.y, z, color)
    }
  }

  build(extra: BufferGeometry[] = []) {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3))
    geometry.computeVertexNormals()
    if (extra.length === 0) return geometry
    return mergeGeometries([geometry, ...extra]) ?? geometry
  }
}

// Heights along one period that join up seamlessly with the next period
function periodicRidge(random: Random, period: number, count: number, low: number, high: number) {
  const heights = Array.from({ length: count }, () => random.range(0, 1))
  // Smooth once so neighbouring points agree a little
  const smooth = heights.map((h, i) => {
    const before = heights[(i - 1 + count) % count]!
    const after = heights[(i + 1) % count]!
    return (before + h * 2 + after) / 4
  })
  return (copies: number) => {
    const points: Vector2[] = []
    for (let copy = 0; copy < copies; copy++) {
      for (let i = 0; i < count; i++) {
        const x = copy * period + (i / count) * period
        points.push(new Vector2(x, low + (high - low) * smooth[i]!))
      }
    }
    points.push(new Vector2(copies * period, low + (high - low) * smooth[0]!))
    return points
  }
}

interface Layer {
  group: Group
  period: number
}

function coloredCone(radius: number, height: number, color: Color, x: number, y: number, z: number) {
  const cone = new ConeGeometry(radius, height, 6, 1).toNonIndexed()
  cone.deleteAttribute('uv')
  cone.translate(x, y + height / 2, z)
  const count = cone.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
  cone.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return cone
}

export class Backdrop {
  private readonly sky: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly layers: Layer[] = []
  private readonly clouds = new Group()
  private readonly cloudPeriod = 520
  private cloudOffset = 0

  constructor(parent: Object3D) {
    const random = createRandom(2022)

    this.sky = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(palette.skyTop) },
          uMiddle: { value: new Color(palette.skyMiddle) },
          uLow: { value: new Color(palette.skyLow) },
          uSun: { value: new Color(palette.sun) },
          uGlow: { value: new Color(palette.sunGlow) },
          uSunPosition: { value: new Vector2(0.72, 0.6) },
          uAspect: { value: 1 },
          uShift: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 1.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uMiddle;
          uniform vec3 uLow;
          uniform vec3 uSun;
          uniform vec3 uGlow;
          uniform vec2 uSunPosition;
          uniform float uAspect;
          uniform float uShift;
          varying vec2 vUv;
          void main() {
            // Flat bands of colour, like a low-poly sky
            float y = clamp(vUv.y + uShift, 0.0, 1.0);
            float band = floor(y * 13.0) / 12.0;
            vec3 color = mix(uLow, uMiddle, smoothstep(0.2, 0.62, band));
            color = mix(color, uTop, smoothstep(0.55, 1.0, band));
            vec2 d = (vUv - uSunPosition) * vec2(uAspect, 1.0);
            float r = length(d);
            float glow = floor((1.0 - smoothstep(0.0, 0.3, r)) * 3.0) / 3.0;
            color = mix(color, uGlow, glow * 0.28);
            color = mix(color, uSun, 1.0 - smoothstep(0.062, 0.066, r));
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        depthTest: false,
        depthWrite: false,
      }),
    )
    this.sky.frustumCulled = false
    this.sky.renderOrder = -10
    parent.add(this.sky)

    this.layers.push(
      this.farRange(random),
      this.mountains(random),
      this.forest(random),
      this.nearHills(random),
    )
    for (const layer of this.layers) parent.add(layer.group)
    this.buildClouds(random)
    parent.add(this.clouds)
  }

  private farRange(random: Random): Layer {
    const z = -260
    const period = 320
    const ridge = periodicRidge(random, period, 26, screenY(0.5, z), screenY(0.66, z))
    const shape = new ShapeBuilder()
    shape.ridge(ridge(3), z, new Color(palette.farRange))
    return this.layer(shape.build(), period, false)
  }

  private mountains(random: Random): Layer {
    const z = -140
    const period = 200
    const base = screenY(0.36, z)
    const light = new Color(palette.mountains)
    const shade = new Color(palette.mountainsShade)
    const shape = new ShapeBuilder()
    const peaks = Array.from({ length: 9 }, (_, i) => ({
      x: (i + random.range(0.1, 0.9)) * (period / 9),
      width: random.range(14, 26),
      top: random.range(screenY(0.44, z), screenY(0.56, z)),
    }))
    for (let copy = 0; copy < 3; copy++) {
      for (const peak of peaks) {
        const x = copy * period + peak.x
        const front = x + peak.width * 0.18
        const bulge = peak.width * 0.7
        // Two faces per peak: the sunlit left side and the shaded right side
        shape.triangle(x - peak.width, base, 0 + z, front, base, z + bulge, x, peak.top, z, light)
        shape.triangle(front, base, z + bulge, x + peak.width, base, z, x, peak.top, z, shade)
      }
    }
    const floor = periodicRidge(random, period, 18, base - 2, base + 2)
    shape.ridge(floor(3), z, shade)
    return this.layer(shape.build(), period, true)
  }

  private forest(random: Random): Layer {
    const z = -62
    const period = 128
    const ridge = periodicRidge(random, period, 20, screenY(0.26, z), screenY(0.33, z))
    const color = new Color(palette.forest)
    const shape = new ShapeBuilder()
    const points = ridge(3)
    shape.ridge(points, z, color)
    // A tree line of flat pines along the ridge
    const treeSpots = Array.from({ length: 70 }, () => ({
      t: random.next(),
      size: random.range(0.7, 1.3),
    }))
    for (let copy = 0; copy < 3; copy++) {
      for (const spot of treeSpots) {
        const x = (copy + spot.t) * period
        const i = Math.min(points.length - 2, Math.floor((x / (period * 3)) * (points.length - 1)))
        const a = points[i]!
        const b = points[i + 1]!
        const y = MathUtils.lerp(a.y, b.y, (x - a.x) / (b.x - a.x)) - 0.5
        const w = 1.6 * spot.size
        const h = 5.5 * spot.size
        shape.triangle(x - w, y, z + 0.1, x + w, y, z + 0.1, x, y + h, z + 0.1, color)
        shape.triangle(x - w * 0.8, y + h * 0.35, z + 0.1, x + w * 0.8, y + h * 0.35, z + 0.1, x, y + h * 1.15, z + 0.1, color)
      }
    }
    return this.layer(shape.build(), period, false)
  }

  private nearHills(random: Random): Layer {
    const z = -26
    const period = 96
    const ridge = periodicRidge(random, period, 16, screenY(0.1, z), screenY(0.2, z))
    const shape = new ShapeBuilder()
    const points = ridge(3)
    shape.ridge(points, z, new Color(palette.hills))
    const pines: BufferGeometry[] = []
    const dark = new Color(palette.pine)
    const light = new Color(palette.pineLight)
    const spots = Array.from({ length: 34 }, () => ({
      t: random.next(),
      size: random.range(0.75, 1.35),
      depth: random.range(-3, 3),
      tone: random.chance(0.5),
    }))
    for (let copy = 0; copy < 3; copy++) {
      for (const spot of spots) {
        const x = (copy + spot.t) * period
        const i = Math.min(points.length - 2, Math.floor((x / (period * 3)) * (points.length - 1)))
        const a = points[i]!
        const b = points[i + 1]!
        const y = MathUtils.lerp(a.y, b.y, (x - a.x) / (b.x - a.x)) - 1
        const color = spot.tone ? dark : light
        const s = spot.size
        pines.push(
          coloredCone(1.5 * s, 4.2 * s, color, x, y, z + spot.depth),
          coloredCone(1.1 * s, 3.4 * s, color, x, y + 2.4 * s, z + spot.depth),
        )
      }
    }
    return this.layer(shape.build(pines), period, true)
  }

  private layer(geometry: BufferGeometry, period: number, faceted: boolean): Layer {
    const material = new MeshLambertMaterial({ vertexColors: true, flatShading: faceted })
    const mesh = new Mesh(geometry, material)
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    const group = new Group()
    group.add(mesh)
    return { group, period }
  }

  private buildClouds(random: Random) {
    const material = new MeshBasicMaterial({ color: palette.cloud })
    const z = -210
    for (let i = 0; i < 7; i++) {
      const puffs: BufferGeometry[] = []
      const width = random.range(10, 22)
      const count = random.int(3, 5)
      for (let p = 0; p < count; p++) {
        const r = random.range(3, 6) * (1 - Math.abs(p / (count - 1) - 0.5))
        const puff = new CircleGeometry(Math.max(2.2, r), 9)
        puff.deleteAttribute('uv')
        puff.translate((p / (count - 1) - 0.5) * width, r * 0.5, 0)
        puffs.push(puff)
      }
      const flat = new PlaneGeometry(width + 4, 2.4)
      flat.deleteAttribute('uv')
      flat.translate(0, 0.2, 0)
      puffs.push(flat)
      const geometry = mergeGeometries(puffs)
      if (!geometry) continue
      const cloud = new Mesh(geometry, material)
      cloud.position.set((i / 7) * this.cloudPeriod + random.range(-20, 20), screenY(random.range(0.72, 0.9), z), z + random.range(-20, 20))
      cloud.userData.baseX = cloud.position.x
      this.clouds.add(cloud)
    }
  }

  // Keep the wrapping layers under the camera and drift the clouds
  update(cameraX: number, cameraY: number, aspect: number, seconds: number, motion: boolean) {
    for (const layer of this.layers) {
      layer.group.position.x = (Math.floor(cameraX / layer.period) - 1) * layer.period
    }
    if (motion) this.cloudOffset += seconds * 1.2
    const period = this.cloudPeriod
    for (const cloud of this.clouds.children) {
      const base = (cloud.userData.baseX as number) + this.cloudOffset
      // Place each cloud in the copy of its period nearest the camera
      cloud.position.x = base + Math.round((cameraX - base) / period) * period
    }
    const uniforms = this.sky.material.uniforms
    uniforms.uAspect!.value = aspect
    uniforms.uShift!.value = (cameraY - REFERENCE_Y) * 0.004
  }
}
