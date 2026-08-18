import './style.css'
import { GameApp } from './app/GameApp'
import { applyTranslations, readStoredLanguage, translate } from './ui'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (milliseconds: number) => void
    echoDepthsDebug?: {
      selectChapter: (chapter: 1 | 2 | 3 | 4 | 5) => Promise<void>
      finishTutorial: () => Promise<void>
      setManualStepping: (enabled: boolean) => void
      setInput: (input: Record<string, number | boolean>) => void
      advanceInput: (input: Record<string, number | boolean>, ticks: number) => void
      releaseAllInputs: () => void
      advanceTicks: (ticks: number) => void
      restartChapter: () => Promise<void>
      solutionStep: (step: number) => void
      assetStatus: () => string
    }
  }
}

let app: GameApp | undefined

GameApp.create()
  .then((created) => {
    app = created
  })
  .catch(() => {
    const language = readStoredLanguage() ?? 'en'
    document.documentElement.lang = language
    applyTranslations(language)
    const errorScreen = document.querySelector<HTMLElement>('#error-screen')
    const errorMessage = document.querySelector<HTMLElement>('#error-message')
    if (errorScreen) {
      document.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
        screen.hidden = screen !== errorScreen
        screen.classList.toggle('screen--visible', screen === errorScreen)
        screen.inert = screen !== errorScreen
        screen.setAttribute('aria-hidden', String(screen !== errorScreen))
      })
      errorScreen.hidden = false
    }
    if (errorMessage) errorMessage.textContent = translate(language, 'errorInitialization')
  })

window.addEventListener('beforeunload', () => app?.destroy(), { once: true })
