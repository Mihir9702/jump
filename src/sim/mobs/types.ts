export type MobKind = 'slime' | 'mushroom' | 'wisp' | 'golem' | 'balrog'

export interface Mob {
  id: number
  kind: MobKind
  name: string
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  facing: 1 | -1
  hp: number
  maxHp: number
  level: number
  exp: number
  touchDamage: number
  patrolMinX: number
  patrolMaxX: number
  grounded: boolean
  hitFlash: number
  dead: boolean
  deathTimer: number
  isBoss: boolean
  bossPhase?: number
  bossAttackTimer?: number
}

export type DropKind = 'meso' | 'redPotion' | 'bluePotion'

export interface DropItem {
  id: number
  kind: DropKind
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  amount: number
  age: number
  collected: boolean
}

export interface DamageNumber {
  id: number
  value: number
  x: number
  y: number
  vy: number
  isCrit: boolean
  isPlayer: boolean
  age: number
  maxAge: number
}
