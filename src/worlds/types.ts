import type { LevelData } from '../sim/level.ts'

export type Medal = 'bronze' | 'silver' | 'gold'

export interface MedalThresholds {
  gold: number
  silver: number
  bronze: number
}

export interface LevelDefinition {
  id: string
  name: string
  data: LevelData
  revision: string
  medals: MedalThresholds
}

export interface WorldDefinition {
  id: string
  name: string
  description: string
  levels: LevelDefinition[]
}

export interface FutureWorld {
  id: string
  name: string
  label: string
}

export function medalForTime(level: LevelDefinition, seconds: number): Medal | null {
  if (seconds <= level.medals.gold) return 'gold'
  if (seconds <= level.medals.silver) return 'silver'
  if (seconds <= level.medals.bronze) return 'bronze'
  return null
}
