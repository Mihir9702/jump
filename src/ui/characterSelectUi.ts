import { CHARACTER_CLASSES, type CharacterClass, saveSelectedClass } from '../sim/classes.ts'

export interface CharacterSelectCallbacks {
  onSelect: (heroClass: CharacterClass) => void
  onClose: () => void
}

export class CharacterSelectUi {
  private readonly modal: HTMLElement
  private readonly list: HTMLElement
  private readonly closeButton: HTMLButtonElement
  private selectedId: string
  private callbacks: CharacterSelectCallbacks
  private previousFocus: HTMLElement | null = null

  constructor(currentClassId: string, callbacks: CharacterSelectCallbacks) {
    this.selectedId = currentClassId
    this.callbacks = callbacks
    this.modal = document.getElementById('character-screen') as HTMLElement
    this.list = document.getElementById('character-list') as HTMLElement
    this.closeButton = document.getElementById('character-close') as HTMLButtonElement

    this.closeButton.addEventListener('click', () => this.close())
    // Tab must not escape a modal into the title's Play button.
    this.modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || this.modal.hidden) return
      const buttons = [
        this.closeButton,
        ...this.list.querySelectorAll<HTMLButtonElement>('.button-select-hero'),
      ]
      if (!buttons.length) return
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = index < 0
        ? 0
        : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      event.preventDefault()
      buttons[next]?.focus({ preventScroll: true })
    })

    this.render()
  }

  render(selectedId = this.selectedId) {
    this.selectedId = selectedId
    this.list.innerHTML = CHARACTER_CLASSES.map(cls => {
      const isSelected = cls.id === this.selectedId
      return `
        <article class="character-card ${isSelected ? 'selected' : ''}" data-class-id="${cls.id}" style="--class-color: ${cls.color}">
          <div class="card-header">
            <span class="card-icon">${cls.icon}</span>
            <div class="card-identity">
              <h3 class="card-name">${cls.name}</h3>
              <span class="card-title">${cls.title}</span>
            </div>
            ${isSelected ? '<span class="selected-badge">Active</span>' : ''}
          </div>
          <p class="card-quote">“${cls.quote}”</p>
          <div class="card-weapon">
            <span class="weapon-label">Signature look</span>
            <span class="weapon-name">${cls.weapon}</span>
          </div>
          <button class="button button-select-hero" type="button">
            ${isSelected ? 'Selected' : 'Choose Hero'}
          </button>
        </article>
      `
    }).join('')

    this.list.querySelectorAll<HTMLElement>('.character-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.classId
        if (!id) return
        const hero = CHARACTER_CLASSES.find(c => c.id === id)
        if (hero) {
          this.selectedId = hero.id
          saveSelectedClass(hero.id)
          this.render(hero.id)
          this.callbacks.onSelect(hero)
        }
      })
    })
    // Re-rendering removes the selected button; keep focus inside the dialog.
    if (this.isOpen()) this.focusSelected()
  }

  private focusSelected() {
    const button = [...this.list.querySelectorAll<HTMLButtonElement>('.button-select-hero')]
      .find(button => button.closest<HTMLElement>('[data-class-id]')?.dataset.classId === this.selectedId)
    button?.focus({ preventScroll: true })
  }

  moveFocus(step: number) {
    if (!this.isOpen()) return
    const buttons = [...this.list.querySelectorAll<HTMLButtonElement>('.button-select-hero')]
    if (!buttons.length) return
    const active = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const index = active < 0 ? (step < 0 ? buttons.length - 1 : 0)
      : (active + step + buttons.length) % buttons.length
    buttons[index]?.focus({ preventScroll: true })
  }

  activateFocused() {
    if (!this.isOpen()) return
    const focused = document.activeElement
    if (focused === this.closeButton) {
      this.close()
    } else if (focused instanceof HTMLButtonElement && this.list.contains(focused)) {
      focused.click()
    }
  }

  open(currentClassId?: string) {
    if (this.isOpen()) return
    this.previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : document.querySelector<HTMLElement>('[data-action="characters"]')
    if (currentClassId) this.selectedId = currentClassId
    this.render(this.selectedId)
    this.modal.hidden = false
    this.focusSelected()
  }

  close() {
    if (!this.isOpen()) return
    this.modal.hidden = true
    this.previousFocus?.focus({ preventScroll: true })
    this.previousFocus = null
    this.callbacks.onClose()
  }

  isOpen(): boolean {
    return !this.modal.hidden
  }
}
