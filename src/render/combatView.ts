import {
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import type { MobManager } from '../sim/mobs/mobWorld.ts'
import type { Player } from '../sim/player.ts'
import type { Stage } from './stage.ts'

export class CombatView {
  readonly group = new Group()
  private readonly slashMesh: Mesh
  private readonly slashMat: MeshBasicMaterial
  private levelUpTimer = 0
  private readonly levelUpGroup = new Group()
  private readonly overlayDiv: HTMLDivElement

  constructor(appContainer: HTMLElement) {
    // 1. Slash Arc
    const shape = new Shape()
    shape.absarc(0, 0, 1.2, -Math.PI * 0.35, Math.PI * 0.35, false)
    shape.absarc(0, 0, 0.7, Math.PI * 0.35, -Math.PI * 0.35, true)
    const slashGeom = new ShapeGeometry(shape)
    this.slashMat = new MeshBasicMaterial({
      color: '#4bf4f4',
      side: DoubleSide,
      transparent: true,
      opacity: 0,
    })
    this.slashMesh = new Mesh(slashGeom, this.slashMat)
    this.slashMesh.visible = false
    this.group.add(this.slashMesh)

    // 2. Level Up Golden Radiance
    const ringGeom = new RingGeometry(0.3, 1.8, 16)
    const ringMat = new MeshBasicMaterial({
      color: '#ffea60',
      side: DoubleSide,
      transparent: true,
      opacity: 0,
    })
    const ring = new Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 2
    this.levelUpGroup.add(ring)
    this.levelUpGroup.visible = false
    this.group.add(this.levelUpGroup)

    // 3. Floating Damage Numbers HTML Container
    let container = document.getElementById('damage-numbers-container') as HTMLDivElement | null
    if (!container) {
      container = document.createElement('div')
      container.id = 'damage-numbers-container'
      container.style.cssText =
        'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:15;'
      appContainer.appendChild(container)
    }
    this.overlayDiv = container
  }

  triggerLevelUp(x: number, y: number) {
    this.levelUpTimer = 1.4
    this.levelUpGroup.position.set(x, y + 1.2, 0)
    this.levelUpGroup.visible = true
  }

  update(mobManager: MobManager, player: Player, stage: Stage, dt: number) {
    // 1. Update Slash Arc
    if (player.attacking) {
      this.slashMesh.visible = true
      this.slashMesh.position.set(
        player.x + player.facing * 0.75,
        player.y + 0.5,
        0.1,
      )
      this.slashMesh.scale.set(player.facing, 1, 1)
      this.slashMat.opacity = Math.min(1, player.attackTimer * 6)
    } else {
      this.slashMesh.visible = false
    }

    // 2. Update Level Up Wings/Halo
    if (this.levelUpTimer > 0) {
      this.levelUpTimer -= dt
      const t = 1.4 - this.levelUpTimer
      this.levelUpGroup.position.y += dt * 1.5
      this.levelUpGroup.scale.setScalar(1 + t * 0.8)
      const ring = this.levelUpGroup.children[0] as Mesh<BufferGeometry, MeshBasicMaterial>
      if (ring) {
        ring.material.opacity = Math.max(0, this.levelUpTimer / 1.4)
        ring.rotation.z += dt * 4
      }
      if (this.levelUpTimer <= 0) {
        this.levelUpGroup.visible = false
      }
    }

    // 3. Render Floating Damage Numbers via Screen Projection
    this.renderDamageNumbers(mobManager.damageNumbers, stage)
  }

  private renderDamageNumbers(numbers: MobManager['damageNumbers'], stage: Stage) {
    const container = this.overlayDiv
    container.replaceChildren()

    const tempV = new Vector3()
    const width = window.innerWidth
    const height = window.innerHeight

    for (const dn of numbers) {
      tempV.set(dn.x, dn.y, 0)
      tempV.project(stage.camera)

      // Convert normalized device coords (-1 to +1) to pixels
      const screenX = (tempV.x * 0.5 + 0.5) * width
      const screenY = (-tempV.y * 0.5 + 0.5) * height

      if (tempV.z < 1) {
        const el = document.createElement('div')
        el.className = dn.isPlayer ? 'dmg-num dmg-player' : dn.isCrit ? 'dmg-num dmg-crit' : 'dmg-num dmg-normal'
        el.style.left = `${Math.round(screenX)}px`
        el.style.top = `${Math.round(screenY)}px`

        const opacity = Math.max(0, 1 - Math.pow(dn.age / dn.maxAge, 2))
        el.style.opacity = opacity.toFixed(2)

        if (dn.isCrit) {
          el.innerHTML = `<span class="crit-badge">CRITICAL!</span><span class="crit-val">${dn.value}</span>`
        } else {
          el.textContent = String(dn.value)
        }

        container.appendChild(el)
      }
    }
  }

  clear() {
    this.overlayDiv.replaceChildren()
    this.slashMesh.visible = false
    this.levelUpGroup.visible = false
    this.levelUpTimer = 0
  }
}
