export function formatRecord(seconds: number) {
  const hundredths = Math.max(0, Math.round(seconds * 100))
  const minutes = Math.floor(hundredths / 6000)
  const rest = hundredths - minutes * 6000
  const whole = Math.floor(rest / 100)
  return `${minutes}:${String(whole).padStart(2, '0')}.${String(rest % 100).padStart(2, '0')}`
}

export function formatDelta(seconds: number) {
  const sign = seconds < 0 ? '-' : '+'
  return `${sign}${Math.abs(seconds).toFixed(2)}`
}
