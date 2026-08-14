import Phaser from 'phaser'
import { ArenaScene } from './scenes/ArenaScene'
import { ACTIVE_THEME } from './theme'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  // Canvas 2D remains reliably inspectable in headless Playwright screenshots.
  type: Phaser.CANVAS,
  width: 960,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#061013',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: ACTIVE_THEME === 'overdrive',
    pixelArt: ACTIVE_THEME === 'pixel',
    roundPixels: true,
  },
  scene: [ArenaScene],
}
