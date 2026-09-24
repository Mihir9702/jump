// Every sound is synthesized here with Web Audio: no sound files. The audio context is
// created on the first key press or tap, so nothing can play before the player acts,
// and there is no music.

export type Sound = 'jump' | 'land' | 'coin' | 'drop' | 'bonk' | 'fall' | 'checkpoint' | 'flag' | 'click'

export class Sfx {
  enabled: boolean
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private noise: AudioBuffer | null = null

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  // Call from a user gesture (key press, tap, click). Events that do not count as one,
  // like Esc, are ignored so the browser never has to block audio.
  unlock() {
    if (!this.enabled) return
    if (navigator.userActivation && !navigator.userActivation.isActive) return
    if (!this.context) {
      const Context = window.AudioContext
      if (!Context) return
      const context = new Context()
      const compressor = context.createDynamicsCompressor()
      const output = context.createGain()
      output.gain.value = 0.5
      output.connect(compressor).connect(context.destination)
      const noise = context.createBuffer(1, context.sampleRate * 0.3, context.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.context = context
      this.output = output
      this.noise = noise
    }
    if (this.context.state === 'suspended') void this.context.resume()
  }

  suspend() {
    if (this.context?.state === 'running') void this.context.suspend()
  }

  resume() {
    if (this.enabled && this.context?.state === 'suspended') void this.context.resume()
  }

  private tone(type: OscillatorType, from: number, to: number, start: number, length: number, volume: number) {
    const context = this.context!
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(from, start)
    oscillator.frequency.exponentialRampToValueAtTime(to, start + length)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    oscillator.connect(gain).connect(this.output!)
    oscillator.start(start)
    oscillator.stop(start + length + 0.02)
  }

  private hiss(start: number, length: number, volume: number, frequency: number) {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = this.noise
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 0.8
    const gain = context.createGain()
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    source.connect(filter).connect(gain).connect(this.output!)
    source.start(start, 0, length + 0.02)
  }

  play(sound: Sound, strength = 1) {
    const context = this.context
    if (!this.enabled || !context || context.state !== 'running') return
    const t = context.currentTime + 0.005
    switch (sound) {
      case 'jump':
        this.tone('triangle', 330, 620, t, 0.12, 0.16)
        break
      case 'land':
        this.tone('sine', 150, 70, t, 0.09, 0.2 * strength)
        this.hiss(t, 0.08, 0.05 * strength, 900)
        break
      case 'coin':
        this.tone('triangle', 988, 988, t, 0.06, 0.13)
        this.tone('triangle', 1319, 1319, t + 0.06, 0.16, 0.13)
        break
      case 'drop':
        this.hiss(t, 0.12, 0.08, 1400)
        break
      case 'bonk':
        this.tone('square', 190, 120, t, 0.06, 0.05)
        break
      case 'fall':
        this.tone('triangle', 520, 130, t, 0.3, 0.14)
        break
      case 'checkpoint':
        this.tone('triangle', 659, 659, t, 0.08, 0.12)
        this.tone('triangle', 880, 880, t + 0.08, 0.18, 0.12)
        break
      case 'flag':
        ;[523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, t + i * 0.09, i === 3 ? 0.35 : 0.1, 0.14))
        break
      case 'click':
        this.tone('sine', 880, 660, t, 0.04, 0.06)
        break
    }
  }
}
