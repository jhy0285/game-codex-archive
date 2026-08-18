import Phaser from 'phaser'
import './style.css'
import { gameConfig } from './game/config'
import { ACTIVE_THEME, THEME_LABELS } from './game/theme'

document.documentElement.dataset.theme = ACTIVE_THEME

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="game-shell" aria-label="PATCH RUN game">
    <div id="game-container"></div>
    <nav class="theme-switch" aria-label="Visual build selector">
      <span class="theme-switch__label">OPEN RELIC</span>
      <a href="/pixel" class="${ACTIVE_THEME === 'pixel' ? 'is-active' : ''}">${THEME_LABELS.pixel}</a>
      <a href="/overdrive" class="${ACTIVE_THEME === 'overdrive' ? 'is-active' : ''}">${THEME_LABELS.overdrive}</a>
    </nav>
    <div class="build-mark" aria-hidden="true">${ACTIVE_THEME === 'overdrive' ? 'THE DROWNED SCRIPTORIUM' : 'PATCH//RUN ARCHIVE'} · GATE I</div>
  </main>
`

new Phaser.Game(gameConfig)
