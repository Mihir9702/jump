import type { Device, Input, TouchButton } from '../input/input.ts'
import { setBlockText } from './blockType.ts'

export type Screen = 'title' | 'playing' | 'paused' | 'clear' | 'win' | 'none'

export interface UiActions {
  play(): void
  pause(): void
  resume(): void
  restart(): void
  quit(): void
  next(): void
  again(): void
  title(): void
  toggleSound(): void
}

export interface LevelResult {
  name: string
  time: number
  coins: number
  total: number
  falls: number
}

// Dialog buttons ignore clicks for a moment after opening, so a jump that is still held
// from gameplay cannot skip straight past them
const ARM_DELAY = 350

export function formatTime(seconds: number) {
  const tenths = Math.floor(seconds * 10)
  const minutes = Math.floor(tenths / 600)
  const rest = tenths - minutes * 600
  const whole = Math.floor(rest / 10)
  return `${minutes}:${String(whole).padStart(2, '0')}.${rest % 10}`
}

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

export class Ui {
  readonly app = byId<HTMLElement>('app')
  private readonly hud = byId<HTMLElement>('hud')
  private readonly levelNumber = byId<HTMLElement>('hud-level-number')
  private readonly levelName = byId<HTMLElement>('hud-level-name')
  private readonly coins = byId<HTMLElement>('hud-coins')
  private readonly time = byId<HTMLElement>('hud-time')
  private readonly hint = byId<HTMLElement>('hint')
  private readonly banner = byId<HTMLElement>('banner')
  private readonly screens: Record<Exclude<Screen, 'playing' | 'none'>, HTMLElement> = {
    title: byId('title-screen'),
    paused: byId('pause-screen'),
    clear: byId('clear-screen'),
    win: byId('win-screen'),
  }
  private readonly clearHeading = byId<HTMLElement>('clear-heading')
  private readonly clearSummary = byId<HTMLElement>('clear-summary')
  private readonly winSummary = byId<HTMLElement>('win-summary')
  private readonly winRows = byId<HTMLElement>('win-rows')
  private readonly winBest = byId<HTMLElement>('win-best')
  private readonly touch = byId<HTMLElement>('touch')
  private readonly fadeLayer = byId<HTMLElement>('fade')
  private screen: Screen = 'none'
  private openedAt = 0
  private shownTime = ''
  private shownCoins = ''
  private shownHint = ''
  private bannerTimer = 0
  private touchWanted = false

  constructor(actions: UiActions, input: Input) {
    setBlockText(byId('pause-heading'), 'Paused')
    setBlockText(byId('win-heading'), 'You made it')

    const guarded = (action: () => void) => () => {
      if (performance.now() - this.openedAt < ARM_DELAY) return
      action()
    }
    byId('play-button').addEventListener('click', () => actions.play())
    byId('pause-button').addEventListener('click', () => actions.pause())
    const handlers: Record<string, () => void> = {
      resume: guarded(actions.resume),
      restart: guarded(actions.restart),
      quit: guarded(actions.quit),
      next: guarded(actions.next),
      again: guarded(actions.again),
      title: guarded(actions.title),
    }
    for (const button of this.app.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const handler = handlers[button.dataset.action ?? '']
      if (handler) button.addEventListener('click', handler)
    }
    for (const button of this.app.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
      button.addEventListener('click', () => actions.toggleSound())
    }
    this.bindTouch(input)
  }

  setDevice(device: Device) {
    this.app.dataset.device = device
    if (device === 'touch') this.touchWanted = true
    this.updateTouch()
  }

  // Touch buttons appear on touch screens, or once someone touches the game
  enableTouch() {
    this.touchWanted = true
    this.updateTouch()
  }

  private updateTouch() {
    const playing = this.screen === 'playing' || this.screen === 'title'
    this.touch.hidden = !(this.touchWanted && playing)
  }

  get current() {
    return this.screen
  }

  show(screen: Screen) {
    this.screen = screen
    this.app.dataset.screen = screen
    for (const [name, element] of Object.entries(this.screens)) {
      const visible = name === screen
      if (!visible && element.contains(document.activeElement)) {
        ;(document.activeElement as HTMLElement).blur()
      }
      element.hidden = !visible
    }
    this.hud.hidden = !(screen === 'playing' || screen === 'paused' || screen === 'clear')
    if (screen !== 'playing') this.setHint(null)
    this.updateTouch()
    this.openedAt = performance.now()
    const dialog = screen === 'paused' || screen === 'clear' || screen === 'win' ? this.screens[screen] : null
    dialog?.querySelector<HTMLButtonElement>('.button-primary')?.focus({ preventScroll: true })
  }

  setLevel(number: number, total: number, name: string, coins: number) {
    this.levelNumber.textContent = String(number)
    this.levelNumber.title = `Level ${number} of ${total}`
    this.levelName.textContent = name
    this.shownCoins = ''
    this.setCoins(0, coins)
    this.shownTime = ''
    this.setTime(0)
  }

  setCoins(count: number, total: number) {
    const text = `${count}/${total}`
    if (text === this.shownCoins) return
    this.shownCoins = text
    this.coins.textContent = text
  }

  setTime(seconds: number) {
    const text = formatTime(seconds)
    if (text === this.shownTime) return
    this.shownTime = text
    this.time.textContent = text
  }

  setHint(text: string | null) {
    const value = text ?? ''
    if (value === this.shownHint) return
    this.shownHint = value
    if (text) {
      this.hint.textContent = text
      this.hint.hidden = false
    } else {
      this.hint.hidden = true
    }
  }

  showBanner(text: string) {
    setBlockText(this.banner, text)
    this.banner.classList.remove('show')
    // Restart the transition
    void this.banner.offsetWidth
    this.banner.classList.add('show')
    window.clearTimeout(this.bannerTimer)
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('show'), 1600)
  }

  hideBanner() {
    window.clearTimeout(this.bannerTimer)
    this.banner.classList.remove('show')
  }

  showClear(result: LevelResult, last: boolean) {
    setBlockText(this.clearHeading, result.name)
    const coins = `${result.coins} of ${result.total} coin${result.total === 1 ? '' : 's'}`
    this.clearSummary.textContent = `Cleared in ${formatTime(result.time)} with ${coins}.`
    const next = this.screens.clear.querySelector<HTMLButtonElement>('[data-action="next"]')
    if (next?.firstChild) next.firstChild.textContent = last ? 'See results ' : 'Next level '
    this.show('clear')
  }

  showWin(results: LevelResult[], best: number | null, newBest: boolean) {
    const time = results.reduce((sum, r) => sum + r.time, 0)
    const coins = results.reduce((sum, r) => sum + r.coins, 0)
    const total = results.reduce((sum, r) => sum + r.total, 0)
    const falls = results.reduce((sum, r) => sum + r.falls, 0)
    const fallText = falls === 0 ? 'no falls' : `${falls} fall${falls === 1 ? '' : 's'}`
    this.winSummary.textContent = `All ${results.length} levels in ${formatTime(time)}, with ${coins} of ${total} coins and ${fallText}.`
    this.winRows.replaceChildren(
      ...results.map((result, i) => {
        const row = document.createElement('tr')
        for (const text of [String(i + 1), result.name, formatTime(result.time), `${result.coins}/${result.total}`]) {
          const cell = document.createElement('td')
          cell.textContent = text
          row.append(cell)
        }
        return row
      }),
    )
    this.winBest.textContent = newBest
      ? 'That is your fastest run so far.'
      : best !== null
        ? `Your fastest run is ${formatTime(best)}.`
        : ''
    this.show('win')
  }

  setSound(on: boolean) {
    for (const button of this.app.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
      button.textContent = on ? 'Sound on' : 'Sound off'
      button.setAttribute('aria-pressed', String(on))
    }
  }

  // Moves focus between the buttons of the open dialog, for arrow keys and gamepads
  moveFocus(step: number) {
    const dialog = this.dialog()
    if (!dialog) return
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not([hidden])')]
    if (buttons.length === 0) return
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = buttons[(index + step + buttons.length) % buttons.length]
    next?.focus({ preventScroll: true })
  }

  activateFocused() {
    const dialog = this.dialog()
    if (!dialog) return
    const focused = dialog.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null
    const target = focused ?? dialog.querySelector<HTMLButtonElement>('.button-primary')
    target?.click()
  }

  private dialog() {
    const screen = this.screen
    return screen === 'paused' || screen === 'clear' || screen === 'win' ? this.screens[screen] : null
  }

  // Covers the screen, runs the change, then uncovers it
  async fade(change: () => void) {
    const layer = this.fadeLayer
    layer.classList.add('on')
    await new Promise(resolve => window.setTimeout(resolve, 180))
    change()
    layer.classList.remove('on')
  }

  private bindTouch(input: Input) {
    const pointers = new Map<number, TouchButton>()
    const buttonAt = (x: number, y: number): TouchButton | null => {
      const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-touch]')
      return (element?.dataset.touch as TouchButton | undefined) ?? null
    }
    const refresh = () => {
      const held = new Set(pointers.values())
      for (const button of ['left', 'right', 'jump', 'down'] as const) {
        input.setTouch(button, held.has(button))
        this.touch.querySelector(`[data-touch="${button}"]`)?.classList.toggle('pressed', held.has(button))
      }
    }
    this.touch.addEventListener('pointerdown', event => {
      const button = buttonAt(event.clientX, event.clientY)
      if (!button) return
      event.preventDefault()
      this.touch.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, button)
      refresh()
    })
    this.touch.addEventListener('pointermove', event => {
      const current = pointers.get(event.pointerId)
      if (!current) return
      // Sliding a thumb between left and right switches direction without lifting it
      const button = buttonAt(event.clientX, event.clientY)
      if (button && button !== current && (button === 'left' || button === 'right') && (current === 'left' || current === 'right')) {
        pointers.set(event.pointerId, button)
        refresh()
      }
    })
    const release = (event: PointerEvent) => {
      if (pointers.delete(event.pointerId)) refresh()
    }
    this.touch.addEventListener('pointerup', release)
    this.touch.addEventListener('pointercancel', release)
    this.touch.addEventListener('lostpointercapture', release)
    this.touch.addEventListener('contextmenu', event => event.preventDefault())
  }
}
