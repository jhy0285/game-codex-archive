import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './logic.ts'
import { EchoScene } from './scenes/EchoScene.ts'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#090b0d',
  scene: [EchoScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    preserveDrawingBuffer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
