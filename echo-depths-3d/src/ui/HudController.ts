import {
  CHAPTER_IDS,
  STAT_COPY,
  applyTranslations,
  chapterCopy,
  failureCopy,
  isLanguage,
  objectiveCopy,
  translate,
  type ChapterId,
  type FailureReason,
  type Language,
  type ObjectiveId,
  type TranslationKey,
} from './i18n'

export type HudMode =
  | 'loading'
  | 'language'
  | 'title'
  | 'playing'
  | 'paused'
  | 'settings'
  | 'chapter-complete'
  | 'ending'
  | 'error'

export type FeedbackTone = 'info' | 'success' | 'warning' | 'danger'
export type EchoHudMode = 'idle' | 'recording' | 'ready' | 'replaying' | 'holding'

export interface EchoHudState {
  readonly mode: EchoHudMode
  readonly elapsedMs: number
  readonly durationMs: number
  readonly loop?: number
}

export interface EndingStats {
  readonly elapsedMs: number
  readonly echoes: number
  readonly failures: number
  readonly restarts: number
  readonly chaptersCleared: number
  readonly rank: string
}

export interface ChapterSelectState {
  readonly unlockedThrough: ChapterId
  readonly completed: readonly ChapterId[]
}

export interface HudCallbacks {
  readonly onLanguageChange: (language: Language) => void
  readonly onStart: () => void
  readonly onChapterSelectRequested: () => void
  readonly onChapterSelected: (chapter: ChapterId) => void
  readonly onPause: () => void
  readonly onResume: () => void
  readonly onRestartChapter: () => void
  readonly onReturnToTitle: () => void
  readonly onContinue: () => void
  readonly onReplay: () => void
  readonly onTutorialContinue: () => void
  readonly onTutorialSkip: () => void
  readonly onFullscreenRequest: () => void
  readonly onSoundToggle: (enabled: boolean) => void
  readonly onReload: () => void
  readonly onRotationPauseChange: (required: boolean) => void
}

export interface HudControllerOptions {
  readonly root?: ParentNode
  readonly language?: Language
  readonly callbacks?: Partial<HudCallbacks>
}

const ECHO_LABELS: Readonly<Record<EchoHudMode, TranslationKey>> = {
  idle: 'echoIdle',
  recording: 'echoRecording',
  ready: 'echoReady',
  replaying: 'echoReplaying',
  holding: 'echoHolding',
}

const TUTORIAL_STEP_KEYS: Readonly<Record<string, TranslationKey>> = {
  move: 'tutorialStepMove',
  camera: 'tutorialStepCamera',
  jump: 'tutorialStepJump',
  interact: 'tutorialStepInteract',
  carry: 'tutorialStepCarry',
  echo: 'tutorialStepEcho',
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Required HUD element is missing: ${selector}`)
  return element
}

function setScreenVisible(screen: HTMLElement, visible: boolean): void {
  screen.hidden = !visible
  screen.classList.toggle('screen--visible', visible)
  screen.inert = !visible
  screen.setAttribute('aria-hidden', String(!visible))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export class HudController {
  private readonly root: ParentNode
  private readonly ownerDocument: Document
  private readonly abortController = new AbortController()
  private callbacks: Partial<HudCallbacks>
  private readonly screens: readonly HTMLElement[]
  private readonly loadingScreen: HTMLElement
  private readonly languageScreen: HTMLElement
  private readonly titleScreen: HTMLElement
  private readonly pauseScreen: HTMLElement
  private readonly settingsScreen: HTMLElement
  private readonly completeScreen: HTMLElement
  private readonly endingScreen: HTMLElement
  private readonly rotationScreen: HTMLElement
  private readonly errorScreen: HTMLElement
  private readonly hud: HTMLElement
  private readonly mobileControls: HTMLElement
  private readonly loadingLabel: HTMLElement
  private readonly loadingProgress: HTMLElement
  private readonly loadingTrack: HTMLElement
  private readonly chapterSelect: HTMLElement
  private readonly chapterNumber: HTMLElement
  private readonly chapterName: HTMLElement
  private readonly objectiveText: HTMLElement
  private readonly echoStatus: HTMLElement
  private readonly timerStatus: HTMLElement
  private readonly feedback: HTMLElement
  private readonly interactPrompt: HTMLElement
  private readonly echoTimelineFill: HTMLElement
  private readonly tutorialPanel: HTMLElement
  private readonly tutorialTitle: HTMLElement
  private readonly tutorialCopy: HTMLElement
  private readonly tutorialSteps: HTMLOListElement
  private readonly tutorialContinueButton: HTMLButtonElement
  private readonly tutorialSkipButton: HTMLButtonElement
  private readonly completeTitle: HTMLElement
  private readonly completeSummary: HTMLElement
  private readonly endingStats: HTMLElement
  private readonly finalRank: HTMLElement
  private readonly errorMessage: HTMLElement
  private readonly titleSoundButton: HTMLButtonElement
  private readonly hudSoundButton: HTMLButtonElement
  private readonly settingsSoundButton: HTMLButtonElement
  private readonly settingsLanguageButtons: readonly HTMLButtonElement[]
  private readonly settingsCloseButton: HTMLButtonElement
  private readonly settingsFullscreenButton: HTMLButtonElement
  private readonly pauseButton: HTMLButtonElement
  private readonly moveZone: HTMLElement
  private readonly cameraZone: HTMLElement
  private readonly fullscreenButtons: readonly HTMLButtonElement[]
  private mode: HudMode = 'loading'
  private language: Language
  private chapter: ChapterId = 1
  private objectiveOverride: string | null = null
  private soundEnabled = true
  private fullscreen = false
  private mobileControlsEnabled = false
  private rotationRequired = false
  private feedbackTimer: number | undefined
  private echoState: EchoHudState = { mode: 'idle', elapsedMs: 0, durationMs: 0 }
  private timerMs = 0
  private chapterState: ChapterSelectState = { unlockedThrough: 5, completed: [] }
  private latestEndingStats: EndingStats | null = null
  private tutorialActive = false
  private tutorialStepOrder: readonly string[] = []
  private tutorialCompleted = new Set<string>()
  private tutorialReady = false
  private settingsReturnMode: 'title' | 'paused' = 'title'
  private settingsOpener: HTMLElement | null = null

  public constructor(options: HudControllerOptions = {}) {
    this.root = options.root ?? document
    this.ownerDocument = this.root instanceof Document
      ? this.root
      : ((this.root as Node).ownerDocument ?? document)
    this.language = options.language ?? 'en'
    this.callbacks = options.callbacks ?? {}

    this.loadingScreen = requiredElement(this.root, '#loading-screen')
    this.languageScreen = requiredElement(this.root, '#language-screen')
    this.titleScreen = requiredElement(this.root, '#title-screen')
    this.pauseScreen = requiredElement(this.root, '#pause-screen')
    this.settingsScreen = requiredElement(this.root, '#settings-screen')
    this.completeScreen = requiredElement(this.root, '#chapter-complete')
    this.endingScreen = requiredElement(this.root, '#ending-screen')
    this.rotationScreen = requiredElement(this.root, '#rotation-screen')
    this.errorScreen = requiredElement(this.root, '#error-screen')
    this.screens = [
      this.loadingScreen,
      this.languageScreen,
      this.titleScreen,
      this.pauseScreen,
      this.settingsScreen,
      this.completeScreen,
      this.endingScreen,
      this.rotationScreen,
      this.errorScreen,
    ]
    this.hud = requiredElement(this.root, '#hud')
    this.mobileControls = requiredElement(this.root, '#mobile-controls')
    this.loadingLabel = requiredElement(this.root, '#loading-label')
    this.loadingProgress = requiredElement(this.root, '#loading-progress')
    this.loadingTrack = requiredElement(this.loadingScreen, '.progress-track')
    this.chapterSelect = requiredElement(this.root, '#chapter-select')
    this.chapterNumber = requiredElement(this.root, '#chapter-number')
    this.chapterName = requiredElement(this.root, '#chapter-name')
    this.objectiveText = requiredElement(this.root, '#objective-text')
    this.echoStatus = requiredElement(this.root, '#echo-status')
    this.timerStatus = requiredElement(this.root, '#timer-status')
    this.feedback = requiredElement(this.root, '#feedback')
    this.interactPrompt = requiredElement(this.root, '#interact-prompt')
    this.echoTimelineFill = requiredElement(this.root, '#echo-timeline-fill')
    this.tutorialPanel = requiredElement(this.root, '#tutorial-panel')
    this.tutorialTitle = requiredElement(this.root, '#tutorial-title')
    this.tutorialCopy = requiredElement(this.root, '#tutorial-copy')
    this.tutorialSteps = requiredElement(this.root, '#tutorial-steps')
    this.tutorialContinueButton = requiredElement(this.root, '#tutorial-continue')
    this.tutorialSkipButton = requiredElement(this.root, '#tutorial-skip')
    this.completeTitle = requiredElement(this.root, '#complete-title')
    this.completeSummary = requiredElement(this.root, '#complete-summary')
    this.endingStats = requiredElement(this.root, '#ending-stats')
    this.finalRank = requiredElement(this.root, '#final-rank')
    this.errorMessage = requiredElement(this.root, '#error-message')
    this.titleSoundButton = requiredElement(this.root, '#sound-button')
    this.hudSoundButton = requiredElement(this.root, '#hud-sound')
    this.settingsSoundButton = requiredElement(this.root, '#settings-sound')
    this.settingsLanguageButtons = [...this.root.querySelectorAll<HTMLButtonElement>('[data-settings-language]')]
    this.settingsCloseButton = requiredElement(this.root, '#settings-close')
    this.settingsFullscreenButton = requiredElement(this.root, '#settings-fullscreen')
    this.pauseButton = requiredElement(this.root, '#pause-button')
    this.moveZone = requiredElement(this.root, '#move-zone')
    this.cameraZone = requiredElement(this.root, '#camera-zone')
    this.fullscreenButtons = [
      requiredElement(this.root, '#title-fullscreen'),
      requiredElement(this.root, '#hud-fullscreen'),
      requiredElement(this.root, '#pause-fullscreen'),
      this.settingsFullscreenButton,
    ]

    this.installControls()
    this.setLanguage(this.language)
    this.setChapter(this.chapter)
    this.setEchoState(this.echoState)
    this.setTimer(0)
    this.showLoading(0)
  }

  public get currentMode(): HudMode {
    return this.mode
  }

  public get currentLanguage(): Language {
    return this.language
  }

  public setCallbacks(callbacks: Partial<HudCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public setLanguage(language: Language): void {
    this.language = language
    this.ownerDocument.documentElement.lang = language
    applyTranslations(language, this.root)
    this.loadingLabel.textContent = translate(language, 'loading')
    this.loadingTrack.setAttribute('aria-label', translate(language, 'loadingAria'))
    this.pauseButton.setAttribute('aria-label', translate(language, 'statusPause'))
    this.pauseButton.title = translate(language, 'statusPause')
    this.mobileControls.setAttribute('aria-label', translate(language, 'touchControls'))
    this.moveZone.setAttribute('aria-label', translate(language, 'moveControl'))
    this.cameraZone.setAttribute('aria-label', translate(language, 'cameraControl'))
    this.setSoundEnabled(this.soundEnabled)
    this.setFullscreenState(this.ownerDocument.fullscreenElement !== null || this.fullscreen)
    if (this.tutorialActive) this.renderTutorial()
    else this.setChapter(this.chapter, this.objectiveOverride)
    this.setEchoState(this.echoState)
    this.setTimer(this.timerMs)
    this.settingsLanguageButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.settingsLanguage === language))
    })
    this.renderChapterSelect()
    if (this.latestEndingStats) this.renderEndingStats(this.latestEndingStats)
  }

  public showLoading(progress = 0, label?: string): void {
    this.activateMode('loading')
    this.setLoadingProgress(progress, label)
  }

  public setLoadingProgress(progress: number, label?: string): void {
    const percent = Math.round(clamp(progress, 0, 1) * 100)
    this.loadingProgress.style.width = `${percent}%`
    this.loadingTrack.setAttribute('aria-valuenow', String(percent))
    this.loadingLabel.textContent = label
      ? `${translate(this.language, 'loadingDetail')} · ${label}`
      : translate(this.language, 'loading')
  }

  public showLanguage(): void {
    this.activateMode('language')
  }

  public showTitle(openChapterSelect = false): void {
    this.activateMode('title')
    this.chapterSelect.hidden = !openChapterSelect
    if (openChapterSelect) this.renderChapterSelect()
  }

  public showPlaying(): void {
    this.activateMode('playing')
  }

  public showPause(): void {
    this.activateMode('paused')
  }

  public showSettings(returnMode: 'title' | 'paused', opener?: HTMLElement): void {
    this.settingsReturnMode = returnMode
    this.settingsOpener = opener ?? null
    this.activateMode('settings')
    queueMicrotask(() => this.settingsCloseButton.focus())
  }

  public closeSettings(): void {
    if (this.settingsReturnMode === 'paused') this.showPause()
    else this.showTitle()
    const opener = this.settingsOpener
    this.settingsOpener = null
    queueMicrotask(() => opener?.focus())
  }

  public showChapterComplete(chapter: ChapterId = this.chapter, summary?: string): void {
    const copy = chapterCopy(this.language, chapter)
    this.completeTitle.textContent = copy.name
    this.completeSummary.textContent = summary ?? copy.complete
    this.activateMode('chapter-complete')
  }

  public showEnding(stats: EndingStats): void {
    this.latestEndingStats = { ...stats }
    this.finalRank.textContent = stats.rank
    this.renderEndingStats(stats)
    this.activateMode('ending')
  }

  public setRotationRequired(required: boolean): void {
    if (this.rotationRequired === required) return
    this.rotationRequired = required
    setScreenVisible(this.rotationScreen, required)
    this.refreshMobileControls()
    this.callbacks.onRotationPauseChange?.(required)
  }

  public showError(message: string): void {
    this.errorMessage.textContent = message
    this.activateMode('error')
  }

  public showErrorKey(key: Extract<TranslationKey, `error${string}`>): void {
    this.showError(translate(this.language, key))
  }

  public setChapter(chapter: ChapterId, objective?: string | null): void {
    this.chapter = chapter
    this.objectiveOverride = objective ?? null
    const copy = chapterCopy(this.language, chapter)
    this.chapterNumber.textContent = `${String(chapter).padStart(2, '0')} / 05`
    this.chapterName.textContent = copy.name
    this.objectiveText.textContent = this.objectiveOverride ?? copy.objective
  }

  public setTutorialProgress(steps: readonly string[], completed: ReadonlySet<string>, ready: boolean): void {
    this.tutorialActive = true
    this.tutorialStepOrder = [...steps]
    this.tutorialCompleted = new Set(completed)
    this.tutorialReady = ready
    this.tutorialPanel.hidden = false
    this.tutorialPanel.setAttribute('aria-hidden', 'false')
    this.chapterNumber.textContent = '00 / 05'
    this.chapterName.textContent = translate(this.language, 'tutorialName')
    this.objectiveText.textContent = translate(this.language, 'tutorialBody')
    this.renderTutorial()
  }

  public clearTutorial(): void {
    this.tutorialActive = false
    this.tutorialStepOrder = []
    this.tutorialCompleted.clear()
    this.tutorialReady = false
    this.tutorialPanel.hidden = true
    this.tutorialPanel.setAttribute('aria-hidden', 'true')
  }

  public setObjective(objective: string): void {
    this.objectiveOverride = objective
    this.objectiveText.textContent = objective
  }

  public setObjectiveId(objective: ObjectiveId): void {
    this.setObjective(objectiveCopy(this.language, objective))
  }

  public resetObjective(): void {
    this.setChapter(this.chapter)
  }

  public setEchoState(state: EchoHudState): void {
    this.echoState = { ...state }
    const duration = Math.max(0, state.durationMs)
    const elapsed = duration > 0
      ? clamp(state.elapsedMs, 0, duration)
      : Math.max(0, state.elapsedMs)
    const fraction = duration > 0 ? clamp(elapsed / duration, 0, 1) : 0
    const label = translate(this.language, ECHO_LABELS[state.mode])
    const time = duration > 0 ? ` · ${this.formatDuration(elapsed)} / ${this.formatDuration(duration)}` : ''
    const loop = state.loop === undefined ? '' : ` · #${state.loop}`
    this.echoStatus.textContent = `${label}${time}${loop}`
    this.echoStatus.dataset.mode = state.mode
    this.echoTimelineFill.style.width = `${Math.round(fraction * 100)}%`
  }

  public setTimer(milliseconds: number, urgentThresholdMs = 10_000): void {
    this.timerMs = Math.max(0, milliseconds)
    this.timerStatus.textContent = `${translate(this.language, 'timerLabel')} · ${this.formatDuration(this.timerMs)}`
    this.timerStatus.classList.toggle('is-urgent', this.timerMs > 0 && this.timerMs <= urgentThresholdMs)
  }

  public showFeedback(message: string, tone: FeedbackTone = 'info', durationMs = 2_600): void {
    if (this.feedbackTimer !== undefined) window.clearTimeout(this.feedbackTimer)
    this.feedback.textContent = message
    this.feedback.dataset.tone = tone
    this.feedback.classList.add('feedback--visible')
    if (durationMs > 0) {
      this.feedbackTimer = window.setTimeout(() => {
        this.feedback.classList.remove('feedback--visible')
        this.feedbackTimer = undefined
      }, durationMs)
    }
  }

  public showFeedbackKey(key: TranslationKey, tone: FeedbackTone = 'info', durationMs = 2_600): void {
    this.showFeedback(translate(this.language, key), tone, durationMs)
  }

  public showFailure(reason: FailureReason): void {
    this.showFeedback(failureCopy(this.language, reason), 'danger', 4_000)
  }

  public setInteractPrompt(message: string | null): void {
    this.interactPrompt.textContent = message ?? ''
    this.interactPrompt.classList.toggle('interact-prompt--visible', Boolean(message))
  }

  public setInteractPromptKey(key: TranslationKey | null): void {
    this.setInteractPrompt(key ? translate(this.language, key) : null)
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
    const label = translate(this.language, enabled ? 'soundOn' : 'soundOff')
    const status = translate(this.language, enabled ? 'statusSoundOn' : 'statusSoundOff')
    this.titleSoundButton.textContent = label
    this.titleSoundButton.setAttribute('aria-label', status)
    this.hudSoundButton.textContent = enabled ? '◐' : '○'
    this.hudSoundButton.setAttribute('aria-label', status)
    this.hudSoundButton.title = status
    this.settingsSoundButton.textContent = label
    this.settingsSoundButton.setAttribute('aria-label', status)
    this.settingsSoundButton.setAttribute('aria-pressed', String(enabled))
  }

  public setFullscreenState(fullscreen: boolean): void {
    this.fullscreen = fullscreen
    const label = translate(this.language, fullscreen ? 'statusWindowed' : 'statusFullscreen')
    this.fullscreenButtons.forEach((button) => {
      button.setAttribute('aria-label', label)
      button.title = label
    })
    this.settingsFullscreenButton.textContent = translate(this.language, fullscreen ? 'exitFullscreen' : 'fullscreen')
    this.settingsFullscreenButton.setAttribute('aria-pressed', String(fullscreen))
  }

  public setMobileControlsEnabled(enabled: boolean): void {
    this.mobileControlsEnabled = enabled
    this.refreshMobileControls()
  }

  public setChapterSelectState(state: ChapterSelectState): void {
    this.chapterState = {
      unlockedThrough: state.unlockedThrough,
      completed: [...state.completed],
    }
    this.renderChapterSelect()
  }

  public openChapterSelect(): void {
    if (this.mode !== 'title') this.showTitle(true)
    else {
      this.chapterSelect.hidden = false
      this.renderChapterSelect()
    }
  }

  public closeChapterSelect(): void {
    this.chapterSelect.hidden = true
  }

  public async toggleFullscreen(): Promise<boolean> {
    try {
      if (this.ownerDocument.fullscreenElement) {
        await this.ownerDocument.exitFullscreen()
        return false
      }
      await this.ownerDocument.documentElement.requestFullscreen()
      const orientation = screen.orientation
      if (orientation && 'lock' in orientation) {
        try {
          await orientation.lock('landscape')
        } catch {
          // Orientation locking is optional and commonly denied outside installed apps.
        }
      }
      return true
    } catch {
      return this.ownerDocument.fullscreenElement !== null
    }
  }

  public destroy(): void {
    if (this.feedbackTimer !== undefined) window.clearTimeout(this.feedbackTimer)
    this.feedbackTimer = undefined
    this.abortController.abort()
  }

  private installControls(): void {
    const signal = this.abortController.signal
    this.root.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const language = button.dataset.language
          if (!language || !isLanguage(language)) return
          this.setLanguage(language)
          this.callbacks.onLanguageChange?.(language)
          this.showTitle()
        },
        { signal },
      )
    })

    this.listenButton('#start-button', () => this.callbacks.onStart?.())
    this.listenButton('#chapter-button', () => {
      this.callbacks.onChapterSelectRequested?.()
      if (this.chapterSelect.hidden) this.openChapterSelect()
      else this.closeChapterSelect()
    })
    const titleSettingsButton = requiredElement<HTMLButtonElement>(this.root, '#title-settings')
    titleSettingsButton.addEventListener('click', () => this.showSettings('title', titleSettingsButton), { signal })
    this.listenButton('#pause-button', () => {
      this.showPause()
      this.callbacks.onPause?.()
    })
    this.listenButton('#resume-button', () => {
      this.showPlaying()
      this.callbacks.onResume?.()
    })
    this.listenButton('#restart-button', () => {
      this.showPlaying()
      this.callbacks.onRestartChapter?.()
    })
    const pauseSettingsButton = requiredElement<HTMLButtonElement>(this.root, '#pause-settings')
    pauseSettingsButton.addEventListener('click', () => this.showSettings('paused', pauseSettingsButton), { signal })
    this.listenButton('#quit-button', () => {
      this.showTitle()
      this.callbacks.onReturnToTitle?.()
    })
    this.listenButton('#continue-button', () => this.callbacks.onContinue?.())
    this.listenButton('#tutorial-continue', () => this.callbacks.onTutorialContinue?.())
    this.listenButton('#tutorial-skip', () => this.callbacks.onTutorialSkip?.())
    this.listenButton('#replay-button', () => this.callbacks.onReplay?.())
    this.listenButton('#ending-chapters', () => {
      this.showTitle(true)
      this.callbacks.onChapterSelectRequested?.()
    })
    this.listenButton('#sound-button', () => this.toggleSound())
    this.listenButton('#hud-sound', () => this.toggleSound())
    this.listenButton('#settings-sound', () => this.toggleSound())
    this.listenButton('#settings-close', () => this.closeSettings())
    this.settingsLanguageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const language = button.dataset.settingsLanguage
        if (!language || !isLanguage(language)) return
        this.setLanguage(language)
        this.callbacks.onLanguageChange?.(language)
      }, { signal })
    })
    this.fullscreenButtons.forEach((button) => {
      button.addEventListener('click', () => this.requestFullscreen(), { signal })
    })
    this.listenButton('#error-reload', () => {
      if (this.callbacks.onReload) this.callbacks.onReload()
      else window.location.reload()
    })

    this.ownerDocument.addEventListener(
      'fullscreenchange',
      () => this.setFullscreenState(this.ownerDocument.fullscreenElement !== null),
      { signal },
    )
    this.ownerDocument.addEventListener(
      'keydown',
      (event) => {
        if (this.mode === 'language' && (event.code === 'Digit1' || event.code === 'Numpad1')) {
          event.preventDefault()
          this.selectLanguage('en')
        } else if (this.mode === 'language' && (event.code === 'Digit2' || event.code === 'Numpad2')) {
          event.preventDefault()
          this.selectLanguage('ko')
        } else if (this.mode === 'title' && event.code === 'Enter' && this.chapterSelect.hidden) {
          event.preventDefault()
          this.callbacks.onStart?.()
        } else if (this.mode === 'title' && event.code === 'Escape' && !this.chapterSelect.hidden) {
          event.preventDefault()
          this.closeChapterSelect()
        } else if (this.mode === 'settings' && event.code === 'Escape') {
          event.preventDefault()
          this.closeSettings()
        }
      },
      { signal },
    )
  }

  private listenButton(selector: string, listener: () => void): void {
    requiredElement<HTMLButtonElement>(this.root, selector).addEventListener('click', listener, {
      signal: this.abortController.signal,
    })
  }

  private selectLanguage(language: Language): void {
    this.setLanguage(language)
    this.callbacks.onLanguageChange?.(language)
    this.showTitle()
  }

  private toggleSound(): void {
    this.setSoundEnabled(!this.soundEnabled)
    this.callbacks.onSoundToggle?.(this.soundEnabled)
  }

  private requestFullscreen(): void {
    if (this.callbacks.onFullscreenRequest) this.callbacks.onFullscreenRequest()
    else void this.toggleFullscreen()
  }

  private renderTutorial(): void {
    if (!this.tutorialActive) return
    this.tutorialTitle.textContent = translate(this.language, 'tutorialName')
    this.tutorialCopy.textContent = translate(this.language, 'tutorialBody')
    this.tutorialSteps.replaceChildren()
    for (const step of this.tutorialStepOrder) {
      const item = this.ownerDocument.createElement('li')
      const complete = this.tutorialCompleted.has(step)
      item.classList.toggle('is-complete', complete)
      item.textContent = `${complete ? '✓' : '○'} ${translate(this.language, TUTORIAL_STEP_KEYS[step] ?? 'tutorialStepMove')}`
      this.tutorialSteps.append(item)
    }
    this.tutorialContinueButton.hidden = !this.tutorialReady
    this.tutorialSkipButton.hidden = this.tutorialReady
  }

  private activateMode(mode: HudMode): void {
    this.mode = mode
    this.screens.forEach((screen) => setScreenVisible(screen, false))
    const activeScreen = this.screenForMode(mode)
    if (activeScreen) setScreenVisible(activeScreen, true)
    const gameVisible = mode === 'playing' || mode === 'paused' || mode === 'chapter-complete'
    this.hud.hidden = !gameVisible
    this.hud.setAttribute('aria-hidden', String(!gameVisible))
    if (this.rotationRequired) setScreenVisible(this.rotationScreen, true)
    this.refreshMobileControls()
  }

  private screenForMode(mode: HudMode): HTMLElement | null {
    switch (mode) {
      case 'loading':
        return this.loadingScreen
      case 'language':
        return this.languageScreen
      case 'title':
        return this.titleScreen
      case 'paused':
        return this.pauseScreen
      case 'settings':
        return this.settingsScreen
      case 'chapter-complete':
        return this.completeScreen
      case 'ending':
        return this.endingScreen
      case 'error':
        return this.errorScreen
      case 'playing':
        return null
    }
  }

  private refreshMobileControls(): void {
    const visible = this.mobileControlsEnabled && this.mode === 'playing' && !this.rotationRequired
    this.mobileControls.hidden = !visible
    this.mobileControls.setAttribute('aria-hidden', String(!visible))
  }

  private renderChapterSelect(): void {
    this.chapterSelect.replaceChildren()
    const heading = this.ownerDocument.createElement('div')
    heading.className = 'chapter-select__heading'
    const title = this.ownerDocument.createElement('strong')
    title.textContent = translate(this.language, 'chapterSelectTitle')
    const hint = this.ownerDocument.createElement('span')
    hint.textContent = translate(this.language, 'chapterSelectHint')
    heading.append(title, hint)

    const list = this.ownerDocument.createElement('div')
    list.className = 'chapter-select__grid'
    for (const chapter of CHAPTER_IDS) {
      const unlocked = chapter <= this.chapterState.unlockedThrough
      const completed = this.chapterState.completed.includes(chapter)
      const copy = chapterCopy(this.language, chapter)
      const button = this.ownerDocument.createElement('button')
      button.type = 'button'
      button.className = 'chapter-card'
      button.disabled = !unlocked
      button.dataset.chapter = String(chapter)
      const number = this.ownerDocument.createElement('span')
      number.className = 'chapter-card__number'
      number.textContent = String(chapter).padStart(2, '0')
      const name = this.ownerDocument.createElement('strong')
      name.textContent = copy.name
      const objective = this.ownerDocument.createElement('span')
      objective.className = 'chapter-card__objective'
      objective.textContent = copy.objective
      const status = this.ownerDocument.createElement('span')
      status.className = 'chapter-card__status'
      status.textContent = translate(
        this.language,
        completed ? 'chapterCleared' : unlocked ? 'chapterAvailable' : 'chapterLocked',
      )
      button.append(number, name, objective, status)
      button.addEventListener(
        'click',
        () => {
          this.closeChapterSelect()
          this.callbacks.onChapterSelected?.(chapter)
        },
        { signal: this.abortController.signal },
      )
      list.append(button)
    }
    this.chapterSelect.append(heading, list)
  }

  private renderEndingStats(stats: EndingStats): void {
    this.endingStats.replaceChildren()
    const values: Readonly<Record<keyof typeof STAT_COPY, string>> = {
      playTime: this.formatDuration(stats.elapsedMs),
      echoes: String(stats.echoes),
      failures: String(stats.failures),
      restarts: String(stats.restarts),
      chapters: `${stats.chaptersCleared} / 5`,
    }
    for (const [stat, key] of Object.entries(STAT_COPY) as [keyof typeof STAT_COPY, TranslationKey][]) {
      const row = this.ownerDocument.createElement('div')
      row.className = 'ending-stat'
      const label = this.ownerDocument.createElement('span')
      label.textContent = translate(this.language, key)
      const value = this.ownerDocument.createElement('strong')
      value.textContent = values[stat]
      row.append(label, value)
      this.endingStats.append(row)
    }
  }

  private formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000))
    const hours = Math.floor(totalSeconds / 3_600)
    const minutes = Math.floor((totalSeconds % 3_600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
}
