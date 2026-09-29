import type { Controls } from '../sim/player.ts'

const ALPHABET = '0123456789abcdefghijklmnopqrstuv'
const STEP_RATE = 120

export interface SavedGhost {
  version: 1
  levelId: string
  levelRevision: string
  stepRate: typeof STEP_RATE
  time: number
  replay: string
  splits: number[]
}

export function encodeControl(control: Controls): string {
  const bits =
    (control.left ? 1 : 0) |
    (control.right ? 2 : 0) |
    (control.jumpHeld ? 4 : 0) |
    (control.jumpPressed ? 8 : 0) |
    (control.downPressed ? 16 : 0)
  return ALPHABET[bits]!
}

export function decodeControl(encoded: string): Controls {
  const bits = ALPHABET.indexOf(encoded)
  if (bits < 0) throw new Error(`Invalid replay frame "${encoded}"`)
  return {
    left: (bits & 1) !== 0,
    right: (bits & 2) !== 0,
    jumpHeld: (bits & 4) !== 0,
    jumpPressed: (bits & 8) !== 0,
    downPressed: (bits & 16) !== 0,
  }
}

export class ReplayRecorder {
  private readonly frames: string[] = []

  push(control: Controls) {
    this.frames.push(encodeControl(control))
  }

  finish(): string {
    return this.frames.join('')
  }

  get length() {
    return this.frames.length
  }
}

export class ReplayPlayback {
  private index = 0
  private readonly encoded: string

  constructor(encoded: string) {
    this.encoded = encoded
  }

  next(): Controls | null {
    if (this.index >= this.encoded.length) return null
    return decodeControl(this.encoded[this.index++]!)
  }

  get finished() {
    return this.index >= this.encoded.length
  }
}
