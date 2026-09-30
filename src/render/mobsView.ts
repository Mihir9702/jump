import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { MobManager } from '../sim/mobs/mobWorld.ts'
import type { Mob } from '../sim/mobs/types.ts'

export class MobsView {
  readonly group = new Group()
  private readonly mobMeshes = new Map<number, Group>()
  private readonly hpBars = new Map<number, { bg: Mesh; fill: Mesh }>()
  private readonly dropMeshes = new Map<number, Mesh>()

  // Shared geometries
  private readonly slimeGeom = new RoundedBoxGeometry(0.85, 0.75, 0.85, 3, 0.2)
  private readonly shroomCapGeom = new SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)
  private readonly shroomStalkGeom = new CylinderGeometry(0.3, 0.35, 0.45, 10)
  private readonly golemBodyGeom = new RoundedBoxGeometry(2.4, 2.8, 2.2, 3, 0.25)
  private readonly eyeGeom = new BoxGeometry(0.08, 0.16, 0.05)
  private readonly hpBarBgGeom = new PlaneGeometry(0.9, 0.12)
  private readonly hpBarFillGeom = new PlaneGeometry(0.86, 0.08)
  private readonly mesoGeom = new CylinderGeometry(0.2, 0.2, 0.08, 10)
  private readonly potionGeom = new CylinderGeometry(0.12, 0.16, 0.32, 8)

  // Shared materials
  private readonly slimeMat = new MeshStandardMaterial({
    color: '#3cd070',
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  })
  private readonly shroomCapMat = new MeshStandardMaterial({ color: '#f26228', roughness: 0.4 })
  private readonly shroomStalkMat = new MeshStandardMaterial({ color: '#f8eedc', roughness: 0.6 })
  private readonly golemMat = new MeshStandardMaterial({ color: '#68727d', roughness: 0.75 })
  private readonly hitMat = new MeshBasicMaterial({ color: '#ffffff' })
  private readonly eyeMat = new MeshBasicMaterial({ color: '#101820' })
  private readonly hpBgMat = new MeshBasicMaterial({ color: '#1a2024', side: DoubleSide })
  private readonly hpFillMat = new MeshBasicMaterial({ color: '#e84242', side: DoubleSide })
  private readonly mesoMat = new MeshStandardMaterial({
    color: '#ffcc15',
    emissive: '#ffaa00',
    emissiveIntensity: 0.4,
    metalness: 0.7,
    roughness: 0.25,
  })
  private readonly redPotionMat = new MeshStandardMaterial({
    color: '#f03632',
    emissive: '#f03632',
    emissiveIntensity: 0.35,
    roughness: 0.2,
  })
  private readonly bluePotionMat = new MeshStandardMaterial({
    color: '#2b88f5',
    emissive: '#2b88f5',
    emissiveIntensity: 0.35,
    roughness: 0.2,
  })

  update(mobManager: MobManager, time: number, _dt: number) {
    const activeMobIds = new Set<number>()

    // Update or spawn mob meshes
    for (const mob of mobManager.mobs) {
      activeMobIds.add(mob.id)
      let meshGroup = this.mobMeshes.get(mob.id)

      if (!meshGroup) {
        meshGroup = this.createMobMesh(mob)
        this.mobMeshes.set(mob.id, meshGroup)
        this.group.add(meshGroup)

        // Overhead HP bar
        const hpGroup = new Group()
        const bg = new Mesh(this.hpBarBgGeom, this.hpBgMat)
        const fill = new Mesh(this.hpBarFillGeom, this.hpFillMat)
        fill.position.z = 0.01
        hpGroup.add(bg, fill)
        hpGroup.position.y = mob.height + 0.35
        meshGroup.add(hpGroup)
        this.hpBars.set(mob.id, { bg, fill })
      }

      // Position & Bouncy squish
      const bob = Math.sin(time * 6 + mob.id) * 0.05
      meshGroup.position.set(mob.x, mob.y + mob.height / 2 + bob, 0)
      meshGroup.scale.x = mob.facing

      // Hit flash
      const isFlashing = mob.hitFlash > 0
      meshGroup.traverse(child => {
        if (child instanceof Mesh && child !== this.hpBars.get(mob.id)?.bg && child !== this.hpBars.get(mob.id)?.fill) {
          if (isFlashing) {
            child.material = this.hitMat
          } else {
            // Restore default material
            child.material = (child.userData.originalMat as Material) ?? child.material
          }
        }
      })

      // Update HP bar fill
      const hpBar = this.hpBars.get(mob.id)
      if (hpBar) {
        const pct = Math.max(0, Math.min(1, mob.hp / mob.maxHp))
        hpBar.fill.scale.x = pct
        hpBar.fill.position.x = -(1 - pct) * 0.43
        // Only show HP bar if damaged or boss
        hpBar.bg.visible = pct < 1 || mob.isBoss
        hpBar.fill.visible = pct < 1 || mob.isBoss
      }
    }

    // Clean up dead/despawned mob meshes
    for (const [id, meshGroup] of this.mobMeshes.entries()) {
      if (!activeMobIds.has(id)) {
        this.group.remove(meshGroup)
        this.mobMeshes.delete(id)
        this.hpBars.delete(id)
      }
    }

    // Update Drop Items
    const activeDropIds = new Set<number>()
    for (const drop of mobManager.drops) {
      activeDropIds.add(drop.id)
      let mesh = this.dropMeshes.get(drop.id)
      if (!mesh) {
        if (drop.kind === 'meso') {
          mesh = new Mesh(this.mesoGeom, this.mesoMat)
          mesh.rotation.x = Math.PI / 2
        } else {
          mesh = new Mesh(this.potionGeom, drop.kind === 'redPotion' ? this.redPotionMat : this.bluePotionMat)
        }
        this.dropMeshes.set(drop.id, mesh)
        this.group.add(mesh)
      }

      mesh.position.set(drop.x, drop.y + 0.2, 0)
      mesh.rotation.y = time * 4
    }

    for (const [id, mesh] of this.dropMeshes.entries()) {
      if (!activeDropIds.has(id)) {
        this.group.remove(mesh)
        this.dropMeshes.delete(id)
      }
    }
  }

  private createMobMesh(mob: Mob): Group {
    const group = new Group()

    if (mob.kind === 'slime') {
      const body = new Mesh(this.slimeGeom, this.slimeMat)
      body.userData.originalMat = this.slimeMat
      body.castShadow = true

      // Eyes
      for (const x of [-0.18, 0.18]) {
        const eye = new Mesh(this.eyeGeom, this.eyeMat)
        eye.position.set(x, 0.05, 0.44)
        group.add(eye)
      }
      group.add(body)
    } else if (mob.kind === 'mushroom') {
      const stalk = new Mesh(this.shroomStalkGeom, this.shroomStalkMat)
      stalk.userData.originalMat = this.shroomStalkMat
      stalk.position.y = -0.2
      stalk.castShadow = true

      const cap = new Mesh(this.shroomCapGeom, this.shroomCapMat)
      cap.userData.originalMat = this.shroomCapMat
      cap.position.y = 0.05
      cap.castShadow = true

      // Eyes on stalk
      for (const x of [-0.12, 0.12]) {
        const eye = new Mesh(this.eyeGeom, this.eyeMat)
        eye.position.set(x, -0.12, 0.32)
        group.add(eye)
      }
      group.add(stalk, cap)
    } else {
      // Golem / Boss
      const body = new Mesh(this.golemBodyGeom, this.golemMat)
      body.userData.originalMat = this.golemMat
      body.castShadow = true
      group.add(body)
    }

    return group
  }

  clear() {
    this.mobMeshes.forEach(m => this.group.remove(m))
    this.mobMeshes.clear()
    this.hpBars.clear()
    this.dropMeshes.forEach(m => this.group.remove(m))
    this.dropMeshes.clear()
  }
}
