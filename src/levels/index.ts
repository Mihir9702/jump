import type { LevelData } from '../sim/level.ts'
import meadow from './1-meadow.json'
import ridge from './2-ridge.json'
import sunsetPeak from './3-sunset-peak.json'
import title from './title.json'

// The maps are validated by parseLevel when they load, and by the tests in test/levels
export const titleLevel = title as LevelData

// Played in this order
export const levels = [meadow, ridge, sunsetPeak] as LevelData[]
