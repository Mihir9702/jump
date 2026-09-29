import type { RecordOutcome } from '../progress/progress.ts'
import { formatDelta, formatRecord } from './recordFormat.ts'

export interface RaceResult {
  time: number
}

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

const medalName = (medal: string | null) =>
  medal ? `${medal[0]!.toUpperCase()}${medal.slice(1)}` : 'No medal yet'

export class RaceUi {
  private readonly split = byId<HTMLElement>('hud-split')
  private readonly clearBest = byId<HTMLElement>('clear-best')
  private readonly clearScreen = byId<HTMLElement>('clear-screen')
  private readonly clearLevels = byId<HTMLButtonElement>('clear-levels')
  private splitTimer = 0

  setGhost(on: boolean) {
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-ghost-toggle]')) {
      button.textContent = on ? 'Ghost on' : 'Ghost off'
      button.setAttribute('aria-pressed', String(on))
    }
  }

  showSplit(delta: number) {
    this.split.textContent = `${formatDelta(delta)} PB`
    this.split.classList.toggle('ahead', delta <= 0)
    this.split.classList.toggle('behind', delta > 0)
    this.split.hidden = false
    window.clearTimeout(this.splitTimer)
    this.splitTimer = window.setTimeout(() => this.clearSplit(), 1800)
  }

  clearSplit() {
    window.clearTimeout(this.splitTimer)
    this.split.hidden = true
    this.split.classList.remove('ahead', 'behind')
  }

  decorateClear(result: RaceResult, outcome: RecordOutcome, solo: boolean) {
    const best = outcome.record.bestTime ?? result.time
    if (outcome.newBest && outcome.previousBest === null) {
      this.clearBest.textContent = `First personal best · ${medalName(outcome.record.medal)}`
    } else if (outcome.newBest && outcome.previousBest !== null) {
      this.clearBest.textContent =
        `${formatDelta(result.time - outcome.previousBest)} · New personal best · ${medalName(outcome.record.medal)}`
    } else {
      this.clearBest.textContent =
        `${formatDelta(result.time - best)} from PB · PB ${formatRecord(best)} · ${medalName(outcome.record.medal)}`
    }

    const next = this.clearScreen.querySelector<HTMLButtonElement>('[data-action="next"]')
    if (solo && next?.firstChild) next.firstChild.textContent = 'Race again '
    this.clearLevels.hidden = !solo
  }
}
