import Phaser from 'phaser'
import './style.css'
import { gameConfig } from './game/config.ts'

let started = false
const startGame = () => {
  if (started) return
  started = true
  new Phaser.Game(gameConfig)
}

if ('fonts' in document) {
  void document.fonts.ready.then(startGame, startGame)
} else {
  startGame()
}
