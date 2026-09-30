import { type Camera, Vector3 } from 'three'
import type { Input } from '../input/input.ts'
import { PLAYER_SIZE } from '../sim/tuning.ts'

export type ChatChannel = 'all' | 'local' | 'party' | 'system'

export interface ChatMessage {
  id: number
  channel: ChatChannel
  sender: string
  text: string
  time: string
  color?: string
}

export interface ChatCallbacks {
  onCommand: (command: string, args: string[]) => void
  onSendMessage: (channel: ChatChannel, text: string) => void
}

let nextMsgId = 1

export class ChatUi {
  private readonly container: HTMLElement
  private readonly messagesList: HTMLElement
  private readonly input: HTMLInputElement
  private readonly form: HTMLFormElement
  private readonly tabs: NodeListOf<HTMLButtonElement>
  private readonly bubbleOverlay: HTMLElement
  private currentChannel: ChatChannel = 'all'
  private messages: ChatMessage[] = []
  private activeBubble: { element: HTMLElement; expiresAt: number } | null = null
  private callbacks: ChatCallbacks
  private inputRef: Input | null = null

  constructor(callbacks: ChatCallbacks) {
    this.callbacks = callbacks
    this.container = document.getElementById('chat-hud') as HTMLElement
    this.messagesList = document.getElementById('chat-messages') as HTMLElement
    this.input = document.getElementById('chat-input') as HTMLInputElement
    this.form = document.getElementById('chat-form') as HTMLFormElement
    this.tabs = document.querySelectorAll<HTMLButtonElement>('.chat-tab')
    this.bubbleOverlay = document.getElementById('speech-bubble-overlay') as HTMLElement

    this.setupTabs()
    this.setupForm()

    // Add initial system greeting
    this.addSystemMessage('Welcome to Jump: MMORPG! Explore Sunset Haven hub, battle monsters, and travel through Runed Portals.')
    this.addSystemMessage('Press [Enter] to chat. Type /help for chat commands or /class <name> to switch heroes.')
  }

  attachInput(input: Input) {
    this.inputRef = input

    window.addEventListener('keydown', event => {
      // Press Enter to focus chat if not already typing
      if (event.key === 'Enter') {
        if (document.activeElement !== this.input) {
          event.preventDefault()
          this.focus()
        }
      } else if (event.key === 'Escape') {
        if (document.activeElement === this.input) {
          event.preventDefault()
          this.blur()
        }
      }
    })
  }

  private setupTabs() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        this.currentChannel = (tab.dataset.channel as ChatChannel) ?? 'all'
        this.renderMessages()
      })
    })

    const collapse = document.getElementById('chat-collapse')
    collapse?.addEventListener('click', () => {
      this.container.classList.toggle('collapsed')
      collapse.textContent = this.container.classList.contains('collapsed') ? '▴' : '▾'
    })
  }

  private setupForm() {
    this.input.addEventListener('focus', () => {
      this.inputRef?.setTyping(true)
      this.container.classList.add('focused')
    })

    this.input.addEventListener('blur', () => {
      this.inputRef?.setTyping(false)
      this.container.classList.remove('focused')
    })

    this.form.addEventListener('submit', event => {
      event.preventDefault()
      const raw = this.input.value.trim()
      this.input.value = ''
      this.blur()

      if (!raw) return

      if (raw.startsWith('/')) {
        const parts = raw.slice(1).split(/\s+/)
        const cmd = parts[0]?.toLowerCase() ?? ''
        const args = parts.slice(1)
        this.callbacks.onCommand(cmd, args)
      } else {
        this.callbacks.onSendMessage(this.currentChannel, raw)
      }
    })
  }

  focus() {
    this.input.focus()
  }

  blur() {
    this.input.blur()
  }

  addSystemMessage(text: string) {
    this.addMessage('system', 'System', text, '#38bdf8')
  }

  addMessage(channel: ChatChannel, sender: string, text: string, color?: string) {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const msg: ChatMessage = {
      id: nextMsgId++,
      channel,
      sender,
      text,
      time: timeStr,
      color,
    }
    this.messages.push(msg)
    if (this.messages.length > 80) this.messages.shift()
    this.renderMessages()
  }

  showSpeechBubble(sender: string, text: string, color = '#6366f1') {
    if (this.activeBubble) {
      this.activeBubble.element.remove()
      this.activeBubble = null
    }

    const bubble = document.createElement('div')
    bubble.className = 'speech-bubble'
    bubble.innerHTML = `
      <div class="bubble-sender" style="color: ${color}">${sender}</div>
      <div class="bubble-body">${escapeHtml(text)}</div>
      <div class="bubble-arrow"></div>
    `
    this.bubbleOverlay.appendChild(bubble)
    this.activeBubble = {
      element: bubble,
      expiresAt: performance.now() + 4200,
    }
  }

  updateBubblePosition(camera: Camera, width: number, height: number, playerX: number, playerY: number) {
    if (!this.activeBubble) return
    const now = performance.now()
    if (now > this.activeBubble.expiresAt) {
      this.activeBubble.element.classList.add('fade-out')
      setTimeout(() => {
        this.activeBubble?.element.remove()
        this.activeBubble = null
      }, 300)
      return
    }

    // Project player position to screen coordinates
    // Head position is playerY + PLAYER_SIZE + 0.35
    const headX = playerX
    const headY = playerY + PLAYER_SIZE + 0.35
    const p = new Vector3(headX, headY, 0)
    p.project(camera)

    const screenX = ((p.x + 1) / 2) * width
    const screenY = ((-p.y + 1) / 2) * height

    this.activeBubble.element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`
  }

  private renderMessages() {
    const filtered = this.currentChannel === 'all'
      ? this.messages
      : this.messages.filter(m => m.channel === this.currentChannel || m.channel === 'system')

    this.messagesList.innerHTML = filtered
      .map(
        m => `
        <div class="chat-msg chat-${m.channel}">
          <span class="chat-time">${m.time}</span>
          <span class="chat-badge">[${capitalize(m.channel)}]</span>
          <span class="chat-sender" ${m.color ? `style="color: ${m.color}"` : ''}>${escapeHtml(m.sender)}:</span>
          <span class="chat-body">${escapeHtml(m.text)}</span>
        </div>`,
      )
      .join('')

    this.messagesList.scrollTop = this.messagesList.scrollHeight
  }

  clear() {
    this.messages = []
    this.renderMessages()
    this.addSystemMessage('Chat history cleared.')
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
