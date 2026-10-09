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

  constructor(currentClassId: string, callbacks: CharacterSelectCallbacks) {
    this.selectedId = currentClassId
    this.callbacks = callbacks
    this.modal = document.getElementById('character-screen') as HTMLElement
    this.list = document.getElementById('character-list') as HTMLElement
    this.closeButton = document.getElementById('character-close') as HTMLButtonElement

    this.closeButton?.addEventListener('click', () => {
      this.close()
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
  }

  open(currentClassId?: string) {
    if (currentClassId) this.selectedId = currentClassId
    this.render(this.selectedId)
    this.modal.hidden = false
  }

  close() {
    this.modal.hidden = true
    this.callbacks.onClose()
  }

  isOpen(): boolean {
    return !this.modal.hidden
  }
}
