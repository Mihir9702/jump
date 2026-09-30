import { type Level, platformAt, solidAt } from '../level.ts'
import type { Player } from '../player.ts'
import { GRAVITY, PLAYER_HALF, PLAYER_SIZE, RUN_SPEED } from '../tuning.ts'
import type { DamageNumber, DropItem, Mob, MobKind } from './types.ts'

export interface MobSpawn {
  kind: MobKind
  x: number
  y: number
  range?: number
  name?: string
  hp?: number
  isBoss?: boolean
}

let nextId = 1

export function createMob(spawn: MobSpawn): Mob {
  const isBoss = spawn.isBoss ?? false
  let width = 0.9
  let height = 0.8
  let maxHp = 45
  let touchDamage = 12
  let exp = 18
  let name = 'Green Slime'

  switch (spawn.kind) {
    case 'slime':
      width = 0.85
      height = 0.75
      maxHp = spawn.hp ?? 40
      touchDamage = 10
      exp = 15
      name = spawn.name ?? 'Green Slime'
      break
    case 'mushroom':
      width = 0.9
      height = 0.95
      maxHp = spawn.hp ?? 65
      touchDamage = 14
      exp = 25
      name = spawn.name ?? 'Orange Mushroom'
      break
    case 'wisp':
      width = 0.75
      height = 0.75
      maxHp = spawn.hp ?? 50
      touchDamage = 16
      exp = 30
      name = spawn.name ?? 'Cave Bat'
      break
    case 'golem':
      width = 2.4
      height = 2.8
      maxHp = spawn.hp ?? 600
      touchDamage = 25
      exp = 250
      name = spawn.name ?? 'Stone Golem King'
      break
    case 'balrog':
      width = 2.8
      height = 3.2
      maxHp = spawn.hp ?? 1200
      touchDamage = 35
      exp = 600
      name = spawn.name ?? 'Crimson Monarch'
      break
  }

  const range = spawn.range ?? (isBoss ? 8 : 4)

  return {
    id: nextId++,
    kind: spawn.kind,
    name,
    x: spawn.x,
    y: spawn.y,
    vx: (Math.random() > 0.5 ? 1 : -1) * (spawn.kind === 'slime' ? 1.4 : spawn.kind === 'mushroom' ? 1.8 : 2.2),
    vy: 0,
    width,
    height,
    facing: 1,
    hp: maxHp,
    maxHp,
    level: isBoss ? 15 : 3,
    exp,
    touchDamage,
    patrolMinX: Math.max(1, spawn.x - range),
    patrolMaxX: spawn.x + range,
    grounded: true,
    hitFlash: 0,
    dead: false,
    deathTimer: 0,
    isBoss,
    bossPhase: isBoss ? 1 : undefined,
    bossAttackTimer: isBoss ? 2 : undefined,
  }
}

export class MobManager {
  mobs: Mob[] = []
  drops: DropItem[] = []
  damageNumbers: DamageNumber[] = []
  activeBoss: Mob | null = null

  reset() {
    this.mobs = []
    this.drops = []
    this.damageNumbers = []
    this.activeBoss = null
  }

  initForLevel(level: Level, customSpawns?: MobSpawn[]) {
    this.reset()
    const spawns = customSpawns ?? this.generateDefaultSpawns(level)
    for (const s of spawns) {
      const mob = createMob(s)
      this.mobs.push(mob)
      if (mob.isBoss) this.activeBoss = mob
    }
  }

  private generateDefaultSpawns(level: Level): MobSpawn[] {
    // Generates cozy MapleStory mobs along flat ground sections
    const spawns: MobSpawn[] = []
    let flatRun = 0
    let startX = 0
    let groundY = 0

    for (let col = 5; col < level.width - 8; col++) {
      let foundGround = false
      for (let row = 1; row < level.height - 3; row++) {
        const isFloor =
          (solidAt(level, col, row - 1) || platformAt(level, col, row - 1)) &&
          !solidAt(level, col, row) &&
          !solidAt(level, col, row + 1)
        if (isFloor) {
          foundGround = true
          if (flatRun === 0) {
            startX = col
            groundY = row
          } else if (groundY !== row) {
            flatRun = 0
            startX = col
            groundY = row
          }
          flatRun++
          break
        }
      }

      if (!foundGround) {
        if (flatRun >= 6) {
          const midX = startX + Math.floor(flatRun / 2)
          const kind: MobKind = spawns.length % 2 === 0 ? 'slime' : 'mushroom'
          spawns.push({ kind, x: midX + 0.5, y: groundY, range: Math.floor(flatRun / 2) })
        }
        flatRun = 0
      }
    }
    return spawns
  }

  step(level: Level, player: Player, dt: number): { expEarned: number; mesosEarned: number; playerHurt: number; mobHit: boolean } {
    let expEarned = 0
    let mesosEarned = 0
    let playerHurt = 0
    let mobHit = false

    // 1. Step Mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i]!
      if (mob.dead) {
        mob.deathTimer -= dt
        if (mob.deathTimer <= 0) {
          this.mobs.splice(i, 1)
          if (this.activeBoss?.id === mob.id) this.activeBoss = null
        }
        continue
      }

      if (mob.hitFlash > 0) mob.hitFlash -= dt

      // Movement & Patrol
      if (mob.kind !== 'wisp') {
        mob.vy -= GRAVITY * dt * 0.7
        mob.y += mob.vy * dt

        // Ground check
        const footCol = Math.floor(mob.x)
        const footRow = Math.floor(mob.y)
        const onSolid = solidAt(level, footCol, footRow) || platformAt(level, footCol, footRow)

        if (onSolid && mob.vy <= 0) {
          mob.y = footRow + 1
          mob.vy = 0
          mob.grounded = true
        } else {
          mob.grounded = false
        }

        // Horizontal movement
        mob.x += mob.vx * dt
        mob.facing = mob.vx >= 0 ? 1 : -1

        // Edge / wall detection: turn around
        const nextCol = Math.floor(mob.x + mob.facing * 0.6)
        const wallAhead = solidAt(level, nextCol, footRow + 1)
        const cliffAhead =
          mob.grounded && !solidAt(level, nextCol, footRow) && !platformAt(level, nextCol, footRow)

        if (mob.x <= mob.patrolMinX || mob.x >= mob.patrolMaxX || wallAhead || cliffAhead) {
          mob.vx = -mob.vx
          mob.facing = mob.vx >= 0 ? 1 : -1
          mob.x = Math.max(mob.patrolMinX, Math.min(mob.patrolMaxX, mob.x))
        }
      } else {
        // Flying wisp bobbing
        mob.x += mob.vx * dt
        mob.y += Math.sin(mob.x * 2) * 0.02
        if (mob.x <= mob.patrolMinX || mob.x >= mob.patrolMaxX) mob.vx = -mob.vx
      }

      // Check attack hits from player
      if (player.attacking && player.attackHitbox) {
        const hb = player.attackHitbox
        const mobBox = {
          left: mob.x - mob.width / 2,
          right: mob.x + mob.width / 2,
          bottom: mob.y,
          top: mob.y + mob.height,
        }

        const overlap =
          hb.x + hb.width > mobBox.left &&
          hb.x < mobBox.right &&
          hb.y + hb.height > mobBox.bottom &&
          hb.y < mobBox.top

        if (overlap && mob.hitFlash <= 0.05) {
          // Calculate Maple damage formula based on player STR and LUK
          const baseDamage = 18 + player.str * 2.4
          const variance = 0.85 + Math.random() * 0.3
          const isCrit = Math.random() < 0.15 + player.luk * 0.015
          const damage = Math.floor(baseDamage * variance * (isCrit ? 1.65 : 1))

          mob.hp -= damage
          mob.hitFlash = 0.22
          mobHit = true
          mob.vx = player.facing * 3.5 // knockback
          if (mob.grounded) mob.vy = 4.5

          this.damageNumbers.push({
            id: nextId++,
            value: damage,
            x: mob.x + (Math.random() - 0.5) * 0.3,
            y: mob.y + mob.height + 0.3,
            vy: 2.8,
            isCrit,
            isPlayer: false,
            age: 0,
            maxAge: 0.85,
          })

          if (mob.hp <= 0) {
            mob.dead = true
            mob.deathTimer = 0.3
            expEarned += mob.exp

            // Spawn drops
            this.spawnDropsForMob(mob)
          }
        }
      }

      // Check contact damage to player
      if (!mob.dead && player.clock > player.invincibleUntil) {
        const pLeft = player.x - PLAYER_HALF
        const pRight = player.x + PLAYER_HALF
        const pBottom = player.y
        const pTop = player.y + PLAYER_SIZE

        const mLeft = mob.x - mob.width / 2
        const mRight = mob.x + mob.width / 2
        const mBottom = mob.y
        const mTop = mob.y + mob.height

        if (pRight > mLeft && pLeft < mRight && pTop > mBottom && pBottom < mTop) {
          const hurt = mob.touchDamage
          playerHurt += hurt
          player.hp = Math.max(0, player.hp - hurt)
          player.invincibleUntil = player.clock + 1.2
          player.vx = (player.x < mob.x ? -1 : 1) * RUN_SPEED * 0.8
          player.vy = 6

          this.damageNumbers.push({
            id: nextId++,
            value: hurt,
            x: player.x,
            y: player.y + PLAYER_SIZE + 0.2,
            vy: 2.2,
            isCrit: false,
            isPlayer: true,
            age: 0,
            maxAge: 0.8,
          })
        }
      }
    }

    // 2. Step Drops (physics & vacuum pickup)
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i]!
      drop.age += dt

      // Vacuum to player if close
      const dist = Math.hypot(player.x - drop.x, player.y + PLAYER_HALF - drop.y)
      if (dist < 2.8) {
        const angle = Math.atan2(player.y + PLAYER_HALF - drop.y, player.x - drop.x)
        const pull = 14 * dt
        drop.x += Math.cos(angle) * pull
        drop.y += Math.sin(angle) * pull

        if (dist < 0.6) {
          // Collected!
          drop.collected = true
          if (drop.kind === 'meso') {
            mesosEarned += drop.amount
          } else if (drop.kind === 'redPotion') {
            player.hp = Math.min(player.maxHp, player.hp + drop.amount)
          } else if (drop.kind === 'bluePotion') {
            player.mp = Math.min(player.maxMp, player.mp + drop.amount)
          }
          this.drops.splice(i, 1)
          continue
        }
      } else {
        // Normal drop physics on platforms
        drop.vy -= GRAVITY * dt * 0.5
        drop.y += drop.vy * dt
        drop.x += drop.vx * dt
        drop.vx *= 0.92

        const col = Math.floor(drop.x)
        const row = Math.floor(drop.y)
        if ((solidAt(level, col, row) || platformAt(level, col, row)) && drop.vy <= 0) {
          drop.y = row + 1
          drop.vy = 0
          drop.grounded = true
        }
      }

      // Expire after 30s
      if (drop.age > 30) this.drops.splice(i, 1)
    }

    // 3. Step Damage Numbers (bouncing physics & fade)
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i]!
      dn.age += dt
      dn.y += dn.vy * dt
      dn.vy -= 4 * dt // gentle deceleration
      if (dn.age >= dn.maxAge) this.damageNumbers.splice(i, 1)
    }

    return { expEarned, mesosEarned, playerHurt, mobHit }
  }

  private spawnDropsForMob(mob: Mob) {
    const mesoCount = mob.isBoss ? 8 : Math.floor(1 + Math.random() * 2)
    for (let i = 0; i < mesoCount; i++) {
      this.drops.push({
        id: nextId++,
        kind: 'meso',
        x: mob.x + (Math.random() - 0.5) * 0.4,
        y: mob.y + mob.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: 4 + Math.random() * 3,
        grounded: false,
        amount: Math.floor(10 + Math.random() * 25 * (mob.isBoss ? 5 : 1)),
        age: 0,
        collected: false,
      })
    }

    // Chance for Red or Blue Potion
    if (Math.random() < 0.45 || mob.isBoss) {
      const isRed = Math.random() < 0.6
      this.drops.push({
        id: nextId++,
        kind: isRed ? 'redPotion' : 'bluePotion',
        x: mob.x,
        y: mob.y + mob.height * 0.6,
        vx: (Math.random() - 0.5) * 3,
        vy: 5,
        grounded: false,
        amount: isRed ? 40 : 30,
        age: 0,
        collected: false,
      })
    }
  }
}
