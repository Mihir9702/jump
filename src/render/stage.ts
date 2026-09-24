import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { palette } from './palette.ts'

// A low field of view keeps the side-on view close to flat while the blocks still show
// their sides and tops. The camera looks down a little so platform tops are visible.
export const FOV = 24
export const PITCH = 5

// What the camera has to fit at the gameplay plane (z = 0), in tiles. Portrait screens
// fit a narrower width so the world does not shrink to a strip.
export interface Framing {
  minWidth: number
  minHeight: number
  portraitMinWidth: number
}

export interface StageOptions {
  shadowMapSize: number
  // Lower the resolution when frames take too long
  adaptive: boolean
}

const SUN_DIRECTION = new Vector3(-0.42, 0.82, 0.55).normalize()
const up = new Vector3(0, 1, 0)

export class Stage {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(FOV, 1, 1, 1200)
  readonly sun = new DirectionalLight(palette.sunLight, 2.7)
  readonly fog: Fog
  // Camera distance along its view direction, and the visible half size at z = 0
  distance = 32
  halfWidth = 10
  halfHeight = 6
  aspect = 1

  private framing: Framing = { minWidth: 16, minHeight: 11, portraitMinWidth: 12 }
  private maxPixelRatio = 1
  private minPixelRatio = 1
  private pixelRatio = 1
  private readonly adaptive: boolean
  private slowTime = 0
  private sampleTime = 0
  private sampleFrames = 0
  private readonly lightTarget = new Object3D()
  private readonly lightX: Vector3
  private readonly lightY: Vector3

  constructor(canvas: HTMLCanvasElement, options: StageOptions) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    this.adaptive = options.adaptive
    this.updatePixelRatio()

    this.fog = new Fog(palette.haze, 40, 380)
    this.scene.fog = this.fog
    this.scene.background = new Color(palette.skyLow)
    this.scene.add(this.camera)

    const hemisphere = new HemisphereLight(palette.skyLight, palette.groundLight, 1.35)
    this.scene.add(hemisphere)

    const sun = this.sun
    sun.castShadow = true
    sun.shadow.mapSize.set(options.shadowMapSize, options.shadowMapSize)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 3
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 90
    sun.target = this.lightTarget
    this.scene.add(sun, this.lightTarget)

    // The light's own axes, for snapping its position to whole shadow-map texels
    this.lightX = new Vector3().crossVectors(up, SUN_DIRECTION).normalize()
    this.lightY = new Vector3().crossVectors(SUN_DIRECTION, this.lightX)
  }

  setFraming(framing: Framing) {
    this.framing = framing
    this.updateProjection()
  }

  resize(width: number, height: number) {
    // The pixel ratio changes when the window moves to another screen or the page zooms
    this.updatePixelRatio()
    this.renderer.setSize(width, height, false)
    this.aspect = width / Math.max(1, height)
    this.updateProjection()
  }

  // Render at the screen's pixel density, up to 2x
  private updatePixelRatio() {
    const max = Math.min(window.devicePixelRatio || 1, 2)
    if (max === this.maxPixelRatio && this.pixelRatio <= max) return
    this.maxPixelRatio = max
    this.minPixelRatio = Math.min(1, max)
    this.pixelRatio = max
    this.slowTime = 0
    this.renderer.setPixelRatio(max)
  }

  private updateProjection() {
    const tan = Math.tan(MathUtils.degToRad(FOV / 2))
    const minWidth = this.aspect < 1 ? this.framing.portraitMinWidth : this.framing.minWidth
    const halfHeight = Math.max(this.framing.minHeight / 2, minWidth / 2 / this.aspect)
    this.distance = halfHeight / tan
    this.halfHeight = halfHeight
    this.halfWidth = halfHeight * this.aspect
    this.camera.aspect = this.aspect
    this.camera.far = this.distance + 700
    this.camera.updateProjectionMatrix()
    this.fog.near = this.distance + 8
    this.fog.far = this.distance + 560

    const shadow = this.sun.shadow
    const extent = Math.max(this.halfWidth, this.halfHeight) + 4
    shadow.camera.left = -extent
    shadow.camera.right = extent
    shadow.camera.top = extent
    shadow.camera.bottom = -extent
    shadow.camera.updateProjectionMatrix()
  }

  // Points the camera at (x, y) on the gameplay plane
  lookAt(x: number, y: number) {
    const pitch = MathUtils.degToRad(PITCH)
    this.camera.position.set(x, y + Math.sin(pitch) * this.distance, Math.cos(pitch) * this.distance)
    this.camera.lookAt(x, y, 0)
    this.placeSun(x, y)
  }

  private placeSun(x: number, y: number) {
    const shadow = this.sun.shadow
    const texel = (shadow.camera.right - shadow.camera.left) / shadow.mapSize.x
    const target = new Vector3(x, y, 0)
    const a = Math.round(target.dot(this.lightX) / texel) * texel
    const b = Math.round(target.dot(this.lightY) / texel) * texel
    const c = target.dot(SUN_DIRECTION)
    target
      .copy(this.lightX)
      .multiplyScalar(a)
      .addScaledVector(this.lightY, b)
      .addScaledVector(SUN_DIRECTION, c)
    this.lightTarget.position.copy(target)
    this.sun.position.copy(target).addScaledVector(SUN_DIRECTION, 45)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  // Called once per frame with the time since the last one. When frames stay slow for a
  // couple of seconds, render fewer pixels. It never goes below one pixel per CSS pixel.
  adapt(seconds: number) {
    if (!this.adaptive || this.pixelRatio <= this.minPixelRatio) return
    this.sampleTime += seconds
    this.sampleFrames++
    if (this.sampleTime < 1) return
    const average = this.sampleTime / this.sampleFrames
    this.sampleTime = 0
    this.sampleFrames = 0
    this.slowTime = average > 1 / 48 ? this.slowTime + 1 : 0
    if (this.slowTime >= 2) {
      this.slowTime = 0
      this.pixelRatio = Math.max(this.minPixelRatio, this.pixelRatio - 0.25)
      this.renderer.setPixelRatio(this.pixelRatio)
    }
  }
}
