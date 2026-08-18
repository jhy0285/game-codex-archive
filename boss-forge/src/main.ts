import Phaser from 'phaser'
import './style.css'
import { BossForgeScene } from './game/scenes/BossForgeScene'

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  width: 960,
  height: 640,
  parent: 'app',
  backgroundColor: '#070909',
  scene: [BossForgeScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
})

declare global {
  interface Window {
    render_game_to_text: () => string
    advanceTime: (ms: number) => void
    set_animation_audit_scenario: (scenario: {
      playerState?: 'idle' | 'run' | 'fire' | 'dodge'
      bossState?:
        | 'idle'
        | 'radial_telegraph'
        | 'radial_release'
        | 'radial_recover'
        | 'aimed_telegraph'
        | 'aimed_release'
        | 'aimed_recover'
        | 'beam_telegraph'
        | 'beam_active'
        | 'beam_recover'
      elapsedMs?: number
    } | null) => void
  }
}

window.render_game_to_text = () => {
  const scene = game.scene.getScene('BossForgeScene') as BossForgeScene | null
  return JSON.stringify(
    scene?.getTextState() ?? {
      phase: 'loading',
      coordinateSystem: 'origin top-left; +x right; +y down; canvas 960x640',
    },
  )
}

window.advanceTime = (ms: number) => {
  const scene = game.scene.getScene('BossForgeScene') as BossForgeScene | null
  scene?.advanceSimulation(ms)
}

window.set_animation_audit_scenario = (scenario) => {
  const scene = game.scene.getScene('BossForgeScene') as BossForgeScene | null
  scene?.setAnimationAuditScenario(scenario)
}
