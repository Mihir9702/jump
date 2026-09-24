// Plays the built game in headless Chrome over the DevTools protocol and checks that it
// works: title screen, movement, jumping, landing, coins, dropping through platforms,
// reaching the goal, the next level, pausing, the results screen, resizing, a phone-sized
// touch screen, reduced motion, and a clean console. Saves screenshots along the way.
//
//   npm run build && npm run playtest
//
// Options: --out <dir> (default .playtest; use docs/screenshots to refresh the README
// images), --url <url> (use a server that is already running instead of starting
// `vite preview`), --port <n> (Chrome debugging port, default 9444). Set CHROME_PATH if
// Chrome is not in the default Windows location.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { preview } from 'vite'
import { parseLevel } from '../src/sim/level.ts'
import { encodeSteps, solveLevel } from './solver.ts'

const { values: args } = parseArgs({
  options: {
    out: { type: 'string', default: '.playtest' },
    url: { type: 'string' },
    port: { type: 'string', default: '9444' },
  },
})
const root = resolve(import.meta.dirname, '..')
const outDir = resolve(root, args.out)
mkdirSync(outDir, { recursive: true })
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = Number(args.port)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

// Routes through each level, found with the real physics (see tools/solver.ts)
const levelFiles = ['1-meadow.json', '2-ridge.json', '3-sunset-peak.json']
const routes = levelFiles.map(file => {
  const level = parseLevel(JSON.parse(readFileSync(join(root, 'src/levels', file), 'utf8')))
  const route = solveLevel(level, { tapSteps: 6 })
  if (!route) throw new Error(`no route through ${file}`)
  return { name: level.name, steps: encodeSteps(route.steps), seconds: route.seconds }
})

// ---------------------------------------------------------------- server and browser
let server = null
let baseUrl = args.url
if (!baseUrl) {
  server = await preview({ root, logLevel: 'silent', preview: { port: 4173, strictPort: false } })
  baseUrl = server.resolvedUrls.local[0]
}
console.log('testing', baseUrl)

const profile = mkdtempSync(join(tmpdir(), 'jump-playtest-'))
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function pageSocketUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find(t => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(150)
  }
  throw new Error('Chrome did not start')
}

const ws = new WebSocket(await pageSocketUrl())
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let nextId = 0
const pending = new Map()
const listeners = []
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method) for (const l of listeners) l(msg)
})
const send = (method, params = {}) =>
  new Promise(resolve => {
    const id = ++nextId
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (response.result?.exceptionDetails) {
    throw new Error(`evaluate failed: ${expression}\n${JSON.stringify(response.result.exceptionDetails)}`)
  }
  return response.result?.result?.value
}

// Everything the page logs. Errors fail the run; warnings are reported.
const consoleLog = []
listeners.push(msg => {
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')
    consoleLog.push({ level: msg.params.type, text })
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const details = msg.params.exceptionDetails
    consoleLog.push({ level: 'error', text: details.exception?.description ?? details.text })
  } else if (msg.method === 'Log.entryAdded') {
    const entry = msg.params.entry
    consoleLog.push({ level: entry.level, text: `${entry.text} ${entry.url ?? ''}`.trim() })
  }
})

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
// Keep the page focused, as if a person had clicked into it
await send('Emulation.setFocusEmulationEnabled', { enabled: true })

// ---------------------------------------------------------------- helpers
const keyInfo = {
  ArrowLeft: [37, 'ArrowLeft'],
  ArrowRight: [39, 'ArrowRight'],
  ArrowUp: [38, 'ArrowUp'],
  ArrowDown: [40, 'ArrowDown'],
  Space: [32, ' '],
  // Real keyboards send a carriage return with Enter, which is what activates buttons
  Enter: [13, 'Enter', '\r'],
  Escape: [27, 'Escape'],
  KeyA: [65, 'a'],
  KeyD: [68, 'd'],
  KeyP: [80, 'p'],
  KeyS: [83, 's'],
  KeyW: [87, 'w'],
}
async function key(type, code) {
  const [keyCode, key, typed] = keyInfo[code]
  const text = typed ?? (key.length === 1 ? key : undefined)
  await send('Input.dispatchKeyEvent', {
    type,
    code,
    key,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    ...(type === 'keyDown' && text ? { text, unmodifiedText: text } : {}),
  })
}
async function press(code, ms = 60) {
  await key('keyDown', code)
  await sleep(ms)
  await key('keyUp', code)
}
async function shot(name) {
  const { result } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(result.data, 'base64'))
  console.log(`      saved ${args.out}/${name}.png`)
}
const state = () => evaluate('window.__jump.state')
async function waitFor(expression, timeout = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true
    await sleep(50)
  }
  return false
}
// Samples the player until a condition on its state holds
async function watch(test, timeout = 5000) {
  const start = Date.now()
  let s = await state()
  while (Date.now() - start < timeout) {
    if (test(s)) return s
    await sleep(16)
    s = await state()
  }
  return null
}
async function touch(type, x, y) {
  await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
}
async function center(selector) {
  return evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
}
async function tapElement(selector, ms = 80) {
  const { x, y } = await center(selector)
  await touch('touchStart', x, y)
  await sleep(ms)
  await touch('touchEnd', x, y)
}
const desktop = { width: 1440, height: 900, scale: 1, mobile: false }
async function open(device = desktop, media = []) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.scale,
    mobile: device.mobile,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: device.mobile, maxTouchPoints: device.mobile ? 5 : 1 })
  await send('Emulation.setEmulatedMedia', { features: media })
  const loaded = new Promise(r => {
    const listener = m => {
      if (m.method === 'Page.loadEventFired') {
        listeners.splice(listeners.indexOf(listener), 1)
        r()
      }
    }
    listeners.push(listener)
  })
  await send('Page.navigate', { url: `${baseUrl}?debug` })
  await loaded
  await waitFor('Boolean(window.__jump)')
  await sleep(1200)
}
async function finishLevel(index) {
  await evaluate(`window.__jump.replay(${JSON.stringify(routes[index].steps)})`)
  return waitFor('window.__jump.state.screen === "clear" || window.__jump.state.screen === "win"', (routes[index].seconds + 15) * 1000)
}

try {
  // -------------------------------------------------------------- desktop: title
  await open()
  let s = await state()
  check('title screen renders', s.state === 'title' && s.screen === 'title')
  const size = await evaluate('(() => { const c = document.querySelector("canvas"); return [c.width, c.height, innerWidth, innerHeight] })()')
  check('canvas fills the window', size[0] === size[2] && size[1] === size[3], size.join(' x '))
  await shot('title')

  // The title is a playground: run and jump on the letters
  await key('keyDown', 'ArrowRight')
  await sleep(500)
  await key('keyUp', 'ArrowRight')
  const moved = await state()
  check('the cube moves on the title screen', moved.x > s.x + 1, `x ${s.x.toFixed(2)} -> ${moved.x.toFixed(2)}`)

  // -------------------------------------------------------------- level 1 with real keys
  await press('Enter')
  check('Enter starts level 1', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 0'))
  await sleep(300)
  s = await state()
  const start = s

  // Run right through the first coins
  await key('keyDown', 'KeyD')
  const coin = await watch(p => p.coins >= 1, 4000)
  check('running right moves the cube', (await state()).x > start.x + 3)
  check('walking into a coin collects it', Boolean(coin), coin ? `${coin.coins} coin(s)` : '')

  // Jump the first gap (tiles 19 to 21) and land on the far side
  await watch(p => p.x > 17.2, 3000)
  await key('keyDown', 'Space')
  const airborne = await watch(p => !p.grounded && p.y > 3.5, 1000)
  check('Space jumps', Boolean(airborne), airborne ? `y ${airborne.y.toFixed(2)}` : '')
  await sleep(250)
  await shot('gameplay')
  await key('keyUp', 'Space')
  const landed = await watch(p => p.grounded && p.x > 22, 3000)
  check('the jump clears the gap and lands on the ground', Boolean(landed), landed ? `x ${landed.x.toFixed(2)}, y ${landed.y.toFixed(2)}` : '')

  // Jump up through the one-way platform (tiles 26 to 31, top at 6) and land on it
  await key('keyUp', 'KeyD')
  await evaluate('window.__jump.teleport(27.5, 3)')
  await sleep(200)
  await key('keyDown', 'KeyW')
  const onPlatform = await watch(p => p.grounded && Math.abs(p.y - 6) < 0.01, 2500)
  await key('keyUp', 'KeyW')
  check('jumping up through a one-way platform lands on top of it', Boolean(onPlatform), onPlatform ? `y ${onPlatform.y}` : '')

  // Press down to drop back through it
  await press('KeyS')
  const dropped = await watch(p => p.grounded && Math.abs(p.y - 3) < 0.01, 2500)
  check('pressing down drops through the platform', Boolean(dropped))

  // A short tap makes a lower jump than a held press. The game reads buttons once per
  // frame and software-rendered frames here can take a quarter of a second, so the tap
  // sends its release straight after the press: both land before the next frame.
  const hop = async ms => {
    await watch(p => p.grounded, 2000)
    const base = (await state()).y
    let peak = base
    if (ms === 0) {
      await Promise.all([key('keyDown', 'Space'), key('keyUp', 'Space')])
    } else {
      await key('keyDown', 'Space')
    }
    const t0 = Date.now()
    let released = ms === 0
    while (Date.now() - t0 < 900) {
      if (!released && Date.now() - t0 >= ms) {
        await key('keyUp', 'Space')
        released = true
      }
      peak = Math.max(peak, (await state()).y)
      await sleep(10)
    }
    if (!released) await key('keyUp', 'Space')
    return peak - base
  }
  const tapHeight = await hop(0)
  const holdHeight = await hop(600)
  check('variable jump height: a tap hops lower than a hold', tapHeight < holdHeight - 1, `tap ${tapHeight.toFixed(2)}, hold ${holdHeight.toFixed(2)} tiles`)

  // -------------------------------------------------------------- pause and hidden tab
  await press('Escape')
  check('Esc pauses', await waitFor('window.__jump.state.state === "paused" && window.__jump.state.screen === "paused"', 3000))
  const pausedTime = (await state()).time
  await sleep(500)
  check('the clock stops while paused', (await state()).time === pausedTime)
  await shot('pause')
  await press('Escape')
  check('Esc resumes', await waitFor('window.__jump.state.state === "playing"', 3000))
  await evaluate(`(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })()`)
  check('hiding the tab pauses the game', (await state()).state === 'paused')
  await evaluate(`(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })()`)
  await press('KeyP')
  check('P resumes', await waitFor('window.__jump.state.state === "playing"', 3000))

  // -------------------------------------------------------------- the goal
  await evaluate('window.__jump.play(0)')
  await sleep(200)
  check('level 1 reaches the flag', await finishLevel(0))
  await sleep(600)
  s = await state()
  check('the level complete card shows time and coins', s.screen === 'clear' && (await evaluate('document.getElementById("clear-summary").textContent')).includes('Cleared in'))
  await shot('level-complete')
  await press('Enter')
  check('reaching the goal advances to level 2', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 1'))
  await sleep(1400)
  await shot('level-2')
  check('level 2 reaches the flag', await finishLevel(1))
  await sleep(500)
  await press('Enter')
  check('then level 3', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 2'))
  await sleep(300)
  // Show off the climb on the way up
  await evaluate(`window.__jump.replay(${JSON.stringify(routes[2].steps)})`)
  await waitFor('window.__jump.state.checkpoint >= 0', 20000)
  await sleep(700)
  await shot('level-3')
  await waitFor('window.__jump.state.screen === "win"', 40000)
  await sleep(900)
  s = await state()
  const summary = await evaluate('document.getElementById("win-summary").textContent')
  const rows = await evaluate('document.querySelectorAll("#win-rows tr").length')
  check('finishing level 3 shows the results with time and coins', s.screen === 'win' && rows === 3, summary)
  await shot('win')
  await press('Enter')
  check('Play again starts level 1', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 0'))

  // -------------------------------------------------------------- falling restarts instantly
  await evaluate('window.__jump.teleport(20, 3)')
  const fell = await watch(p => p.falls >= 1, 4000)
  check('falling off restarts at once', Boolean(fell) && fell.x === 3.5, fell ? `back at x ${fell.x}` : '')

  // -------------------------------------------------------------- resize and high DPI
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 700, deviceScaleFactor: 2, mobile: false })
  await sleep(600)
  const hiDpi = await evaluate('(() => { const c = document.querySelector("canvas"); return [c.width, c.height] })()')
  check('resizing to a high-DPI window renders at full resolution', hiDpi[0] === 2048 && hiDpi[1] === 1400, hiDpi.join(' x '))

  // -------------------------------------------------------------- gamepad
  // Headless Chrome has no gamepads, so stand in a fake one for the game's polling
  await open()
  await evaluate(`(() => {
    const pad = { connected: true, id: 'playtest pad', mapping: 'standard', index: 0, timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }
    window.__pad = pad
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] })
  })()`)
  const padButton = async (i, ms = 120) => {
    await evaluate(`window.__pad.buttons[${i}].pressed = true`)
    await sleep(ms)
    await evaluate(`window.__pad.buttons[${i}].pressed = false`)
    await sleep(80)
  }
  await evaluate('window.__pad.buttons[0].pressed = true')
  const titleHop = await watch(p => !p.grounded, 1500)
  await evaluate('window.__pad.buttons[0].pressed = false')
  await sleep(400)
  check('gamepad A jumps on the title without starting the game', Boolean(titleHop) && (await state()).state === 'title')
  await padButton(9)
  check('gamepad Start begins the game', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 0'))
  check('the title switches to gamepad wording', await evaluate('document.getElementById("app").dataset.device === "gamepad"'))
  await sleep(400)
  s = await state()
  await evaluate('window.__pad.axes[0] = 1')
  const padMoved = await watch(p => p.x > s.x + 2, 3000)
  await evaluate('window.__pad.axes[0] = 0')
  check('the gamepad stick moves the cube', Boolean(padMoved))
  await evaluate('window.__pad.buttons[0].pressed = true')
  const padJump = await watch(p => !p.grounded && p.y > 3.8, 1500)
  await evaluate('window.__pad.buttons[0].pressed = false')
  check('gamepad A jumps', Boolean(padJump))
  await sleep(500)
  await padButton(9)
  check('gamepad Start pauses', await waitFor('window.__jump.state.state === "paused"', 3000))
  await padButton(1)
  check('gamepad B resumes', await waitFor('window.__jump.state.state === "playing"', 3000))

  // -------------------------------------------------------------- phone
  await open({ width: 390, height: 844, scale: 2, mobile: true })
  check('touch buttons show on a phone', await evaluate('!document.getElementById("touch").hidden'))
  await shot('phone-title')
  await tapElement('#play-button')
  check('tapping Play starts level 1', await waitFor('window.__jump.state.state === "playing" && window.__jump.state.level === 0'))
  await sleep(1500)
  s = await state()
  const right = await center('[data-touch="right"]')
  await touch('touchStart', right.x, right.y)
  const walked = await watch(p => p.x > s.x + 2, 3000)
  check('holding the right button moves the cube', Boolean(walked))
  const jumpButton = await center('[data-touch="jump"]')
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, jumpButton].map((p, id) => ({ ...p, id })) })
  const touchJump = await watch(p => !p.grounded && p.y > 3.8, 1500)
  check('the jump button jumps (with a second finger on right)', Boolean(touchJump))
  await sleep(120)
  await shot('phone')
  await touch('touchEnd', right.x, right.y)

  // Landscape phone
  await open({ width: 844, height: 390, scale: 2, mobile: true })
  await tapElement('#play-button')
  await waitFor('window.__jump.state.state === "playing"')
  await sleep(1500)
  await shot('phone-landscape')

  // -------------------------------------------------------------- reduced motion
  await open(desktop, [{ name: 'prefers-reduced-motion', value: 'reduce' }])
  check('reduced motion is detected', await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'))
  await evaluate(`window.__jump.play(0)`)
  check('level 1 still finishes with reduced motion', await finishLevel(0))
} catch (error) {
  check('the run completed', false, error.message)
}

// ---------------------------------------------------------------- report
ws.close()
chrome.kill()
await server?.close()
await sleep(300)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}

const problems = consoleLog.filter(m => m.level === 'error' || m.level === 'warning')
check('no console errors or warnings', problems.length === 0, problems.map(p => `${p.level}: ${p.text}`).join(' | '))
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 ? 0 : 1)
