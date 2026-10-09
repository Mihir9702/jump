import { validReplay, type SavedGhost } from '../replay/replay.ts'
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const validGhost = (value: unknown): value is SavedGhost =>
  isRecord(value) &&
  value.version === 1 &&
  typeof value.levelId === 'string' &&
  value.levelId.length > 0 &&
  typeof value.levelRevision === 'string' &&
  value.levelRevision.length > 0 &&
  value.stepRate === 120 &&
  validTime(value.time) &&
  validReplay(value.replay) &&
  Array.isArray(value.splits) &&
  value.splits.every(split =>
    split === null || (typeof split === 'number' && Number.isFinite(split) && split >= 0),
  )

// Only trust validated fields in browser-stored progress. Preserve every
// legitimate best time, coin count and replay rather than wiping all progress
// because an unrelated record is malformed.
export function sanitizeProgress(value: unknown): ProgressData | null {
  if (
    !isRecord(value) ||
    value.version !== PROGRESS_VERSION ||
    !isRecord(value.levels) ||
    !isRecord(value.worlds)
  ) return null

  const data = createProgress()
  for (const [id, raw] of Object.entries(value.levels)) {
    if (!isRecord(raw)) continue
    const bestTime = validTime(raw.bestTime) ? raw.bestTime : null
    const medal =
      bestTime !== null &&
      (raw.medal === 'gold' || raw.medal === 'silver' || raw.medal === 'bronze')
        ? raw.medal
        : null
    // Define an own property so unusual saved IDs cannot mutate the map's prototype.
    Object.defineProperty(data.levels, id, {
      value: {
        bestTime,
        bestCoins: validCount(raw.bestCoins) ? raw.bestCoins : 0,
        fewestFalls: validCount(raw.fewestFalls) ? raw.fewestFalls : null,
        medal,
        ghost: validGhost(raw.ghost) ? raw.ghost : null,
      },
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  for (const [id, raw] of Object.entries(value.worlds)) {
    if (!isRecord(raw)) continue
    Object.defineProperty(data.worlds, id, {
      value: { bestTime: validTime(raw.bestTime) ? raw.bestTime : null },
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return data
}

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
    !validGhost(ghost) ||
    ghost.levelId !== level.id ||
    ghost.levelRevision !== level.revision
  ) {
    return null
  }
  return ghost
}
