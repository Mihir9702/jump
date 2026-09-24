// Keyboard, gamepad and touch buttons, merged into one set of held buttons plus a queue of
// presses. The game takes presses once per simulation step, so a tap between two frames
// still counts.

export type Action =
  | 'jump'
  | 'down'
  | 'pause'
  | 'confirm'
  | 'back'
  | 'restart'
  | 'mute'
  | 'navUp'
  | 'navDown'
  | 'navLeft'
  | 'navRight'

export type Device = 'keyboard' | 'touch' | 'gamepad'
export type TouchButton = 'left' | 'right' | 'jump' | 'down'

interface Held {
  left: boolean
  right: boolean
  jump: boolean
  down: boolean
}

const LEFT = ['ArrowLeft', 'KeyA']
const RIGHT = ['ArrowRight', 'KeyD']
const JUMP = ['Space', 'ArrowUp', 'KeyW']
const DOWN = ['ArrowDown', 'KeyS']
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...JUMP, ...DOWN])

const none = (): Held => ({ left: false, right: false, jump: false, down: false })

// Standard gamepad layout: 0 A/cross, 1 B/circle, 8 select, 9 start, 12-15 d-pad
interface PadState extends Held {
  up: boolean
  a: boolean
  b: boolean
  start: boolean
}

export class Input {
  device: Device = 'keyboard'
  onDeviceChange: ((device: Device) => void) | null = null
  private readonly keys = new Set<string>()
  private readonly touch = none()
  private pad: PadState = { ...none(), up: false, a: false, b: false, start: false }
  private readonly queue = new Set<Action>()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.releaseAll)
  }

  held(): Held {
    const k = this.keys
    const any = (codes: string[]) => codes.some(code => k.has(code))
    return {
      left: any(LEFT) || this.touch.left || this.pad.left,
      right: any(RIGHT) || this.touch.right || this.pad.right,
      jump: any(JUMP) || this.touch.jump || this.pad.a,
      down: any(DOWN) || this.touch.down || this.pad.down,
    }
  }

  // True once for each press of the action
  take(action: Action): boolean {
    return this.queue.delete(action)
  }

  clear() {
    this.queue.clear()
  }

  readonly releaseAll = () => {
    this.keys.clear()
    Object.assign(this.touch, none())
  }

  setTouch(button: TouchButton, down: boolean) {
    const was = this.touch[button]
    this.touch[button] = down
    if (down && !was) {
      if (button === 'jump') this.queue.add('jump')
      if (button === 'down') this.queue.add('down')
    }
    this.setDevice('touch')
  }

  setDevice(device: Device) {
    if (this.device === device) return
    this.device = device
    this.onDeviceChange?.(device)
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const code = event.code
    // Focused buttons and links handle Enter and Space themselves
    const target = event.target
    const control = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement
    if (control && (code === 'Enter' || code === 'NumpadEnter' || code === 'Space')) return

    const press = (action: Action) => {
      if (!event.repeat) this.queue.add(action)
    }
    if (GAME_KEYS.has(code)) this.keys.add(code)
    if (LEFT.includes(code)) press('navLeft')
    else if (RIGHT.includes(code)) press('navRight')
    else if (DOWN.includes(code)) {
      press('down')
      press('navDown')
    } else if (JUMP.includes(code)) {
      press('jump')
      if (code !== 'Space') press('navUp')
    } else if (code === 'Escape' || code === 'KeyP') press('pause')
    else if (code === 'Enter' || code === 'NumpadEnter') press('confirm')
    else if (code === 'KeyR') press('restart')
    else if (code === 'KeyM') press('mute')
    else return

    event.preventDefault()
    this.setDevice('keyboard')
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  // Gamepads have no events for buttons, so they are read once per frame
  poll() {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []
    let gamepad: Gamepad | null = null
    for (const pad of pads) {
      if (pad?.connected) {
        gamepad = pad
        break
      }
    }
    const before = this.pad
    if (!gamepad) {
      this.pad = { ...none(), up: false, a: false, b: false, start: false }
      return
    }
    const button = (i: number) => gamepad.buttons[i]?.pressed ?? false
    const x = gamepad.axes[0] ?? 0
    const y = gamepad.axes[1] ?? 0
    const now: PadState = {
      left: x < -0.4 || button(14),
      right: x > 0.4 || button(15),
      up: y < -0.6 || button(12),
      down: y > 0.6 || button(13),
      jump: button(0),
      a: button(0),
      b: button(1),
      start: button(9) || button(8),
    }
    this.pad = now
    const edge = (key: keyof PadState, ...actions: Action[]) => {
      if (now[key] && !before[key]) for (const action of actions) this.queue.add(action)
    }
    edge('a', 'jump', 'confirm')
    edge('b', 'back')
    edge('start', 'pause')
    edge('down', 'down', 'navDown')
    edge('up', 'navUp')
    edge('left', 'navLeft')
    edge('right', 'navRight')
    const active = Object.values(now).some(Boolean) || Math.abs(x) > 0.4 || Math.abs(y) > 0.4
    if (active) this.setDevice('gamepad')
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.releaseAll)
  }
}
