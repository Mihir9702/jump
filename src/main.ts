import './style.css'
import { Game } from './game/game.ts'

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const canvas = document.getElementById('scene')
const fallback = document.getElementById('fallback')

if (!(canvas instanceof HTMLCanvasElement) || !webglAvailable()) {
  if (fallback) fallback.hidden = false
  document.getElementById('title-screen')?.setAttribute('hidden', '')
} else {
  const debug = new URLSearchParams(window.location.search).has('debug')
  new Game(canvas, { debug }).start()
}
