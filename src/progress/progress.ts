import type { SavedGhost } from '../replay/replay.ts'
import type { LevelDefinition, Medal } from '../worlds/types.ts'
import { medalForTime } from '../worlds/types.ts'

export const PROGRESS_VERSION = 1

export interface LevelRecord {
  bestTime: number | null
  bestCoins: number
  fewestFalls: number | null
  medal: Medal | null
  ghost: SavedGhost | null
}

export interface WorldRecord {
  bestTime: number | null
}

export interface ProgressData {
  version: typeof PROGRESS_VERSION
  levels: Record<string, LevelRecord>
  worlds: Record<string, WorldRecord>
}

export interface LevelResultInput {
  time: number
  coins: number
  falls: number
}

export interface RecordOutcome {
  newBest: boolean
  previousBest: number | null
  record: LevelRecord
}

export const createProgress = (): ProgressData => ({
  version: PROGRESS_VERSION,
  levels: {},
  worlds: {},
})

export const createLevelRecord = (): LevelRecord => ({
  bestTime: null,
  bestCoins: 0,
  fewestFalls: null,
  medal: null,
  ghost: null,
})

export function getLevelRecord(data: ProgressData, levelId: string): LevelRecord {
  return data.levels[levelId] ?? createLevelRecord()
}

export function getWorldRecord(data: ProgressData, worldId: string): WorldRecord {
  return data.worlds[worldId] ?? { bestTime: null }
}

export function recordLevel(
  data: ProgressData,
  level: LevelDefinition,
  result: LevelResultInput,
  ghost: SavedGhost,
): RecordOutcome {
  const previous = getLevelRecord(data, level.id)
  const previousBest = previous.bestTime
  const newBest = previousBest === null || result.time < previousBest
  const bestTime = newBest ? result.time : previousBest
  const record: LevelRecord = {
    bestTime,
    bestCoins: Math.max(previous.bestCoins, result.coins),
    fewestFalls:
      previous.fewestFalls === null ? result.falls : Math.min(previous.fewestFalls, result.falls),
    medal: bestTime === null ? null : medalForTime(level, bestTime),
    ghost: newBest ? ghost : previous.ghost,
  }
  data.levels[level.id] = record
  return { newBest, previousBest, record }
}

export function recordWorld(data: ProgressData, worldId: string, time: number): boolean {
  const previous = getWorldRecord(data, worldId)
  if (previous.bestTime !== null && previous.bestTime <= time) return false
  data.worlds[worldId] = { bestTime: time }
  return true
}

export function compatibleGhost(record: LevelRecord, level: LevelDefinition): SavedGhost | null {
  const ghost = record.ghost
  if (
    !ghost ||
    ghost.version !== 1 ||
    ghost.levelId !== level.id ||
    ghost.levelRevision !== level.revision ||
    ghost.stepRate !== 120
  ) {
    return null
  }
  return ghost
}
