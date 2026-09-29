import { progress } from '../progress/storage.ts'
import { parseLevel } from '../sim/level.ts'
import { futureWorlds, type WorldDefinition, worlds } from '../worlds/worlds.ts'
import { setBlockText } from './blockType.ts'
import { formatRecord } from './recordFormat.ts'

export interface SelectionActions {
  selectWorld(id: string): void
  selectLevel(id: string): void
}

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

const text = (tag: string, value: string, className?: string) => {
  const element = document.createElement(tag)
  element.textContent = value
  if (className) element.className = className
  return element
}

const medalName = (medal: string | null) =>
  medal ? `${medal[0]!.toUpperCase()}${medal.slice(1)}` : 'No medal yet'

export class SelectionUi {
  private readonly worldList = byId<HTMLElement>('world-list')
  private readonly levelList = byId<HTMLElement>('level-list')
  private readonly levelHeading = byId<HTMLElement>('level-heading')
  private readonly levelDescription = byId<HTMLElement>('level-description')
  private readonly worldRecord = byId<HTMLElement>('world-record')
  private readonly runWorldButton = byId<HTMLButtonElement>('run-world-button')

  constructor(actions: SelectionActions) {
    this.worldList.addEventListener('click', event => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-world-id]')
      const id = button?.dataset.worldId
      if (id) actions.selectWorld(id)
    })
    this.levelList.addEventListener('click', event => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-level-id]')
      const id = button?.dataset.levelId
      if (id) actions.selectLevel(id)
    })
  }

  renderWorlds() {
    const live = worlds.map((world, index) => {
      let medals = 0
      let coins = 0
      let totalCoins = 0
      for (const level of world.levels) {
        const record = progress.level(level)
        if (record.medal) medals += 1
        coins += record.bestCoins
        totalCoins += parseLevel(level.data).coins.length
      }

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'select-card world-card'
      button.dataset.worldId = world.id
      button.append(
        text('span', `WORLD ${index + 1}`, 'card-kicker'),
        text('strong', world.name, 'card-title'),
        text('span', world.description, 'card-copy'),
        text(
          'span',
          progress.world(world.id).bestTime === null
            ? 'No world time yet'
            : `World PB ${formatRecord(progress.world(world.id).bestTime!)}`,
          'card-record',
        ),
        text('span', `${medals}/${world.levels.length} medals · ${coins}/${totalCoins} coins`, 'card-meta'),
      )
      return button
    })

    const locked = futureWorlds.map((world, index) => {
      const card = document.createElement('div')
      card.className = 'select-card world-card locked'
      card.setAttribute('aria-disabled', 'true')
      card.append(
        text('span', `WORLD ${worlds.length + index + 1}`, 'card-kicker'),
        text('strong', world.name, 'card-title'),
        text('span', world.label, 'card-record'),
      )
      return card
    })

    this.worldList.replaceChildren(...live, ...locked)
  }

  renderLevels(world: WorldDefinition) {
    setBlockText(this.levelHeading, world.name)
    this.levelDescription.textContent = world.description
    const worldBest = progress.world(world.id).bestTime
    this.worldRecord.textContent =
      worldBest === null
        ? 'Complete all levels in one run to set a world PB.'
        : `World PB · ${formatRecord(worldBest)}`
    if (this.runWorldButton.firstChild) this.runWorldButton.firstChild.textContent = `Run ${world.name} `

    const cards = world.levels.map((level, index) => {
      const record = progress.level(level)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'select-card level-card'
      button.dataset.levelId = level.id
      button.append(
        text('span', String(index + 1).padStart(2, '0'), 'level-number'),
        text('strong', level.name, 'card-title'),
        text('span', medalName(record.medal), `medal medal-${record.medal ?? 'none'}`),
        text(
          'span',
          record.bestTime === null
            ? 'No PB yet'
            : `PB ${formatRecord(record.bestTime)}${progress.ghost(level) ? ' · Ghost ready' : ''}`,
          'card-record',
        ),
        text(
          'span',
          `Coins ${record.bestCoins}/${parseLevel(level.data).coins.length} · Fewest falls ${record.fewestFalls ?? '—'}`,
          'card-meta',
        ),
      )
      return button
    })
    this.levelList.replaceChildren(...cards)
  }
}
