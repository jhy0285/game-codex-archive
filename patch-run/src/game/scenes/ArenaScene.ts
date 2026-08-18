import Phaser from 'phaser'
import {
  PATCH_SCHEDULE,
  PATCH_DESCRIPTIONS,
  bounceStats,
  canDamageEnemyAfterBounce,
  nextScheduledPatch,
  secondsUntilNextPatch,
  type PatchId,
} from '../rules'
import { ACTIVE_THEME } from '../theme'

const WIDTH = 960
const HEIGHT = 600
const ARENA = { left: 28, right: 932, top: 76, bottom: 572 }
const PLAYER_SPEED = 260
const DASH_SPEED = 760
const BULLET_SPEED = 720

type Mode = 'running' | 'dead'
type PlayerMotionState = 'idle' | 'walk' | 'fire' | 'dash-compress' | 'dash-smear' | 'dash-recover' | 'hit' | 'dead'
type EnemyMotionState = 'emerge' | 'skitter' | 'anticipate' | 'hit' | 'death'
type Controls = Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'R' | 'F', Phaser.Input.Keyboard.Key>

interface BulletState {
  damage: number
  age: number
  bounces: number
  visualScale: number
}

interface DebugApi {
  forceDeath: () => void
  hitPlayer: () => void
  restart: () => void
  advanceTo: (elapsedMs: number) => void
  clearEnemies: () => void
  fireRight: () => void
  spawnEnemyNear: () => void
  spawnEnemyAt: (x: number, y: number) => void
  setPlayerPosition: (x: number, y: number) => void
  setNearestEnemyPosition: (x: number, y: number) => void
  setPresentationClock: (ms: number | null) => void
  hitNearestEnemy: () => void
  killNearestEnemy: () => void
}

interface PlayerRig {
  container: Phaser.GameObjects.Container
  blade: Phaser.GameObjects.Image
  mask: Phaser.GameObjects.Image
  leftCloak: Phaser.GameObjects.Image
  rightCloak: Phaser.GameObjects.Image
  feet: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
}

interface EnemyRig {
  container: Phaser.GameObjects.Container
  core: Phaser.GameObjects.Image
  leftWing: Phaser.GameObjects.Image
  rightWing: Phaser.GameObjects.Image
  legs: Phaser.GameObjects.Graphics
  shadow: Phaser.GameObjects.Ellipse
  bornAt: number
  hitUntil: number
  state: EnemyMotionState
  frame: number
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void>
    patchRunDebug?: DebugApi
  }
}

export class ArenaScene extends Phaser.Scene {
  private readonly theme = ACTIVE_THEME
  private player!: Phaser.Physics.Arcade.Image
  private enemies!: Phaser.Physics.Arcade.Group
  private bullets!: Phaser.Physics.Arcade.Group
  private keys!: Controls
  private mode: Mode = 'running'
  private elapsedMs = 0
  private score = 0
  private health = 100
  private activePatches: PatchId[] = []
  private nextSpawnAt = 0
  private lastShotAt = -1_000
  private nextContactDamageAt = 0
  private dashRemaining = 0
  private dashCooldownUntil = 0
  private dashDirection = new Phaser.Math.Vector2(1, 0)
  private lastAim = new Phaser.Math.Vector2(1, 0)
  private patchCounter = 0
  private lastEvadeFeedbackAt = -1_000
  private nextHudRefreshAt = 0
  private nextLaserSoundAt = 0
  private movementVector = new Phaser.Math.Vector2()
  private healthBar!: Phaser.GameObjects.Rectangle
  private healthText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private nextPatchText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private threatText!: Phaser.GameObjects.Text
  private dashStatusText!: Phaser.GameObjects.Text
  private patchRows: Phaser.GameObjects.Container[] = []
  private patchNotice!: Phaser.GameObjects.Container
  private patchNoticeKicker!: Phaser.GameObjects.Text
  private patchNoticeTitle!: Phaser.GameObjects.Text
  private patchNoticeDescription!: Phaser.GameObjects.Text
  private deathOverlay!: Phaser.GameObjects.Container
  private deathScore!: Phaser.GameObjects.Text
  private controlHint!: Phaser.GameObjects.Text
  private playerGlow!: Phaser.GameObjects.Arc
  private playerRig?: PlayerRig
  private enemyRigs = new Map<Phaser.Physics.Arcade.Image, EnemyRig>()
  private playerMotionState: PlayerMotionState = 'idle'
  private playerMotionSince = 0
  private playerAnimFrame = 0
  private firePoseUntil = -1_000
  private firePoseStartedAt = -1_000
  private hitPoseUntil = -1_000
  private dashStartedAt = -1_000
  private lastEnemyDeathAt = -1_000
  private lastEnemyDeathFrame = 0
  private playerHitDirection = new Phaser.Math.Vector2(-1, 0)
  private motionPreviewClockMs: number | null = null
  private actorFxOverlay!: Phaser.GameObjects.Graphics
  private combatOverlay!: Phaser.GameObjects.Graphics
  private projectileOverlay!: Phaser.GameObjects.Graphics
  private damageOverlay!: Phaser.GameObjects.Rectangle

  constructor() {
    super('arena')
  }

  preload(): void {
    this.load.image('drowned-arena', '/assets/drowned-scriptorium/drowned-scriptorium-arena.webp')
    this.load.image('curse-runner', '/assets/drowned-scriptorium/curse-runner.png')
    this.load.image('seed-husk', '/assets/drowned-scriptorium/seed-husk.png')
    this.load.image('bullet', '/assets/kenney-space-shooter/laser.png')
    this.load.audio('laser-sfx', '/assets/kenney-space-shooter/laser.ogg')
    this.load.audio('hit-sfx', '/assets/kenney-space-shooter/hit.ogg')
    this.load.audio('evade-sfx', '/assets/kenney-space-shooter/evade.ogg')
    this.load.spritesheet('pixel-ships', '/assets/pixel-bitshift/ships.png', { frameWidth: 8, frameHeight: 8 })
    this.load.spritesheet('pixel-projectiles', '/assets/pixel-bitshift/projectiles.png', { frameWidth: 8, frameHeight: 8 })
  }

  create(): void {
    this.resetState()
    this.createTextures()
    this.createIllustratedRigFrames()
    this.drawArena()
    this.createHud()
    this.createActors()
    this.createOverlays()
    this.bindInput()
    this.installAutomationHooks()

    this.spawnEnemy(ARENA.left + 46, ARENA.top + 46)
    this.spawnEnemy(ARENA.right - 46, ARENA.top + 46)
    this.spawnEnemy(ARENA.left + 46, ARENA.bottom - 46)
    this.spawnEnemy(ARENA.right - 46, ARENA.bottom - 46)
    this.nextSpawnAt = 2_200
    this.updateHud(true)
  }

  update(_time: number, delta: number): void {
    const safeDelta = Math.min(delta, 50)

    if (this.mode === 'dead') return

    this.elapsedMs += safeDelta
    this.activateDuePatches()
    this.updateAim()
    this.updatePlayer(safeDelta)
    this.updateEnemies()
    this.updateActorFx()
    this.updateBullets(safeDelta)
    this.handleShooting()
    this.handleSpawning()
    this.updateHud()
  }

  private resetState(): void {
    this.mode = 'running'
    this.elapsedMs = 0
    this.score = 0
    this.health = 100
    this.activePatches = []
    this.nextSpawnAt = 0
    this.lastShotAt = -1_000
    this.nextContactDamageAt = 0
    this.dashRemaining = 0
    this.dashCooldownUntil = 0
    this.patchCounter = 0
    this.lastEvadeFeedbackAt = -1_000
    this.nextHudRefreshAt = 0
    this.nextLaserSoundAt = 0
    this.patchRows = []
    this.enemyRigs.clear()
    this.playerRig = undefined
    this.playerMotionState = 'idle'
    this.playerMotionSince = 0
    this.playerAnimFrame = 0
    this.firePoseUntil = -1_000
    this.firePoseStartedAt = -1_000
    this.hitPoseUntil = -1_000
    this.dashStartedAt = -1_000
    this.lastEnemyDeathAt = -1_000
    this.lastEnemyDeathFrame = 0
    this.motionPreviewClockMs = null
  }

  private createTextures(): void {
    if (!this.textures.exists('player-vector')) {
      const player = this.make.graphics({ x: 0, y: 0 }, false)
      player.fillStyle(0x06171c, 0.96)
      player.fillTriangle(58, 22, 8, 3, 15, 22)
      player.fillTriangle(58, 22, 15, 22, 8, 41)
      player.fillStyle(0x16474c, 1)
      player.fillTriangle(49, 22, 16, 8, 22, 22)
      player.fillTriangle(49, 22, 22, 22, 16, 36)
      player.fillStyle(0xf0fff6, 1)
      player.fillTriangle(45, 22, 25, 13, 29, 22)
      player.fillTriangle(45, 22, 29, 22, 25, 31)
      player.fillStyle(0x62ffdf, 1)
      player.fillTriangle(18, 22, 5, 16, 5, 28)
      player.fillStyle(0xeaff89, 0.9)
      player.fillRect(42, 19, 8, 6)
      player.lineStyle(2, 0x62ffdf, 0.92)
      player.strokeTriangle(58, 22, 8, 3, 8, 41)
      player.lineStyle(1, 0xd9fff5, 0.68)
      player.lineBetween(29, 22, 52, 22)
      player.generateTexture('player-vector', 64, 44)
      player.destroy()
    }

    if (!this.textures.exists('enemy-vector')) {
      const enemy = this.make.graphics({ x: 0, y: 0 }, false)
      enemy.fillStyle(0x220d18, 0.98)
      enemy.fillTriangle(32, 3, 24, 16, 40, 16)
      enemy.fillTriangle(32, 41, 24, 28, 40, 28)
      enemy.fillTriangle(3, 22, 17, 14, 17, 30)
      enemy.fillTriangle(61, 22, 47, 14, 47, 30)
      enemy.fillStyle(0x6e2038, 1)
      enemy.fillCircle(32, 22, 14)
      enemy.fillStyle(0x160912, 1)
      enemy.fillCircle(32, 22, 8)
      enemy.fillStyle(0xff6877, 1)
      enemy.fillCircle(32, 22, 4)
      enemy.lineStyle(2, 0xff6877, 0.85)
      enemy.strokeCircle(32, 22, 19)
      enemy.lineStyle(1, 0xffc0bf, 0.66)
      enemy.lineBetween(18, 8, 24, 15)
      enemy.lineBetween(46, 8, 40, 15)
      enemy.generateTexture('enemy-vector', 64, 44)
      enemy.destroy()
    }

    if (!this.textures.exists('bullet-vector')) {
      const bullet = this.make.graphics({ x: 0, y: 0 }, false)
      bullet.fillStyle(0xd4aa38, 0.1)
      bullet.fillCircle(10, 10, 10)
      bullet.fillStyle(0xaebf79, 0.46)
      bullet.fillCircle(10, 10, 6)
      bullet.fillStyle(0xf3e9b3, 1)
      bullet.fillEllipse(10, 9, 8, 12)
      bullet.fillStyle(0x463719, 0.9)
      bullet.fillEllipse(10, 9, 2, 6)
      bullet.lineStyle(1, 0xd7bd68, 0.88)
      bullet.lineBetween(10, 15, 6, 20)
      bullet.lineBetween(10, 15, 14, 20)
      bullet.generateTexture('bullet-vector', 20, 22)
      bullet.destroy()
    }
  }

  /**
   * The illustrated actors deliberately use one generated source image each.
   * Tight texture frames let the renderer articulate the mask, mantle, feet,
   * wings, shell and legs independently without changing the physics sprite or
   * introducing identity drift between AI-generated animation frames.
   */
  private createIllustratedRigFrames(): void {
    if (this.theme !== 'overdrive') return

    const runner = this.textures.get('curse-runner')
    if (!runner.has('runner-full')) {
      runner.add('runner-full', 0, 110, 16, 164, 350)
      runner.add('runner-blade', 0, 160, 16, 64, 178)
      runner.add('runner-mask', 0, 135, 118, 114, 134)
      runner.add('runner-cloak-left', 0, 110, 160, 83, 158)
      runner.add('runner-cloak-right', 0, 191, 160, 83, 158)
      runner.add('runner-feet', 0, 150, 266, 84, 100)
    }

    const husk = this.textures.get('seed-husk')
    if (!husk.has('husk-core')) {
      husk.add('husk-core', 0, 129, 24, 126, 336)
      husk.add('husk-wing-left', 0, 80, 132, 116, 158)
      husk.add('husk-wing-right', 0, 188, 132, 116, 158)
    }
  }

  private drawArena(): void {
    if (this.theme === 'overdrive') {
      this.drawDrownedSanctuary()
      return
    }
    if (this.theme === 'pixel') {
      const base = this.add.graphics()
      base.fillStyle(0x090a13, 1)
      base.fillRect(0, 0, WIDTH, HEIGHT)
      base.fillStyle(0x101321, 1)
      base.fillRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top)

      base.fillStyle(0x242b3e, 0.8)
      for (let x = ARENA.left; x < ARENA.right; x += 24) base.fillRect(x, ARENA.top, 1, ARENA.bottom - ARENA.top)
      for (let y = ARENA.top; y < ARENA.bottom; y += 24) base.fillRect(ARENA.left, y, ARENA.right - ARENA.left, 1)

      const starColors = [0xe8f5e9, 0x86d7f2, 0xe6ff74, 0x9d7bf2]
      for (let i = 0; i < 76; i += 1) {
        const x = ARENA.left + 7 + ((i * 149) % (ARENA.right - ARENA.left - 14))
        const y = ARENA.top + 7 + ((i * 83) % (ARENA.bottom - ARENA.top - 14))
        const size = i % 11 === 0 ? 3 : i % 4 === 0 ? 2 : 1
        base.fillStyle(starColors[i % starColors.length]!, i % 5 === 0 ? 0.72 : 0.34)
        base.fillRect(x, y, size, size)
      }

      base.lineStyle(3, 0xe6ff74, 1)
      base.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top)
      base.lineStyle(1, 0x86d7f2, 0.48)
      base.strokeRect(ARENA.left + 5, ARENA.top + 5, ARENA.right - ARENA.left - 10, ARENA.bottom - ARENA.top - 10)
      this.add.text(ARENA.left + 12, ARENA.top + 10, 'ZONE 07  //  HOT', {
        fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#e6ff74',
        backgroundColor: '#090a13', padding: { x: 5, y: 3 },
      }).setDepth(3)
      this.add.text(ARENA.right - 12, ARENA.top + 10, '1UP  READY', {
        fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#86d7f2',
        backgroundColor: '#090a13', padding: { x: 5, y: 3 },
      }).setOrigin(1, 0).setDepth(3)
      return
    }

    const base = this.add.graphics()
    base.fillStyle(0x020609, 1)
    base.fillRect(0, 0, WIDTH, HEIGHT)
    this.add.image(WIDTH / 2, HEIGHT / 2, 'arena-bg')
      .setDisplaySize(WIDTH + 120, HEIGHT + 120)
      .setAlpha(0.2)

    const arenaCenterY = (ARENA.top + ARENA.bottom) / 2
    this.add.image(WIDTH / 2, arenaCenterY, 'patch-forge-arena')
      .setDisplaySize(ARENA.right - ARENA.left, ARENA.bottom - ARENA.top)
      .setAlpha(0.93)

    // Three cheap atmospheric planes make the painted environment feel deep
    // without adding a per-particle update loop.
    const fogPlanes = [
      this.add.ellipse(ARENA.left + 110, ARENA.top + 145, 300, 116, 0x38c8d4, 0.035),
      this.add.ellipse(ARENA.right - 120, ARENA.bottom - 128, 360, 128, 0x4af1d2, 0.028),
      this.add.ellipse(WIDTH / 2, arenaCenterY, 460, 126, 0x75f4ff, 0.018),
    ]
    fogPlanes.forEach((fog, index) => {
      fog.setDepth(1).setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: fog,
        x: fog.x + (index % 2 === 0 ? 54 : -64),
        scaleX: 1.1 + index * 0.04,
        alpha: { from: fog.alpha * 0.7, to: fog.alpha * 1.35 },
        duration: 5_800 + index * 1_250,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      })
    })

    const background = this.add.graphics()

    background.fillStyle(0x0b2025, 0.84)
    background.fillRect(ARENA.left, ARENA.top, 7, ARENA.bottom - ARENA.top)
    background.fillRect(ARENA.right - 7, ARENA.top, 7, ARENA.bottom - ARENA.top)
    background.fillStyle(0x02080a, 0.56)
    background.fillRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, 26)
    background.fillRect(ARENA.left, ARENA.bottom - 30, ARENA.right - ARENA.left, 30)

    // Small, deterministic signal lights make the arena feel inhabited without
    // adding per-frame objects or the visual noise of a particle field.
    background.fillStyle(0x8effe8, 0.34)
    for (let i = 0; i < 34; i += 1) {
      const x = ARENA.left + 18 + ((i * 137) % 860)
      const y = ARENA.top + 36 + ((i * 73) % 430)
      const size = i % 5 === 0 ? 2 : 1
      background.fillCircle(x, y, size)
    }

    background.lineStyle(1, 0x2f6a70, 0.16)
    for (let x = ARENA.left + 24; x < ARENA.right; x += 48) {
      background.lineBetween(x, ARENA.top, x, ARENA.bottom)
    }
    for (let y = ARENA.top + 24; y < ARENA.bottom; y += 48) {
      background.lineBetween(ARENA.left, y, ARENA.right, y)
    }

    const centerY = arenaCenterY
    background.lineStyle(1, 0x6aece1, 0.18)
    background.strokeCircle(WIDTH / 2, centerY, 96)
    background.strokeCircle(WIDTH / 2, centerY, 176)
    background.lineStyle(1, 0x3ef5dc, 0.15)
    background.lineBetween(WIDTH / 2 - 195, (ARENA.top + ARENA.bottom) / 2, WIDTH / 2 + 195, (ARENA.top + ARENA.bottom) / 2)
    background.lineBetween(WIDTH / 2, (ARENA.top + ARENA.bottom) / 2 - 195, WIDTH / 2, (ARENA.top + ARENA.bottom) / 2 + 195)
    background.lineStyle(1, 0xeaff89, 0.08)
    background.lineBetween(ARENA.left + 8, ARENA.bottom - 82, WIDTH / 2, centerY)
    background.lineBetween(ARENA.right - 8, ARENA.bottom - 82, WIDTH / 2, centerY)
    background.lineBetween(ARENA.left + 8, ARENA.top + 68, WIDTH / 2, centerY)
    background.lineBetween(ARENA.right - 8, ARENA.top + 68, WIDTH / 2, centerY)

    background.fillStyle(0x061419, 0.9)
    background.fillRect(ARENA.left + 12, ARENA.top + 12, 176, 22)
    background.fillRect(ARENA.right - 188, ARENA.top + 12, 176, 22)
    background.lineStyle(1, 0x6cefe0, 0.24)
    background.strokeRect(ARENA.left + 12, ARENA.top + 12, 176, 22)
    background.strokeRect(ARENA.right - 188, ARENA.top + 12, 176, 22)
    this.add.text(ARENA.left + 24, ARENA.top + 18, 'SECTOR 07  /  LIVE', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#6cefe0', letterSpacing: 2,
    }).setDepth(3)
    this.add.text(ARENA.right - 24, ARENA.top + 18, 'RADAR 360°  /  LOCKED', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#7d9899', letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(3)

    background.lineStyle(2, 0x3ef5dc, 0.55)
    background.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top)
    background.lineStyle(5, 0x3ef5dc, 0.9)
    const c = 28
    background.lineBetween(ARENA.left, ARENA.top, ARENA.left + c, ARENA.top)
    background.lineBetween(ARENA.left, ARENA.top, ARENA.left, ARENA.top + c)
    background.lineBetween(ARENA.right, ARENA.top, ARENA.right - c, ARENA.top)
    background.lineBetween(ARENA.right, ARENA.top, ARENA.right, ARENA.top + c)
    background.lineBetween(ARENA.left, ARENA.bottom, ARENA.left + c, ARENA.bottom)
    background.lineBetween(ARENA.left, ARENA.bottom, ARENA.left, ARENA.bottom - c)
    background.lineBetween(ARENA.right, ARENA.bottom, ARENA.right - c, ARENA.bottom)
    background.lineBetween(ARENA.right, ARENA.bottom, ARENA.right, ARENA.bottom - c)

    const scanline = this.add.rectangle(WIDTH / 2, ARENA.top + 4, ARENA.right - ARENA.left - 8, 2, 0x64ffe8, 0.08)
      .setDepth(2)
    this.tweens.add({
      targets: scanline,
      y: ARENA.bottom - 4,
      alpha: { from: 0.03, to: 0.16 },
      duration: 4_600,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    })

    const coreHalo = this.add.circle(WIDTH / 2, ARENA.top + 27, 18, 0x58fbff, 0.08)
      .setStrokeStyle(1, 0xaaffff, 0.42).setDepth(2).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: coreHalo,
      scale: 1.55,
      alpha: 0.02,
      duration: 1_900,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    })
  }

  private drawDrownedSanctuary(): void {
    const arenaCenterY = (ARENA.top + ARENA.bottom) / 2
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x040705, 1)
    this.add.image(WIDTH / 2, arenaCenterY, 'drowned-arena')
      .setDisplaySize(ARENA.right - ARENA.left, ARENA.bottom - ARENA.top)
      .setAlpha(0.98)

    // Water haze, upper spores, and a close veil establish three depth planes.
    const waterHaze = this.add.ellipse(ARENA.left + 200, arenaCenterY + 96, 430, 96, 0x456f65, 0.055)
      .setDepth(1).setBlendMode(Phaser.BlendModes.ADD)
    const moonMist = this.add.ellipse(ARENA.right - 220, arenaCenterY - 116, 470, 84, 0xc9d1b6, 0.032)
      .setDepth(2).setBlendMode(Phaser.BlendModes.ADD)
    const foregroundVeil = this.add.ellipse(WIDTH / 2, ARENA.bottom + 38, 700, 140, 0x020403, 0.58)
      .setDepth(14)
    ;[waterHaze, moonMist].forEach((fog, index) => this.tweens.add({
      targets: fog,
      x: fog.x + (index === 0 ? 72 : -88),
      scaleX: index === 0 ? 1.14 : 1.08,
      alpha: { from: fog.alpha * 0.68, to: fog.alpha * 1.32 },
      duration: 6_800 + index * 1_700,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    }))
    this.tweens.add({
      targets: foregroundVeil,
      x: WIDTH / 2 + 38,
      alpha: { from: 0.45, to: 0.66 },
      duration: 8_400,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    })

    const marks = this.add.graphics().setDepth(3)
    const seals = [{ x: 477, y: 189 }, { x: 282, y: 405 }, { x: 680, y: 405 }]
    for (const seal of seals) {
      marks.fillStyle(0xcaa63a, 0.055)
      marks.fillCircle(seal.x, seal.y, 21)
      marks.lineStyle(1, 0xd4bb66, 0.14)
      marks.strokeCircle(seal.x, seal.y, 17)
      marks.lineBetween(seal.x - 7, seal.y, seal.x + 7, seal.y)
      marks.lineBetween(seal.x, seal.y - 7, seal.x, seal.y + 7)
    }
    marks.lineStyle(2, 0xb9ad82, 0.34)
    marks.strokeRoundedRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top, 48)
    marks.lineStyle(1, 0x456f65, 0.38)
    marks.strokeRoundedRect(ARENA.left + 6, ARENA.top + 6, ARENA.right - ARENA.left - 12, ARENA.bottom - ARENA.top - 12, 43)
    marks.fillStyle(0xdad7b6, 0.22)
    for (let i = 0; i < 30; i += 1) {
      const x = ARENA.left + 22 + ((i * 157) % 858)
      const y = ARENA.top + 22 + ((i * 79) % 440)
      marks.fillCircle(x, y, i % 7 === 0 ? 1.7 : 0.9)
    }

    const roots = this.add.graphics().setDepth(15)
    roots.fillStyle(0x010302, 0.78)
    roots.fillTriangle(0, 0, 134, 0, 0, 122)
    roots.fillTriangle(WIDTH, 0, WIDTH - 140, 0, WIDTH, 126)
    roots.fillTriangle(0, HEIGHT, 164, HEIGHT, 0, HEIGHT - 106)
    roots.fillTriangle(WIDTH, HEIGHT, WIDTH - 166, HEIGHT, WIDTH, HEIGHT - 108)
    roots.lineStyle(9, 0x010302, 0.72)
    roots.lineBetween(24, 0, 78, 96)
    roots.lineBetween(WIDTH - 28, 0, WIDTH - 86, 104)
  }

  private createHud(): void {
    if (this.theme === 'pixel') {
      this.createPixelHud()
      return
    }
    this.createDrownedHud()
    return

    this.add.rectangle(WIDTH / 2, 36, WIDTH, 72, 0x03090b, 0.98)
    this.add.image(322, 36, 'holo-panel').setDisplaySize(214, 62).setAlpha(0.18)
    this.add.image(790, 36, 'holo-panel').setDisplaySize(250, 66).setAlpha(0.16)
    this.add.rectangle(WIDTH / 2, 71, WIDTH, 1, 0x3ef5dc, 0.34)
    this.add.rectangle(208, 36, 1, 38, 0x3ef5dc, 0.2)
    this.add.rectangle(642, 36, 1, 38, 0x3ef5dc, 0.2)
    this.add.rectangle(430, 36, 1, 38, 0x3ef5dc, 0.2)

    this.add.text(28, 16, 'PATCH//RUN', {
      fontFamily: 'Arial Narrow, Segoe UI, sans-serif',
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#dffffa',
      letterSpacing: 2,
    })
    this.add.text(30, 45, 'LIVE RULESET / GATE 1', {
      fontFamily: 'Consolas, monospace',
      fontSize: '9px',
      color: '#5e8f90',
      letterSpacing: 2,
    })

    this.nextPatchText = this.add.text(319, 11, 'NEXT PATCH', {
      fontFamily: 'Consolas, monospace',
      fontSize: '9px',
      color: '#6b9294',
      letterSpacing: 2,
    }).setOrigin(0.5, 0)
    this.timerText = this.add.text(319, 25, '00:20', {
      fontFamily: 'Consolas, monospace',
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#eaff89',
    }).setOrigin(0.5, 0)

    this.scoreText = this.add.text(456, 17, 'SCORE 000000', {
      fontFamily: 'Consolas, monospace',
      fontSize: '15px',
      color: '#99b9ba',
      letterSpacing: 1,
    })
    this.threatText = this.add.text(456, 46, 'THREAT  /  04 CONTACTS', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#678586', letterSpacing: 1,
    })
    this.dashStatusText = this.add.text(558, 46, 'DASH  /  READY', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#6cefe0', letterSpacing: 1,
    })

    this.add.text(688, 13, 'INTEGRITY', {
      fontFamily: 'Consolas, monospace',
      fontSize: '9px',
      color: '#6b9294',
      letterSpacing: 2,
    })
    this.add.rectangle(688, 37, 184, 12, 0x142a2d, 1).setOrigin(0, 0.5)
    this.healthBar = this.add.rectangle(688, 37, 184, 12, 0x3ef5dc, 1).setOrigin(0, 0.5)
    this.healthText = this.add.text(904, 26, '100', {
      fontFamily: 'Consolas, monospace',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#dffffa',
    })

    this.add.text(47, 89, 'PATCH STACK  /  LIVE RULES', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#83a9aa', letterSpacing: 1.5,
    }).setDepth(20)
    const labels: PatchId[] = ['RICOCHET', 'GROWTH', 'FRIENDLY FIRE']
    labels.forEach((label, index) => {
      const row = this.add.container(47, 108 + index * 29).setDepth(20)
      const bg = this.add.rectangle(0, 0, 188, 22, 0x071012, 0.88).setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x24464a, 0.9)
      const accent = this.add.rectangle(0, 0, 3, 22, 0x24464a, 0.95).setOrigin(0, 0.5)
      const number = this.add.text(9, -6, `0${index + 1}`, {
        fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#537778',
      })
      const text = this.add.text(34, -7, label, {
        fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#6f9293',
      })
      const state = this.add.text(176, -7, '—', {
        fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#526d70',
      }).setOrigin(1, 0)
      row.add([bg, accent, number, text, state])
      row.setData('bg', bg)
      row.setData('number', number)
      row.setData('text', text)
      row.setData('state', state)
      this.patchRows.push(row)
    })

    this.controlHint = this.add.text(WIDTH / 2, 554, 'WASD  MOVE   •   MOUSE  AIM / FIRE   •   SPACE  DASH   •   F  FULLSCREEN', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#719193',
      backgroundColor: '#071012dd',
      padding: { x: 10, y: 5 },
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(30)
  }

  private createDrownedHud(): void {
    const serif = 'Georgia, Times New Roman, serif'
    const ivory = '#ede8cf'
    this.add.rectangle(WIDTH / 2, 35, WIDTH, 70, 0x070a08, 0.94).setDepth(20)
    this.add.rectangle(WIDTH / 2, 69, WIDTH, 2, 0xb5a66f, 0.44).setDepth(20)
    this.add.text(28, 11, 'PATCH//RUN', {
      fontFamily: serif, fontSize: '26px', fontStyle: 'bold', color: ivory, letterSpacing: 3,
    }).setDepth(21)
    this.add.text(30, 43, 'THE DROWNED SCRIPTORIUM · GATE I', {
      fontFamily: serif, fontSize: '9px', color: '#858a77', letterSpacing: 2,
    }).setDepth(21)

    this.nextPatchText = this.add.text(390, 11, 'NEXT INSCRIPTION', {
      fontFamily: serif, fontSize: '9px', color: '#8e927f', letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(21)
    this.timerText = this.add.text(390, 24, '00:20', {
      fontFamily: serif, fontSize: '27px', fontStyle: 'bold', color: '#d5b94e',
    }).setOrigin(0.5, 0).setDepth(21)
    this.scoreText = this.add.text(502, 16, 'MARKS 000000', {
      fontFamily: serif, fontSize: '15px', color: '#cac7ad', letterSpacing: 1,
    }).setDepth(21)
    this.threatText = this.add.text(502, 44, 'HUSKS  /  04 STIRRING', {
      fontFamily: serif, fontSize: '9px', color: '#7e8879', letterSpacing: 1,
    }).setDepth(21)
    this.dashStatusText = this.add.text(640, 44, 'THREADSTEP  /  READY', {
      fontFamily: serif, fontSize: '9px', color: '#9bb7a7', letterSpacing: 1,
    }).setDepth(21)

    this.add.text(692, 11, 'VIGOR', {
      fontFamily: serif, fontSize: '9px', color: '#8e927f', letterSpacing: 2,
    }).setDepth(21)
    this.add.rectangle(692, 37, 184, 9, 0x222720, 1).setOrigin(0, 0.5).setDepth(21)
    this.healthBar = this.add.rectangle(692, 37, 184, 9, 0x789c8a, 1).setOrigin(0, 0.5).setDepth(21)
    this.healthText = this.add.text(904, 25, '100', {
      fontFamily: serif, fontSize: '17px', fontStyle: 'bold', color: ivory,
    }).setDepth(21)

    this.add.text(47, 89, 'LIVING INSCRIPTIONS', {
      fontFamily: serif, fontSize: '9px', color: '#b0ad91', letterSpacing: 2,
    }).setDepth(20)
    const labels: PatchId[] = ['RICOCHET', 'GROWTH', 'FRIENDLY FIRE']
    labels.forEach((label, index) => {
      const row = this.add.container(47, 112 + index * 31).setDepth(20)
      const bg = this.add.rectangle(0, 0, 194, 24, 0x11140f, 0.86).setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x5b6557, 0.72)
      const accent = this.add.ellipse(8, 0, 7, 7, 0x53675c, 0.7)
      const number = this.add.text(17, -7, ['I', 'II', 'III'][index]!, {
        fontFamily: serif, fontSize: '9px', color: '#737967',
      })
      const text = this.add.text(42, -8, label, {
        fontFamily: serif, fontSize: '10px', color: '#8e917e', letterSpacing: 1,
      })
      const state = this.add.text(181, -8, 'DORMANT', {
        fontFamily: serif, fontSize: '8px', color: '#666b5e',
      }).setOrigin(1, 0)
      row.add([bg, accent, number, text, state])
      row.setData('bg', bg)
      row.setData('accent', accent)
      row.setData('number', number)
      row.setData('text', text)
      row.setData('state', state)
      this.patchRows.push(row)
    })

    this.controlHint = this.add.text(WIDTH / 2, 554, 'WASD  WALK   ·   MOUSE  CAST SEEDS   ·   SPACE  THREADSTEP   ·   F  FULLSCREEN', {
      fontFamily: serif, fontSize: '10px', color: '#aaa991', backgroundColor: '#090c09df',
      padding: { x: 13, y: 6 }, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(30)
  }

  private createPixelHud(): void {
    const mono = 'Consolas, monospace'
    this.add.rectangle(WIDTH / 2, 34, WIDTH, 68, 0x090a13, 1)
    this.add.rectangle(WIDTH / 2, 67, WIDTH, 3, 0xe6ff74, 1)
    this.add.text(22, 12, 'PATCH//RUN', {
      fontFamily: mono, fontSize: '23px', fontStyle: 'bold', color: '#f6f3df',
    })
    this.add.text(24, 42, 'BITSHIFT EDITION  //  INSERT CHAOS', {
      fontFamily: mono, fontSize: '9px', color: '#86d7f2', letterSpacing: 1,
    })

    this.nextPatchText = this.add.text(315, 11, 'NEXT / RICOCHET', {
      fontFamily: mono, fontSize: '9px', color: '#9aa2b6', letterSpacing: 1,
    }).setOrigin(0.5, 0)
    this.timerText = this.add.text(315, 26, '00:20', {
      fontFamily: mono, fontSize: '25px', fontStyle: 'bold', color: '#e6ff74',
    }).setOrigin(0.5, 0)

    this.scoreText = this.add.text(414, 16, 'SCORE 000000', {
      fontFamily: mono, fontSize: '14px', color: '#f6f3df',
    })
    this.threatText = this.add.text(414, 42, 'THREAT  /  04', {
      fontFamily: mono, fontSize: '9px', color: '#f07a87',
    })
    this.dashStatusText = this.add.text(548, 42, 'DASH  /  READY', {
      fontFamily: mono, fontSize: '9px', color: '#86d7f2',
    })

    this.add.text(676, 12, 'HP', {
      fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#f6f3df',
    })
    this.add.rectangle(704, 19, 190, 15, 0x242b3e, 1).setOrigin(0, 0)
    this.healthBar = this.add.rectangle(706, 21, 186, 11, 0xe6ff74, 1).setOrigin(0, 0)
    this.healthText = this.add.text(898, 15, '100', {
      fontFamily: mono, fontSize: '16px', fontStyle: 'bold', color: '#f6f3df',
    })

    this.add.text(45, 86, 'PATCH DECK', {
      fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#f6f3df',
      backgroundColor: '#090a13', padding: { x: 5, y: 3 },
    }).setDepth(20)
    const labels: PatchId[] = ['RICOCHET', 'GROWTH', 'FRIENDLY FIRE']
    labels.forEach((label, index) => {
      const row = this.add.container(45, 114 + index * 29).setDepth(20)
      const bg = this.add.rectangle(0, 0, 174, 22, 0x141827, 0.96).setOrigin(0, 0.5)
        .setStrokeStyle(2, 0x343b50, 1)
      const accent = this.add.rectangle(0, 0, 5, 22, 0x343b50, 1).setOrigin(0, 0.5)
      const number = this.add.text(11, -6, `${index + 1}`, {
        fontFamily: mono, fontSize: '9px', color: '#656d82',
      })
      const text = this.add.text(31, -7, label, {
        fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#7f879a',
      })
      const state = this.add.text(164, -7, 'OFF', {
        fontFamily: mono, fontSize: '9px', color: '#656d82',
      }).setOrigin(1, 0)
      row.add([bg, accent, number, text, state])
      row.setData('bg', bg)
      row.setData('number', number)
      row.setData('text', text)
      row.setData('state', state)
      this.patchRows.push(row)
    })

    this.controlHint = this.add.text(WIDTH / 2, 554, 'WASD MOVE   //   MOUSE FIRE   //   SPACE DASH   //   F FULLSCREEN', {
      fontFamily: mono, fontSize: '10px', color: '#aab2c5',
      backgroundColor: '#090a13e8', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(30)
  }

  private createActors(): void {
    this.enemies = this.physics.add.group()
    this.bullets = this.physics.add.group()
    const pixel = this.theme === 'pixel'
    this.playerGlow = this.add.circle(
      WIDTH / 2,
      HEIGHT / 2 + 20,
      pixel ? 17 : 33,
      pixel ? 0xe6ff74 : 0xc9b65c,
      pixel ? 0.09 : 0.07,
    ).setStrokeStyle(pixel ? 2 : 1, pixel ? 0xe6ff74 : 0x95b09d, pixel ? 0.42 : 0.28).setDepth(5)
    this.player = pixel
      ? this.physics.add.image(WIDTH / 2, HEIGHT / 2 + 20, 'pixel-ships', 4)
      : this.physics.add.image(WIDTH / 2, HEIGHT / 2 + 20, 'curse-runner')
    this.player.setDisplaySize(pixel ? 34 : 94, pixel ? 34 : 94).setDepth(10)
    if (pixel) this.player.setCircle(4, 2, 2)
    else {
      this.player.setCircle(58, 134, 134)
      this.player.setAlpha(0)
      this.playerRig = this.createPlayerRig(this.player.x, this.player.y)
    }
    this.player.setDrag(0)
    this.projectileOverlay = this.add.graphics().setDepth(6)
    this.actorFxOverlay = this.add.graphics().setDepth(6)
    this.combatOverlay = this.add.graphics().setDepth(18)
  }

  private createPlayerRig(x: number, y: number): PlayerRig {
    const shadow = this.add.ellipse(0, 15, 48, 21, 0x000000, 0.48)
    const feet = this.add.image(0, 31, 'curse-runner', 'runner-feet').setDisplaySize(28, 33)
    const leftCloak = this.add.image(-13.5, 5, 'curse-runner', 'runner-cloak-left').setDisplaySize(28, 53)
      .setOrigin(0.58, 0.25)
    const rightCloak = this.add.image(13.5, 5, 'curse-runner', 'runner-cloak-right').setDisplaySize(28, 53)
      .setOrigin(0.42, 0.25)
    const blade = this.add.image(0, -39, 'curse-runner', 'runner-blade').setDisplaySize(21, 59)
    const mask = this.add.image(0, -13, 'curse-runner', 'runner-mask').setDisplaySize(38, 45)
    const container = this.add.container(x, y, [shadow, feet, leftCloak, rightCloak, blade, mask])
      .setDepth(10)
    return { container, blade, mask, leftCloak, rightCloak, feet, shadow }
  }

  private createOverlays(): void {
    this.damageOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 8, HEIGHT - 8, 0xff3949, 0)
      .setStrokeStyle(8, 0xff5d67, 0).setDepth(90)

    const noticeVeil = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x010607, 0.42)
    const noticeBg = this.add.rectangle(0, 0, 650, 164, 0x061012, 0.98)
      .setStrokeStyle(2, 0xeaff89, 0.9)
    const noticeTopRule = this.add.rectangle(0, -82, 650, 3, 0xeaff89, 0.95)
    const noticeIndex = this.add.text(-292, -62, '01', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#eaff89', letterSpacing: 2,
    }).setOrigin(0, 0.5)
    this.patchNoticeKicker = this.add.text(0, -58, 'PERMANENT RULE INSTALLED', {
      fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#7da2a3', letterSpacing: 4,
    }).setOrigin(0.5)
    this.patchNoticeTitle = this.add.text(0, -13, 'RICOCHET', {
      fontFamily: 'Arial Narrow, Segoe UI, sans-serif', fontSize: '45px', fontStyle: 'bold',
      color: '#eaff89', letterSpacing: 6,
    }).setOrigin(0.5)
    this.patchNoticeDescription = this.add.text(0, 32, PATCH_DESCRIPTIONS.RICOCHET, {
      fontFamily: 'Consolas, monospace', fontSize: '13px', color: '#d8f4f1', letterSpacing: 1,
    }).setOrigin(0.5)
    const noticeFooter = this.add.text(0, 65, 'STACKS PERMANENTLY  //  ADAPT OR TERMINATE', {
      fontFamily: 'Consolas, monospace', fontSize: '9px', color: '#54797b', letterSpacing: 3,
    }).setOrigin(0.5)
    this.patchNotice = this.add.container(WIDTH / 2, HEIGHT / 2 - 8, [
      noticeVeil, noticeBg, noticeTopRule, noticeIndex,
      this.patchNoticeKicker, this.patchNoticeTitle, this.patchNoticeDescription, noticeFooter,
    ])
      .setDepth(100).setAlpha(0).setScale(0.94)
    this.patchNotice.setData('index', noticeIndex)

    const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020607, 0.9)
    const rule = this.add.rectangle(0, -74, 520, 2, 0xff5d67, 0.85)
    const kicker = this.add.text(0, -122, 'PATCH PROCESS HALTED', {
      fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#bb747a', letterSpacing: 4,
    }).setOrigin(0.5)
    const title = this.add.text(0, -42, 'RUN TERMINATED', {
      fontFamily: 'Arial Narrow, Segoe UI, sans-serif', fontSize: '48px', fontStyle: 'bold',
      color: '#ffe8e9', letterSpacing: 4,
    }).setOrigin(0.5)
    this.deathScore = this.add.text(0, 20, 'SCORE 000000  /  PATCHES 0/3', {
      fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#99b9ba', letterSpacing: 2,
    }).setOrigin(0.5)
    const restart = this.add.text(0, 76, 'PRESS  R  OR  CLICK  TO  RESTART', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#eaff89', letterSpacing: 2,
      backgroundColor: '#152123', padding: { x: 18, y: 10 },
    }).setOrigin(0.5)
    this.deathOverlay = this.add.container(WIDTH / 2, HEIGHT / 2, [shade, rule, kicker, title, this.deathScore, restart])
      .setDepth(200).setVisible(false)

    if (this.theme === 'overdrive') {
      noticeVeil.setFillStyle(0x030503, 0.58)
      noticeBg.setFillStyle(0x171911, 0.98).setStrokeStyle(2, 0xc8aa4a, 0.82)
      noticeTopRule.setFillStyle(0xc8aa4a, 0.9)
      noticeIndex.setFontFamily('Georgia, Times New Roman, serif').setColor('#c8aa4a')
      this.patchNoticeKicker.setFontFamily('Georgia, Times New Roman, serif').setColor('#8fa28f')
      this.patchNoticeTitle.setFontFamily('Georgia, Times New Roman, serif').setColor('#e7d486')
      this.patchNoticeDescription.setFontFamily('Georgia, Times New Roman, serif').setColor('#e3dfc7')
      noticeFooter.setFontFamily('Georgia, Times New Roman, serif')
        .setText('THE STONE REMEMBERS · EACH RULE ENDURES').setColor('#777d6d')
      shade.setFillStyle(0x030503, 0.93)
      rule.setFillStyle(0x8f3e2d, 0.82)
      kicker.setFontFamily('Georgia, Times New Roman, serif').setText('THE PILGRIMAGE ENDS').setColor('#a76d61')
      title.setFontFamily('Georgia, Times New Roman, serif').setText('THREAD SEVERED').setColor('#eee7cf')
      this.deathScore.setFontFamily('Georgia, Times New Roman, serif').setColor('#aaa88f')
      restart.setFontFamily('Georgia, Times New Roman, serif')
        .setText('PRESS  R  OR  CLICK  TO  BEGIN THE RITE AGAIN')
        .setColor('#dbc15a').setBackgroundColor('#1c2018')
    }

    shade.setInteractive().on('pointerdown', () => {
      if (this.mode === 'dead') this.restartRun()
    })
  }

  private bindInput(): void {
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,R,F') as Controls
    this.keys.R.on('down', () => {
      if (this.mode === 'dead') this.restartRun()
    })
    this.keys.F.on('down', () => this.toggleFullscreen())
    this.keys.SPACE.on('down', () => this.tryStartDash())
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
    })
  }

  private updateAim(): void {
    const pointer = this.input.activePointer
    const aimX = pointer.worldX - this.player.x
    const aimY = pointer.worldY - this.player.y
    const aimLength = Math.hypot(aimX, aimY)
    if (aimLength > 4) this.lastAim.set(aimX / aimLength, aimY / aimLength)
    this.player.setRotation(this.lastAim.angle() + Math.PI / 2)
    if (this.playerRig) this.playerRig.container.setRotation(this.lastAim.angle() + Math.PI / 2)

    const cursorX = Phaser.Math.Clamp(pointer.worldX, ARENA.left + 8, ARENA.right - 8)
    const cursorY = Phaser.Math.Clamp(pointer.worldY, ARENA.top + 8, ARENA.bottom - 8)
    this.combatOverlay.clear()
    const aimColor = this.theme === 'pixel' ? 0x7cfff0 : 0x9bb3a0
    const focusColor = this.theme === 'pixel' ? 0xeaff89 : 0xd4b94f
    this.combatOverlay.lineStyle(1, aimColor, 0.28)
    this.combatOverlay.lineBetween(
      this.player.x + this.lastAim.x * 21,
      this.player.y + this.lastAim.y * 21,
      this.player.x + this.lastAim.x * 51,
      this.player.y + this.lastAim.y * 51,
    )
    this.combatOverlay.lineStyle(1, focusColor, this.input.activePointer.isDown ? 0.9 : 0.62)
    this.combatOverlay.strokeCircle(cursorX, cursorY, this.input.activePointer.isDown ? 8 : 11)
    if (this.theme === 'pixel') {
      this.combatOverlay.lineBetween(cursorX - 17, cursorY, cursorX - 8, cursorY)
      this.combatOverlay.lineBetween(cursorX + 8, cursorY, cursorX + 17, cursorY)
      this.combatOverlay.lineBetween(cursorX, cursorY - 17, cursorX, cursorY - 8)
      this.combatOverlay.lineBetween(cursorX, cursorY + 8, cursorX, cursorY + 17)
    } else {
      this.combatOverlay.strokeCircle(cursorX, cursorY, 4)
      for (let i = 0; i < 4; i += 1) {
        const angle = i * Math.PI / 2 + Math.PI / 4
        this.combatOverlay.lineBetween(
          cursorX + Math.cos(angle) * 9, cursorY + Math.sin(angle) * 9,
          cursorX + Math.cos(angle) * 16, cursorY + Math.sin(angle) * 16,
        )
      }
    }
  }

  private updatePlayer(delta: number): void {
    const movement = this.movementVector.set(
      (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0),
      (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0),
    )

    if (this.dashRemaining > 0) {
      this.dashRemaining -= delta
      this.player.setVelocity(this.dashDirection.x * DASH_SPEED, this.dashDirection.y * DASH_SPEED)
      if (Math.floor(this.dashRemaining / 35) !== Math.floor((this.dashRemaining + delta) / 35)) this.spawnDashEcho()
    } else {
      if (movement.lengthSq() > 0) movement.normalize()
      this.player.setVelocity(movement.x * PLAYER_SPEED, movement.y * PLAYER_SPEED)
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, ARENA.left + 16, ARENA.right - 16)
    this.player.y = Phaser.Math.Clamp(this.player.y, ARENA.top + 16, ARENA.bottom - 16)
    this.player.setAlpha(this.theme === 'pixel' ? (this.dashRemaining > 0 ? 0.7 : 1) : 0)
    this.playerGlow.setPosition(this.player.x, this.player.y)
    this.playerGlow.setScale(1 + Math.sin(this.elapsedMs * 0.012) * 0.08 + (this.dashRemaining > 0 ? 0.35 : 0))
    this.playerGlow.setAlpha(this.dashRemaining > 0 ? 0.75 : 0.7)
    this.updatePlayerMotionPresentation()
  }

  private tryStartDash(): void {
    if (this.mode !== 'running' || this.elapsedMs < this.dashCooldownUntil) return
    const dashX = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0)
    const dashY = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0)
    this.dashDirection.set(dashX, dashY)
    if (this.dashDirection.lengthSq() > 0) this.dashDirection.normalize()
    else this.dashDirection.copy(this.lastAim)
    this.dashRemaining = 170
    this.dashCooldownUntil = this.elapsedMs + 900
    this.dashStartedAt = this.elapsedMs
    this.spawnDashBurst()
    this.spawnDashEcho()
  }

  private setPlayerMotionState(next: PlayerMotionState): void {
    if (next === this.playerMotionState) return
    this.playerMotionState = next
    this.playerMotionSince = this.elapsedMs
  }

  private updatePlayerMotionPresentation(): void {
    const rig = this.playerRig
    if (!rig) return

    const velocityX = this.player.body?.velocity.x ?? 0
    const velocityY = this.player.body?.velocity.y ?? 0
    const speed = Math.hypot(velocityX, velocityY)
    let nextState: PlayerMotionState
    if (this.mode === 'dead') nextState = 'dead'
    else if (this.elapsedMs < this.hitPoseUntil) nextState = 'hit'
    else if (this.dashRemaining > 0) {
      const dashAge = this.elapsedMs - this.dashStartedAt
      nextState = dashAge < 34 ? 'dash-compress' : this.dashRemaining > 38 ? 'dash-smear' : 'dash-recover'
    } else if (this.elapsedMs < this.firePoseUntil) nextState = 'fire'
    else if (speed > 20) nextState = 'walk'
    else nextState = 'idle'
    this.setPlayerMotionState(nextState)

    const motionTime = this.motionPreviewClockMs ?? this.elapsedMs
    const stateAge = Math.max(0, this.elapsedMs - this.playerMotionSince)
    const idleBreath = Math.sin(motionTime * 0.0055)
    const stride = Math.sin(motionTime * 0.023)
    const strideLift = Math.abs(Math.cos(motionTime * 0.023))
    const aimAngle = this.lastAim.angle()
    const velocityAngle = speed > 1 ? Math.atan2(velocityY, velocityX) : aimAngle
    const strafe = Math.sin(Phaser.Math.Angle.Wrap(velocityAngle - aimAngle))
    let scaleX = 1
    let scaleY = 1
    let alpha = 1
    let recoil = 0
    let localBob = 0
    let lean = 0

    switch (nextState) {
      case 'idle':
        this.playerAnimFrame = Math.floor(motionTime / 280) % 4
        scaleX = 1 - idleBreath * 0.012
        scaleY = 1 + idleBreath * 0.026
        localBob = idleBreath * 1.2
        break
      case 'walk':
        this.playerAnimFrame = Math.floor(motionTime / 72) % 8
        scaleX = 1 + strideLift * 0.075
        scaleY = 0.98 - strideLift * 0.045
        localBob = -strideLift * 4.4
        lean = strafe * 0.11 + stride * 0.032
        break
      case 'fire': {
        this.playerAnimFrame = Math.min(3, Math.floor(stateAge / 32))
        const shotAge = Math.max(0, this.elapsedMs - this.firePoseStartedAt)
        recoil = Math.sin(Math.min(1, shotAge / 115) * Math.PI)
        scaleX = 1 + recoil * 0.055
        scaleY = 1 - recoil * 0.075
        break
      }
      case 'dash-compress':
        this.playerAnimFrame = Math.min(2, Math.floor(stateAge / 12))
        scaleX = 1.3
        scaleY = 0.68
        alpha = 0.95
        break
      case 'dash-smear':
        this.playerAnimFrame = 3 + (Math.floor(motionTime / 34) % 2)
        scaleX = 0.62
        scaleY = 1.58
        alpha = 0.78
        break
      case 'dash-recover':
        this.playerAnimFrame = 5
        scaleX = 0.9 + Math.min(1, stateAge / 42) * 0.1
        scaleY = 1.18 - Math.min(1, stateAge / 42) * 0.18
        break
      case 'hit':
        this.playerAnimFrame = Math.min(4, Math.floor(stateAge / 34))
        scaleX = 1.14 - Math.min(1, stateAge / 180) * 0.14
        scaleY = 0.82 + Math.min(1, stateAge / 180) * 0.18
        lean = Math.sin(stateAge * 0.16) * 0.11
        break
      case 'dead':
        this.playerAnimFrame = 0
        scaleX = 1.08
        scaleY = 0.72
        alpha = 0.5
        break
    }

    const hitPush = nextState === 'hit' ? (1 - Math.min(1, stateAge / 180)) * 6 : 0
    rig.container
      .setPosition(
        this.player.x - this.lastAim.x * recoil * 8 + this.playerHitDirection.x * hitPush,
        this.player.y - this.lastAim.y * recoil * 8 + this.playerHitDirection.y * hitPush + localBob,
      )
      .setScale(scaleX, scaleY)
      .setAlpha(alpha)
      .setRotation(this.lastAim.angle() + Math.PI / 2 + lean)

    const dashSpread = nextState.startsWith('dash') ? 0.2 : 0
    const cloakBeat = nextState === 'walk' ? stride * 0.2 : idleBreath * 0.035
    rig.leftCloak.setRotation(-0.045 - cloakBeat - dashSpread)
    rig.rightCloak.setRotation(0.045 + cloakBeat + dashSpread)
    rig.leftCloak.setY(5 + (nextState === 'walk' ? stride * 3.2 : 0))
    rig.rightCloak.setY(5 - (nextState === 'walk' ? stride * 3.2 : 0))
    rig.feet.setX(nextState === 'walk' ? stride * 7.5 : 0)
    rig.feet.setY(31 + (nextState === 'walk' ? -strideLift * 2 : idleBreath * 0.6))
    rig.feet.setRotation(nextState === 'walk' ? stride * 0.18 : 0)
    rig.blade
      .setY(-39 + recoil * 9 - (nextState === 'dash-smear' ? 5 : 0))
      .setRotation(nextState === 'walk' ? -stride * 0.045 : 0)
    rig.mask
      .setY(-13 + (nextState === 'walk' ? strideLift * 2.1 : idleBreath * 0.45))
      .setRotation(nextState === 'walk' ? stride * 0.038 : 0)
    rig.shadow.setScale(1 + speed / DASH_SPEED * 0.35, 1 - Math.min(0.35, speed / DASH_SPEED * 0.25))
    rig.shadow.setAlpha(nextState.startsWith('dash') ? 0.25 : 0.48)
  }

  private updateActorFx(): void {
    this.actorFxOverlay.clear()
    if (this.theme === 'pixel') return

    if (this.lastEnemyDeathAt >= 0) {
      this.lastEnemyDeathFrame = Math.min(5, Math.floor((this.elapsedMs - this.lastEnemyDeathAt) / 42))
    }

    const pulse = (Math.sin(this.elapsedMs * 0.028) + 1) * 0.5
    // A thread ring and drifting knot replace the old twin-engine exhaust.
    this.actorFxOverlay.lineStyle(1, 0x9db5a0, 0.2 + pulse * 0.08)
    this.actorFxOverlay.strokeCircle(this.player.x, this.player.y, 23 + pulse * 2)
    this.actorFxOverlay.lineStyle(2, 0xcab355, 0.24 + pulse * 0.08)
    this.actorFxOverlay.beginPath()
    this.actorFxOverlay.moveTo(this.player.x - this.lastAim.x * 22, this.player.y - this.lastAim.y * 22)
    this.actorFxOverlay.lineTo(
      this.player.x - this.lastAim.x * (34 + pulse * 7) - this.lastAim.y * 4,
      this.player.y - this.lastAim.y * (34 + pulse * 7) + this.lastAim.x * 4,
    )
    this.actorFxOverlay.strokePath()
    this.actorFxOverlay.fillStyle(0xc7b75d, 0.07 + pulse * 0.025)
    this.actorFxOverlay.fillCircle(this.player.x, this.player.y, 21 + pulse * 2)

    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      const phase = (enemy.getData('phase') as number | undefined) ?? 0
      const enemyPulse = (Math.sin(this.elapsedMs * 0.008 + phase) + 1) * 0.5
      this.actorFxOverlay.fillStyle(0x8f321f, 0.04 + enemyPulse * 0.035)
      this.actorFxOverlay.fillCircle(enemy.x, enemy.y, 24 + enemyPulse * 4)
      this.actorFxOverlay.lineStyle(1, 0xb9774b, 0.1 + enemyPulse * 0.08)
      this.actorFxOverlay.strokeCircle(enemy.x, enemy.y, 26 + enemyPulse * 3)
    }
  }

  private updateEnemies(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      const dx = this.player.x - enemy.x
      const dy = this.player.y - enemy.y
      const distance = Math.hypot(dx, dy)
      const directionX = distance > 1 ? dx / distance : 0
      const directionY = distance > 1 ? dy / distance : 0
      const speed = 72 + Math.min(38, this.elapsedMs / 2_500)
      enemy.setVelocity(directionX * speed, directionY * speed)
      enemy.setRotation(Math.atan2(directionY, directionX) - Math.PI / 2)
      this.updateEnemyMotionPresentation(enemy, directionX, directionY, distance)

      if (distance < 27 && this.elapsedMs >= this.nextContactDamageAt && this.dashRemaining <= 0) {
        this.nextContactDamageAt = this.elapsedMs + 620
        this.damagePlayer(16, enemy)
      } else if (distance < 34 && this.dashRemaining > 0) {
        const lastEvade = (enemy.getData('lastEvadeAt') as number | undefined) ?? -1_000
        if (this.elapsedMs - lastEvade > 450 && this.elapsedMs - this.lastEvadeFeedbackAt > 180) {
          enemy.setData('lastEvadeAt', this.elapsedMs)
          this.lastEvadeFeedbackAt = this.elapsedMs
          this.spawnEvadeEffect()
        }
      }
    }
  }

  private createEnemyRig(x: number, y: number): EnemyRig {
    const shadow = this.add.ellipse(0, 12, 48, 19, 0x000000, 0.46)
    const legs = this.add.graphics()
    const leftWing = this.add.image(-14, 5, 'seed-husk', 'husk-wing-left').setDisplaySize(30, 40)
      .setOrigin(0.72, 0.46)
    const rightWing = this.add.image(14, 5, 'seed-husk', 'husk-wing-right').setDisplaySize(30, 40)
      .setOrigin(0.28, 0.46)
    const core = this.add.image(0, 0, 'seed-husk', 'husk-core').setDisplaySize(33, 88)
    const container = this.add.container(x, y, [shadow, legs, leftWing, rightWing, core]).setDepth(7)
    return {
      container, core, leftWing, rightWing, legs, shadow,
      bornAt: this.elapsedMs, hitUntil: -1_000, state: 'emerge', frame: 0,
    }
  }

  private drawEnemyLegs(rig: EnemyRig, phase: number, state: EnemyMotionState): void {
    const legs = rig.legs
    legs.clear()
    const anticipating = state === 'anticipate'
    const hit = state === 'hit'
    const strideAmount = state === 'skitter' ? 7 : anticipating ? 3 : 1.5

    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row += 1) {
        const alternate = row % 2 === 0 ? side : -side
        const stride = Math.sin(phase + row * 1.9) * strideAmount * alternate
        const rootY = -22 + row * 21
        const kneeX = side * (anticipating ? 18 : 24)
        const kneeY = rootY + stride * 0.42 + (hit ? 3 : 0)
        const footX = side * (anticipating ? 29 : 39 + Math.abs(stride) * 0.4)
        const footY = rootY + 10 - stride
        legs.lineStyle(5, 0x10140d, 0.98)
        legs.lineBetween(side * 8, rootY, kneeX, kneeY)
        legs.lineBetween(kneeX, kneeY, footX, footY)
        legs.lineStyle(2, hit ? 0xc15b3d : 0x77806a, hit ? 0.86 : 0.62)
        legs.lineBetween(side * 9, rootY, kneeX, kneeY)
        legs.lineBetween(kneeX, kneeY, footX, footY)
        legs.fillStyle(hit ? 0xc15b3d : 0xb8a35c, hit ? 0.72 : 0.46)
        legs.fillCircle(footX, footY, 1.8)
      }
    }
  }

  private updateEnemyMotionPresentation(
    enemy: Phaser.Physics.Arcade.Image,
    directionX: number,
    directionY: number,
    distance: number,
  ): void {
    const rig = this.enemyRigs.get(enemy)
    if (!rig) return
    const motionTime = this.motionPreviewClockMs ?? this.elapsedMs
    const age = Math.max(0, this.elapsedMs - rig.bornAt)
    const phaseOffset = (enemy.getData('phase') as number | undefined) ?? 0
    const phase = motionTime * 0.019 + phaseOffset
    const previousState = rig.state
    rig.state = age < 240
      ? 'emerge'
      : this.elapsedMs < rig.hitUntil
        ? 'hit'
        : distance < 72
          ? 'anticipate'
          : 'skitter'
    if (rig.state !== previousState) rig.frame = 0
    else rig.frame = rig.state === 'skitter'
      ? Math.floor((motionTime + phaseOffset * 100) / 64) % 8
      : Math.min(5, Math.floor(age / 45))

    let scaleX = 1
    let scaleY = 1
    let alpha = 1
    let bob = 0
    let angleJitter = 0
    const stride = Math.sin(phase)
    if (rig.state === 'emerge') {
      const t = Phaser.Math.Clamp(age / 240, 0, 1)
      scaleX = 0.52 + t * 0.48
      scaleY = 0.52 + t * 0.48
      alpha = t
      bob = (1 - t) * 8
    } else if (rig.state === 'skitter') {
      scaleX = 1 + Math.abs(stride) * 0.045
      scaleY = 1 - Math.abs(stride) * 0.035
      bob = -Math.abs(stride) * 2.8
      angleJitter = stride * 0.022
    } else if (rig.state === 'anticipate') {
      const coil = (Math.sin(motionTime * 0.026 + phaseOffset) + 1) * 0.5
      scaleX = 1.13 - coil * 0.04
      scaleY = 0.84 + coil * 0.04
      bob = 3 + coil * 2
    } else if (rig.state === 'hit') {
      const hitAge = Math.max(0, rig.hitUntil - this.elapsedMs)
      scaleX = 0.84 + (1 - Math.min(1, hitAge / 160)) * 0.16
      scaleY = 1.18 - (1 - Math.min(1, hitAge / 160)) * 0.18
      angleJitter = Math.sin(motionTime * 0.19) * 0.13
    }

    rig.container
      .setPosition(enemy.x, enemy.y + bob)
      .setRotation(Math.atan2(directionY, directionX) - Math.PI / 2 + angleJitter)
      .setScale(scaleX, scaleY)
      .setAlpha(alpha)
    rig.leftWing.setRotation(-0.08 - stride * 0.11 - (rig.state === 'anticipate' ? 0.13 : 0))
    rig.rightWing.setRotation(0.08 + stride * 0.11 + (rig.state === 'anticipate' ? 0.13 : 0))
    rig.leftWing.setY(5 + stride * 1.8)
    rig.rightWing.setY(5 - stride * 1.8)
    rig.core.setY(rig.state === 'skitter' ? -Math.abs(stride) * 1.5 : 0)
    rig.shadow.setScale(1 + Math.abs(stride) * 0.1, 1 - Math.abs(stride) * 0.08)
    if (rig.state === 'hit') {
      rig.core.setTint(0xf1d6a4).setTintMode(Phaser.TintModes.FILL)
      rig.leftWing.setTint(0xd87955).setTintMode(Phaser.TintModes.FILL)
      rig.rightWing.setTint(0xd87955).setTintMode(Phaser.TintModes.FILL)
    } else {
      rig.core.clearTint()
      rig.leftWing.clearTint()
      rig.rightWing.clearTint()
    }
    this.drawEnemyLegs(rig, phase, rig.state)
  }

  private animateEnemyDeath(enemy: Phaser.Physics.Arcade.Image): void {
    const rig = this.enemyRigs.get(enemy)
    if (!rig) return
    this.enemyRigs.delete(enemy)
    rig.state = 'death'
    rig.frame = 0
    this.lastEnemyDeathAt = this.elapsedMs
    this.lastEnemyDeathFrame = 0
    rig.core.setTint(0xc45a39).setTintMode(Phaser.TintModes.FILL)
    rig.leftWing.setTint(0x8f3e2d).setTintMode(Phaser.TintModes.FILL)
    rig.rightWing.setTint(0x8f3e2d).setTintMode(Phaser.TintModes.FILL)
    this.tweens.add({
      targets: rig.container,
      scaleX: 1.36,
      scaleY: 0.22,
      rotation: rig.container.rotation + 0.48,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const tween = this.tweens.getTweensOf(rig.container)[0]
        if (tween) rig.frame = Math.min(5, Math.floor(tween.progress * 6))
      },
      onComplete: () => rig.container.destroy(),
    })
  }

  private handleShooting(): void {
    if (!this.input.activePointer.isDown || this.elapsedMs < this.lastShotAt + 145) return
    this.lastShotAt = this.elapsedMs
    this.fireBullet(this.lastAim)
  }

  private fireBullet(direction: Phaser.Math.Vector2): Phaser.Physics.Arcade.Image {
    this.firePoseStartedAt = this.elapsedMs
    this.firePoseUntil = this.elapsedMs + 118
    const pixel = this.theme === 'pixel'
    const bullet = this.bullets.create(
      this.player.x + direction.x * 20,
      this.player.y + direction.y * 20,
      pixel ? 'pixel-projectiles' : 'bullet-vector',
      pixel ? 8 : undefined,
    ) as Phaser.Physics.Arcade.Image
    bullet.setDisplaySize(pixel ? 12 : 17, pixel ? 12 : 19).setDepth(8)
    bullet.setRotation(direction.angle() + Math.PI / 2)
    bullet.setVelocity(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED)
    bullet.setData('state', { damage: 20, age: 0, bounces: 0, visualScale: 1 } satisfies BulletState)
    if (this.elapsedMs >= this.nextLaserSoundAt) {
      this.nextLaserSoundAt = this.elapsedMs + 280
      this.sound.play('laser-sfx', { volume: 0.11 })
    }
    return bullet
  }

  private updateBullets(delta: number): void {
    this.projectileOverlay.clear()
    const bulletChildren = this.bullets.getChildren()
    for (let bulletIndex = bulletChildren.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bulletChildren[bulletIndex] as Phaser.Physics.Arcade.Image
      if (!bullet.active) continue
      const state = bullet.getData('state') as BulletState
      state.age += delta
      if (state.age >= 2_600) {
        bullet.destroy()
        continue
      }

      const hitHorizontal = bullet.x <= ARENA.left + 5 || bullet.x >= ARENA.right - 5
      const hitVertical = bullet.y <= ARENA.top + 5 || bullet.y >= ARENA.bottom - 5
      if (hitHorizontal || hitVertical) {
        if (!this.hasPatch('RICOCHET') || state.bounces >= 1) {
          bullet.destroy()
          continue
        }
        const velocityX = bullet.body?.velocity.x ?? 0
        const velocityY = bullet.body?.velocity.y ?? 0
        const resetX = hitHorizontal
          ? (bullet.x < WIDTH / 2 ? ARENA.left + 14 : ARENA.right - 14)
          : bullet.x
        const resetY = hitVertical
          ? (bullet.y < HEIGHT / 2 ? ARENA.top + 14 : ARENA.bottom - 14)
          : bullet.y
        bullet.body?.reset(resetX, resetY)
        bullet.setVelocity(hitHorizontal ? -velocityX : velocityX, hitVertical ? -velocityY : velocityY)
        bullet.setRotation(Math.atan2(hitVertical ? -velocityY : velocityY, hitHorizontal ? -velocityX : velocityX) + Math.PI / 2)
        state.bounces = 1
        const previousScale = state.visualScale
        const grown = bounceStats(state.damage, previousScale, this.hasPatch('GROWTH'))
        state.damage = grown.damage
        state.visualScale = grown.scale
        if (grown.scale !== previousScale) {
          const scaleMultiplier = grown.scale / previousScale
          bullet.setScale(bullet.scaleX * scaleMultiplier, bullet.scaleY * scaleMultiplier)
        }
        bullet.setTint(this.hasPatch('GROWTH') ? 0xd4ae35 : 0x9cb9a1)
        this.spawnBounceEffect(bullet.x, bullet.y, this.hasPatch('GROWTH'))
      }

      const velocityX = bullet.body?.velocity.x ?? 0
      const velocityY = bullet.body?.velocity.y ?? 0
      const velocityLength = Math.hypot(velocityX, velocityY) || 1
      const grownRicochet = state.bounces > 0 && this.hasPatch('GROWTH')
      const trailLength = grownRicochet ? 31 : 18
      this.projectileOverlay.lineStyle(grownRicochet ? 4 : 2, grownRicochet ? 0xd4ae35 : 0xa3b79f, grownRicochet ? 0.46 : 0.3)
      this.projectileOverlay.lineBetween(
        bullet.x - (velocityX / velocityLength) * trailLength,
        bullet.y - (velocityY / velocityLength) * trailLength,
        bullet.x,
        bullet.y,
      )

      for (const enemyChild of this.enemies.getChildren()) {
        const enemy = enemyChild as Phaser.Physics.Arcade.Image
        if (!enemy.active || !bullet.active) continue
        const radius = 16 + (bullet.displayWidth * 0.45)
        const enemyDx = bullet.x - enemy.x
        const enemyDy = bullet.y - enemy.y
        if ((enemyDx * enemyDx) + (enemyDy * enemyDy) > radius * radius) continue
        if (!canDamageEnemyAfterBounce(state.bounces > 0, this.hasPatch('FRIENDLY FIRE'))) continue
        this.damageEnemy(enemy, state.damage, state.bounces > 0)
        bullet.destroy()
      }
    }
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Image, damage: number, bounced: boolean): void {
    const health = (enemy.getData('health') as number) - damage
    enemy.setData('health', health)
    const rig = this.enemyRigs.get(enemy)
    if (rig) rig.hitUntil = this.elapsedMs + 320
    else {
      enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
      this.time.delayedCall(55, () => { if (enemy.active) enemy.clearTint() })
    }
    this.spawnDamageText(enemy.x, enemy.y - 20, damage, bounced)
    if (health > 0) return

    this.score += 100
    this.cameras.main.shake(65, bounced ? 0.004 : 0.0025)
    this.spawnEnemyBurst(enemy.x, enemy.y)
    this.animateEnemyDeath(enemy)
    enemy.destroy()
  }

  private damagePlayer(amount: number, source?: Phaser.Physics.Arcade.Image): void {
    this.health = Math.max(0, this.health - amount)
    this.sound.play('hit-sfx', { volume: 0.22 })
    this.cameras.main.flash(90, 255, 42, 67, false)
    this.cameras.main.shake(125, 0.011)
    this.hitPoseUntil = this.elapsedMs + 185
    this.playerHitDirection.copy(source
      ? new Phaser.Math.Vector2(this.player.x - source.x, this.player.y - source.y).normalize()
      : this.lastAim.clone().negate())
    this.player.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
    this.damageOverlay.setFillStyle(0xff3949, 0.13).setStrokeStyle(8, 0xff5d67, 0.72).setAlpha(1)
    this.tweens.killTweensOf(this.damageOverlay)
    this.tweens.add({ targets: this.damageOverlay, alpha: 0, duration: 260, ease: 'Quad.easeOut' })
    this.tweens.add({ targets: [this.healthBar, this.healthText], alpha: 0.22, duration: 55, yoyo: true, repeat: 1 })
    this.spawnPlayerHitEffect(amount, source)
    this.time.delayedCall(90, () => { if (this.player.active) this.player.clearTint() })
    if (this.health <= 0) this.endRun()
  }

  private handleSpawning(): void {
    if (this.elapsedMs < this.nextSpawnAt || this.enemies.countActive(true) >= 16) return
    const side = Phaser.Math.Between(0, 3)
    const x = side === 0 ? ARENA.left + 18 : side === 1 ? ARENA.right - 18 : Phaser.Math.Between(ARENA.left + 30, ARENA.right - 30)
    const y = side === 2 ? ARENA.top + 18 : side === 3 ? ARENA.bottom - 18 : Phaser.Math.Between(ARENA.top + 30, ARENA.bottom - 30)
    this.spawnEnemy(x, y)
    this.nextSpawnAt = this.elapsedMs + Math.max(700, 1_850 - this.elapsedMs / 48)
  }

  private spawnEnemy(x: number, y: number): void {
    const pixel = this.theme === 'pixel'
    const texture = pixel
      ? 'pixel-ships'
      : 'seed-husk'
    const enemy = this.enemies.create(x, y, texture, pixel ? 45 : undefined) as Phaser.Physics.Arcade.Image
    enemy.setDisplaySize(pixel ? 34 : 72, pixel ? 34 : 72).setDepth(7)
    if (pixel) enemy.setCircle(4, 2, 2)
    else enemy.setCircle(74, 118, 118)
    enemy.setData('health', 40)
    enemy.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2))
    if (!pixel) {
      enemy.setAlpha(0)
      const rig = this.createEnemyRig(x, y)
      this.enemyRigs.set(enemy, rig)
      const arrival = this.add.circle(x, y, 9, 0x812f21, 0.04)
        .setStrokeStyle(2, 0xb9794a, 0.74).setDepth(6)
      this.tweens.add({
        targets: arrival,
        scale: 3.8,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => arrival.destroy(),
      })
    }
  }

  private activateDuePatches(): void {
    while (this.patchCounter < PATCH_SCHEDULE.length && this.elapsedMs >= PATCH_SCHEDULE[this.patchCounter]!.atMs) {
      const patch = PATCH_SCHEDULE[this.patchCounter]!.id
      this.activePatches.push(patch)
      this.showPatchNotification(patch, this.patchCounter)
      this.activatePatchRow(this.patchCounter)
      this.patchCounter += 1
    }
  }

  private showPatchNotification(patch: PatchId, index: number): void {
    this.tweens.killTweensOf(this.patchNotice)
    const noticeIndex = this.patchNotice.getData('index') as Phaser.GameObjects.Text
    noticeIndex.setText(`0${index + 1}`)
    this.patchNoticeKicker.setText(this.theme === 'pixel' ? 'PERMANENT RULE INSTALLED' : 'A LIVING RULE IS INSCRIBED')
    this.patchNoticeTitle.setText(patch)
    this.patchNoticeDescription.setText(PATCH_DESCRIPTIONS[patch])
    this.patchNotice.setAlpha(0).setScale(0.94)
    this.tweens.add({
      targets: this.patchNotice,
      alpha: 1,
      scale: 1,
      duration: 160,
      hold: 1_650,
      yoyo: true,
      ease: 'Quad.easeOut',
    })
    this.cameras.main.shake(150, 0.005)
  }

  private activatePatchRow(index: number): void {
    const row = this.patchRows[index]
    if (!row) return
    const bg = row.getData('bg') as Phaser.GameObjects.Rectangle
    const number = row.getData('number') as Phaser.GameObjects.Text
    const text = row.getData('text') as Phaser.GameObjects.Text
    const state = row.getData('state') as Phaser.GameObjects.Text
    if (this.theme === 'pixel') {
      bg.setFillStyle(0x272f25, 0.98).setStrokeStyle(2, 0xe6ff74, 1)
      number.setColor('#e6ff74')
      text.setColor('#f6f3df')
      state.setText('ON').setColor('#e6ff74')
    } else {
      bg.setFillStyle(0x25281d, 0.94).setStrokeStyle(1, 0xd4b34f, 0.72)
      number.setColor('#d4b34f')
      text.setColor('#ede8cf')
      state.setText('AWAKE').setColor('#d4b34f')
      state.setText('●').setColor('#eaff89')
    }
  }

  private updateHud(force = false): void {
    if (!force && this.elapsedMs < this.nextHudRefreshAt) return
    this.nextHudRefreshAt = this.elapsedMs + 100
    const next = nextScheduledPatch(this.elapsedMs)
    this.timerText.setText(next ? `00:${secondsUntilNextPatch(this.elapsedMs).toString().padStart(2, '0')}` : 'LIVE')
    this.nextPatchText.setText(next
      ? `${this.theme === 'pixel' ? 'NEXT' : 'NEXT INSCRIPTION'} / ${next.id}`
      : (this.theme === 'pixel' ? 'ALL PATCHES ACTIVE' : 'ALL INSCRIPTIONS AWAKE'))
    this.scoreText.setText(`${this.theme === 'pixel' ? 'SCORE' : 'MARKS'} ${this.score.toString().padStart(6, '0')}`)
    this.threatText.setText(this.theme === 'pixel'
      ? `THREAT  /  ${this.enemies.countActive(true).toString().padStart(2, '0')} CONTACTS`
      : `HUSKS  /  ${this.enemies.countActive(true).toString().padStart(2, '0')} STIRRING`)
    const dashReady = this.elapsedMs >= this.dashCooldownUntil
    this.dashStatusText.setText(this.theme === 'pixel'
      ? (dashReady ? 'DASH  /  READY' : 'DASH  /  COOLDOWN')
      : (dashReady ? 'THREADSTEP  /  READY' : 'THREADSTEP  /  MENDING'))
    this.dashStatusText.setColor(dashReady ? (this.theme === 'pixel' ? '#6cefe0' : '#9bb7a7') : '#6f7365')
    this.healthBar.width = (this.theme === 'pixel' ? 186 : 184) * (this.health / 100)
    this.healthBar.setFillStyle(this.health > 35
      ? (this.theme === 'pixel' ? 0xe6ff74 : 0x789c8a)
      : 0xff5d67)
    this.healthText.setText(this.health.toString().padStart(3, '0'))
    if (this.elapsedMs > 6_000 && this.controlHint.alpha > 0) this.controlHint.setAlpha(Math.max(0, 1 - (this.elapsedMs - 6_000) / 1_000))
  }

  private spawnBounceEffect(x: number, y: number, growth: boolean): void {
    const color = this.theme === 'pixel'
      ? (growth ? 0xffd75e : 0x63f7ff)
      : (growth ? 0xd4ae35 : 0x94af9c)
    this.cameras.main.shake(growth ? 85 : 45, growth ? 0.004 : 0.0015)
    const ring = this.add.circle(x, y, 11, color, 0.08).setStrokeStyle(3, color, 0.95).setDepth(25)
    this.tweens.add({ targets: ring, scale: growth ? 3.2 : 2.2, alpha: 0, duration: 300, onComplete: () => ring.destroy() })
    if (this.theme === 'overdrive') {
      const splinters = this.add.graphics().setDepth(26)
      const count = growth ? 8 : 5
      splinters.lineStyle(growth ? 2 : 1, color, 0.84)
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + 0.22
        const inner = growth ? 10 : 8
        const outer = growth ? 36 + (i % 3) * 5 : 25 + (i % 2) * 4
        splinters.lineBetween(
          x + Math.cos(angle) * inner, y + Math.sin(angle) * inner,
          x + Math.cos(angle) * outer, y + Math.sin(angle) * outer,
        )
      }
      this.tweens.add({
        targets: splinters,
        scale: growth ? 1.25 : 1.12,
        alpha: 0,
        duration: growth ? 380 : 260,
        ease: 'Quad.easeOut',
        onComplete: () => splinters.destroy(),
      })
    }
    if (growth) {
      const labelX = Phaser.Math.Clamp(x, ARENA.left + 92, ARENA.right - 92)
      const label = this.add.text(labelX, y - 27, 'RICOCHET × GROWTH', {
        fontFamily: this.theme === 'pixel' ? 'Consolas, monospace' : 'Georgia, Times New Roman, serif',
        fontSize: '10px', fontStyle: 'bold', color: this.theme === 'pixel' ? '#ffd75e' : '#d9bc55',
        backgroundColor: '#0b0d09dd', padding: { x: 5, y: 3 },
      }).setOrigin(0.5).setDepth(30)
      this.tweens.add({ targets: label, y: y - 47, alpha: 0, duration: 720, onComplete: () => label.destroy() })
    }
  }

  private spawnDamageText(x: number, y: number, damage: number, bounced: boolean): void {
    const label = this.add.text(x, y, `${bounced ? '↳ ' : ''}${damage}`, {
      fontFamily: 'Consolas, monospace', fontSize: bounced ? '15px' : '12px', fontStyle: 'bold',
      color: bounced ? '#ffd75e' : '#dffffa',
    }).setOrigin(0.5).setDepth(30)
    this.tweens.add({ targets: label, y: y - 24, alpha: 0, duration: 450, onComplete: () => label.destroy() })
  }

  private spawnEnemyBurst(x: number, y: number): void {
    const burstColor = this.theme === 'pixel' ? 0xff5d67 : 0x9e4b32
    const ring = this.add.circle(x, y, 12, burstColor, 0.08)
      .setStrokeStyle(2, burstColor, 0.9).setDepth(24)
    this.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8
      const shard = this.add.rectangle(x, y, i % 2 === 0 ? 9 : 5, 2, burstColor, 0.92)
        .setRotation(angle).setDepth(24)
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * 34,
        y: y + Math.sin(angle) * 34,
        alpha: 0,
        duration: 280,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      })
    }
  }

  private spawnPlayerHitEffect(amount: number, source?: Phaser.Physics.Arcade.Image): void {
    const direction = source
      ? new Phaser.Math.Vector2(this.player.x - source.x, this.player.y - source.y).normalize()
      : this.lastAim.clone().negate()
    const x = this.player.x
    const y = this.player.y
    this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * 9, ARENA.left + 16, ARENA.right - 16)
    this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * 9, ARENA.top + 16, ARENA.bottom - 16)

    const ring = this.add.circle(x, y, 18, 0xff3347, 0.08)
      .setStrokeStyle(4, 0xff5d67, 0.95).setDepth(75)
    this.tweens.add({ targets: ring, scale: 2.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() })

    const label = this.add.text(x, y - 34, `-${amount}  INTEGRITY`, {
      fontFamily: 'Consolas, monospace', fontSize: '15px', fontStyle: 'bold', color: '#ff7b83',
      backgroundColor: '#1a080ddd', padding: { x: 7, y: 4 }, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(80)
    this.tweens.add({ targets: label, y: y - 58, alpha: 0, duration: 650, onComplete: () => label.destroy() })

    for (let i = 0; i < 6; i += 1) {
      const angle = direction.angle() + Math.PI + Phaser.Math.FloatBetween(-0.85, 0.85)
      const shard = this.add.rectangle(x, y, 12, 2, 0xff5d67, 0.95).setRotation(angle).setDepth(76)
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * Phaser.Math.Between(28, 48),
        y: y + Math.sin(angle) * Phaser.Math.Between(28, 48),
        alpha: 0,
        duration: 260,
        onComplete: () => shard.destroy(),
      })
    }
  }

  private spawnDashBurst(): void {
    const x = this.player.x
    const y = this.player.y
    this.cameras.main.shake(45, 0.0015)
    const dashColor = this.theme === 'pixel' ? 0x3ef5dc : 0x96b39f
    const ring = this.add.circle(x, y, 17, dashColor, 0.08)
      .setStrokeStyle(3, dashColor, 0.92).setDepth(26)
    this.tweens.add({ targets: ring, scale: 2.7, alpha: 0, duration: 220, onComplete: () => ring.destroy() })

    for (let i = -1; i <= 1; i += 1) {
      const perpendicularX = -this.dashDirection.y * i * 7
      const perpendicularY = this.dashDirection.x * i * 7
      const streak = this.add.rectangle(
        x - this.dashDirection.x * 16 + perpendicularX,
        y - this.dashDirection.y * 16 + perpendicularY,
        34 - Math.abs(i) * 8,
        2,
        dashColor,
        0.78,
      ).setRotation(this.dashDirection.angle()).setDepth(6)
      this.tweens.add({
        targets: streak,
        x: streak.x - this.dashDirection.x * 34,
        y: streak.y - this.dashDirection.y * 34,
        scaleX: 0.35,
        alpha: 0,
        duration: 200,
        onComplete: () => streak.destroy(),
      })
    }
  }

  private spawnEvadeEffect(): void {
    this.sound.play('evade-sfx', { volume: 0.18 })
    const shield = this.add.circle(this.player.x, this.player.y, 25, 0x789989, 0.08)
      .setStrokeStyle(2, 0xaebdab, 0.7).setDepth(39)
    const ring = this.add.circle(this.player.x, this.player.y, 22, 0x789989, 0.05)
      .setStrokeStyle(2, 0xc4cbb5, 0.94).setDepth(40)
    const label = this.add.text(this.player.x, this.player.y - 36, this.theme === 'pixel' ? 'EVADE' : 'THREADSTEP', {
      fontFamily: this.theme === 'pixel' ? 'Consolas, monospace' : 'Georgia, Times New Roman, serif',
      fontSize: '12px', fontStyle: 'bold', color: '#cbd3bd',
      backgroundColor: '#090d0add', padding: { x: 6, y: 3 }, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(42)
    this.tweens.add({ targets: shield, scale: 1.35, alpha: 0, duration: 240, onComplete: () => shield.destroy() })
    this.tweens.add({ targets: ring, scale: 2.3, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    this.tweens.add({ targets: label, y: label.y - 20, alpha: 0, duration: 520, onComplete: () => label.destroy() })
  }

  private spawnDashEcho(): void {
    const pixel = this.theme === 'pixel'
    const echo = this.add.image(
      this.player.x,
      this.player.y,
      pixel ? 'pixel-ships' : 'curse-runner',
      pixel ? 4 : 'runner-full',
    )
    if (pixel) echo.setScale(this.player.scaleX, this.player.scaleY)
    else echo.setDisplaySize(54, 115).setScale(0.62, 1.18)
    echo
      .setRotation(this.player.rotation)
      .setTint(this.theme === 'pixel' ? 0xe6ff74 : 0x9eb6a1)
      .setAlpha(this.theme === 'pixel' ? 0.56 : 0.34).setDepth(5)
    this.tweens.add({
      targets: echo,
      x: echo.x - this.dashDirection.x * 18,
      y: echo.y - this.dashDirection.y * 18,
      alpha: 0,
      scaleX: pixel ? 1.3 : 0.44,
      scaleY: pixel ? 1.3 : 1.44,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => echo.destroy(),
    })
  }

  private endRun(): void {
    if (this.mode === 'dead') return
    this.mode = 'dead'
    this.setPlayerMotionState('dead')
    this.updatePlayerMotionPresentation()
    this.player.setVelocity(0, 0)
    this.enemies.setVelocity(0, 0)
    this.tweens.killTweensOf(this.patchNotice)
    this.patchNotice.setAlpha(0)
    this.updateHud(true)
    this.deathScore.setText(`SCORE ${this.score.toString().padStart(6, '0')}  /  PATCHES ${this.activePatches.length}/3`)
    this.deathOverlay.setVisible(true).setAlpha(0)
    this.tweens.add({ targets: this.deathOverlay, alpha: 1, duration: 180 })
    if (this.playerRig) {
      this.tweens.add({
        targets: this.playerRig.container,
        rotation: this.playerRig.container.rotation + 0.52,
        scaleX: 1.15,
        scaleY: 0.58,
        alpha: 0.28,
        duration: 280,
        ease: 'Cubic.easeOut',
      })
    }
  }

  private restartRun(): void {
    this.scene.restart()
  }

  private hasPatch(patch: PatchId): boolean {
    return this.activePatches.includes(patch)
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen()
    else this.scale.startFullscreen()
  }

  private installAutomationHooks(): void {
    window.render_game_to_text = () => JSON.stringify({
      coordinateSystem: 'origin top-left; +x right; +y down; arena x=28..932, y=76..572',
      visualTheme: this.theme,
      environment: this.theme === 'overdrive' ? 'THE DROWNED SCRIPTORIUM' : 'ZONE 07',
      mode: this.mode,
      fullscreen: this.scale.isFullscreen,
      elapsedSeconds: Number((this.elapsedMs / 1_000).toFixed(1)),
      player: {
        x: Math.round(this.player.x), y: Math.round(this.player.y), health: this.health,
        velocityX: Math.round(this.player.body?.velocity.x ?? 0), velocityY: Math.round(this.player.body?.velocity.y ?? 0),
        dashReady: this.elapsedMs >= this.dashCooldownUntil,
        animation: {
          state: this.playerMotionState,
          frame: this.playerAnimFrame,
          stateElapsedMs: Math.max(0, Math.round(this.elapsedMs - this.playerMotionSince)),
        },
      },
      presentationClockMs: Math.round(this.motionPreviewClockMs ?? this.elapsedMs),
      aim: { x: Number(this.lastAim.x.toFixed(2)), y: Number(this.lastAim.y.toFixed(2)) },
      nextPatch: nextScheduledPatch(this.elapsedMs)?.id ?? null,
      patchCountdownSeconds: secondsUntilNextPatch(this.elapsedMs),
      activePatches: [...this.activePatches],
      enemies: this.enemies.getChildren().slice(0, 18).map((child) => {
        const enemy = child as Phaser.Physics.Arcade.Image
        const rig = this.enemyRigs.get(enemy)
        return {
          x: Math.round(enemy.x), y: Math.round(enemy.y), health: enemy.getData('health') as number,
          animation: rig ? { state: rig.state, frame: rig.frame } : null,
        }
      }),
      recentEnemyDeathAnimation: {
        active: this.lastEnemyDeathAt >= 0 && this.elapsedMs - this.lastEnemyDeathAt < 300,
        frame: this.lastEnemyDeathFrame,
      },
      bullets: this.bullets.getChildren().slice(0, 16).map((child) => {
        const bullet = child as Phaser.Physics.Arcade.Image
        const state = bullet.getData('state') as BulletState
        return { x: Math.round(bullet.x), y: Math.round(bullet.y), bounced: state.bounces > 0, damage: state.damage, scale: Number(state.visualScale.toFixed(1)) }
      }),
      score: this.score,
      performance: {
        renderObjects: this.children.length,
        activeBullets: this.bullets.countActive(true),
        activeEnemies: this.enemies.countActive(true),
      },
      controls: 'WASD move; mouse aim; left mouse shoot; Space dash; R restart after death; F fullscreen',
    })

    window.advanceTime = async (ms: number) => {
      if (this.mode === 'running') {
        this.elapsedMs += Math.max(0, ms)
        this.activateDuePatches()
        this.updateHud(true)
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    window.patchRunDebug = {
      forceDeath: () => this.damagePlayer(999),
      hitPlayer: () => this.damagePlayer(16),
      restart: () => this.restartRun(),
      advanceTo: (elapsedMs: number) => {
        this.elapsedMs = Math.max(this.elapsedMs, elapsedMs)
        this.activateDuePatches()
        this.updateHud(true)
      },
      clearEnemies: () => {
        for (const rig of this.enemyRigs.values()) rig.container.destroy()
        this.enemyRigs.clear()
        this.enemies.clear(true, true)
        this.nextSpawnAt = Number.POSITIVE_INFINITY
      },
      fireRight: () => {
        const bullet = this.fireBullet(new Phaser.Math.Vector2(1, 0))
        bullet.setPosition(ARENA.right - 10, this.player.y)
      },
      spawnEnemyNear: () => this.spawnEnemy(
        this.player.x + this.lastAim.x * 24,
        this.player.y + this.lastAim.y * 24,
      ),
      spawnEnemyAt: (x: number, y: number) => this.spawnEnemy(
        Phaser.Math.Clamp(x, ARENA.left + 20, ARENA.right - 20),
        Phaser.Math.Clamp(y, ARENA.top + 20, ARENA.bottom - 20),
      ),
      setPlayerPosition: (x: number, y: number) => {
        const nextX = Phaser.Math.Clamp(x, ARENA.left + 16, ARENA.right - 16)
        const nextY = Phaser.Math.Clamp(y, ARENA.top + 16, ARENA.bottom - 16)
        this.player.body?.reset(nextX, nextY)
        this.player.setPosition(nextX, nextY)
        this.playerRig?.container.setPosition(nextX, nextY)
      },
      setNearestEnemyPosition: (x: number, y: number) => {
        const enemy = this.enemies.getFirstAlive() as Phaser.Physics.Arcade.Image | null
        if (!enemy) return
        const nextX = Phaser.Math.Clamp(x, ARENA.left + 20, ARENA.right - 20)
        const nextY = Phaser.Math.Clamp(y, ARENA.top + 20, ARENA.bottom - 20)
        enemy.body?.reset(nextX, nextY)
        enemy.setPosition(nextX, nextY)
        this.enemyRigs.get(enemy)?.container.setPosition(nextX, nextY)
      },
      setPresentationClock: (ms: number | null) => {
        this.motionPreviewClockMs = ms === null ? null : Math.max(0, ms)
      },
      hitNearestEnemy: () => {
        const enemy = this.enemies.getFirstAlive() as Phaser.Physics.Arcade.Image | null
        if (enemy) this.damageEnemy(enemy, 20, false)
      },
      killNearestEnemy: () => {
        const enemy = this.enemies.getFirstAlive() as Phaser.Physics.Arcade.Image | null
        if (enemy) this.damageEnemy(enemy, (enemy.getData('health') as number) || 40, false)
      },
    }
  }
}
