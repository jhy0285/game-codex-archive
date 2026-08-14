import Phaser from 'phaser'
import ashenBellSanctumUrl from '../../assets/gothic/ashen-bell-sanctum-game.jpg'
import ivoryPilgrimUrl from '../../assets/gothic/ivory-pilgrim-game.png'
import rootboundBellSmithUrl from '../../assets/gothic/rootbound-bell-smith-game.png'
import {
  ATTACK_MODULES,
  clamp,
  nextAttackModule,
  pointToSegmentDistance,
  toggleModuleSelection,
  type AttackModuleId,
} from '../gameLogic'

type GamePhase = 'config' | 'fight' | 'win' | 'lose'
type AttackStage = 'telegraph' | 'active'
type PlayerAnimationState = 'idle' | 'run' | 'fire' | 'dodge'
type BossAnimationState =
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

type MovingProjectile = {
  sprite: Phaser.GameObjects.Arc
  x: number
  y: number
  velocityX: number
  velocityY: number
  radius: number
  damage: number
  kind: 'player' | 'radial' | 'aimed'
}

type CombatParticle = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  radius: number
  lifeMs: number
  maxLifeMs: number
  color: number
}

type CombatShockwave = {
  x: number
  y: number
  radius: number
  expansionPerSecond: number
  lifeMs: number
  maxLifeMs: number
  color: number
}

type DodgeEcho = {
  sprite: Phaser.GameObjects.Image
  lifeMs: number
  maxLifeMs: number
}

type PlayerRig = {
  root: Phaser.GameObjects.Container
  leftMantle: Phaser.GameObjects.Polygon
  rightMantle: Phaser.GameObjects.Polygon
  leftLeg: Phaser.GameObjects.Ellipse
  rightLeg: Phaser.GameObjects.Ellipse
  maskGlow: Phaser.GameObjects.Ellipse
}

type BossLimbRig = {
  root: Phaser.GameObjects.Container
  proximal: Phaser.GameObjects.Ellipse
  distalRoot: Phaser.GameObjects.Container
  distal: Phaser.GameObjects.Ellipse
  proximalRidge: Phaser.GameObjects.Rectangle
  distalRidge: Phaser.GameObjects.Rectangle
  baseRotation: number
  side: -1 | 1
  phase: number
}

type BossRig = {
  root: Phaser.GameObjects.Container
  limbs: BossLimbRig[]
  hammer: Phaser.GameObjects.Container
  hammerShaft: Phaser.GameObjects.Ellipse
  hammerHead: Phaser.GameObjects.Graphics
  core: Phaser.GameObjects.Arc
  shellHalo: Phaser.GameObjects.Ellipse
}

type ActiveBossAttack = {
  module: AttackModuleId
  stage: AttackStage
  elapsedMs: number
  targetX: number
  targetY: number
  angle: number
}

type ConfigCard = {
  module: AttackModuleId
  panel: Phaser.GameObjects.Rectangle
  shrine: Phaser.GameObjects.Graphics
  halo: Phaser.GameObjects.Arc
  name: Phaser.GameObjects.Text
  description: Phaser.GameObjects.Text
  marker: Phaser.GameObjects.Text
}

type Destroyable = Phaser.GameObjects.GameObject & { destroy: () => void }

const WIDTH = 960
const HEIGHT = 640
const ARENA = { left: 34, right: 926, top: 96, bottom: 606 }
const PLAYER_RADIUS = 14
const BOSS_RADIUS = 35

const COLORS = {
  background: 0x070909,
  panel: 0x111513,
  panelSelected: 0x1a2420,
  cyan: 0x78b5aa,
  yellow: 0xe7d6ad,
  orange: 0xb96b3e,
  red: 0xc45d3e,
  purple: 0x79998f,
  white: 0xeee5cf,
  muted: 0x938f82,
  soot: 0x0a0c0b,
  verdigris: 0x5e938b,
}

const SERIF = 'Palatino Linotype, Book Antiqua, Georgia, serif'
const SMALL_CAPS = 'Trebuchet MS, Arial Narrow, sans-serif'

export class BossForgeScene extends Phaser.Scene {
  private sceneReady = false
  private phase: GamePhase = 'config'
  private selectedModules: AttackModuleId[] = []
  private configObjects: Destroyable[] = []
  private configCards: ConfigCard[] = []
  private resultObjects: Destroyable[] = []
  private fightObjects: Destroyable[] = []

  private player: Phaser.GameObjects.Arc | null = null
  private boss: Phaser.GameObjects.Arc | null = null
  private bossInner: Phaser.GameObjects.Arc | null = null
  private playerSprite: Phaser.GameObjects.Image | null = null
  private playerRig: PlayerRig | null = null
  private playerShadow: Phaser.GameObjects.Ellipse | null = null
  private bossShadow: Phaser.GameObjects.Ellipse | null = null
  private bossSprite: Phaser.GameObjects.Image | null = null
  private bossRig: BossRig | null = null
  private playerHealth = 100
  private bossHealth = 300
  private playerBullets: MovingProjectile[] = []
  private bossProjectiles: MovingProjectile[] = []
  private activeBossAttack: ActiveBossAttack | null = null
  private bossAttackCooldownMs = 800
  private attackIndex = 0
  private attackHistory: AttackModuleId[] = []
  private playerShotCooldownMs = 0
  private dodgeCooldownMs = 0
  private dodgeRemainingMs = 0
  private dodgeDirection = { x: 0, y: 0 }
  private playerInvulnerabilityMs = 0
  private playerHitFlashMs = 0
  private bossHitFlashMs = 0
  private elapsedFightMs = 0
  private presentationClockMs = 0
  private playerAnimationState: PlayerAnimationState = 'idle'
  private playerAnimationFrame = 0
  private playerFacingOctant = 0
  private playerFirePoseMs = 0
  private previousPlayerX = 190
  private previousPlayerY = 350
  private bossAnimationState: BossAnimationState = 'idle'
  private bossAnimationFrame = 0
  private bossReleasePoseMs = 0
  private bossReleaseModule: AttackModuleId | null = null
  private bossReleaseAngle = 0
  private bossRecoveryPoseMs = 0
  private bossRecoveryModule: AttackModuleId | null = null
  private debugAnimationScenario:
    | { playerState?: PlayerAnimationState; bossState?: BossAnimationState; elapsedMs?: number }
    | null = null
  private impactFlashMs = 0
  private dodgeEchoSpawnMs = 0
  private combatParticles: CombatParticle[] = []
  private shockwaves: CombatShockwave[] = []
  private dodgeEchoes: DodgeEcho[] = []

  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private spaceKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private telegraphGraphics: Phaser.GameObjects.Graphics | null = null
  private aimGraphics: Phaser.GameObjects.Graphics | null = null
  private atmosphereGraphics: Phaser.GameObjects.Graphics | null = null
  private combatVfxGraphics: Phaser.GameObjects.Graphics | null = null
  private impactOverlay: Phaser.GameObjects.Rectangle | null = null
  private playerHealthBar: Phaser.GameObjects.Graphics | null = null
  private bossHealthBar: Phaser.GameObjects.Graphics | null = null
  private statusText: Phaser.GameObjects.Text | null = null
  private bossStatusText: Phaser.GameObjects.Text | null = null
  private incomingText: Phaser.GameObjects.Text | null = null
  private incomingFrame: Phaser.GameObjects.Graphics | null = null
  private dodgeText: Phaser.GameObjects.Text | null = null
  private dodgeProgressBar: Phaser.GameObjects.Graphics | null = null
  private configStartButton: Phaser.GameObjects.Rectangle | null = null
  private configStartText: Phaser.GameObjects.Text | null = null
  private foregroundGraphics: Phaser.GameObjects.Graphics | null = null

  constructor() {
    super('BossForgeScene')
  }

  preload(): void {
    this.load.image('ashen-bell-sanctum', ashenBellSanctumUrl)
    this.load.image('ivory-pilgrim', ivoryPilgrimUrl)
    this.load.image('rootbound-bell-smith', rootboundBellSmithUrl)
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background)
    this.drawBackdrop()
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.input.keyboard!.on('keydown-R', () => {
      if (this.phase !== 'config') this.showConfiguration()
    })
    this.input.keyboard!.on('keydown-F', () => this.toggleFullscreen())
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Escape' && this.scale.isFullscreen) this.scale.stopFullscreen()
    })
    this.showConfiguration()
    this.sceneReady = true
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'config' && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.showConfiguration()
      return
    }
    // Audit poses are presentation-only stills. Freezing the live simulation here
    // keeps each captured frame paired with one exact animation timestamp without
    // changing normal combat timing or collision behavior.
    if (this.phase === 'fight' && !this.debugAnimationScenario) this.simulate(Math.min(delta, 50))
  }

  advanceSimulation(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return
    const steps = Math.min(3600, Math.ceil(milliseconds / (1000 / 60)))
    const stepMs = milliseconds / steps
    for (let index = 0; index < steps && this.phase === 'fight'; index += 1) {
      this.simulate(stepMs)
    }
  }

  getTextState(): object {
    const moduleNames = this.selectedModules.map(
      (id) => ATTACK_MODULES.find((module) => module.id === id)?.name ?? id,
    )
    return {
      phase: this.sceneReady ? this.phase : 'loading',
      ready: this.sceneReady,
      coordinateSystem: 'origin top-left; +x right; +y down; canvas 960x640',
      selectedModules: moduleNames,
      selectionCount: this.selectedModules.length,
      canStartFight: this.selectedModules.length === 2,
      player: this.player
        ? {
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            health: this.playerHealth,
            dodgeReady: this.dodgeCooldownMs <= 0,
            dodging: this.dodgeRemainingMs > 0,
            dodgeCooldownSeconds: Number((this.dodgeCooldownMs / 1000).toFixed(2)),
            shotCooldownSeconds: Number((this.playerShotCooldownMs / 1000).toFixed(2)),
            animationState: this.playerAnimationState,
            animationFrame: this.playerAnimationFrame,
            facingOctant: this.playerFacingOctant,
          }
        : null,
      boss: this.boss
        ? {
            x: Math.round(this.boss.x),
            y: Math.round(this.boss.y),
            health: this.bossHealth,
            animationState: this.bossAnimationState,
            animationFrame: this.bossAnimationFrame,
          }
        : null,
      currentBossAttack: this.activeBossAttack
        ? {
            module:
              ATTACK_MODULES.find((module) => module.id === this.activeBossAttack?.module)
                ?.name ?? this.activeBossAttack.module,
            stage: this.activeBossAttack.stage,
            elapsedMs: Math.round(this.activeBossAttack.elapsedMs),
            target: {
              x: Math.round(this.activeBossAttack.targetX),
              y: Math.round(this.activeBossAttack.targetY),
            },
          }
        : null,
      attackHistory: this.attackHistory.map(
        (id) => ATTACK_MODULES.find((module) => module.id === id)?.name ?? id,
      ),
      projectiles: { player: this.playerBullets.length, boss: this.bossProjectiles.length },
      visibleProjectiles: {
        player: this.playerBullets.slice(0, 12).map((projectile) => ({
          x: Math.round(projectile.x), y: Math.round(projectile.y), kind: projectile.kind,
        })),
        boss: this.bossProjectiles.slice(0, 16).map((projectile) => ({
          x: Math.round(projectile.x), y: Math.round(projectile.y), kind: projectile.kind,
        })),
      },
      combatFeedback: {
        particles: this.combatParticles.length,
        shockwaves: this.shockwaves.length,
        dodgeEchoes: this.dodgeEchoes.length,
        impactFlash: this.impactFlashMs > 0,
      },
      elapsedFightSeconds: Number((this.elapsedFightMs / 1000).toFixed(1)),
      presentationClockMs: Math.round(this.presentationClockMs),
      fullscreen: this.scale.isFullscreen,
      controls:
        this.phase === 'config'
          ? 'Click exactly two module cards, then click FORGE THIS BOSS.'
          : 'WASD move; mouse aim; left click attack; Space dodge; R return to configuration; F fullscreen.',
    }
  }

  setAnimationAuditScenario(scenario: {
    playerState?: PlayerAnimationState
    bossState?: BossAnimationState
    elapsedMs?: number
  } | null): void {
    this.debugAnimationScenario = scenario
    if (scenario?.elapsedMs !== undefined) this.presentationClockMs = scenario.elapsedMs
    if (this.phase === 'fight') this.drawFightFeedback()
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen()
    else this.scale.startFullscreen()
  }

  private drawBackdrop(): void {
    const background = this.add.graphics()
    background.fillStyle(COLORS.background, 1)
    background.fillRect(0, 0, WIDTH, HEIGHT)
    background.setDepth(-110)
    this.add
      .image(WIDTH / 2, HEIGHT / 2, 'ashen-bell-sanctum')
      .setDisplaySize(WIDTH, HEIGHT)
      .setAlpha(0.93)
      .setDepth(-100)
    const shade = this.add.graphics()
    shade.fillStyle(0x050807, 0.16)
    shade.fillRect(0, 0, WIDTH, HEIGHT)
    shade.fillStyle(0x050706, 0.46)
    shade.fillRect(0, 0, WIDTH, 76)
    shade.setDepth(-92)
    const light = this.add.graphics()
    light.fillStyle(COLORS.white, 0.035)
    light.fillTriangle(700, 0, 935, 0, 650, 520)
    light.fillStyle(COLORS.verdigris, 0.028)
    light.fillEllipse(486, 410, 720, 174)
    light.setDepth(-90)
    const vignette = this.add.graphics()
    vignette.lineStyle(2, 0x202824, 0.72)
    vignette.strokeRect(11, 11, WIDTH - 22, HEIGHT - 22)
    vignette.lineStyle(1, COLORS.white, 0.12)
    vignette.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32)
    vignette.setDepth(90)
  }

  private showConfiguration(): void {
    this.phase = 'config'
    this.selectedModules = []
    this.clearFightObjects()
    this.destroyAll(this.resultObjects)
    this.destroyAll(this.configObjects)
    this.configCards = []
    this.configStartButton = null
    this.configStartText = null

    const altarVeil = this.add.graphics()
    altarVeil.fillStyle(COLORS.soot, 0.58)
    altarVeil.fillRoundedRect(54, 196, 852, 302, 110)
    altarVeil.fillStyle(COLORS.verdigris, 0.055)
    altarVeil.fillEllipse(WIDTH / 2, 376, 790, 222)
    altarVeil.lineStyle(1, COLORS.white, 0.16)
    altarVeil.beginPath()
    altarVeil.moveTo(104, 451)
    altarVeil.lineTo(170, 471)
    altarVeil.lineTo(480, 484)
    altarVeil.lineTo(790, 471)
    altarVeil.lineTo(856, 451)
    altarVeil.strokePath()

    const crown = this.add.graphics()
    crown.lineStyle(2, COLORS.white, 0.28)
    crown.lineBetween(438, 51, 470, 51)
    crown.lineBetween(490, 51, 522, 51)
    crown.fillStyle(COLORS.orange, 0.72)
    crown.fillCircle(480, 51, 3)
    crown.lineStyle(1, COLORS.verdigris, 0.48)
    crown.strokeCircle(480, 51, 12)

    const eyebrow = this.add
      .text(WIDTH / 2, 75, 'BENEATH THE LAST BELL', {
        fontFamily: SMALL_CAPS, fontSize: '13px', color: '#a8aa9d', letterSpacing: 5,
      })
      .setOrigin(0.5)
    const title = this.add
      .text(WIDTH / 2, 116, 'BOSS FORGE', {
        fontFamily: SERIF, fontStyle: 'bold', fontSize: '50px', color: '#eee5cf',
        stroke: '#080a09', strokeThickness: 6, letterSpacing: 3,
      })
      .setOrigin(0.5)
    const hook = this.add
      .text(WIDTH / 2, 158, 'Inscribe two rites. Endure the keeper they awaken.', {
        fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', color: '#c4bdab',
      })
      .setOrigin(0.5)
    const instruction = this.add
      .text(WIDTH / 2, 190, 'CHOOSE EXACTLY TWO ATTACK MODULES', {
        fontFamily: SMALL_CAPS, fontSize: '13px', color: '#d7c9a4', letterSpacing: 3,
      })
      .setOrigin(0.5)
    this.configObjects.push(altarVeil, crown, eyebrow, title, hook, instruction)
    for (const object of [crown, eyebrow, title, hook, instruction]) object.setAlpha(0)
    this.tweens.add({
      targets: [crown, eyebrow, title, hook, instruction],
      alpha: 1,
      duration: 420,
      ease: 'Sine.Out',
    })

    ATTACK_MODULES.forEach((module, index) => {
      const centerX = 180 + index * 300
      const halo = this.add.circle(centerX, 334, 78, COLORS.verdigris, 0.02)
      halo.setStrokeStyle(1, COLORS.white, 0.13)
      const shrine = this.add.graphics()
      const panel = this.add
        .rectangle(centerX, 348, 260, 260, COLORS.soot, 0.001)
        .setInteractive({ useHandCursor: true })
      const name = this.add
        .text(centerX, 395, module.name, {
          fontFamily: SERIF, fontStyle: 'bold',
          fontSize: module.id === 'ROTATING_BEAM' ? '17px' : '19px',
          color: '#d7d1bf', align: 'center', letterSpacing: 1,
        })
        .setOrigin(0.5)
      const description = this.add
        .text(centerX, 426, module.description, {
          fontFamily: SERIF, fontSize: '13px', color: '#9f9c90', align: 'center',
          wordWrap: { width: 220 }, lineSpacing: 3,
        })
        .setOrigin(0.5)
      const marker = this.add
        .text(centerX, 470, 'UNMARKED', {
          fontFamily: SMALL_CAPS, fontSize: '11px', color: '#85877e', letterSpacing: 3,
        })
        .setOrigin(0.5)

      const card: ConfigCard = {
        module: module.id, panel, shrine, halo, name, description, marker,
      }
      panel.on('pointerdown', () => this.toggleCard(module.id))
      panel.on('pointerover', () => {
        panel.setData('hovered', true)
        this.refreshConfiguration()
      })
      panel.on('pointerout', () => {
        panel.setData('hovered', false)
        this.refreshConfiguration()
      })
      this.configCards.push(card)
      this.configObjects.push(halo, shrine, panel, name, description, marker)
      const cardObjects = [name, description, marker]
      for (const object of cardObjects) object.setAlpha(0)
      this.tweens.add({
        targets: cardObjects,
        alpha: 1,
        y: '+=0',
        duration: 360,
        delay: 140 + index * 90,
        ease: 'Sine.Out',
      })
    })

    const startButton = this.add
      .rectangle(WIDTH / 2, 551, 324, 56, 0x121614, 0.96)
      .setStrokeStyle(1, 0x777468, 0.72)
      .setInteractive({ useHandCursor: true })
    const startText = this.add
      .text(WIDTH / 2, 550, 'INSCRIBE TWO RITES', {
        fontFamily: SERIF, fontStyle: 'bold', fontSize: '16px', color: '#888a82', letterSpacing: 2,
      })
      .setOrigin(0.5)
    this.configStartButton = startButton
    this.configStartText = startText
    startButton.on('pointerdown', () => {
      if (this.selectedModules.length === 2) this.startFight()
    })
    startButton.on('pointerover', () => {
      startButton.setData('hovered', true)
      this.refreshConfiguration()
    })
    startButton.on('pointerout', () => {
      startButton.setData('hovered', false)
      this.refreshConfiguration()
    })
    const controls = this.add
      .text(WIDTH / 2, 603, 'F  ·  FULLSCREEN', {
        fontFamily: SMALL_CAPS, fontSize: '11px', color: '#777a73', letterSpacing: 3,
      })
      .setOrigin(0.5)
    this.configObjects.push(startButton, startText, controls)
    this.refreshConfiguration()
    for (const object of [startText, controls]) object.setAlpha(0)
    this.tweens.add({
      targets: [startText, controls],
      alpha: 1,
      duration: 320,
      delay: 390,
      ease: 'Sine.Out',
    })
  }

  private drawModuleIcon(
    graphics: Phaser.GameObjects.Graphics,
    module: AttackModuleId,
    x: number,
    y: number,
  ): void {
    graphics.lineStyle(1, COLORS.white, 0.2)
    graphics.strokeCircle(x, y, 42)
    graphics.lineStyle(2, COLORS.verdigris, 0.78)
    if (module === 'RADIAL_BURST') {
      graphics.fillStyle(COLORS.yellow, 0.9)
      graphics.fillCircle(x, y, 5)
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8
        const inner = 17
        const outer = 31
        graphics.lineBetween(
          x + Math.cos(angle) * inner,
          y + Math.sin(angle) * inner,
          x + Math.cos(angle) * outer,
          y + Math.sin(angle) * outer,
        )
        graphics.fillCircle(x + Math.cos(angle) * 33, y + Math.sin(angle) * 33, 2.5)
      }
    } else if (module === 'AIMED_SHOT') {
      graphics.beginPath()
      graphics.moveTo(x - 27, y + 20)
      graphics.lineTo(x, y - 31)
      graphics.lineTo(x + 27, y + 20)
      graphics.lineTo(x, y + 9)
      graphics.closePath()
      graphics.strokePath()
      graphics.fillStyle(COLORS.yellow, 0.9)
      graphics.fillEllipse(x, y - 3, 7, 18)
    } else {
      graphics.lineStyle(5, COLORS.orange, 0.8)
      graphics.beginPath()
      graphics.arc(x, y, 27, -2.4, 0.8, false)
      graphics.strokePath()
      graphics.lineStyle(1, COLORS.yellow, 0.75)
      graphics.beginPath()
      graphics.arc(x, y, 17, -2.4, 0.8, false)
      graphics.strokePath()
      graphics.fillStyle(COLORS.white, 0.9)
      graphics.fillCircle(x - 19, y - 18, 5)
    }
  }

  private redrawShrine(card: ConfigCard, selected: boolean, hovered: boolean): void {
    const x = card.panel.x
    const y = card.panel.y - 17
    const graphics = card.shrine
    graphics.clear()
    graphics.fillStyle(selected ? 0x18211e : 0x101311, hovered ? 0.98 : 0.9)
    graphics.fillEllipse(x, y + 38, 190, 134)
    graphics.lineStyle(1, selected ? COLORS.yellow : COLORS.muted, selected ? 0.72 : hovered ? 0.42 : 0.2)
    graphics.beginPath()
    graphics.moveTo(x - 84, y + 56)
    graphics.lineTo(x - 63, y - 45)
    graphics.lineTo(x, y - 71)
    graphics.lineTo(x + 63, y - 45)
    graphics.lineTo(x + 84, y + 56)
    graphics.strokePath()
    graphics.lineStyle(2, selected ? COLORS.verdigris : 0x4e5954, selected ? 0.82 : hovered ? 0.58 : 0.3)
    graphics.strokeEllipse(x, y, 112, 112)
    this.drawModuleIcon(graphics, card.module, x, y)
    if (selected) {
      graphics.fillStyle(COLORS.orange, 0.9)
      graphics.fillCircle(x, y + 69, 3)
      graphics.lineStyle(1, COLORS.yellow, 0.44)
      graphics.lineBetween(x - 19, y + 69, x + 19, y + 69)
    }
  }

  private toggleCard(module: AttackModuleId): void {
    this.selectedModules = toggleModuleSelection(this.selectedModules, module)
    this.refreshConfiguration()
  }

  private refreshConfiguration(): void {
    for (const card of this.configCards) {
      const selected = this.selectedModules.includes(card.module)
      const hovered = Boolean(card.panel.getData('hovered'))
      this.redrawShrine(card, selected, hovered)
      card.halo
        .setFillStyle(selected ? COLORS.verdigris : COLORS.soot, selected ? 0.14 : hovered ? 0.08 : 0.01)
        .setStrokeStyle(1, selected ? COLORS.yellow : COLORS.white, selected ? 0.32 : hovered ? 0.18 : 0.08)
        .setScale(selected ? 1.08 : hovered ? 1.04 : 1)
      card.name.setColor(selected ? '#eadbb6' : hovered ? '#ded7c4' : '#b8b4a7')
      card.description.setColor(selected ? '#c5c2b6' : '#94948b')
      const bindIndex = this.selectedModules.indexOf(card.module)
      card.marker.setText(selected ? `BOUND  ${bindIndex + 1} / 2` : 'UNMARKED')
      card.marker.setColor(selected ? '#c97a4d' : '#7e8179')
    }
    const ready = this.selectedModules.length === 2
    const hovered = Boolean(this.configStartButton?.getData('hovered'))
    this.configStartButton
      ?.setFillStyle(ready ? (hovered ? 0x26342f : 0x1b2421) : 0x111412, 0.97)
      .setStrokeStyle(1, ready ? COLORS.yellow : COLORS.muted, ready ? (hovered ? 0.95 : 0.6) : 0.35)
    this.configStartText
      ?.setText(ready ? 'AWAKEN THE BELL-SMITH' : `INSCRIBE ${2 - this.selectedModules.length} MORE`)
      .setColor(ready ? '#eee2c5' : '#85877f')
  }

  private startFight(): void {
    if (this.selectedModules.length !== 2) return
    this.phase = 'fight'
    this.destroyAll(this.configObjects)
    this.configCards = []
    this.destroyAll(this.resultObjects)
    this.clearFightObjects()
    this.playerHealth = 100
    this.bossHealth = 300
    this.playerShotCooldownMs = 0
    this.dodgeCooldownMs = 0
    this.dodgeRemainingMs = 0
    this.playerInvulnerabilityMs = 0
    this.bossAttackCooldownMs = 800
    this.activeBossAttack = null
    this.attackIndex = 0
    this.attackHistory = []
    this.elapsedFightMs = 0
    this.presentationClockMs = 0
    this.playerAnimationState = 'idle'
    this.playerAnimationFrame = 0
    this.playerFacingOctant = 0
    this.playerFirePoseMs = 0
    this.previousPlayerX = 190
    this.previousPlayerY = 350
    this.bossAnimationState = 'idle'
    this.bossAnimationFrame = 0
    this.bossReleasePoseMs = 0
    this.bossReleaseModule = null
    this.bossReleaseAngle = 0
    this.bossRecoveryPoseMs = 0
    this.bossRecoveryModule = null
    this.impactFlashMs = 0
    this.dodgeEchoSpawnMs = 0
    this.combatParticles = []
    this.shockwaves = []
    this.dodgeEchoes = []

    const arena = this.add.graphics()
    arena.fillStyle(0x080b0a, 0.08)
    arena.fillRoundedRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top, 26)
    arena.lineStyle(1, COLORS.white, 0.2)
    arena.strokeRoundedRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top, 26)
    arena.setDepth(0)
    const arenaDetail = this.add.graphics()
    arenaDetail.lineStyle(1, COLORS.verdigris, 0.2)
    for (const rune of [[110, 176], [850, 176], [110, 540], [850, 540]] as const) {
      arenaDetail.beginPath()
      arenaDetail.moveTo(rune[0], rune[1] - 12)
      arenaDetail.lineTo(rune[0] + 8, rune[1])
      arenaDetail.lineTo(rune[0], rune[1] + 12)
      arenaDetail.lineTo(rune[0] - 8, rune[1])
      arenaDetail.closePath()
      arenaDetail.strokePath()
      arenaDetail.fillStyle(COLORS.orange, 0.32)
      arenaDetail.fillCircle(rune[0], rune[1], 2)
    }
    arenaDetail.lineStyle(1, COLORS.white, 0.1)
    arenaDetail.lineBetween(285, 350, 345, 350)
    arenaDetail.lineBetween(615, 350, 675, 350)
    arenaDetail.setDepth(1)
    this.atmosphereGraphics = this.add.graphics().setDepth(2)
    this.playerShadow = this.add.ellipse(190, 360, 42, 14, 0x000000, 0.58).setDepth(4)
    this.bossShadow = this.add.ellipse(735, 376, 184, 52, 0x000000, 0.64).setDepth(4)
    this.bossInner = this.add.circle(735, 350, 44, COLORS.orange, 0.1).setDepth(5)
    this.boss = this.add.circle(735, 350, BOSS_RADIUS, COLORS.orange, 0.001).setDepth(5)
    this.bossRig = this.createBossRig(735, 350)
    this.bossSprite = this.add
      .image(0, 0, 'rootbound-bell-smith')
      .setDisplaySize(190, 202)
      .setDepth(1)
    // The generated shell stays foremost; the code-native tendons and bell read as
    // shadowed anatomy behind it instead of a diagnostic overlay.
    this.bossRig.root.addAt(this.bossSprite, this.bossRig.limbs.length + 2)
    this.bossSprite.setData('baseScaleX', this.bossSprite.scaleX)
    this.bossSprite.setData('baseScaleY', this.bossSprite.scaleY)
    this.bossSprite.setAlpha(0)
    this.tweens.add({ targets: this.bossSprite, alpha: 1, duration: 540, ease: 'Sine.Out' })
    this.player = this.add.circle(190, 350, PLAYER_RADIUS + 3, COLORS.cyan, 0.08).setDepth(6)
    this.player.setStrokeStyle(1, COLORS.cyan, 0.45)
    this.playerRig = this.createPlayerRig(190, 350)
    this.playerSprite = this.add
      .image(0, 0, 'ivory-pilgrim')
      .setDisplaySize(42, 101)
      .setDepth(1)
    this.playerRig.root.addAt(this.playerSprite, 5)
    this.playerSprite.setData('baseScaleX', this.playerSprite.scaleX)
    this.playerSprite.setData('baseScaleY', this.playerSprite.scaleY)
    this.aimGraphics = this.add.graphics().setDepth(10)
    this.telegraphGraphics = this.add.graphics().setDepth(9)
    this.combatVfxGraphics = this.add.graphics().setDepth(11)
    this.foregroundGraphics = this.add.graphics().setDepth(20)
    this.drawForegroundSilhouettes()
    this.impactOverlay = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.white, 0)
      .setDepth(26)

    const hudVeil = this.add.graphics().setDepth(40)
    hudVeil.fillStyle(COLORS.soot, 0.72)
    hudVeil.fillRect(0, 0, WIDTH, 91)
    hudVeil.lineStyle(1, COLORS.white, 0.12)
    hudVeil.lineBetween(24, 90, WIDTH - 24, 90)
    hudVeil.lineStyle(1, COLORS.verdigris, 0.24)
    hudVeil.lineBetween(316, 82, 644, 82)
    this.playerHealthBar = this.add.graphics().setDepth(42)
    this.bossHealthBar = this.add.graphics().setDepth(42)

    const modeText = this.add.text(30, 19, 'PILGRIM OATHS', {
      fontFamily: SMALL_CAPS, fontSize: '10px', color: '#7f9d94', letterSpacing: 3,
    }).setDepth(42)
    const moduleText = this.add.text(
      30,
      42,
      this.selectedModules.map((id) => ATTACK_MODULES.find((module) => module.id === id)?.name).join('  +  '),
      { fontFamily: SERIF, fontStyle: 'italic', fontSize: '13px', color: '#d6cfbb' },
    ).setDepth(42)
    const controls = this.add
      .text(WIDTH - 28, 42, 'WASD · MOVE    MOUSE · STRIKE    SPACE · SHROUD    R · RETURN', {
        fontFamily: SMALL_CAPS, fontSize: '9px', color: '#99998f', letterSpacing: 1,
      })
      .setOrigin(1, 0.5)
      .setDepth(42)
    this.statusText = this.add.text(34, 103, 'PILGRIM', {
      fontFamily: SMALL_CAPS, fontSize: '11px', color: '#a9c7bd', letterSpacing: 2,
    }).setDepth(42)
    this.bossStatusText = this.add
      .text(WIDTH / 2, 18, 'ROOTBOUND BELL-SMITH', {
        fontFamily: SERIF, fontStyle: 'bold', fontSize: '16px', color: '#ded3b9', letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(42)
    this.incomingFrame = this.add.graphics().setVisible(false).setDepth(44)
    this.incomingFrame.lineStyle(1, COLORS.orange, 0.58)
    this.incomingFrame.lineBetween(326, 112, 410, 112)
    this.incomingFrame.lineBetween(550, 112, 634, 112)
    this.incomingFrame.fillStyle(COLORS.orange, 0.82)
    this.incomingFrame.fillCircle(480, 112, 2)
    this.incomingText = this.add
      .text(WIDTH / 2, 110, '', {
        fontFamily: SERIF, fontStyle: 'italic', fontSize: '16px', color: '#e1cba2', letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(45)
    this.dodgeProgressBar = this.add.graphics().setDepth(42)
    this.dodgeText = this.add
      .text(35, 612, 'SPACE · SHROUD READY', {
        fontFamily: SMALL_CAPS, fontSize: '10px', color: '#d8d6c8', letterSpacing: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(42)

    this.fightObjects.push(
      arena, arenaDetail, this.atmosphereGraphics, this.playerShadow, this.bossShadow,
      this.bossInner, this.boss, this.bossRig.root, this.player, this.playerRig.root,
      this.aimGraphics, this.telegraphGraphics, this.combatVfxGraphics, this.foregroundGraphics,
      this.impactOverlay, hudVeil, this.playerHealthBar, this.bossHealthBar,
      modeText, moduleText, controls, this.statusText,
      this.bossStatusText, this.incomingFrame, this.incomingText,
      this.dodgeProgressBar, this.dodgeText,
    )
    this.refreshHud()
  }

  private drawForegroundSilhouettes(): void {
    if (!this.foregroundGraphics) return
    const graphics = this.foregroundGraphics
    graphics.clear()
    graphics.fillStyle(0x030504, 0.88)
    graphics.beginPath()
    graphics.moveTo(0, 640)
    graphics.lineTo(0, 515)
    graphics.lineTo(32, 534)
    graphics.lineTo(50, 573)
    graphics.lineTo(96, 594)
    graphics.lineTo(135, 640)
    graphics.closePath()
    graphics.fillPath()
    graphics.beginPath()
    graphics.moveTo(960, 640)
    graphics.lineTo(960, 503)
    graphics.lineTo(929, 524)
    graphics.lineTo(909, 567)
    graphics.lineTo(864, 590)
    graphics.lineTo(825, 640)
    graphics.closePath()
    graphics.fillPath()
    graphics.lineStyle(7, 0x060908, 0.86)
    graphics.beginPath()
    graphics.moveTo(18, 640)
    graphics.lineTo(45, 584)
    graphics.lineTo(53, 532)
    graphics.lineTo(86, 482)
    graphics.strokePath()
    graphics.beginPath()
    graphics.moveTo(942, 640)
    graphics.lineTo(914, 578)
    graphics.lineTo(907, 530)
    graphics.lineTo(876, 478)
    graphics.strokePath()
    graphics.fillStyle(COLORS.verdigris, 0.1)
    graphics.fillEllipse(86, 617, 104, 22)
    graphics.fillEllipse(874, 617, 104, 22)
  }

  private createPlayerRig(x: number, y: number): PlayerRig {
    const root = this.add.container(x, y - 4).setDepth(8)
    const maskGlow = this.add
      .ellipse(0, -8, 32, 38, COLORS.white, 0.07)
      .setStrokeStyle(1, COLORS.cyan, 0.22)
    const leftLeg = this.add
      .ellipse(-7, 28, 7, 24, 0x352f2a, 1)
      .setStrokeStyle(1, COLORS.white, 0.22)
    const rightLeg = this.add
      .ellipse(7, 28, 7, 24, 0x352f2a, 1)
      .setStrokeStyle(1, COLORS.white, 0.22)
    const leftMantle = this.add
      .polygon(-13, 6, [0, -18, 12, -7, 15, 22, 3, 31, -3, 10], 0x151918, 0.95)
      .setStrokeStyle(1, COLORS.verdigris, 0.28)
    const rightMantle = this.add
      .polygon(13, 6, [0, -18, -12, -7, -15, 22, -3, 31, 3, 10], 0x151918, 0.95)
      .setStrokeStyle(1, COLORS.verdigris, 0.28)
    root.add([maskGlow, leftLeg, rightLeg, leftMantle, rightMantle])
    return { root, leftMantle, rightMantle, leftLeg, rightLeg, maskGlow }
  }

  private createBossLimb(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    baseRotation: number,
    side: -1 | 1,
    phase: number,
  ): BossLimbRig {
    const root = this.add.container(x, y).setRotation(baseRotation)
    const proximal = this.add
      .ellipse(27, 0, 62, 14, 0x201e1a, 0.48)
      .setStrokeStyle(1, 0x66563f, 0.18)
    const proximalRidge = this.add
      .rectangle(27, -1, 45, 1, 0x806c4d, 0.38)
    const distalRoot = this.add.container(52, 1)
    const distal = this.add
      .ellipse(22, 0, 47, 9, 0x29241d, 0.5)
      .setStrokeStyle(1, 0x6d5a40, 0.16)
    const distalRidge = this.add
      .rectangle(21, -1, 34, 1, 0x8a714e, 0.34)
    distalRoot.add([distal, distalRidge])
    root.add([proximal, proximalRidge, distalRoot])
    parent.add(root)
    return { root, proximal, distalRoot, distal, proximalRidge, distalRidge, baseRotation, side, phase }
  }

  private createBossRig(x: number, y: number): BossRig {
    const root = this.add.container(x, y).setDepth(7)
    const limbs: BossLimbRig[] = []
    const placements: Array<[number, number, number, -1 | 1, number]> = [
      [-48, -48, -2.7, -1, 0],
      [-63, -3, -3.04, -1, 1.2],
      [-48, 43, 2.63, -1, 2.4],
      [48, -48, -0.44, 1, 3.1],
      [63, -3, 0.1, 1, 4.3],
      [48, 43, 0.51, 1, 5.5],
    ]
    for (const placement of placements) {
      limbs.push(this.createBossLimb(root, ...placement))
    }
    const shellHalo = this.add
      .ellipse(0, 4, 137, 160, COLORS.verdigris, 0.07)
      .setStrokeStyle(1, COLORS.yellow, 0.12)
    root.add(shellHalo)
    const hammer = this.add.container(0, 0)
    const hammerShaft = this.add
      .ellipse(0, 67, 10, 96, 0x1b1b18, 0.76)
      .setStrokeStyle(1, 0x746249, 0.24)
    const shaftRidge = this.add.rectangle(1, 66, 1, 76, 0x8b7654, 0.32)
    const hammerHead = this.add
      .graphics()
      .setPosition(0, 116)
    hammerHead.fillStyle(0x24221e, 0.9)
    hammerHead.fillEllipse(0, -8, 50, 31)
    hammerHead.fillRoundedRect(-28, -7, 56, 29, 8)
    hammerHead.fillStyle(0x171816, 0.94)
    hammerHead.fillEllipse(0, 20, 66, 11)
    hammerHead.fillCircle(0, 26, 5)
    hammerHead.lineStyle(1, 0x8a7451, 0.42)
    hammerHead.strokeEllipse(0, -8, 50, 31)
    hammerHead.strokeRoundedRect(-28, -7, 56, 29, 8)
    hammerHead.strokeEllipse(0, 20, 66, 11)
    hammerHead.lineStyle(1, 0x9c8058, 0.34)
    hammerHead.lineBetween(-8, -5, -2, 3)
    hammerHead.lineBetween(-2, 3, -7, 10)
    hammerHead.lineBetween(-7, 10, 1, 17)
    hammerHead.lineStyle(1, 0x080a09, 0.65)
    hammerHead.lineBetween(10, 2, 5, 9)
    hammerHead.lineBetween(5, 9, 11, 14)
    hammer.add([hammerShaft, shaftRidge, hammerHead])
    root.add(hammer)
    const core = this.add
      .circle(0, -4, 14, COLORS.orange, 0.88)
      .setStrokeStyle(3, COLORS.yellow, 0.72)
    root.add(core)
    return { root, limbs, hammer, hammerShaft, hammerHead, core, shellHalo }
  }

  private simulate(deltaMs: number): void {
    if (this.phase !== 'fight' || !this.player || !this.boss) return
    this.elapsedFightMs += deltaMs
    this.playerShotCooldownMs = Math.max(0, this.playerShotCooldownMs - deltaMs)
    this.dodgeCooldownMs = Math.max(0, this.dodgeCooldownMs - deltaMs)
    this.dodgeRemainingMs = Math.max(0, this.dodgeRemainingMs - deltaMs)
    this.playerInvulnerabilityMs = Math.max(0, this.playerInvulnerabilityMs - deltaMs)
    this.playerHitFlashMs = Math.max(0, this.playerHitFlashMs - deltaMs)
    this.bossHitFlashMs = Math.max(0, this.bossHitFlashMs - deltaMs)
    this.impactFlashMs = Math.max(0, this.impactFlashMs - deltaMs)
    this.playerFirePoseMs = Math.max(0, this.playerFirePoseMs - deltaMs)
    const releaseWasActive = this.bossReleasePoseMs > 0
    this.bossReleasePoseMs = Math.max(0, this.bossReleasePoseMs - deltaMs)
    if (this.bossReleasePoseMs <= 0) this.bossReleaseModule = null
    // Recovery starts after the short presentation-only release latch. Gameplay
    // cooldowns and projectile movement continue throughout this visual hold.
    if (!releaseWasActive) this.bossRecoveryPoseMs = Math.max(0, this.bossRecoveryPoseMs - deltaMs)
    this.presentationClockMs += deltaMs
    this.updatePlayer(deltaMs)
    this.updatePlayerBullets(deltaMs)
    if (this.phase !== 'fight') return
    this.updateBossProjectiles(deltaMs)
    if (this.phase !== 'fight') return
    this.updateBossAttack(deltaMs)
    if (this.phase !== 'fight') return
    this.drawArenaAtmosphere()
    this.updateCombatEffects(deltaMs)
    this.drawFightFeedback()
    this.refreshHud()
  }

  private drawArenaAtmosphere(): void {
    if (!this.atmosphereGraphics) return
    const graphics = this.atmosphereGraphics
    graphics.clear()
    const arenaWidth = ARENA.right - ARENA.left
    const arenaHeight = ARENA.bottom - ARENA.top
    const farDrift = (this.elapsedFightMs * 0.008) % 420
    graphics.fillStyle(COLORS.white, 0.022)
    graphics.fillEllipse(160 + farDrift, 222, 430, 62)
    graphics.fillStyle(COLORS.verdigris, 0.024)
    graphics.fillEllipse(910 - farDrift, 470, 510, 78)
    const nearDrift = (this.elapsedFightMs * 0.015) % 540
    graphics.fillStyle(COLORS.white, 0.018)
    graphics.fillEllipse(40 + nearDrift, 566, 470, 72)

    for (let index = 0; index < 32; index += 1) {
      const speed = 0.006 + (index % 5) * 0.0022
      const travel = (index * 71 + this.elapsedFightMs * speed) % arenaHeight
      const x = ARENA.left + ((index * 137 + Math.sin(this.elapsedFightMs * 0.0007 + index) * 34) % arenaWidth)
      const y = ARENA.bottom - travel
      const pulse = 0.35 + Math.sin(this.elapsedFightMs * 0.003 + index * 1.7) * 0.2
      const isEmber = index % 11 === 0
      graphics.fillStyle(isEmber ? COLORS.orange : COLORS.white, Math.max(0.025, pulse * (isEmber ? 0.28 : 0.14)))
      graphics.fillCircle(x, y, isEmber ? 1.45 : 0.75 + (index % 3) * 0.35)
    }
  }

  private updateCombatEffects(deltaMs: number): void {
    if (!this.combatVfxGraphics) return
    const seconds = deltaMs / 1000
    const keptParticles: CombatParticle[] = []
    for (const particle of this.combatParticles) {
      particle.lifeMs -= deltaMs
      if (particle.lifeMs <= 0) continue
      particle.x += particle.velocityX * seconds
      particle.y += particle.velocityY * seconds
      particle.velocityX *= Math.pow(0.86, deltaMs / 16.67)
      particle.velocityY *= Math.pow(0.86, deltaMs / 16.67)
      keptParticles.push(particle)
    }
    this.combatParticles = keptParticles

    const keptShockwaves: CombatShockwave[] = []
    for (const shockwave of this.shockwaves) {
      shockwave.lifeMs -= deltaMs
      if (shockwave.lifeMs <= 0) continue
      shockwave.radius += shockwave.expansionPerSecond * seconds
      keptShockwaves.push(shockwave)
    }
    this.shockwaves = keptShockwaves

    if (this.dodgeRemainingMs > 0 && this.playerSprite) {
      this.dodgeEchoSpawnMs -= deltaMs
      if (this.dodgeEchoSpawnMs <= 0) {
        this.spawnDodgeEcho()
        this.dodgeEchoSpawnMs = 45
      }
    }
    const keptEchoes: DodgeEcho[] = []
    for (const echo of this.dodgeEchoes) {
      echo.lifeMs -= deltaMs
      if (echo.lifeMs <= 0) {
        echo.sprite.destroy()
        continue
      }
      const ratio = echo.lifeMs / echo.maxLifeMs
      echo.sprite.setAlpha(ratio * 0.34)
      echo.sprite.setScale(echo.sprite.scaleX * 1.003, echo.sprite.scaleY * 1.003)
      keptEchoes.push(echo)
    }
    this.dodgeEchoes = keptEchoes

    const graphics = this.combatVfxGraphics
    graphics.clear()
    for (const projectile of [...this.playerBullets, ...this.bossProjectiles]) {
      const speed = Math.max(1, Math.hypot(projectile.velocityX, projectile.velocityY))
      const trailX = projectile.x - (projectile.velocityX / speed) * (projectile.kind === 'aimed' ? 34 : 22)
      const trailY = projectile.y - (projectile.velocityY / speed) * (projectile.kind === 'aimed' ? 34 : 22)
      const color = projectile.kind === 'player'
        ? COLORS.cyan
        : projectile.kind === 'aimed' ? COLORS.red : COLORS.yellow
      graphics.lineStyle(projectile.radius * 2 + 6, color, 0.12)
      graphics.lineBetween(trailX, trailY, projectile.x, projectile.y)
      graphics.lineStyle(Math.max(2, projectile.radius * 0.8), color, 0.65)
      graphics.lineBetween(trailX, trailY, projectile.x, projectile.y)
    }
    for (const echo of this.dodgeEchoes) {
      const ratio = echo.lifeMs / echo.maxLifeMs
      graphics.lineStyle(7, COLORS.cyan, ratio * 0.08)
      if (this.player) graphics.lineBetween(echo.sprite.x, echo.sprite.y, this.player.x, this.player.y)
      graphics.lineStyle(2, COLORS.cyan, ratio * 0.38)
      graphics.strokeCircle(echo.sprite.x, echo.sprite.y, 14 + (1 - ratio) * 8)
    }
    for (const particle of this.combatParticles) {
      const ratio = particle.lifeMs / particle.maxLifeMs
      graphics.lineStyle(Math.max(1, particle.radius * ratio), particle.color, ratio * 0.55)
      graphics.lineBetween(
        particle.x - particle.velocityX * 0.018,
        particle.y - particle.velocityY * 0.018,
        particle.x,
        particle.y,
      )
      graphics.fillStyle(particle.color, ratio)
      graphics.fillCircle(particle.x, particle.y, Math.max(0.8, particle.radius * ratio))
    }
    for (const shockwave of this.shockwaves) {
      const ratio = shockwave.lifeMs / shockwave.maxLifeMs
      graphics.lineStyle(2 + ratio * 3, shockwave.color, ratio * 0.7)
      graphics.strokeCircle(shockwave.x, shockwave.y, shockwave.radius)
    }
    this.impactOverlay?.setAlpha(this.impactFlashMs > 0 ? Math.min(0.16, this.impactFlashMs / 480) : 0)
  }

  private spawnDodgeEcho(): void {
    if (!this.playerSprite || !this.playerRig) return
    const echo = this.add
      .image(this.playerRig.root.x, this.playerRig.root.y, 'ivory-pilgrim')
      .setDisplaySize(this.playerSprite.displayWidth, this.playerSprite.displayHeight)
      .setRotation(this.playerRig.root.rotation)
      .setScale(this.playerRig.root.scaleX, this.playerRig.root.scaleY)
      .setAlpha(0.34)
      .setDepth(7)
    this.dodgeEchoes.push({ sprite: echo, lifeMs: 180, maxLifeMs: 180 })
  }

  private emitCombatParticles(
    x: number,
    y: number,
    color: number,
    count: number,
    baseSpeed: number,
  ): void {
    const phase = this.elapsedFightMs * 0.001 + x * 0.013 + y * 0.009
    for (let index = 0; index < count; index += 1) {
      const jitter = Math.sin(phase + index * 12.9898) * 0.28
      const angle = (Math.PI * 2 * index) / count + jitter
      const speed = baseSpeed * (0.62 + ((index * 37) % 53) / 100)
      const maxLifeMs = 210 + (index % 4) * 48
      this.combatParticles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius: 1.8 + (index % 3) * 0.75,
        lifeMs: maxLifeMs,
        maxLifeMs,
        color,
      })
    }
    if (this.combatParticles.length > 140) {
      this.combatParticles.splice(0, this.combatParticles.length - 140)
    }
  }

  private emitShockwave(x: number, y: number, color: number, radius = 18): void {
    this.shockwaves.push({
      x, y, radius, expansionPerSecond: 150, lifeMs: 260, maxLifeMs: 260, color,
    })
    if (this.shockwaves.length > 12) this.shockwaves.shift()
  }

  private triggerImpactFlash(color: number, durationMs: number): void {
    this.impactFlashMs = Math.max(this.impactFlashMs, durationMs)
    this.impactOverlay?.setFillStyle(color, 1)
  }

  private updatePlayer(deltaMs: number): void {
    if (!this.player) return
    this.previousPlayerX = this.player.x
    this.previousPlayerY = this.player.y
    let inputX = Number(this.keys.D.isDown) - Number(this.keys.A.isDown)
    let inputY = Number(this.keys.S.isDown) - Number(this.keys.W.isDown)
    const inputLength = Math.hypot(inputX, inputY)
    if (inputLength > 0) {
      inputX /= inputLength
      inputY /= inputLength
    }
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.dodgeCooldownMs <= 0) {
      if (inputLength > 0) this.dodgeDirection = { x: inputX, y: inputY }
      else {
        const pointer = this.input.activePointer
        const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x)
        this.dodgeDirection = { x: Math.cos(angle), y: Math.sin(angle) }
      }
      this.dodgeRemainingMs = 190
      this.dodgeCooldownMs = 900
      this.playerInvulnerabilityMs = Math.max(this.playerInvulnerabilityMs, 240)
      this.dodgeEchoSpawnMs = 0
      this.emitShockwave(this.player.x, this.player.y, COLORS.cyan, 13)
      this.emitCombatParticles(this.player.x, this.player.y, COLORS.cyan, 8, 125)
      this.cameras.main.shake(42, 0.0007)
    }
    const speed = this.dodgeRemainingMs > 0 ? 600 : 245
    const direction = this.dodgeRemainingMs > 0 ? this.dodgeDirection : { x: inputX, y: inputY }
    this.player.x = clamp(
      this.player.x + direction.x * speed * (deltaMs / 1000),
      ARENA.left + PLAYER_RADIUS,
      ARENA.right - PLAYER_RADIUS,
    )
    this.player.y = clamp(
      this.player.y + direction.y * speed * (deltaMs / 1000),
      ARENA.top + PLAYER_RADIUS,
      ARENA.bottom - PLAYER_RADIUS,
    )
    this.playerShadow?.setPosition(this.player.x, this.player.y + 12)
    const pointer = this.input.activePointer
    if (pointer.isDown && this.playerShotCooldownMs <= 0) {
      this.firePlayerBullet(pointer.worldX, pointer.worldY)
      this.playerShotCooldownMs = 145
      this.playerFirePoseMs = 105
    }
  }

  private firePlayerBullet(targetX: number, targetY: number): void {
    if (!this.player) return
    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x)
    const x = this.player.x + Math.cos(angle) * 22
    const y = this.player.y + Math.sin(angle) * 22
    const sprite = this.add.circle(x, y, 5, COLORS.cyan, 1).setDepth(10)
    sprite.setStrokeStyle(2, COLORS.white, 0.9)
    this.emitCombatParticles(x, y, COLORS.cyan, 3, 68)
    this.playerBullets.push({
      sprite, x, y, velocityX: Math.cos(angle) * 610, velocityY: Math.sin(angle) * 610,
      radius: 5, damage: 10, kind: 'player',
    })
  }

  private updatePlayerBullets(deltaMs: number): void {
    if (!this.boss) return
    const kept: MovingProjectile[] = []
    for (const projectile of this.playerBullets) {
      projectile.x += projectile.velocityX * (deltaMs / 1000)
      projectile.y += projectile.velocityY * (deltaMs / 1000)
      projectile.sprite.setPosition(projectile.x, projectile.y)
      const hitBoss = Math.hypot(projectile.x - this.boss.x, projectile.y - this.boss.y) <= projectile.radius + BOSS_RADIUS
      if (hitBoss) {
        projectile.sprite.destroy()
        this.bossHealth = Math.max(0, this.bossHealth - projectile.damage)
        this.bossHitFlashMs = 80
        this.emitCombatParticles(projectile.x, projectile.y, COLORS.cyan, 7, 185)
        this.emitCombatParticles(projectile.x, projectile.y, COLORS.orange, 4, 125)
        this.emitShockwave(projectile.x, projectile.y, COLORS.cyan, 9)
        this.triggerImpactFlash(COLORS.cyan, 46)
        this.cameras.main.shake(45, 0.0008)
        if (this.bossHealth <= 0) {
          this.endFight('win')
          return
        }
      } else if (this.isProjectileInBounds(projectile, 30)) kept.push(projectile)
      else projectile.sprite.destroy()
    }
    this.playerBullets = kept
  }

  private updateBossProjectiles(deltaMs: number): void {
    if (!this.player) return
    const kept: MovingProjectile[] = []
    for (const projectile of this.bossProjectiles) {
      projectile.x += projectile.velocityX * (deltaMs / 1000)
      projectile.y += projectile.velocityY * (deltaMs / 1000)
      projectile.sprite.setPosition(projectile.x, projectile.y)
      const hitPlayer = Math.hypot(projectile.x - this.player.x, projectile.y - this.player.y) <= projectile.radius + PLAYER_RADIUS
      if (hitPlayer) {
        projectile.sprite.destroy()
        this.damagePlayer(projectile.damage)
        if (this.phase !== 'fight') return
      } else if (this.isProjectileInBounds(projectile, 35)) kept.push(projectile)
      else projectile.sprite.destroy()
    }
    this.bossProjectiles = kept
  }

  private isProjectileInBounds(projectile: MovingProjectile, margin: number): boolean {
    return projectile.x >= ARENA.left - margin && projectile.x <= ARENA.right + margin &&
      projectile.y >= ARENA.top - margin && projectile.y <= ARENA.bottom + margin
  }

  private updateBossAttack(deltaMs: number): void {
    if (!this.boss || !this.player) return
    if (!this.activeBossAttack) {
      this.bossAttackCooldownMs -= deltaMs
      if (this.bossAttackCooldownMs <= 0) this.beginBossAttack()
      return
    }
    const attack = this.activeBossAttack
    attack.elapsedMs += deltaMs
    if (attack.module === 'RADIAL_BURST' && attack.elapsedMs >= 760) {
      this.fireRadialBurst()
      this.finishBossAttack(1050)
    } else if (attack.module === 'AIMED_SHOT' && attack.elapsedMs >= 680) {
      this.fireAimedShot(attack.targetX, attack.targetY)
      this.finishBossAttack(1050)
    } else if (attack.module === 'ROTATING_BEAM') {
      if (attack.stage === 'telegraph' && attack.elapsedMs >= 900) {
        attack.stage = 'active'
        attack.elapsedMs = 0
        this.bossReleasePoseMs = 170
        this.bossReleaseModule = 'ROTATING_BEAM'
        this.bossReleaseAngle = attack.angle
        this.emitShockwave(this.boss.x, this.boss.y, COLORS.red, 36)
        this.emitCombatParticles(this.boss.x, this.boss.y, COLORS.orange, 18, 210)
        this.triggerImpactFlash(COLORS.orange, 70)
        this.cameras.main.shake(85, 0.002)
      } else if (attack.stage === 'active') {
        attack.angle += deltaMs * 0.00155
        const endX = this.boss.x + Math.cos(attack.angle) * 1150
        const endY = this.boss.y + Math.sin(attack.angle) * 1150
        const distance = pointToSegmentDistance(this.player.x, this.player.y, this.boss.x, this.boss.y, endX, endY)
        if (distance <= PLAYER_RADIUS + 13) this.damagePlayer(24)
        if (this.phase !== 'fight') return
        if (attack.elapsedMs >= 1650) this.finishBossAttack(750)
      }
    }
  }

  private beginBossAttack(): void {
    if (!this.player || !this.boss) return
    const module = nextAttackModule(this.selectedModules, this.attackIndex)
    if (!module) return
    this.attackIndex += 1
    this.attackHistory.push(module)
    if (this.attackHistory.length > 8) this.attackHistory.shift()
    this.activeBossAttack = {
      module, stage: 'telegraph', elapsedMs: 0, targetX: this.player.x, targetY: this.player.y,
      angle: Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x),
    }
  }

  private finishBossAttack(cooldownMs: number): void {
    this.bossRecoveryModule = this.activeBossAttack?.module ?? null
    this.bossRecoveryPoseMs = this.bossRecoveryModule === 'ROTATING_BEAM' ? 420 : 280
    this.activeBossAttack = null
    this.bossAttackCooldownMs = cooldownMs
    this.telegraphGraphics?.clear()
  }

  private fireRadialBurst(): void {
    this.bossReleasePoseMs = 150
    this.bossReleaseModule = 'RADIAL_BURST'
    this.bossReleaseAngle = 0
    if (this.boss) {
      this.emitShockwave(this.boss.x, this.boss.y, COLORS.yellow, 38)
      this.emitCombatParticles(this.boss.x, this.boss.y, COLORS.yellow, 20, 225)
      this.triggerImpactFlash(COLORS.orange, 58)
      this.cameras.main.shake(65, 0.0014)
    }
    for (let index = 0; index < 8; index += 1) {
      this.spawnBossProjectile((Math.PI * 2 * index) / 8, 225, 8, 15, 'radial')
    }
  }

  private fireAimedShot(targetX: number, targetY: number): void {
    if (!this.boss) return
    this.bossReleasePoseMs = 150
    this.bossReleaseModule = 'AIMED_SHOT'
    const angle = Math.atan2(targetY - this.boss.y, targetX - this.boss.x)
    this.bossReleaseAngle = angle
    this.emitShockwave(this.boss.x, this.boss.y, COLORS.red, 24)
    this.emitCombatParticles(this.boss.x, this.boss.y, COLORS.red, 12, 195)
    this.triggerImpactFlash(COLORS.red, 45)
    this.cameras.main.shake(55, 0.001)
    this.spawnBossProjectile(angle, 390, 11, 24, 'aimed')
  }

  private spawnBossProjectile(
    angle: number,
    speed: number,
    radius: number,
    damage: number,
    kind: 'radial' | 'aimed',
  ): void {
    if (!this.boss) return
    const x = this.boss.x + Math.cos(angle) * (BOSS_RADIUS + 10)
    const y = this.boss.y + Math.sin(angle) * (BOSS_RADIUS + 10)
    const color = kind === 'aimed' ? COLORS.red : COLORS.yellow
    const sprite = this.add.circle(x, y, radius, color, 1).setDepth(10)
    sprite.setStrokeStyle(2, COLORS.white, kind === 'aimed' ? 0.9 : 0.55)
    this.bossProjectiles.push({
      sprite, x, y, velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed,
      radius, damage, kind,
    })
  }

  private damagePlayer(damage: number): void {
    if (this.phase !== 'fight' || this.playerInvulnerabilityMs > 0) return
    this.playerHealth = Math.max(0, this.playerHealth - damage)
    this.playerInvulnerabilityMs = 520
    this.playerHitFlashMs = 120
    if (this.player) {
      this.emitCombatParticles(this.player.x, this.player.y, COLORS.red, 15, 215)
      this.emitShockwave(this.player.x, this.player.y, COLORS.red, 12)
    }
    this.triggerImpactFlash(COLORS.red, 110)
    this.cameras.main.shake(90, 0.003)
    if (this.playerHealth <= 0) this.endFight('lose')
  }

  private getBossAnimationState(): BossAnimationState {
    if (this.debugAnimationScenario?.bossState) return this.debugAnimationScenario.bossState
    if (this.bossReleasePoseMs > 0 && this.bossReleaseModule) {
      if (this.bossReleaseModule === 'RADIAL_BURST') return 'radial_release'
      if (this.bossReleaseModule === 'AIMED_SHOT') return 'aimed_release'
      return 'beam_active'
    }
    const attack = this.activeBossAttack
    if (attack) {
      if (attack.module === 'RADIAL_BURST') return 'radial_telegraph'
      if (attack.module === 'AIMED_SHOT') return 'aimed_telegraph'
      return attack.stage === 'active' ? 'beam_active' : 'beam_telegraph'
    }
    if (this.bossRecoveryPoseMs > 0 && this.bossRecoveryModule) {
      if (this.bossRecoveryModule === 'RADIAL_BURST') return 'radial_recover'
      if (this.bossRecoveryModule === 'AIMED_SHOT') return 'aimed_recover'
      return 'beam_recover'
    }
    return 'idle'
  }

  private updatePlayerRig(aimAngle: number): void {
    if (!this.player || !this.playerSprite || !this.playerRig) return
    const rig = this.playerRig
    const velocityX = this.player.x - this.previousPlayerX
    const velocityY = this.player.y - this.previousPlayerY
    const moving = Math.hypot(velocityX, velocityY) > 0.01
    const directionAngle = moving ? Math.atan2(velocityY, velocityX) : aimAngle
    this.playerFacingOctant = ((Math.round((directionAngle / (Math.PI * 2)) * 8) % 8) + 8) % 8
    this.playerAnimationState = this.debugAnimationScenario?.playerState ?? (this.dodgeRemainingMs > 0
      ? 'dodge'
      : this.playerFirePoseMs > 0 ? 'fire' : moving ? 'run' : 'idle')

    const state = this.playerAnimationState
    const cycleMs = state === 'run' ? 260 : state === 'idle' ? 720 : state === 'fire' ? 105 : 190
    const frameCount = state === 'run' ? 6 : state === 'idle' ? 4 : state === 'fire' ? 3 : 5
    this.playerAnimationFrame = Math.floor((this.presentationClockMs % cycleMs) / (cycleMs / frameCount))
    const phase = (this.presentationClockMs / cycleMs) * Math.PI * 2
    const stride = state === 'run' ? Math.sin(phase) : 0
    const idleBreath = state === 'idle' ? Math.sin(phase) : 0
    const auditPhase = ((this.debugAnimationScenario?.elapsedMs ?? this.presentationClockMs) % cycleMs) / cycleMs
    const fireProgress = state === 'fire'
      ? this.debugAnimationScenario ? auditPhase : 1 - this.playerFirePoseMs / 105
      : 0
    const dodgeProgress = state === 'dodge'
      ? this.debugAnimationScenario ? auditPhase : 1 - this.dodgeRemainingMs / 190
      : 0
    const dodgeEnvelope = state === 'dodge' ? Math.sin(Math.PI * clamp(dodgeProgress, 0, 1)) : 0
    const bob = state === 'run' ? Math.abs(stride) * -3.2 : idleBreath * 1.1
    const locomotionLean = moving
      ? clamp((velocityX * Math.cos(aimAngle) + velocityY * Math.sin(aimAngle)) * 0.017, -0.12, 0.12)
      : 0
    const rootScaleX = 1 + (state === 'run' ? Math.abs(stride) * 0.04 : idleBreath * 0.012) + dodgeEnvelope * 0.34
    const rootScaleY = 1 - (state === 'run' ? Math.abs(stride) * 0.025 : idleBreath * 0.01) - dodgeEnvelope * 0.28
    rig.root
      .setPosition(this.player.x, this.player.y - 4 + bob)
      .setRotation(aimAngle + Math.PI / 2 + locomotionLean + stride * 0.025)
      .setScale(rootScaleX, rootScaleY)
      .setAlpha(this.playerHitFlashMs > 0 ? 0.62 : state === 'dodge' ? 0.82 : 1)

    rig.leftLeg.setY(28 + stride * 5).setRotation(stride * 0.18)
    rig.rightLeg.setY(28 - stride * 5).setRotation(-stride * 0.18)
    const mantleFlutter = state === 'run' ? stride * 0.13 : idleBreath * 0.035
    rig.leftMantle.setRotation(-0.05 - mantleFlutter - dodgeEnvelope * 0.12)
    rig.rightMantle.setRotation(0.05 + mantleFlutter + dodgeEnvelope * 0.12)
    const needleThrust = state === 'fire' ? Math.sin(Math.PI * clamp(fireProgress, 0, 1)) : 0
    rig.maskGlow
      .setScale(1 + idleBreath * 0.035 + needleThrust * 0.09)
      .setAlpha(state === 'dodge' ? 0.34 : 0.13 + needleThrust * 0.12)
    const playerBaseScaleX = this.playerSprite.getData('baseScaleX') as number
    const playerBaseScaleY = this.playerSprite.getData('baseScaleY') as number
    this.playerSprite.setScale(
      playerBaseScaleX * (1 + idleBreath * 0.009),
      playerBaseScaleY * (1 - idleBreath * 0.009 + needleThrust * 0.06),
    )
    this.playerSprite.setY(-needleThrust * 9)
  }

  private updateBossRig(): void {
    if (!this.boss || !this.bossSprite || !this.bossRig) return
    const rig = this.bossRig
    this.bossAnimationState = this.getBossAnimationState()
    const state = this.bossAnimationState
    const cycleMs = state === 'idle' ? 980 : state.includes('telegraph') ? 240 : state.includes('recover') ? 320 : 150
    const frameCount = state === 'idle' ? 5 : state.includes('telegraph') ? 6 : state.includes('recover') ? 4 : 3
    this.bossAnimationFrame = Math.floor((this.presentationClockMs % cycleMs) / (cycleMs / frameCount))
    const idlePhase = (this.presentationClockMs / 980) * Math.PI * 2
    const breath = Math.sin(idlePhase)
    const liveAttack = this.activeBossAttack
    const auditModule: AttackModuleId | null = state.startsWith('radial_')
      ? 'RADIAL_BURST'
      : state.startsWith('aimed_') ? 'AIMED_SHOT' : state.startsWith('beam_') ? 'ROTATING_BEAM' : null
    const attack = liveAttack ?? (auditModule && this.player
      ? {
          module: auditModule,
          stage: state === 'beam_active' ? 'active' as AttackStage : 'telegraph' as AttackStage,
          elapsedMs: this.debugAnimationScenario?.elapsedMs ?? 0,
          targetX: this.player.x,
          targetY: this.player.y,
          angle: Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x),
        }
      : null)
    const telegraphDuration = attack?.module === 'RADIAL_BURST' ? 760 : attack?.module === 'AIMED_SHOT' ? 680 : 900
    const auditBossState = this.debugAnimationScenario?.bossState
    const auditPhase = ((this.debugAnimationScenario?.elapsedMs ?? this.presentationClockMs) % cycleMs) / cycleMs
    const charge = auditBossState
      ? auditBossState.includes('telegraph') ? 0.72 : auditBossState.includes('release') || auditBossState === 'beam_active' ? 1 : 0
      : attack?.stage === 'telegraph' ? clamp(attack.elapsedMs / telegraphDuration, 0, 1) : attack ? 1 : 0
    const release = auditBossState?.includes('release') || auditBossState === 'beam_active'
      ? Math.sin(Math.PI * auditPhase)
      : this.bossReleasePoseMs > 0
        ? Math.sin(Math.PI * (1 - this.bossReleasePoseMs / (this.bossReleaseModule === 'ROTATING_BEAM' ? 170 : 150)))
        : 0
    const recovery = auditBossState?.includes('recover')
      ? 1 - auditPhase
      : this.bossReleasePoseMs <= 0 && this.bossRecoveryPoseMs > 0
        ? this.bossRecoveryPoseMs / (this.bossRecoveryModule === 'ROTATING_BEAM' ? 420 : 280)
        : 0
    const attackAngle = attack
      ? Math.atan2(attack.targetY - this.boss.y, attack.targetX - this.boss.x)
      : this.bossReleaseAngle

    let rootRotation = breath * 0.015
    let rootScaleX = 1 + breath * 0.012
    let rootScaleY = 1 - breath * 0.01
    let rootOffsetX = 0
    let rootOffsetY = breath * 1.3
    if (state.startsWith('radial_')) {
      rootScaleX += charge * 0.1 + release * 0.13
      rootScaleY -= charge * 0.07 - release * 0.12
      rootOffsetY += charge * 3
    } else if (state.startsWith('aimed_')) {
      rootRotation += -0.04 * charge + 0.08 * release
      rootOffsetX -= Math.cos(attackAngle) * (charge * 10 - release * 17)
      rootOffsetY -= Math.sin(attackAngle) * (charge * 10 - release * 17)
      rootScaleY -= charge * 0.08
    } else if (state.startsWith('beam_')) {
      rootRotation += (attack?.angle ?? attackAngle) * 0.025 + charge * 0.06
      rootScaleX -= charge * 0.025
      rootScaleY += charge * 0.065
    }
    rootScaleX += recovery * 0.025 * Math.sin(idlePhase * 2)
    rootScaleY -= recovery * 0.018 * Math.sin(idlePhase * 2)
    rig.root
      .setPosition(this.boss.x + rootOffsetX, this.boss.y + rootOffsetY)
      .setRotation(rootRotation)
      .setScale(rootScaleX, rootScaleY)
      .setAlpha(this.bossHitFlashMs > 0 ? 0.68 : 1)

    for (const limb of rig.limbs) {
      const gait = Math.sin(idlePhase + limb.phase)
      let spread = gait * 0.055
      let reach = 1 + Math.max(0, gait) * 0.045
      if (state.startsWith('radial_')) {
        spread += limb.side * (charge * 0.14 + release * 0.23)
        reach += charge * 0.12 + release * 0.15
      } else if (state.startsWith('aimed_')) {
        const forwardBias = Math.cos(limb.baseRotation - attackAngle)
        spread += forwardBias * release * 0.16 - forwardBias * charge * 0.08
        reach += Math.max(0, forwardBias) * (charge * 0.1 + release * 0.22)
      } else if (state.startsWith('beam_')) {
        spread += limb.side * Math.sin((attack?.angle ?? 0) + limb.phase) * 0.12 * charge
        reach += charge * 0.07
      }
      limb.root.setRotation(limb.baseRotation + spread).setScale(reach, 1 - (reach - 1) * 0.28)
      limb.distalRoot
        .setRotation(-spread * 0.34 + gait * 0.025)
        .setScale(1 + (reach - 1) * 0.36, 1 - (reach - 1) * 0.12)
      const tendonBreath = 0.43 + Math.max(0, gait) * 0.07 + charge * 0.04
      limb.proximal.setAlpha(tendonBreath)
      limb.distal.setAlpha(Math.min(0.55, tendonBreath + 0.04))
      limb.proximalRidge.setAlpha(0.28 + charge * 0.08)
      limb.distalRidge.setAlpha(0.25 + release * 0.09)
    }

    let hammerRotation = 0
    let hammerScale = 1
    let hammerY = 0
    if (state.startsWith('aimed_')) {
      hammerRotation = -0.42 * charge + 0.72 * release
      hammerScale = 1 + charge * 0.1
      hammerY = -charge * 12 + release * 18
    } else if (state.startsWith('beam_')) {
      hammerRotation = (attack?.angle ?? 0) + Math.PI / 2
      hammerScale = 1 + charge * 0.14
      hammerY = -8 * charge
    } else if (state.startsWith('radial_')) {
      hammerRotation = Math.sin(idlePhase * 1.5) * 0.06
      hammerY = release * 9
    }
    rig.hammer.setRotation(hammerRotation).setScale(hammerScale).setY(hammerY)
    rig.core
      .setScale(1 + charge * 0.35 + release * 0.28 + breath * 0.06)
      .setAlpha(0.72 + charge * 0.22)
    rig.shellHalo
      .setScale(1 + charge * 0.18 + release * 0.12)
      .setAlpha(0.08 + charge * 0.18)
    const bossBaseScaleX = this.bossSprite.getData('baseScaleX') as number
    const bossBaseScaleY = this.bossSprite.getData('baseScaleY') as number
    this.bossSprite.setScale(
      bossBaseScaleX * (1 + breath * 0.008),
      bossBaseScaleY * (1 - breath * 0.006),
    )
    this.bossShadow
      ?.setPosition(this.boss.x + rootOffsetX * 0.25, this.boss.y + 26)
      .setScale(1 + charge * 0.13 + release * 0.09, 1 - charge * 0.05)
  }

  private drawFightFeedback(): void {
    if (!this.player || !this.boss || !this.aimGraphics || !this.telegraphGraphics) return
    const pointer = this.input.activePointer
    const aimAngle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x)
    this.aimGraphics.clear()
    this.aimGraphics.lineStyle(1, COLORS.cyan, 0.42)
    this.aimGraphics.lineBetween(
      this.player.x, this.player.y, this.player.x + Math.cos(aimAngle) * 18, this.player.y + Math.sin(aimAngle) * 18,
    )
    this.aimGraphics.lineStyle(1, COLORS.cyan, 0.46)
    for (let index = 0; index < 4; index += 1) {
      const angle = (Math.PI / 2) * index
      this.aimGraphics.lineBetween(
        pointer.worldX + Math.cos(angle) * 8,
        pointer.worldY + Math.sin(angle) * 8,
        pointer.worldX + Math.cos(angle) * 13,
        pointer.worldY + Math.sin(angle) * 13,
      )
    }
    this.player.setFillStyle(
      this.playerHitFlashMs > 0 ? COLORS.white : COLORS.cyan,
      this.playerHitFlashMs > 0 ? 0.62 : this.dodgeRemainingMs > 0 ? 0.08 : 0.14,
    )
    this.player.setStrokeStyle(2, this.playerHitFlashMs > 0 ? COLORS.white : COLORS.cyan, 0.58)
    this.updatePlayerRig(aimAngle)
    this.updateBossRig()
    const coreCharge = this.activeBossAttack?.stage === 'telegraph'
      ? 0.2 + Math.min(0.8, this.activeBossAttack.elapsedMs / 900)
      : this.activeBossAttack?.stage === 'active' ? 1 : 0
    this.bossInner
      ?.setScale(1 + Math.sin(this.elapsedFightMs * 0.004) * 0.08 + coreCharge * 0.18)
      .setAlpha(0.55 + coreCharge * 0.45)

    this.telegraphGraphics.clear()
    const attack = this.activeBossAttack
    if (!attack) {
      this.incomingFrame?.setVisible(false)
      this.incomingText?.setVisible(false)
      return
    }
    const moduleName = ATTACK_MODULES.find((module) => module.id === attack.module)?.name
    this.incomingText
      ?.setText(attack.stage === 'telegraph' ? `The bell draws breath  ·  ${moduleName}` : `The ember is loosed  ·  ${moduleName}`)
      .setColor(attack.stage === 'active' ? '#cf754c' : '#dfcfaa')
      .setVisible(true)
    this.incomingFrame
      ?.setVisible(true)
      .setAlpha(0.82 + Math.sin(this.elapsedFightMs * 0.018) * 0.12)

    if (attack.module === 'RADIAL_BURST') {
      const progress = clamp(attack.elapsedMs / 760, 0, 1)
      this.telegraphGraphics.lineStyle(10, COLORS.orange, 0.045 + progress * 0.08)
      this.telegraphGraphics.strokeCircle(this.boss.x, this.boss.y, 48 + progress * 38)
      this.telegraphGraphics.lineStyle(2, COLORS.yellow, 0.38 + progress * 0.56)
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + Math.sin(this.elapsedFightMs * 0.004) * 0.025
        this.telegraphGraphics.lineBetween(
          this.boss.x + Math.cos(angle) * 54, this.boss.y + Math.sin(angle) * 54,
          this.boss.x + Math.cos(angle) * (82 + progress * 21),
          this.boss.y + Math.sin(angle) * (82 + progress * 21),
        )
        this.telegraphGraphics.fillStyle(COLORS.yellow, 0.5 + progress * 0.5)
        this.telegraphGraphics.fillCircle(
          this.boss.x + Math.cos(angle) * (67 + progress * 31),
          this.boss.y + Math.sin(angle) * (67 + progress * 31),
          2 + progress * 2,
        )
      }
    } else if (attack.module === 'AIMED_SHOT') {
      const progress = clamp(attack.elapsedMs / 680, 0, 1)
      const angle = Math.atan2(attack.targetY - this.boss.y, attack.targetX - this.boss.x)
      const laneEndX = this.boss.x + Math.cos(angle) * 1150
      const laneEndY = this.boss.y + Math.sin(angle) * 1150
      const normalX = -Math.sin(angle)
      const normalY = Math.cos(angle)
      this.telegraphGraphics.fillStyle(COLORS.red, 0.055 + progress * 0.09)
      this.telegraphGraphics.fillTriangle(
        this.boss.x,
        this.boss.y,
        laneEndX + normalX * 15,
        laneEndY + normalY * 15,
        laneEndX - normalX * 15,
        laneEndY - normalY * 15,
      )
      this.telegraphGraphics.lineStyle(3 + progress * 4, COLORS.red, 0.35 + progress * 0.6)
      this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, laneEndX, laneEndY)
      this.telegraphGraphics.lineStyle(1, COLORS.white, 0.25 + progress * 0.45)
      this.telegraphGraphics.lineBetween(
        this.boss.x + normalX * 12,
        this.boss.y + normalY * 12,
        laneEndX + normalX * 12,
        laneEndY + normalY * 12,
      )
      this.telegraphGraphics.lineBetween(
        this.boss.x - normalX * 12,
        this.boss.y - normalY * 12,
        laneEndX - normalX * 12,
        laneEndY - normalY * 12,
      )
      const targetSize = 11 + progress * 11
      this.telegraphGraphics.lineStyle(2, COLORS.red, 0.88)
      this.telegraphGraphics.beginPath()
      this.telegraphGraphics.moveTo(attack.targetX, attack.targetY - targetSize)
      this.telegraphGraphics.lineTo(attack.targetX + targetSize, attack.targetY)
      this.telegraphGraphics.lineTo(attack.targetX, attack.targetY + targetSize)
      this.telegraphGraphics.lineTo(attack.targetX - targetSize, attack.targetY)
      this.telegraphGraphics.closePath()
      this.telegraphGraphics.strokePath()
      this.telegraphGraphics.fillStyle(COLORS.orange, 0.55 + progress * 0.3)
      this.telegraphGraphics.fillCircle(attack.targetX, attack.targetY, 2 + progress * 2)
    } else {
      const endX = this.boss.x + Math.cos(attack.angle) * 1150
      const endY = this.boss.y + Math.sin(attack.angle) * 1150
      const normalX = -Math.sin(attack.angle)
      const normalY = Math.cos(attack.angle)
      if (attack.stage === 'telegraph') {
        const progress = clamp(attack.elapsedMs / 900, 0, 1)
        this.telegraphGraphics.lineStyle(9 + progress * 10, COLORS.orange, 0.15 + progress * 0.32)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
        this.telegraphGraphics.lineStyle(1, COLORS.yellow, 0.35 + progress * 0.45)
        this.telegraphGraphics.lineBetween(
          this.boss.x + normalX * 17,
          this.boss.y + normalY * 17,
          endX + normalX * 17,
          endY + normalY * 17,
        )
        this.telegraphGraphics.lineBetween(
          this.boss.x - normalX * 17,
          this.boss.y - normalY * 17,
          endX - normalX * 17,
          endY - normalY * 17,
        )
        this.telegraphGraphics.lineStyle(2, COLORS.yellow, 0.9)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
      } else {
        this.telegraphGraphics.lineStyle(44, COLORS.red, 0.12)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
        this.telegraphGraphics.lineStyle(23, COLORS.red, 0.72)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
        this.telegraphGraphics.lineStyle(9, COLORS.orange, 0.9)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
        this.telegraphGraphics.lineStyle(3, COLORS.yellow, 0.95)
        this.telegraphGraphics.lineBetween(this.boss.x, this.boss.y, endX, endY)
      }
    }
  }

  private refreshHud(): void {
    if (!this.playerHealthBar || !this.bossHealthBar || !this.statusText ||
      !this.bossStatusText || !this.dodgeProgressBar || !this.dodgeText) return
    const playerRatio = this.playerHealth / 100
    this.playerHealthBar.clear()
    this.playerHealthBar.fillStyle(COLORS.soot, 0.82)
    this.playerHealthBar.fillRoundedRect(34, 124, 214, 9, 4)
    this.playerHealthBar.fillStyle(COLORS.verdigris, 0.92)
    this.playerHealthBar.fillRoundedRect(34, 124, 214 * playerRatio, 9, 4)
    this.playerHealthBar.lineStyle(1, COLORS.white, 0.34)
    this.playerHealthBar.strokeRoundedRect(34, 124, 214, 9, 4)
    for (let index = 1; index < 5; index += 1) {
      const x = 34 + (214 * index) / 5
      this.playerHealthBar.lineStyle(1, COLORS.soot, 0.8)
      this.playerHealthBar.lineBetween(x, 125, x, 132)
    }
    this.statusText.setText(`PILGRIM  ·  ${this.playerHealth}/100`)

    const bossRatio = this.bossHealth / 300
    this.bossHealthBar.clear()
    this.bossHealthBar.fillStyle(COLORS.soot, 0.9)
    this.bossHealthBar.fillRoundedRect(330, 54, 300, 8, 4)
    this.bossHealthBar.fillStyle(COLORS.orange, 0.9)
    this.bossHealthBar.fillRoundedRect(330, 54, 300 * bossRatio, 8, 4)
    this.bossHealthBar.lineStyle(1, COLORS.yellow, 0.36)
    this.bossHealthBar.strokeRoundedRect(330, 54, 300, 8, 4)
    this.bossStatusText.setText(`ROOTBOUND BELL-SMITH  ·  ${this.bossHealth}/300`)
    const cooldownSeconds = Math.max(0, this.dodgeCooldownMs / 1000)
    const dodgeReadiness = 1 - clamp(this.dodgeCooldownMs / 900, 0, 1)
    this.dodgeProgressBar.clear()
    this.dodgeProgressBar.lineStyle(1, COLORS.white, 0.25)
    this.dodgeProgressBar.lineBetween(35, 591, 196, 591)
    this.dodgeProgressBar.lineStyle(3, cooldownSeconds <= 0 ? COLORS.cyan : COLORS.muted, 0.82)
    this.dodgeProgressBar.lineBetween(35, 591, 35 + 161 * dodgeReadiness, 591)
    this.dodgeProgressBar.fillStyle(cooldownSeconds <= 0 ? COLORS.yellow : COLORS.muted, 0.9)
    this.dodgeProgressBar.fillCircle(35 + 161 * dodgeReadiness, 591, 2.5)
    this.dodgeText
      .setText(cooldownSeconds <= 0 ? 'SPACE  ·  SHROUD READY' : `SPACE  ·  SHROUD ${cooldownSeconds.toFixed(1)}s`)
      .setColor(cooldownSeconds <= 0 ? '#b9d7ce' : '#85877f')
  }

  private endFight(result: 'win' | 'lose'): void {
    if (this.phase !== 'fight') return
    this.phase = result
    this.activeBossAttack = null
    this.telegraphGraphics?.clear()
    this.incomingFrame?.setVisible(false)
    this.incomingText?.setVisible(false)
    for (const projectile of [...this.playerBullets, ...this.bossProjectiles]) projectile.sprite.destroy()
    this.playerBullets = []
    this.bossProjectiles = []
    this.refreshHud()

    const shade = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x050706, 0.82)
      .setDepth(60)
    const resultPanel = this.add.graphics().setDepth(61)
    resultPanel.fillStyle(0x0c100e, 0.94)
    resultPanel.fillRoundedRect(229, 178, 502, 206, 86)
    resultPanel.lineStyle(1, COLORS.white, 0.24)
    resultPanel.strokeRoundedRect(229, 178, 502, 206, 86)
    resultPanel.lineStyle(1, result === 'win' ? COLORS.verdigris : COLORS.orange, 0.6)
    resultPanel.beginPath()
    resultPanel.moveTo(321, 220)
    resultPanel.lineTo(389, 202)
    resultPanel.lineTo(480, 194)
    resultPanel.lineTo(571, 202)
    resultPanel.lineTo(639, 220)
    resultPanel.strokePath()
    resultPanel.fillStyle(result === 'win' ? COLORS.verdigris : COLORS.orange, 0.86)
    resultPanel.fillCircle(480, 194, 3)
    const kicker = this.add
      .text(WIDTH / 2, 226, result === 'win' ? 'THE LAST BELL RESTS' : 'THE ASH REMEMBERS', {
        fontFamily: SMALL_CAPS, fontSize: '12px',
        color: result === 'win' ? '#91b9ae' : '#c87a50', letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(62)
    const title = this.add
      .text(WIDTH / 2, 276, result === 'win' ? 'THE KEEPER IS SILENT' : 'THE PILGRIM FALLS', {
        fontFamily: SERIF, fontStyle: 'bold', fontSize: '40px', color: '#eee5cf',
      })
      .setOrigin(0.5)
      .setDepth(62)
    const detail = this.add
      .text(WIDTH / 2, 329, result === 'win' ? 'You endured the rites you inscribed.' : 'Read its breath. Bind new rites. Return.', {
        fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', color: '#bbb6a8',
      })
      .setOrigin(0.5)
      .setDepth(62)
    const button = this.add
      .rectangle(WIDTH / 2, 425, 310, 54, 0x161c19, 0.98)
      .setStrokeStyle(1, COLORS.yellow, 0.54)
      .setInteractive({ useHandCursor: true })
      .setDepth(62)
    const buttonText = this.add
      .text(WIDTH / 2, 424, 'RETURN TO THE ALTAR', {
        fontFamily: SERIF, fontStyle: 'bold', fontSize: '15px', color: '#e7ddc3', letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(63)
    const shortcut = this.add
      .text(WIDTH / 2, 470, 'R  ·  QUICK RETURN', {
        fontFamily: SMALL_CAPS, fontSize: '10px', color: '#80837b', letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(62)
    button.on('pointerdown', () => this.showConfiguration())
    button.on('pointerover', () => button.setFillStyle(0x24312c, 1).setStrokeStyle(1, COLORS.yellow, 0.9))
    button.on('pointerout', () => button.setFillStyle(0x161c19, 0.98).setStrokeStyle(1, COLORS.yellow, 0.54))
    this.resultObjects.push(shade, resultPanel, kicker, title, detail, button, buttonText, shortcut)
  }

  private clearFightObjects(): void {
    for (const projectile of [...this.playerBullets, ...this.bossProjectiles]) projectile.sprite.destroy()
    for (const echo of this.dodgeEchoes) echo.sprite.destroy()
    this.playerBullets = []
    this.bossProjectiles = []
    this.dodgeEchoes = []
    this.combatParticles = []
    this.shockwaves = []
    this.destroyAll(this.fightObjects)
    this.player = null
    this.boss = null
    this.bossInner = null
    this.playerSprite = null
    this.playerRig = null
    this.playerShadow = null
    this.bossShadow = null
    this.bossSprite = null
    this.bossRig = null
    this.telegraphGraphics = null
    this.aimGraphics = null
    this.atmosphereGraphics = null
    this.combatVfxGraphics = null
    this.foregroundGraphics = null
    this.impactOverlay = null
    this.playerHealthBar = null
    this.bossHealthBar = null
    this.statusText = null
    this.bossStatusText = null
    this.incomingFrame = null
    this.incomingText = null
    this.dodgeProgressBar = null
    this.dodgeText = null
    this.activeBossAttack = null
    this.attackHistory = []
    this.impactFlashMs = 0
  }

  private destroyAll(objects: Destroyable[]): void {
    for (const object of objects) object.destroy()
    objects.length = 0
  }
}
