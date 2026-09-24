// Jump's own block lettering: a 5x7 grid face drawn for this game, rendered as SVG with a
// short extruded side so headings look like they are built from the same blocks as the
// world. Only used for short headings; everything else is set in the system font.
const glyphs: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ':': ['.', '#', '.', '.', '.', '#', '.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

const ROWS = 7
const DEPTH = 0.4
const SVG_NS = 'http://www.w3.org/2000/svg'

// Builds the SVG path data for a line of text, one rectangle per run of filled cells
function layout(text: string) {
  let face = ''
  let x = 0
  for (const char of text.toUpperCase()) {
    const glyph = glyphs[char] ?? glyphs[' ']!
    glyph.forEach((row, y) => {
      let start = -1
      for (let i = 0; i <= row.length; i++) {
        const filled = row[i] === '#'
        if (filled && start < 0) start = i
        if (!filled && start >= 0) {
          face += `M${x + start} ${y}h${i - start}v1h${start - i}z`
          start = -1
        }
      }
    })
    x += glyph[0]!.length + 1
  }
  return { face, width: Math.max(0, x - 1) }
}

// An aria-hidden SVG of the text; pair it with real text for screen readers
export function blockText(text: string): SVGSVGElement {
  const { face, width } = layout(text)
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width + DEPTH} ${ROWS + DEPTH}`)
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('block-text')
  const side = document.createElementNS(SVG_NS, 'path')
  side.setAttribute('d', face)
  side.setAttribute('transform', `translate(${DEPTH} ${DEPTH})`)
  side.setAttribute('class', 'block-text-side')
  const front = document.createElementNS(SVG_NS, 'path')
  front.setAttribute('d', face)
  front.setAttribute('class', 'block-text-face')
  svg.append(side, front)
  return svg
}

// Fills an element with block lettering while keeping the words readable to assistive tech
export function setBlockText(element: HTMLElement, text: string) {
  const label = document.createElement('span')
  label.className = 'sr-only'
  label.textContent = text
  element.replaceChildren(blockText(text), label)
}
