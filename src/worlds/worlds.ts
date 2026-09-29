import type { LevelData } from '../sim/level.ts'
import meadow from '../levels/1-meadow.json'
import ridge from '../levels/2-ridge.json'
import sunsetPeak from '../levels/3-sunset-peak.json'
import { hashString } from '../util/random.ts'
import type {
  FutureWorld,
  LevelDefinition,
  MedalThresholds,
  WorldDefinition,
} from './types.ts'

export type { FutureWorld, LevelDefinition, Medal, MedalThresholds, WorldDefinition } from './types.ts'
export { medalForTime } from './types.ts'

const revisionFor = (data: LevelData) => hashString(JSON.stringify(data)).toString(36)

const defineLevel = (
  worldId: string,
  slug: string,
  data: LevelData,
  medals: MedalThresholds,
): LevelDefinition => ({
  id: `${worldId}/${slug}`,
  name: data.name,
  data,
  revision: revisionFor(data),
  medals,
})

const WORLD_ID = 'sunset-valley'

export const sunsetValley: WorldDefinition = {
  id: WORLD_ID,
  name: 'Sunset Valley',
  description: 'The original three-level run: meadow, ridge and the climb to Sunset Peak.',
  levels: [
    defineLevel(WORLD_ID, 'meadow', meadow as LevelData, { gold: 22, silver: 30, bronze: 45 }),
    defineLevel(WORLD_ID, 'ridge', ridge as LevelData, { gold: 27, silver: 38, bronze: 55 }),
    defineLevel(WORLD_ID, 'sunset-peak', sunsetPeak as LevelData, { gold: 30, silver: 42, bronze: 60 }),
  ],
}

export const worlds: WorldDefinition[] = [sunsetValley]

export const futureWorlds: FutureWorld[] = [
  { id: 'world-2', name: '???', label: 'Coming later' },
  { id: 'world-3', name: '???', label: 'Coming later' },
]

export const findWorld = (id: string) => worlds.find(world => world.id === id) ?? null

export const findLevel = (id: string) => {
  for (const world of worlds) {
    const index = world.levels.findIndex(candidate => candidate.id === id)
    if (index >= 0) return { world, level: world.levels[index]!, index }
  }
  return null
}
