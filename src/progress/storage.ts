import {
  type ProgressData,
  type LevelResultInput,
  type RecordOutcome,
  compatibleGhost,
  createProgress,
  getLevelRecord,
  getWorldRecord,
  recordLevel,
  recordWorld,
  sanitizeProgress,
} from './progress.ts'
import type { SavedGhost } from '../replay/replay.ts'
import type { LevelDefinition } from '../worlds/worlds.ts'
import { sunsetValley } from '../worlds/worlds.ts'

const KEY = 'jump:progress:v1'
const LEGACY_BEST_KEY = 'jump:best'

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Progress stays in memory when storage is unavailable.
  }
}

function load(): ProgressData {
  const raw = readStorage(KEY)
  if (raw) {
    try {
      const restored = sanitizeProgress(JSON.parse(raw) as unknown)
      if (restored) return restored
    } catch {
      // Ignore malformed saved data and start clean.
    }
  }

  const data = createProgress()
  const legacy = Number(readStorage(LEGACY_BEST_KEY))
  if (Number.isFinite(legacy) && legacy > 0) {
    data.worlds[sunsetValley.id] = { bestTime: legacy }
  }
  return data
}

export class ProgressStore {
  private readonly data = load()

  private save() {
    writeStorage(KEY, JSON.stringify(this.data))
  }

  level(level: LevelDefinition) {
    return getLevelRecord(this.data, level.id)
  }

  ghost(level: LevelDefinition) {
    return compatibleGhost(this.level(level), level)
  }

  world(worldId: string) {
    return getWorldRecord(this.data, worldId)
  }

  recordLevel(
    level: LevelDefinition,
    result: LevelResultInput,
    ghost: SavedGhost,
  ): RecordOutcome {
    const outcome = recordLevel(this.data, level, result, ghost)
    this.save()
    return outcome
  }

  recordWorld(worldId: string, time: number) {
    const newBest = recordWorld(this.data, worldId, time)
    if (newBest) this.save()
    return newBest
  }
}

export const progress = new ProgressStore()
