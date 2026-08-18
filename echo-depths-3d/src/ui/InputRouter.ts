export const INPUT_ACTIONS = [
  'jump',
  'interact',
  'attack',
  'throw',
  'dash',
  'echo',
  'pause',
  'fullscreen',
] as const

export type InputAction = (typeof INPUT_ACTIONS)[number]

export interface InputFrame {
  readonly moveX: number
  readonly moveZ: number
  readonly cameraTurn: number
  readonly cameraYawDelta: number
  readonly cameraPitchDelta: number
  readonly held: Readonly<Record<InputAction, boolean>>
  readonly pressed: Readonly<Record<InputAction, boolean>>
}

export interface InputRouterOptions {
  readonly root?: ParentNode
  readonly moveZone?: HTMLElement
  readonly moveStick?: HTMLElement
  readonly cameraZone?: HTMLElement
  readonly cameraSensitivity?: number
  readonly joystickDeadZone?: number
  readonly onPauseRequest?: () => void
  readonly onFullscreenRequest?: () => void
}

type PointerRole = 'move' | 'camera' | 'action' | 'canvas'

interface ActivePointer {
  readonly role: PointerRole
  readonly target: HTMLElement
  readonly action?: InputAction
  readonly button: number
  readonly startX: number
  readonly startY: number
  lastX: number
  lastY: number
}

const RECOGNIZED_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
  'KeyQ',
  'KeyC',
])

const KEY_ACTIONS: Readonly<Partial<Record<string, InputAction>>> = {
  Space: 'jump',
  KeyE: 'interact',
  KeyJ: 'attack',
  KeyK: 'throw',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyR: 'echo',
  Escape: 'pause',
  KeyF: 'fullscreen',
}

const MAX_CAMERA_DELTA_PER_TICK = Math.PI * 0.18

function actionRecord(value: boolean): Record<InputAction, boolean> {
  return {
    jump: value,
    interact: value,
    attack: value,
    throw: value,
    dash: value,
    echo: value,
    pause: value,
    fullscreen: value,
  }
}

function isInputAction(value: string | undefined): value is InputAction {
  return value !== undefined && INPUT_ACTIONS.some((action) => action === value)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select')
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export class InputRouter {
  private readonly abortController = new AbortController()
  private readonly heldKeys = new Set<string>()
  private readonly heldActions = actionRecord(false)
  private readonly pressedActions = actionRecord(false)
  private readonly activePointers = new Map<number, ActivePointer>()
  private readonly moveZone: HTMLElement | null
  private readonly moveStick: HTMLElement | null
  private readonly cameraZone: HTMLElement | null
  private readonly root: ParentNode
  private readonly cameraSensitivity: number
  private readonly joystickDeadZone: number
  private readonly onPauseRequest: (() => void) | undefined
  private readonly onFullscreenRequest: (() => void) | undefined
  private enabled = true
  private joystickX = 0
  private joystickZ = 0
  private cameraYawDelta = 0
  private cameraPitchDelta = 0

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    options: InputRouterOptions = {},
  ) {
    this.root = options.root ?? document
    this.moveZone = options.moveZone ?? this.root.querySelector<HTMLElement>('#move-zone')
    this.moveStick = options.moveStick ?? this.root.querySelector<HTMLElement>('#move-stick')
    this.cameraZone = options.cameraZone ?? this.root.querySelector<HTMLElement>('#camera-zone')
    this.cameraSensitivity = options.cameraSensitivity ?? 0.006
    this.joystickDeadZone = clamp(options.joystickDeadZone ?? 0.14, 0, 0.8)
    this.onPauseRequest = options.onPauseRequest
    this.onFullscreenRequest = options.onFullscreenRequest

    this.canvas.tabIndex = 0
    this.canvas.setAttribute(
      'aria-keyshortcuts',
      'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight Q C E Space J K Shift R Escape F',
    )

    this.installKeyboard()
    this.installCanvasPointer()
    this.installTouchControls()
    this.installSafetyRelease()
  }

  public consumeFrame(): InputFrame {
    const frame = this.createFrame()
    this.cameraYawDelta = 0
    this.cameraPitchDelta = 0
    for (const action of INPUT_ACTIONS) this.pressedActions[action] = false
    return frame
  }

  public peekFrame(): InputFrame {
    return this.createFrame()
  }

  public isHeld(action: InputAction): boolean {
    return this.heldActions[action]
  }

  public consumePressed(action: InputAction): boolean {
    const pressed = this.pressedActions[action]
    this.pressedActions[action] = false
    return pressed
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.clear()
  }

  public clear(): void {
    this.heldKeys.clear()
    for (const action of INPUT_ACTIONS) {
      this.heldActions[action] = false
      this.pressedActions[action] = false
    }
    for (const [pointerId, pointer] of this.activePointers) {
      if (pointer.target.hasPointerCapture(pointerId)) {
        try {
          pointer.target.releasePointerCapture(pointerId)
        } catch {
          // The browser may already have released capture while hiding the page.
        }
      }
    }
    this.activePointers.clear()
    this.joystickX = 0
    this.joystickZ = 0
    this.cameraYawDelta = 0
    this.cameraPitchDelta = 0
    this.renderJoystick(0, 0)
  }

  public destroy(): void {
    this.clear()
    this.abortController.abort()
  }

  private createFrame(): InputFrame {
    let moveX = this.joystickX
    let moveZ = this.joystickZ
    moveX += Number(this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight'))
    moveX -= Number(this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft'))
    moveZ += Number(this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp'))
    moveZ -= Number(this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown'))
    const magnitude = Math.hypot(moveX, moveZ)
    if (magnitude > 1) {
      moveX /= magnitude
      moveZ /= magnitude
    }

    const cameraTurn = Number(this.heldKeys.has('KeyC')) - Number(this.heldKeys.has('KeyQ'))
    return {
      moveX,
      moveZ,
      cameraTurn,
      cameraYawDelta: this.cameraYawDelta,
      cameraPitchDelta: this.cameraPitchDelta,
      held: { ...this.heldActions },
      pressed: { ...this.pressedActions },
    }
  }

  private installKeyboard(): void {
    const signal = this.abortController.signal
    window.addEventListener(
      'keydown',
      (event) => {
        if (!this.enabled || isEditableTarget(event.target) || event.ctrlKey || event.metaKey) return
        const action = KEY_ACTIONS[event.code]
        if (!action && !RECOGNIZED_KEYS.has(event.code)) return
        event.preventDefault()
        this.heldKeys.add(event.code)
        if (action && !event.repeat) {
          this.pressAction(action)
          if (action === 'pause') this.onPauseRequest?.()
          if (action === 'fullscreen') this.onFullscreenRequest?.()
        }
      },
      { signal },
    )
    window.addEventListener(
      'keyup',
      (event) => {
        const action = KEY_ACTIONS[event.code]
        if (!action && !RECOGNIZED_KEYS.has(event.code)) return
        event.preventDefault()
        this.heldKeys.delete(event.code)
        if (action) this.releaseAction(action)
      },
      { signal },
    )
  }

  private installCanvasPointer(): void {
    const signal = this.abortController.signal
    this.canvas.addEventListener(
      'contextmenu',
      (event) => event.preventDefault(),
      { signal },
    )
    this.canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.enabled || event.pointerType === 'touch') return
        event.preventDefault()
        this.capturePointer(event, this.canvas, 'canvas')
        if (event.button === 0) this.pressAction('attack')
        if (event.button === 2) this.pressAction('throw')
      },
      { signal },
    )
    this.canvas.addEventListener(
      'pointermove',
      (event) => {
        const pointer = this.activePointers.get(event.pointerId)
        if (!this.enabled || pointer?.role !== 'canvas') return
        event.preventDefault()
        this.accumulateCamera(event.clientX - pointer.lastX, event.clientY - pointer.lastY)
        pointer.lastX = event.clientX
        pointer.lastY = event.clientY
      },
      { signal },
    )
  }

  private installTouchControls(): void {
    const signal = this.abortController.signal
    if (this.moveZone) {
      this.moveZone.addEventListener(
        'pointerdown',
        (event) => {
          if (!this.enabled || this.hasPointerRole('move')) return
          event.preventDefault()
          this.capturePointer(event, this.moveZone as HTMLElement, 'move')
          this.updateJoystick(event.clientX, event.clientY)
        },
        { signal },
      )
      this.moveZone.addEventListener(
        'pointermove',
        (event) => {
          if (this.activePointers.get(event.pointerId)?.role !== 'move') return
          event.preventDefault()
          this.updateJoystick(event.clientX, event.clientY)
        },
        { signal },
      )
    }

    if (this.cameraZone) {
      this.cameraZone.addEventListener(
        'pointerdown',
        (event) => {
          if (!this.enabled || this.hasPointerRole('camera')) return
          event.preventDefault()
          this.capturePointer(event, this.cameraZone as HTMLElement, 'camera')
        },
        { signal },
      )
      this.cameraZone.addEventListener(
        'pointermove',
        (event) => {
          const pointer = this.activePointers.get(event.pointerId)
          if (!this.enabled || pointer?.role !== 'camera') return
          event.preventDefault()
          this.accumulateCamera(event.clientX - pointer.lastX, event.clientY - pointer.lastY)
          pointer.lastX = event.clientX
          pointer.lastY = event.clientY
        },
        { signal },
      )
    }

    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => {
      const action = button.dataset.action
      if (!isInputAction(action)) return
      button.addEventListener(
        'pointerdown',
        (event) => {
          if (!this.enabled) return
          event.preventDefault()
          event.stopPropagation()
          this.capturePointer(event, button, 'action', action)
          this.pressAction(action)
        },
        { signal },
      )
    })
  }

  private installSafetyRelease(): void {
    const signal = this.abortController.signal
    const release = (event: PointerEvent) => this.endPointer(event.pointerId)
    window.addEventListener('pointerup', release, { capture: true, signal })
    window.addEventListener('pointercancel', release, { capture: true, signal })
    window.addEventListener('blur', () => this.clear(), { signal })
    window.addEventListener('orientationchange', () => this.clear(), { signal })
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState !== 'visible') this.clear()
      },
      { signal },
    )
  }

  private capturePointer(
    event: PointerEvent,
    target: HTMLElement,
    role: PointerRole,
    action?: InputAction,
  ): void {
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // Global release listeners still guarantee cleanup when capture is unavailable.
    }
    const pointer: ActivePointer = {
      role,
      target,
      button: event.button,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      ...(action ? { action } : {}),
    }
    this.activePointers.set(event.pointerId, pointer)
  }

  private endPointer(pointerId: number): void {
    const pointer = this.activePointers.get(pointerId)
    if (!pointer) return
    if (pointer.role === 'move') {
      this.joystickX = 0
      this.joystickZ = 0
      this.renderJoystick(0, 0)
    }
    if (pointer.role === 'action' && pointer.action) this.releaseAction(pointer.action)
    if (pointer.role === 'canvas') {
      if (pointer.button === 0) this.releaseAction('attack')
      if (pointer.button === 2) this.releaseAction('throw')
    }
    this.activePointers.delete(pointerId)
  }

  private pressAction(action: InputAction): void {
    if (!this.heldActions[action]) this.pressedActions[action] = true
    this.heldActions[action] = true
  }

  private releaseAction(action: InputAction): void {
    this.heldActions[action] = false
  }

  private hasPointerRole(role: PointerRole): boolean {
    for (const pointer of this.activePointers.values()) {
      if (pointer.role === role) return true
    }
    return false
  }

  private updateJoystick(clientX: number, clientY: number): void {
    if (!this.moveZone) return
    const bounds = this.moveZone.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    const radius = Math.max(24, Math.min(bounds.width, bounds.height) * 0.32)
    const rawX = clientX - centerX
    const rawY = clientY - centerY
    const distance = Math.hypot(rawX, rawY)
    const limitedDistance = Math.min(distance, radius)
    const directionX = distance > 0 ? rawX / distance : 0
    const directionY = distance > 0 ? rawY / distance : 0
    const normalized = limitedDistance / radius
    const strength = normalized <= this.joystickDeadZone
      ? 0
      : (normalized - this.joystickDeadZone) / (1 - this.joystickDeadZone)
    this.joystickX = directionX * strength
    this.joystickZ = -directionY * strength
    this.renderJoystick(directionX * limitedDistance, directionY * limitedDistance)
  }

  private renderJoystick(offsetX: number, offsetY: number): void {
    if (!this.moveStick) return
    this.moveStick.style.setProperty('--stick-x', `${offsetX.toFixed(2)}px`)
    this.moveStick.style.setProperty('--stick-y', `${offsetY.toFixed(2)}px`)
  }

  private accumulateCamera(deltaX: number, deltaY: number): void {
    this.cameraYawDelta = clamp(
      this.cameraYawDelta + deltaX * this.cameraSensitivity,
      -MAX_CAMERA_DELTA_PER_TICK,
      MAX_CAMERA_DELTA_PER_TICK,
    )
    this.cameraPitchDelta = clamp(
      this.cameraPitchDelta + deltaY * this.cameraSensitivity,
      -MAX_CAMERA_DELTA_PER_TICK,
      MAX_CAMERA_DELTA_PER_TICK,
    )
  }
}
