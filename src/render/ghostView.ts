import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { PLAYER_SIZE, RUN_SPEED } from '../sim/tuning.ts'
import { palette } from './palette.ts'
import type { PlayerPose } from './playerView.ts'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export class GhostView {
  readonly group = new Group()
  private readonly body = new Group()
  private readonly eyes = new Group()

  constructor() {
    const cube = new RoundedBoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE, 3, 0.1)
    const eye = new BoxGeometry(0.1, 0.2, 0.04)
    const skin = new MeshStandardMaterial({
      color: palette.player,
      emissive: palette.player,
      emissiveIntensity: 0.08,
      roughness: 0.55,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
    const ink = new MeshBasicMaterial({
      color: palette.cloud,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    const mesh = new Mesh(cube, skin)
    mesh.position.y = PLAYER_SIZE / 2
    mesh.castShadow = false
    mesh.receiveShadow = false

    this.eyes.position.set(0, PLAYER_SIZE * 0.62, PLAYER_SIZE / 2 + 0.012)
    for (const x of [-0.13, 0.13]) {
      const e = new Mesh(eye, ink)
      e.position.x = x
      this.eyes.add(e)
    }
    this.body.add(mesh, this.eyes)
    this.group.add(this.body)
    this.group.visible = false
    this.group.renderOrder = 2
  }

  update(pose: PlayerPose) {
    this.group.position.set(pose.x, pose.y, 0.08)
    const speed = clamp(pose.vx / RUN_SPEED, -1, 1)
    this.body.rotation.z = -speed * (pose.grounded ? 0.045 : 0.02)
    this.eyes.position.x = pose.facing * 0.05 + speed * 0.015
    this.eyes.position.y = PLAYER_SIZE * 0.62 + clamp(pose.vy * 0.003, -0.045, 0.03)
  }
}
