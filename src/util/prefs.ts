// Small per-browser preferences. Storage can be missing or blocked (private windows,
// embedded previews), so every access is guarded and the game works without it.
const PREFIX = 'jump:'

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value)
  } catch {
    // Not saved; fine for a preference
  }
}

export const prefs = {
  get sound(): boolean {
    return read('sound') !== 'off'
  },
  set sound(on: boolean) {
    write('sound', on ? 'on' : 'off')
  },
  // Fastest full run, in seconds, or null
  get best(): number | null {
    const value = Number(read('best'))
    return Number.isFinite(value) && value > 0 ? value : null
  },
  set best(seconds: number | null) {
    if (seconds !== null) write('best', seconds.toFixed(3))
  },
}
