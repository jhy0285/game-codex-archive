import Phaser from 'phaser'
import { GameAudio } from '../audio.ts'
import {
  ACTION_DASH,
  ACTION_INTERACT,
  ACTION_PULSE,
  CRATE_RADIUS,
  DASH_COOLDOWN_MS,
  DASH_DURATION_MS,
  DASH_SPEED,
  FIXED_STEP_MS,
  LOOP_DURATION_MS,
  PLAYER_ACCELERATION,
  PLAYER_DECELERATION,
  PLAYER_MAX_SPEED,
  PLAYER_RADIUS,
  STAGES,
  WORLD_BOUNDS,
  actionFramesBetween,
  addLatch,
  approach,
  copyEchoFrames,
  createStageRuntime,
  directionFromVector,
  directionVector,
  distanceSquared,
  evaluateStage,
  fixedStepsForDelta,
  getLaserPhase,
  getPlateOccupant,
  guardianPositionAt,
  laserHitsPoint,
  pointInRadius,
  redirectVelocity,
  registerGuardianStrike,
  resolveCircleMovement,
  sampleEcho,
  stepFreeCrate,
  type ActorId,
  type CrateState,
  type Direction,
  type EchoFrame,
  type PlateOccupant,
  type Point,
  type StageDefinition,
  type StageRuntime,
} from '../logic.ts'
import { avatarTexture, createPixelTextures } from '../pixelArt.ts'
import { applyDocumentLanguage, getStageCopy, stageLabel, tr, type Language } from '../i18n.ts'

type GameMode =
  | 'language-select'
  | 'title'
  | 'playing'
  | 'paused'
  | 'stage-clear'
  | 'escape'
  | 'ending'
  | 'chapter-select'

type ActorState = Point & {
  vx: number
  vy: number
  facing: Direction
  moving: boolean
  dashRemainingMs: number
  dashCooldownMs: number
  carryingId: string | null
  animationTimeMs: number
}

type EchoState = Point & {
  visible: boolean
  frames: EchoFrame[]
  facing: Direction
  moving: boolean
  carryingId: string | null
  lastReplayTimeMs: number
  holdingFinalPosition: boolean
}

type KeyMap = {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  w: Phaser.Input.Keyboard.Key
  a: Phaser.Input.Keyboard.Key
  s: Phaser.Input.Keyboard.Key
  d: Phaser.Input.Keyboard.Key
  interact: Phaser.Input.Keyboard.Key
  pulse: Phaser.Input.Keyboard.Key
  dash: Phaser.Input.Keyboard.Key
  bind: Phaser.Input.Keyboard.Key
  restart: Phaser.Input.Keyboard.Key
  fullscreen: Phaser.Input.Keyboard.Key
  pause: Phaser.Input.Keyboard.Key
  enter: Phaser.Input.Keyboard.Key
  sound: Phaser.Input.Keyboard.Key
}

type TouchMoveState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

type BurstFx = Point & {
  ageMs: number
  durationMs: number
  color: number
  radius: number
}

type TrailPoint = Point & {
  ageMs: number
  echo: boolean
}

type DebugApi = {
  start: () => void
  action: (action: 'interact' | 'pulse' | 'dash' | 'bind' | 'restart') => void
  setStage: (index: number) => void
  teleportPlayer: (x: number, y: number, facing?: Direction) => void
  teleportEcho: (x: number, y: number, facing?: Direction) => void
  teleportCrate: (id: string, x: number, y: number) => void
  addLatch: (id: string) => void
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (milliseconds: number) => void
    echoHeistDebug?: DebugApi
  }
}

const COLORS = {
  void: 0x050713,
  floor: 0x0a1020,
  floorAlt: 0x10182b,
  grid: 0x1b2942,
  cyan: 0x55e8ff,
  cyanDark: 0x176479,
  magenta: 0xf06dff,
  magentaDark: 0x6a2f83,
  amber: 0xffc45c,
  amberDark: 0x7a5422,
  mint: 0x70ffc4,
  red: 0xff526d,
  violet: 0xa77bff,
  ink: 0x07101c,
  text: '#d9f8ff',
  muted: '#7190a7',
} as const

const textStyle = (
  size: number,
  color: string = COLORS.text,
  align: 'left' | 'center' | 'right' = 'left',
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'Silkscreen, "Malgun Gothic", "Noto Sans KR", sans-serif',
  fontSize: `${size}px`,
  color,
  align,
  lineSpacing: 4,
})

const clonePoint = (point: Point) => ({ x: point.x, y: point.y })

export class EchoScene extends Phaser.Scene {
  private mode: GameMode = 'language-select'
  private language: Language = 'en'
  private resumeMode: GameMode = 'playing'
  private stageIndex = 0
  private stage: StageDefinition = STAGES[0]
  private runtime: StageRuntime = createStageRuntime(STAGES[0])
  private player: ActorState = this.makePlayer(STAGES[0].start)
  private echo: EchoState = this.makeEcho(STAGES[0].start)
  private recording: EchoFrame[] = []
  private loopTimeMs = 0
  private accumulatorMs = 0
  private totalElapsedMs = 0
  private stageElapsedMs = 0
  private stageTimesMs: number[] = []
  private loopNumber = 1
  private totalBinds = 0
  private deaths = 0
  private restartCount = 0
  private tutorialStep = 0
  private stageMessage = ''
  private stageMessageMs = 0
  private hitStopMs = 0
  private escapeTimeMs = 0
  private lastDoorOpen = false
  private lastPlateStates = new Map<string, PlateOccupant>()
  private actionBuffer = { interact: 0, pulse: 0, dash: 0 }
  private touchMove: TouchMoveState = {
    up: false,
    down: false,
    left: false,
    right: false,
  }
  private learned = new Set<string>()
  private audio = new GameAudio()
  private keys!: KeyMap
  private worldContainer!: Phaser.GameObjects.Container
  private overlayContainer!: Phaser.GameObjects.Container
  private touchContainer!: Phaser.GameObjects.Container
  private staticGraphics!: Phaser.GameObjects.Graphics
  private dynamicGraphics!: Phaser.GameObjects.Graphics
  private uiGraphics!: Phaser.GameObjects.Graphics
  private playerSprite!: Phaser.GameObjects.Image
  private echoSprite!: Phaser.GameObjects.Image
  private playerShadow!: Phaser.GameObjects.Ellipse
  private echoShadow!: Phaser.GameObjects.Ellipse
  private portalSprite!: Phaser.GameObjects.Sprite
  private guardianSprite: Phaser.GameObjects.Sprite | null = null
  private crateSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private worldLabels: Phaser.GameObjects.Text[] = []
  private hudChapter!: Phaser.GameObjects.Text
  private hudObjective!: Phaser.GameObjects.Text
  private hudTimer!: Phaser.GameObjects.Text
  private hudLoop!: Phaser.GameObjects.Text
  private hudHint!: Phaser.GameObjects.Text
  private hudPrompt!: Phaser.GameObjects.Text
  private hudNodes!: Phaser.GameObjects.Text
  private soundButton!: Phaser.GameObjects.Text
  private helpButton!: Phaser.GameObjects.Text
  private fullscreenButton!: Phaser.GameObjects.Text
  private bursts: BurstFx[] = []
  private trails: TrailPoint[] = []
  private previousPlayerPoint: Point = clonePoint(STAGES[0].start)
  private previousEchoPoint: Point = clonePoint(STAGES[0].start)
  private pointerPulseBlockedUntil = 0

  constructor() {
    super('EchoScene')
  }

  preload() {
    const base = '/assets/neon-facility'
    this.load.spritesheet('facility-tiles', `${base}/tileset.png`, {
      frameWidth: 16,
      frameHeight: 16,
    })
    this.load.spritesheet('facility-crates', `${base}/crates_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    })
    this.load.spritesheet('facility-guard', `${base}/guard_orange_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    })
    this.load.spritesheet('facility-portal', `${base}/portal_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    })
    this.load.spritesheet('facility-orb', `${base}/orb_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    })
  }

  create() {
    createPixelTextures(this)
    this.cameras.main.setBackgroundColor(COLORS.void)
    const keyboard = this.input.keyboard
    if (!keyboard) throw new Error('Keyboard input is unavailable')
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      pulse: Phaser.Input.Keyboard.KeyCodes.J,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      bind: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      fullscreen: Phaser.Input.Keyboard.KeyCodes.F,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      sound: Phaser.Input.Keyboard.KeyCodes.M,
    }) as KeyMap
    keyboard.on('keydown', this.handleRawKeyDown, this)

    this.worldContainer = this.add.container(0, 0)
    this.overlayContainer = this.add.container(0, 0).setDepth(100)
    this.touchContainer = this.add.container(0, 0).setDepth(90)
    this.createHud()
    this.loadStage(0, false)
    this.mode = 'language-select'
    applyDocumentLanguage(this.language)
    this.buildOverlay()
    this.createTouchControls()

    this.input.on('pointerdown', this.handleWorldPointer, this)
    this.input.on('pointerup', this.releaseTouchMove, this)
    this.input.on('pointerupoutside', this.releaseTouchMove, this)
    this.input.on('pointercancel', this.releaseTouchMove, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownScene, this)
    this.installDebugHooks()
    this.renderFrame()
  }

  update(_time: number, delta: number) {
    this.pollInputEdges()
    if (this.mode === 'playing' && !this.isPortraitMobile()) {
      const fixed = fixedStepsForDelta(this.accumulatorMs, delta)
      this.accumulatorMs = fixed.remainderMs
      for (let index = 0; index < fixed.steps; index += 1) {
        this.simulate(FIXED_STEP_MS)
      }
    } else if (this.mode === 'escape') {
      this.advanceEscape(delta)
    }
    this.updateFx(Math.min(delta, 50))
    this.renderFrame()
  }

  private makePlayer(start: Point): ActorState {
    return {
      ...clonePoint(start),
      vx: 0,
      vy: 0,
      facing: 'down',
      moving: false,
      dashRemainingMs: 0,
      dashCooldownMs: 0,
      carryingId: null,
      animationTimeMs: 0,
    }
  }

  private makeEcho(start: Point): EchoState {
    return {
      ...clonePoint(start),
      visible: false,
      frames: [],
      facing: 'down',
      moving: false,
      carryingId: null,
      lastReplayTimeMs: -0.001,
      holdingFinalPosition: false,
    }
  }

  private ui(key: string, values: Record<string, string | number> = {}) {
    return tr(this.language, key, values)
  }

  private stageCopy() {
    return getStageCopy(this.language, this.stage.id)
  }

  private createHud() {
    this.uiGraphics = this.add.graphics().setDepth(70)
    this.hudChapter = this.add.text(28, 17, '', textStyle(14)).setDepth(72)
    this.hudObjective = this.add
      .text(28, 47, '', { ...textStyle(11, COLORS.muted), wordWrap: { width: 600 } })
      .setDepth(72)
    this.hudTimer = this.add.text(925, 18, '', textStyle(18, COLORS.text, 'right')).setOrigin(1, 0).setDepth(72)
    this.hudLoop = this.add.text(925, 48, '', textStyle(10, COLORS.muted, 'right')).setOrigin(1, 0).setDepth(72)
    this.hudHint = this.add
      .text(480, 91, '', { ...textStyle(10, '#a9c7d8', 'center'), wordWrap: { width: 700 } })
      .setOrigin(0.5, 0)
      .setDepth(72)
    this.hudPrompt = this.add
      .text(480, 556, '', { ...textStyle(10, COLORS.text, 'center'), wordWrap: { width: 560 } })
      .setOrigin(0.5, 0.5)
      .setDepth(72)
    this.hudNodes = this.add.text(28, 82, '', textStyle(8, '#93afc0')).setDepth(74)
    this.soundButton = this.add
      .text(827, 82, this.ui('hud.soundOn'), textStyle(9, '#91b5c8', 'center'))
      .setOrigin(0.5)
      .setDepth(73)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.pointerPulseBlockedUntil = this.time.now + 100
        this.unlockAudio()
        this.audio.toggle()
        this.renderHud()
      })
    this.helpButton = this.add
      .text(907, 82, this.ui('hud.help'), textStyle(9, '#91b5c8', 'center'))
      .setOrigin(0.5)
      .setDepth(73)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.pointerPulseBlockedUntil = this.time.now + 100
        if (this.mode === 'playing') this.pauseGame()
        else if (this.mode === 'paused') this.resumeGame()
      })
    this.fullscreenButton = this.add
      .text(747, 82, this.ui('hud.fullscreen'), textStyle(8, '#91b5c8', 'center'))
      .setOrigin(0.5)
      .setDepth(73)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.pointerPulseBlockedUntil = this.time.now + 100
        this.enterFullscreen()
      })
  }

  private loadStage(index: number, countRestart = false) {
    this.stageIndex = Math.max(0, Math.min(STAGES.length - 1, index))
    this.stage = STAGES[this.stageIndex]
    this.runtime = createStageRuntime(this.stage)
    this.player = this.makePlayer(this.stage.start)
    this.echo = this.makeEcho(this.stage.start)
    this.recording = [this.makeRecordingFrame(0, 0)]
    this.loopTimeMs = 0
    this.accumulatorMs = 0
    this.stageElapsedMs = 0
    this.loopNumber = 1
    this.tutorialStep = 0
    this.stageMessage = ''
    this.stageMessageMs = 0
    this.lastDoorOpen = false
    this.lastPlateStates.clear()
    this.actionBuffer = { interact: 0, pulse: 0, dash: 0 }
    this.touchMove = { up: false, down: false, left: false, right: false }
    this.learned.clear()
    this.bursts = []
    this.trails = []
    this.previousPlayerPoint = clonePoint(this.player)
    this.previousEchoPoint = clonePoint(this.echo)
    if (countRestart) this.restartCount += 1
    this.buildStageView()
    this.updateTutorialProgress()
  }

  private buildStageView() {
    this.worldContainer.removeAll(true)
    this.crateSprites.clear()
    this.worldLabels = []
    this.guardianSprite = null
    this.staticGraphics = this.add.graphics()
    this.dynamicGraphics = this.add.graphics()
    this.worldContainer.add([this.staticGraphics, this.dynamicGraphics])

    const graphics = this.staticGraphics
    graphics.fillStyle(COLORS.floor, 1)
    graphics.fillRect(
      WORLD_BOUNDS.left,
      WORLD_BOUNDS.top,
      WORLD_BOUNDS.right - WORLD_BOUNDS.left,
      WORLD_BOUNDS.bottom - WORLD_BOUNDS.top,
    )
    graphics.fillStyle(COLORS.floorAlt, 0.58)
    for (let row = 0; row < 13; row += 1) {
      for (let column = 0; column < 28; column += 1) {
        if ((row * 7 + column * 11 + this.stageIndex * 3) % 5 !== 0) continue
        graphics.fillRect(40 + column * 32, 120 + row * 32, 30, 30)
      }
    }
    graphics.lineStyle(1, COLORS.grid, 0.35)
    for (let x = 48; x < 928; x += 32) graphics.lineBetween(x, 120, x, 528)
    for (let y = 120; y < 532; y += 32) graphics.lineBetween(32, y, 928, y)
    graphics.lineStyle(2, COLORS.cyanDark, 0.28)
    graphics.strokeRect(34, 114, 892, 416)

    for (let x = 40; x <= 920; x += 32) {
      this.addFacilityTile(x, 120, 2)
      this.addFacilityTile(x, 520, 10)
    }
    for (let y = 152; y <= 488; y += 32) {
      this.addFacilityTile(40, y, 6)
      this.addFacilityTile(920, y, 7)
    }

    for (const obstacle of this.stage.obstacles) {
      graphics.fillStyle(0x10192b, 1)
      graphics.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      graphics.lineStyle(2, COLORS.violet, 0.34)
      graphics.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      for (let y = obstacle.y + 12; y < obstacle.y + obstacle.height; y += 28) {
        this.addFacilityTile(obstacle.x + obstacle.width / 2, y, 5, 1.8)
      }
    }

    for (const plate of this.stage.plates) {
      const label = this.add
        .text(plate.x, plate.y + 35, stageLabel(this.language, this.stage.id, plate.id), textStyle(8, '#d3a34e', 'center'))
        .setOrigin(0.5)
      this.worldContainer.add(label)
      this.worldLabels.push(label)
    }

    if (this.stage.launchPad) {
      const label = this.add
        .text(this.stage.launchPad.x, this.stage.launchPad.y + 35, this.stageCopy().labels.launchPad ?? this.ui('world.launch'), textStyle(8, '#d3a34e', 'center'))
        .setOrigin(0.5)
      this.worldContainer.add(label)
      this.worldLabels.push(label)
    }
    if (this.stage.receiver) {
      const label = this.add
        .text(this.stage.receiver.x, this.stage.receiver.y + 47, this.stageCopy().labels.receiver ?? this.ui('world.receiver'), textStyle(8, '#86eac4', 'center'))
        .setOrigin(0.5)
      this.worldContainer.add(label)
      this.worldLabels.push(label)
    }

    this.portalSprite = this.add.sprite(this.stage.exit.x, this.stage.exit.y, 'facility-portal', 0).setScale(3.1)
    this.worldContainer.add(this.portalSprite)

    for (const crate of this.runtime.crates) {
      const sprite = this.add
        .sprite(crate.x, crate.y, crate.kind === 'cargo' ? 'facility-crates' : 'facility-orb', crate.kind === 'cargo' ? 0 : 0)
        .setScale(crate.kind === 'cargo' ? 2.7 : 2.5)
      if (crate.kind === 'core') sprite.setTint(COLORS.amber)
      this.crateSprites.set(crate.id, sprite)
      this.worldContainer.add(sprite)
    }

    if (this.stage.guardian) {
      this.guardianSprite = this.add.sprite(
        this.stage.guardian.x,
        this.stage.guardian.y,
        'facility-guard',
        0,
      ).setScale(3.05)
      this.worldContainer.add(this.guardianSprite)
      const label = this.add
        .text(this.stage.guardian.x, 142, this.stageCopy().labels.guardian ?? this.ui('world.sentinel'), textStyle(8, '#ff7b8e', 'center'))
        .setOrigin(0.5)
      this.worldContainer.add(label)
      this.worldLabels.push(label)
    }

    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 16, 38, 13, 0x000000, 0.48)
    this.echoShadow = this.add.ellipse(this.echo.x, this.echo.y + 16, 38, 13, COLORS.magentaDark, 0.2)
    this.playerSprite = this.add.image(this.player.x, this.player.y, avatarTexture('down', 0)).setScale(1.75)
    this.echoSprite = this.add
      .image(this.echo.x, this.echo.y, avatarTexture('down', 0))
      .setScale(1.75)
      .setTint(COLORS.magenta)
      .setAlpha(0.72)
    this.worldContainer.add([
      this.playerShadow,
      this.echoShadow,
      this.echoSprite,
      this.playerSprite,
    ])
  }

  private addFacilityTile(
    x: number,
    y: number,
    frame: number,
    scale = 2,
  ) {
    const tile = this.add.image(x, y, 'facility-tiles', frame).setScale(scale).setTint(0x587399)
    this.worldContainer.add(tile)
  }

  private pollInputEdges() {
    const justDown = Phaser.Input.Keyboard.JustDown
    if (justDown(this.keys.fullscreen)) this.toggleFullscreen()
    if (justDown(this.keys.sound)) {
      this.unlockAudio()
      this.audio.toggle()
    }

    if (this.mode === 'title') {
      if (justDown(this.keys.enter) || justDown(this.keys.interact) || justDown(this.keys.bind)) {
        this.startCampaign()
      }
      return
    }
    if (this.mode === 'stage-clear') {
      if (justDown(this.keys.enter) || justDown(this.keys.interact) || justDown(this.keys.bind)) {
        this.advanceStage()
      }
      return
    }
    if (this.mode === 'ending') {
      if (justDown(this.keys.enter) || justDown(this.keys.interact)) this.replayCampaign()
      return
    }
    if (this.mode === 'chapter-select') {
      if (justDown(this.keys.pause)) {
        this.mode = 'ending'
        this.buildOverlay()
      }
      return
    }
    if (this.mode === 'paused') {
      if (justDown(this.keys.pause) || justDown(this.keys.enter) || justDown(this.keys.interact)) {
        this.resumeGame()
      }
      return
    }
    if (this.mode !== 'playing') return

    if (justDown(this.keys.pause)) {
      this.pauseGame()
      return
    }
    if (justDown(this.keys.restart)) {
      this.restartStage()
      return
    }
    if (justDown(this.keys.bind)) this.bindEcho()
    if (justDown(this.keys.interact)) this.bufferAction(ACTION_INTERACT)
    if (justDown(this.keys.pulse)) this.bufferAction(ACTION_PULSE)
    if (justDown(this.keys.dash)) this.bufferAction(ACTION_DASH)
  }

  private handleRawKeyDown(event: KeyboardEvent) {
    if (event.repeat) return
    if (this.mode === 'language-select') {
      if (event.code === 'Digit1' || event.code === 'Numpad1') this.selectLanguage('en')
      if (event.code === 'Digit2' || event.code === 'Numpad2' || event.code === 'KeyK') this.selectLanguage('ko')
      return
    }
    if (this.mode === 'title' && (event.code === 'Enter' || event.code === 'KeyE')) {
      this.startCampaign()
    }
  }

  private bufferAction(action: number) {
    if (action === ACTION_INTERACT) this.actionBuffer.interact = 150
    if (action === ACTION_PULSE) this.actionBuffer.pulse = 150
    if (action === ACTION_DASH) this.actionBuffer.dash = 150
  }

  private readMovement(): Point {
    const left = this.keys.left.isDown || this.keys.a.isDown || this.touchMove.left
    const right = this.keys.right.isDown || this.keys.d.isDown || this.touchMove.right
    const up = this.keys.up.isDown || this.keys.w.isDown || this.touchMove.up
    const down = this.keys.down.isDown || this.keys.s.isDown || this.touchMove.down
    let x = Number(right) - Number(left)
    let y = Number(down) - Number(up)
    const length = Math.hypot(x, y)
    if (length > 1) {
      x /= length
      y /= length
    }
    return { x, y }
  }

  private simulate(stepMs: number) {
    if (this.mode !== 'playing') return
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - stepMs)
      return
    }

    const previousLoopTime = this.loopTimeMs
    this.loopTimeMs = Math.min(LOOP_DURATION_MS, this.loopTimeMs + stepMs)
    this.totalElapsedMs += stepMs
    this.stageElapsedMs += stepMs
    this.runtime.hazardTimeMs += stepMs
    this.stageMessageMs = Math.max(0, this.stageMessageMs - stepMs)
    this.player.dashCooldownMs = Math.max(0, this.player.dashCooldownMs - stepMs)
    this.actionBuffer.interact = Math.max(0, this.actionBuffer.interact - stepMs)
    this.actionBuffer.pulse = Math.max(0, this.actionBuffer.pulse - stepMs)
    this.actionBuffer.dash = Math.max(0, this.actionBuffer.dash - stepMs)

    this.previousPlayerPoint = clonePoint(this.player)
    this.previousEchoPoint = clonePoint(this.echo)
    const playerActionMask = this.simulatePlayer(stepMs)
    this.simulateEcho(previousLoopTime, this.loopTimeMs)
    this.simulateObjects(stepMs)
    this.simulateStageRules()
    this.recording.push(this.makeRecordingFrame(this.loopTimeMs, playerActionMask))
    this.updateTutorialProgress()

    if (this.loopTimeMs >= LOOP_DURATION_MS) this.bindEcho(true)
  }

  private simulatePlayer(stepMs: number) {
    const movement = this.readMovement()
    const deltaSeconds = stepMs / 1000
    let actionMask = 0

    if (this.actionBuffer.dash > 0 && this.player.dashCooldownMs <= 0) {
      this.actionBuffer.dash = 0
      this.player.dashRemainingMs = DASH_DURATION_MS
      this.player.dashCooldownMs = DASH_COOLDOWN_MS
      this.player.facing = directionFromVector(movement.x, movement.y, this.player.facing)
      const dashVector = directionVector(this.player.facing)
      this.player.vx = dashVector.x * DASH_SPEED
      this.player.vy = dashVector.y * DASH_SPEED
      actionMask |= ACTION_DASH
      this.learned.add('dash')
      this.audio.cue('dash')
      this.spawnBurst(this.player, COLORS.cyan, 52, 210)
    }

    if (this.player.dashRemainingMs > 0) {
      this.player.dashRemainingMs = Math.max(0, this.player.dashRemainingMs - stepMs)
    } else {
      const desiredX = movement.x * PLAYER_MAX_SPEED
      const desiredY = movement.y * PLAYER_MAX_SPEED
      const acceleration = movement.x !== 0 || movement.y !== 0
        ? PLAYER_ACCELERATION
        : PLAYER_DECELERATION
      this.player.vx = approach(this.player.vx, desiredX, acceleration * deltaSeconds)
      this.player.vy = approach(this.player.vy, desiredY, acceleration * deltaSeconds)
      this.player.facing = directionFromVector(movement.x, movement.y, this.player.facing)
    }

    const colliders = this.currentColliders()
    const before = clonePoint(this.player)
    const next = resolveCircleMovement(this.player, this.player, deltaSeconds, colliders)
    this.player.x = next.x
    this.player.y = next.y
    this.pushCrates(before, next)
    const travel = Math.hypot(this.player.x - before.x, this.player.y - before.y)
    this.player.moving = travel > 0.08
    this.player.animationTimeMs += stepMs * (this.player.dashRemainingMs > 0 ? 1.8 : 1)

    if (this.actionBuffer.interact > 0) {
      this.actionBuffer.interact = 0
      actionMask |= ACTION_INTERACT
      this.handleInteract('player')
    }
    if (this.actionBuffer.pulse > 0) {
      this.actionBuffer.pulse = 0
      actionMask |= ACTION_PULSE
      this.handlePulse('player')
    }

    if (this.player.moving && Math.floor(this.player.animationTimeMs / 180) !== Math.floor((this.player.animationTimeMs - stepMs) / 180)) {
      this.audio.cue('step')
    }
    return actionMask
  }

  private simulateEcho(fromTimeMs: number, toTimeMs: number) {
    if (!this.echo.visible || this.echo.frames.length === 0) return
    const sampled = sampleEcho(this.echo.frames, toTimeMs)
    if (!sampled) return
    this.echo.x = sampled.x
    this.echo.y = sampled.y
    this.echo.facing = sampled.facing
    this.echo.moving = sampled.moving && toTimeMs < this.echo.frames[this.echo.frames.length - 1].t
    this.echo.holdingFinalPosition = toTimeMs >= this.echo.frames[this.echo.frames.length - 1].t

    for (const frame of actionFramesBetween(this.echo.frames, fromTimeMs, toTimeMs)) {
      this.echo.x = frame.x
      this.echo.y = frame.y
      this.echo.facing = frame.facing
      if ((frame.actionMask & ACTION_INTERACT) !== 0) this.handleInteract('echo')
      if ((frame.actionMask & ACTION_PULSE) !== 0) this.handlePulse('echo')
    }
    const finalSample = sampleEcho(this.echo.frames, toTimeMs)
    if (finalSample) {
      this.echo.x = finalSample.x
      this.echo.y = finalSample.y
      this.echo.facing = finalSample.facing
    }
    this.echo.lastReplayTimeMs = toTimeMs
  }

  private simulateObjects(stepMs: number) {
    const deltaSeconds = stepMs / 1000
    for (const crate of this.runtime.crates) {
      if (crate.carriedBy) {
        const actor = this.actorState(crate.carriedBy)
        if (!actor) {
          crate.carriedBy = null
          continue
        }
        const forward = directionVector(actor.facing)
        crate.x = actor.x + forward.x * 29
        crate.y = actor.y + forward.y * 29
        crate.vx = 0
        crate.vy = 0
        crate.airborne = false
      } else {
        stepFreeCrate(crate, deltaSeconds, this.currentColliders(false))
      }
    }

    const guardianDefinition = this.stage.guardian
    const guardian = this.runtime.guardian
    if (guardianDefinition && guardian && !guardian.defeated) {
      if (!guardian.firstStrike) {
        const point = guardianPositionAt(guardianDefinition, this.runtime.hazardTimeMs)
        guardian.x = point.x
        guardian.y = point.y
      } else if (this.runtime.hazardTimeMs - guardian.firstStrike.timeMs > 1_300) {
        guardian.firstStrike = null
        guardian.feedback = 'late'
        this.setMessage(this.ui('message.syncLost'), 1_500)
      }
    }
  }

  private simulateStageRules() {
    const occupants = this.plateOccupants()
    if (this.stage.persistentObjectives.includes('cargo') && occupants.cargo === 'cargo') {
      if (!this.runtime.latches.includes('cargo')) {
        addLatch(this.runtime, 'cargo')
        this.audio.cue('plate')
        this.spawnBurst(this.stage.plates.find((plate) => plate.id === 'cargo') ?? this.player, COLORS.amber, 48, 320)
        this.setMessage(this.ui('message.cargoLatched'), 1_500)
      }
    }

    if (this.stage.receiver && !this.runtime.latches.includes('receiver')) {
      const core = this.runtime.crates.find((crate) => crate.kind === 'core' && crate.active)
      if (core && pointInRadius(core, this.stage.receiver, this.stage.receiver.radius)) {
        core.active = false
        core.carriedBy = null
        addLatch(this.runtime, 'receiver')
        this.audio.cue('receiver')
        this.spawnBurst(this.stage.receiver, COLORS.mint, 86, 520)
        this.cameras.main.shake(120, 0.003)
        this.setMessage(this.ui('message.signalCaptured'), 1_700)
      }
    }

    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)
    if (evaluation.doorOpen && !this.lastDoorOpen) {
      this.audio.cue('door')
      this.spawnBurst({ x: this.stage.door.x + this.stage.door.width / 2, y: this.stage.door.y + this.stage.door.height / 2 }, COLORS.mint, 72, 420)
      this.setMessage(this.ui('message.veilOpen'), 1_500)
    }
    this.lastDoorOpen = evaluation.doorOpen

    for (const plate of this.stage.plates) {
      const previous = this.lastPlateStates.get(plate.id) ?? null
      const current = occupants[plate.id] ?? null
      if (!previous && current) this.audio.cue('plate')
      this.lastPlateStates.set(plate.id, current)
    }

    for (const laser of this.stage.lasers) {
      const disabled = laser.disabledByPlate
        ? occupants[laser.disabledByPlate] === 'echo'
        : false
      if (
        getLaserPhase(laser, this.runtime.hazardTimeMs, disabled) === 'active' &&
        this.player.dashRemainingMs <= 0 &&
        laserHitsPoint(laser, this.player, PLAYER_RADIUS)
      ) {
        this.failAttempt(this.ui('message.laserContact'))
        return
      }
    }
  }

  private currentColliders(includeDoor = true) {
    const colliders = [...this.stage.obstacles]
    if (includeDoor && !this.lastDoorOpen) colliders.push(this.stage.door)
    return colliders
  }

  private pushCrates(before: Point, after: Point) {
    if (this.player.carryingId) return
    const moved = { x: after.x - before.x, y: after.y - before.y }
    if (Math.hypot(moved.x, moved.y) < 0.01) return
    for (const crate of this.runtime.crates) {
      if (!crate.active || crate.carriedBy || crate.airborne || crate.kind !== 'cargo') continue
      const minimum = PLAYER_RADIUS + CRATE_RADIUS
      const dx = crate.x - this.player.x
      const dy = crate.y - this.player.y
      const distance = Math.hypot(dx, dy)
      if (distance >= minimum || distance === 0) continue
      const pushSpeed = Math.hypot(moved.x, moved.y) / (FIXED_STEP_MS / 1000)
      const velocity = {
        vx: (dx / distance) * pushSpeed,
        vy: (dy / distance) * pushSpeed,
      }
      const pushed = resolveCircleMovement(crate, velocity, FIXED_STEP_MS / 1000, this.currentColliders(false), CRATE_RADIUS)
      const pushedDistance = Math.hypot(pushed.x - crate.x, pushed.y - crate.y)
      if (pushedDistance > 0.02) {
        crate.x = pushed.x
        crate.y = pushed.y
      } else {
        this.player.x = before.x
        this.player.y = before.y
        this.player.vx = 0
        this.player.vy = 0
      }
    }
  }

  private handleInteract(actorId: ActorId) {
    const actor = this.actorState(actorId)
    if (!actor) return
    const occupants = this.plateOccupants()
    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)
    if (
      actorId === 'player' &&
      evaluation.doorOpen &&
      pointInRadius(actor, this.stage.exit, 43)
    ) {
      this.completeStage()
      return
    }

    if (actor.carryingId) {
      const crate = this.runtime.crates.find((candidate) => candidate.id === actor.carryingId)
      if (!crate) {
        actor.carryingId = null
        return
      }
      const facing = directionVector(actor.facing)
      crate.x = actor.x + facing.x * 38
      crate.y = actor.y + facing.y * 38
      crate.carriedBy = null
      crate.airborne = false
      crate.vx = 0
      crate.vy = 0
      actor.carryingId = null
      this.snapCargoToPlate(crate)
      this.learned.add('carry')
      if (actorId === 'player') this.audio.cue('interact')
      this.spawnBurst(crate, actorId === 'player' ? COLORS.amber : COLORS.magenta, 28, 180)
      return
    }

    const nearest = this.runtime.crates
      .filter((crate) => crate.active && !crate.carriedBy && !crate.airborne)
      .map((crate) => ({ crate, distance: distanceSquared(crate, actor) }))
      .filter((entry) => entry.distance <= 56 * 56)
      .sort((a, b) => a.distance - b.distance)[0]?.crate
    if (!nearest) {
      if (actorId === 'player') this.setMessage(this.contextPrompt(), 1_100)
      return
    }
    nearest.carriedBy = actorId
    actor.carryingId = nearest.id
    this.learned.add('carry')
    if (actorId === 'player') this.audio.cue('interact')
    this.spawnBurst(nearest, actorId === 'player' ? COLORS.amber : COLORS.magenta, 30, 180)
  }

  private handlePulse(actorId: ActorId) {
    const actor = this.actorState(actorId)
    if (!actor) return
    this.learned.add('pulse')
    if (actor.carryingId) {
      const crate = this.runtime.crates.find((candidate) => candidate.id === actor.carryingId)
      if (!crate) {
        actor.carryingId = null
        return
      }
      const velocity = redirectVelocity(actor.facing, crate.kind === 'core' ? 315 : 255)
      crate.carriedBy = null
      crate.airborne = true
      crate.vx = velocity.vx
      crate.vy = velocity.vy
      actor.carryingId = null
      this.learned.add('throw')
      if (actorId === 'player') this.audio.cue('throw')
      this.spawnBurst(crate, actorId === 'player' ? COLORS.amber : COLORS.magenta, 44, 230)
      return
    }

    const facing = directionVector(actor.facing)
    this.spawnBurst(
      { x: actor.x + facing.x * 28, y: actor.y + facing.y * 28 },
      actorId === 'player' ? COLORS.cyan : COLORS.magenta,
      72,
      190,
    )
    if (actorId === 'player') {
      this.audio.cue('pulse')
      this.cameras.main.shake(65, 0.0018)
    }

    for (const crate of this.runtime.crates) {
      if (!crate.active || crate.carriedBy) continue
      const dx = crate.x - actor.x
      const dy = crate.y - actor.y
      const distance = Math.hypot(dx, dy)
      const facingDot = distance > 0 ? (dx / distance) * facing.x + (dy / distance) * facing.y : 1
      if (distance > 96 || facingDot < 0.18) continue
      const velocity = redirectVelocity(actor.facing, crate.kind === 'core' ? 330 : 230)
      crate.vx = velocity.vx
      crate.vy = velocity.vy
      crate.airborne = true
      this.learned.add('redirect')
      this.spawnBurst(crate, COLORS.amber, 38, 210)
    }

    const guardian = this.runtime.guardian
    if (guardian && !guardian.defeated) {
      const dx = guardian.x - actor.x
      const dy = guardian.y - actor.y
      const distance = Math.hypot(dx, dy)
      const facingDot = distance > 0 ? (dx / distance) * facing.x + (dy / distance) * facing.y : 1
      if (distance <= 112 && facingDot > 0.35) {
        const feedback = registerGuardianStrike(guardian, {
          actor: actorId,
          direction: actor.facing,
          timeMs: this.runtime.hazardTimeMs,
        })
        this.hitStopMs = 46
        this.audio.cue('hit')
        this.cameras.main.shake(110, 0.004)
        if (feedback === 'breached') {
          addLatch(this.runtime, 'guardian')
          this.audio.cue('guardian')
          this.spawnBurst(guardian, COLORS.red, 120, 650)
          this.setMessage(this.ui('message.sentinelBreached'), 2_000)
        } else if (feedback === 'armed') {
          this.setMessage(this.ui('message.shieldExposed'), 1_300)
        } else if (feedback === 'same-actor') {
          this.setMessage(this.ui('message.rejected'), 1_600)
        } else if (feedback === 'wrong-side') {
          this.setMessage(this.ui('message.deflected'), 1_500)
        } else if (feedback === 'late') {
          this.setMessage(this.ui('message.syncLost'), 1_500)
        }
      }
    }
  }

  private actorState(actorId: ActorId): ActorState | EchoState | null {
    if (actorId === 'player') return this.player
    return this.echo.visible ? this.echo : null
  }

  private snapCargoToPlate(crate: CrateState) {
    if (crate.kind !== 'cargo') return
    const plate = this.stage.plates.find(
      (candidate) =>
        candidate.accepts !== 'actor' && pointInRadius(crate, candidate, 58),
    )
    if (!plate) return
    crate.x = plate.x
    crate.y = plate.y
    this.audio.cue('plate')
  }

  private plateOccupants() {
    const result: Record<string, PlateOccupant> = {}
    for (const plate of this.stage.plates) {
      result[plate.id] = getPlateOccupant(
        plate,
        this.player,
        this.echo.visible ? this.echo : null,
        this.runtime.crates,
      )
    }
    return result
  }

  private makeRecordingFrame(timeMs: number, actionMask: number): EchoFrame {
    return {
      t: timeMs,
      x: this.player.x,
      y: this.player.y,
      facing: this.player.facing,
      moving: this.player.moving,
      actionMask,
    }
  }

  private bindEcho(automatic = false) {
    if (this.mode !== 'playing' || this.recording.length < 1) return
    const frames = copyEchoFrames(this.recording)
    if (frames[frames.length - 1].t < this.loopTimeMs) {
      frames.push(this.makeRecordingFrame(this.loopTimeMs, 0))
    }
    const retainedLatches = [...this.runtime.latches]
    this.releaseCarriedObjects()
    this.runtime = createStageRuntime(this.stage, retainedLatches)
    this.player = this.makePlayer(this.stage.start)
    this.echo = {
      ...this.makeEcho(this.stage.start),
      visible: true,
      frames,
    }
    this.recording = [this.makeRecordingFrame(0, 0)]
    this.loopTimeMs = 0
    this.accumulatorMs = 0
    this.loopNumber += 1
    this.totalBinds += 1
    this.actionBuffer = { interact: 0, pulse: 0, dash: 0 }
    this.lastDoorOpen = false
    this.lastPlateStates.clear()
    this.learned.add('echo')
    this.audio.cue('bind')
    this.cameras.main.flash(100, 62, 15, 80, false)
    this.spawnBurst(this.stage.start, COLORS.magenta, 92, 420)
    this.setMessage(
      automatic ? this.ui('message.loopExpired') : this.ui('message.echoBound'),
      1_600,
    )
  }

  private releaseCarriedObjects() {
    this.player.carryingId = null
    this.echo.carryingId = null
    for (const crate of this.runtime.crates) crate.carriedBy = null
  }

  private failAttempt(message: string) {
    if (this.mode !== 'playing') return
    this.deaths += 1
    this.audio.cue('fail')
    this.cameras.main.shake(180, 0.008)
    this.cameras.main.flash(130, 140, 15, 35, false)
    const retainedLatches = [...this.runtime.latches]
    const echoFrames = copyEchoFrames(this.echo.frames)
    const keepEcho = this.echo.visible
    this.runtime = createStageRuntime(this.stage, retainedLatches)
    this.player = this.makePlayer(this.stage.start)
    this.echo = keepEcho
      ? { ...this.makeEcho(this.stage.start), visible: true, frames: echoFrames }
      : this.makeEcho(this.stage.start)
    this.recording = [this.makeRecordingFrame(0, 0)]
    this.loopTimeMs = 0
    this.accumulatorMs = 0
    this.actionBuffer = { interact: 0, pulse: 0, dash: 0 }
    this.lastDoorOpen = false
    this.lastPlateStates.clear()
    this.setMessage(message, 1_800)
  }

  private restartStage() {
    if (this.mode !== 'playing' && this.mode !== 'paused') return
    this.loadStage(this.stageIndex, true)
    this.mode = 'playing'
    this.overlayContainer.removeAll(true)
    this.audio.cue('bind')
    this.setMessage(this.ui('message.chapterReset'), 1_300)
  }

  private completeStage() {
    if (this.mode !== 'playing') return
    this.stageTimesMs[this.stageIndex] = this.stageElapsedMs
    if (this.stageIndex === STAGES.length - 1) {
      this.beginEscape()
      return
    }
    this.mode = 'stage-clear'
    this.audio.cue('receiver')
    this.cameras.main.flash(160, 45, 190, 145, false)
    this.buildOverlay()
  }

  private advanceStage() {
    if (this.mode !== 'stage-clear') return
    this.loadStage(this.stageIndex + 1, false)
    this.mode = 'playing'
    this.overlayContainer.removeAll(true)
    this.audio.cue('start')
  }

  private beginEscape() {
    this.mode = 'escape'
    this.escapeTimeMs = 0
    this.releaseCarriedObjects()
    this.audio.cue('escape')
    this.spawnBurst(this.stage.exit, COLORS.mint, 160, 1_100)
    this.cameras.main.shake(400, 0.004)
  }

  private advanceEscape(deltaMs: number) {
    this.escapeTimeMs += deltaMs
    const progress = Math.min(1, this.escapeTimeMs / 1_250)
    this.player.x += (this.stage.exit.x - this.player.x) * Math.min(1, deltaMs / 180)
    this.player.y += (this.stage.exit.y - this.player.y) * Math.min(1, deltaMs / 180)
    this.playerSprite.setAlpha(1 - progress * 0.9)
    if (this.escapeTimeMs >= 1_250) {
      this.mode = 'ending'
      this.stageTimesMs[this.stageIndex] = this.stageElapsedMs
      this.buildOverlay()
    }
  }

  private startCampaign() {
    if (this.mode !== 'title') return
    this.unlockAudio()
    this.enterFullscreen()
    this.totalElapsedMs = 0
    this.stageTimesMs = []
    this.totalBinds = 0
    this.deaths = 0
    this.restartCount = 0
    this.loadStage(0, false)
    this.mode = 'playing'
    this.overlayContainer.removeAll(true)
    this.audio.cue('start')
  }

  private replayCampaign() {
    this.mode = 'title'
    this.totalElapsedMs = 0
    this.stageTimesMs = []
    this.totalBinds = 0
    this.deaths = 0
    this.restartCount = 0
    this.loadStage(0, false)
    this.buildOverlay()
  }

  private pauseGame() {
    if (this.mode !== 'playing') return
    this.resumeMode = this.mode
    this.mode = 'paused'
    this.buildOverlay()
  }

  private resumeGame() {
    if (this.mode !== 'paused') return
    this.mode = this.resumeMode
    this.overlayContainer.removeAll(true)
  }

  private buildOverlay() {
    this.overlayContainer.removeAll(true)
    if (this.mode === 'playing' || this.mode === 'escape') return
    const shade = this.add.rectangle(480, 300, 960, 600, 0x02040c, this.mode === 'title' ? 0.91 : 0.86)
    shade.setInteractive()
    this.overlayContainer.add(shade)

    if (this.mode === 'language-select') {
      this.buildLanguageOverlay()
      return
    }
    if (this.mode === 'title') {
      this.buildTitleOverlay()
      return
    }
    if (this.mode === 'stage-clear') {
      this.buildStageClearOverlay()
      return
    }
    if (this.mode === 'paused') {
      this.buildPauseOverlay()
      return
    }
    if (this.mode === 'ending') {
      this.buildEndingOverlay()
      return
    }
    if (this.mode === 'chapter-select') this.buildChapterSelectOverlay()
  }

  private buildLanguageOverlay() {
    const accent = this.add.graphics()
    accent.lineStyle(2, COLORS.cyan, 0.7)
    accent.lineBetween(170, 120, 390, 120)
    accent.lineBetween(570, 120, 790, 120)
    accent.lineStyle(1, COLORS.magenta, 0.4)
    accent.strokeCircle(480, 260, 150)
    this.overlayContainer.add(accent)

    const title = this.add.text(480, 150, this.ui('language.title'), textStyle(28, '#e9fdff', 'center')).setOrigin(0.5)
    title.setShadow(0, 0, '#55e8ff', 12, true, true)
    const subtitle = this.add
      .text(480, 205, this.ui('language.subtitle'), { ...textStyle(11, '#bcd8e7', 'center'), wordWrap: { width: 650 } })
      .setOrigin(0.5)
    const english = this.makeButton(330, 330, 260, 86, this.ui('language.english'), COLORS.cyan, () => this.selectLanguage('en'), 13)
    const korean = this.makeButton(630, 330, 260, 86, this.ui('language.korean'), COLORS.magenta, () => this.selectLanguage('ko'), 13)
    const hint = this.add.text(480, 470, this.ui('language.hint'), textStyle(10, '#9ab8ca', 'center')).setOrigin(0.5)
    this.overlayContainer.add([title, subtitle, english, korean, hint])
  }

  private selectLanguage(language: Language) {
    this.language = language
    applyDocumentLanguage(language)
    this.mode = 'title'
    this.buildOverlay()
  }

  private buildTitleOverlay() {
    const accent = this.add.graphics()
    accent.lineStyle(2, COLORS.cyan, 0.7)
    accent.lineBetween(100, 120, 350, 120)
    accent.lineBetween(610, 120, 860, 120)
    accent.lineStyle(1, COLORS.magenta, 0.35)
    accent.strokeCircle(480, 286, 177)
    accent.strokeCircle(480, 286, 184)
    this.overlayContainer.add(accent)

    const title = this.add.text(480, 61, 'ECHO HEIST', textStyle(36, '#e9fdff', 'center')).setOrigin(0.5)
    title.setShadow(0, 0, '#55e8ff', 12, true, true)
    const tag = this.add
      .text(480, 101, this.ui('title.tag'), textStyle(10, '#f06dff', 'center'))
      .setOrigin(0.5)
    const concept = this.add
      .text(
        480,
        145,
        this.ui('title.concept'),
        { ...textStyle(13, '#bcd8e7', 'center'), lineSpacing: 7 },
      )
      .setOrigin(0.5, 0)
    const objective = this.add
      .text(480, 214, this.ui('title.goal'), textStyle(9, '#70ffc4', 'center'))
      .setOrigin(0.5)

    const desktop = this.add
      .text(
        170,
        260,
        this.ui('title.desktop'),
        { ...textStyle(10, '#a9c7d8', 'left'), lineSpacing: 6 },
      )
      .setOrigin(0, 0)
    const mobile = this.add
      .text(
        585,
        260,
        this.ui('title.mobile'),
        { ...textStyle(10, '#a9c7d8', 'left'), lineSpacing: 6 },
      )
      .setOrigin(0, 0)
    const start = this.makeButton(480, 490, 290, 52, this.ui('title.start'), COLORS.cyan, () => this.startCampaign())
    const fullscreen = this.makeButton(170, 548, 170, 34, this.ui('title.fullscreen'), COLORS.cyan, () => this.enterFullscreen(), 8)
    const sound = this.makeButton(
      370,
      548,
      175,
      34,
      this.audio.isEnabled() ? this.ui('title.soundOn') : this.ui('title.soundOff'),
      COLORS.violet,
      () => {
        this.unlockAudio()
        this.audio.toggle()
        this.buildOverlay()
      },
    )
    const chapter = this.makeButton(590, 548, 220, 34, this.ui('title.chapterSelect'), COLORS.magenta, () => {
      this.mode = 'chapter-select'
      this.buildOverlay()
    })
    this.overlayContainer.add([title, tag, concept, objective, desktop, mobile, start, fullscreen, sound, chapter])
  }

  private buildStageClearOverlay() {
    const stageCopy = this.stageCopy()
    const title = this.add.text(480, 160, this.ui('overlay.breachComplete'), textStyle(28, '#70ffc4', 'center')).setOrigin(0.5)
    const chapter = this.add
      .text(480, 220, `${this.stage.chapter} · ${stageCopy.title}`, textStyle(14, COLORS.text, 'center'))
      .setOrigin(0.5)
    const stats = this.add
      .text(
        480,
        275,
        `${this.ui('overlay.time')} ${this.formatTime(this.stageElapsedMs)}   ·   ${this.ui('overlay.loops')} ${this.loopNumber}   ·   ${this.ui('overlay.totalBinds')} ${this.totalBinds}`,
        textStyle(10, '#9ab8ca', 'center'),
      )
      .setOrigin(0.5)
    const nextStage = STAGES[this.stageIndex + 1]
    const next = this.add
      .text(
        480,
        330,
        `${this.ui('overlay.next')}: ${nextStage.chapter} · ${getStageCopy(this.language, nextStage.id).title}\n${getStageCopy(this.language, nextStage.id).subtitle}`,
        { ...textStyle(12, '#f4b8ff', 'center'), lineSpacing: 8 },
      )
      .setOrigin(0.5)
    const button = this.makeButton(480, 430, 270, 50, this.ui('overlay.continue'), COLORS.mint, () => this.advanceStage())
    this.overlayContainer.add([title, chapter, stats, next, button])
  }

  private buildPauseOverlay() {
    const title = this.add.text(480, 115, this.ui('overlay.paused'), textStyle(27, COLORS.text, 'center')).setOrigin(0.5)
    const rules = this.add
      .text(
        480,
        170,
        this.ui('overlay.pauseRules'),
        { ...textStyle(10, '#a9c7d8', 'center'), lineSpacing: 7 },
      )
      .setOrigin(0.5, 0)
    const controls = this.add
      .text(
        480,
        290,
        this.ui('overlay.pauseControls'),
        { ...textStyle(10, '#d9f8ff', 'center'), lineSpacing: 10 },
      )
      .setOrigin(0.5)
    const hint = this.add
      .text(480, 360, this.stageCopy().hint, { ...textStyle(10, '#ffcf75', 'center'), wordWrap: { width: 680 } })
      .setOrigin(0.5)
    const resume = this.makeButton(380, 455, 230, 48, this.ui('overlay.resume'), COLORS.cyan, () => this.resumeGame())
    const restart = this.makeButton(640, 455, 230, 48, this.ui('overlay.resetChapter'), COLORS.red, () => this.restartStage())
    this.overlayContainer.add([title, rules, controls, hint, resume, restart])
  }

  private buildEndingOverlay() {
    const title = this.add.text(480, 83, this.ui('overlay.endingTitle'), textStyle(26, '#70ffc4', 'center')).setOrigin(0.5)
    title.setShadow(0, 0, '#55e8ff', 12, true, true)
    const ending = this.add
      .text(
        480,
        137,
        this.ui('overlay.endingText'),
        { ...textStyle(12, '#c8e0ea', 'center'), lineSpacing: 9 },
      )
      .setOrigin(0.5, 0)
    const result = this.add
      .text(
        480,
        234,
        `${this.ui('overlay.escapeTime')}  ${this.formatTime(this.totalElapsedMs)}\n${this.ui('overlay.echoesBound')}  ${this.totalBinds}\n${this.ui('overlay.fracturesSurvived')}  ${this.deaths}\n${this.ui('overlay.chapterResets')}  ${this.restartCount}`,
        { ...textStyle(12, '#f1bdff', 'center'), lineSpacing: 9 },
      )
      .setOrigin(0.5, 0)
    const rank = this.add
      .text(480, 380, this.endingRank(), textStyle(13, '#ffcf75', 'center'))
      .setOrigin(0.5)
    const replay = this.makeButton(350, 465, 230, 50, this.ui('overlay.replay'), COLORS.cyan, () => this.replayCampaign())
    const chapters = this.makeButton(610, 465, 230, 50, this.ui('overlay.chapterSelect'), COLORS.magenta, () => {
      this.mode = 'chapter-select'
      this.buildOverlay()
    })
    const note = this.add
      .text(480, 535, this.ui('overlay.note'), textStyle(9, '#7898aa', 'center'))
      .setOrigin(0.5)
    this.overlayContainer.add([title, ending, result, rank, replay, chapters, note])
  }

  private buildChapterSelectOverlay() {
    const title = this.add.text(480, 60, this.ui('overlay.chapterSelect'), textStyle(25, COLORS.text, 'center')).setOrigin(0.5)
    const note = this.add
      .text(480, 95, this.ui('overlay.chapterSelectNote'), textStyle(9, '#8eabba', 'center'))
      .setOrigin(0.5)
    this.overlayContainer.add([title, note])
    STAGES.forEach((stage, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = column === 0 ? 300 : 660
      const y = 170 + row * 120
      const button = this.makeButton(
        x,
        y,
        320,
        86,
        `${stage.chapter} · ${getStageCopy(this.language, stage.id).title}\n${getStageCopy(this.language, stage.id).objective}`,
        index % 2 === 0 ? COLORS.cyan : COLORS.magenta,
        () => {
          this.totalElapsedMs = 0
          this.stageTimesMs = []
          this.totalBinds = 0
          this.deaths = 0
          this.restartCount = 0
          this.loadStage(index, false)
          this.mode = 'playing'
          this.overlayContainer.removeAll(true)
          this.unlockAudio()
        },
        9,
      )
      this.overlayContainer.add(button)
    })
    const back = this.makeButton(480, 540, 180, 38, this.ui('overlay.back'), COLORS.violet, () => {
      this.mode = 'title'
      this.buildOverlay()
    })
    this.overlayContainer.add(back)
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onPress: () => void,
    fontSize = 11,
  ) {
    const container = this.add.container(x, y)
    const border = this.add.rectangle(0, 0, width, height, 0x0b1628, 0.96).setStrokeStyle(2, color, 0.9)
    const text = this.add
      .text(0, 0, label, { ...textStyle(fontSize, '#d9f8ff', 'center'), wordWrap: { width: width - 24 } })
      .setOrigin(0.5)
    border
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => border.setFillStyle(color, 0.18))
      .on('pointerout', () => border.setFillStyle(0x0b1628, 0.96))
      .on('pointerdown', () => {
        this.pointerPulseBlockedUntil = this.time.now + 120
        onPress()
      })
    container.add([border, text])
    return container
  }

  private createTouchControls() {
    this.touchContainer.removeAll(true)
    const movementButtons = [
      { key: 'up' as const, x: 102, y: 445, label: '▲' },
      { key: 'down' as const, x: 102, y: 515, label: '▼' },
      { key: 'left' as const, x: 67, y: 480, label: '◀' },
      { key: 'right' as const, x: 137, y: 480, label: '▶' },
    ]
    for (const button of movementButtons) {
      const circle = this.add.circle(button.x, button.y, 36, 0x07111f, 0.78).setStrokeStyle(2, COLORS.cyan, 0.55)
      const label = this.add.text(button.x, button.y, button.label, textStyle(13, '#bcefff', 'center')).setOrigin(0.5)
      circle.setInteractive()
      circle.on('pointerdown', () => {
        this.pointerPulseBlockedUntil = this.time.now + 100
        this.touchMove[button.key] = true
      })
      this.touchContainer.add([circle, label])
    }

    this.addTouchAction(700, 445, 42, this.ui('touch.echo'), COLORS.magenta, () => this.bindEcho())
    this.addTouchAction(805, 445, 42, this.ui('touch.pulse'), COLORS.cyan, () => this.bufferAction(ACTION_PULSE))
    this.addTouchAction(700, 520, 42, this.ui('touch.use'), COLORS.amber, () => this.bufferAction(ACTION_INTERACT))
    this.addTouchAction(805, 520, 42, this.ui('touch.dash'), COLORS.violet, () => this.bufferAction(ACTION_DASH))
  }

  private addTouchAction(
    x: number,
    y: number,
    radius: number,
    labelText: string,
    color: number,
    action: () => void,
  ) {
    const circle = this.add.circle(x, y, radius, 0x07111f, 0.82).setStrokeStyle(2, color, 0.72)
    const label = this.add.text(x, y, labelText, textStyle(8, '#e5faff', 'center')).setOrigin(0.5)
    circle.setInteractive().on('pointerdown', () => {
      this.pointerPulseBlockedUntil = this.time.now + 100
      action()
    })
    this.touchContainer.add([circle, label])
  }

  private isTouchLayout() {
    return this.scale.displaySize.width < 800 || window.matchMedia('(pointer: coarse)').matches
  }

  private isPortraitMobile() {
    return window.innerWidth < 800 && window.innerHeight > window.innerWidth
  }

  private releaseTouchMove() {
    this.touchMove = { up: false, down: false, left: false, right: false }
  }

  private handleWorldPointer(pointer: Phaser.Input.Pointer) {
    if (this.mode !== 'playing' || this.isTouchLayout()) return
    if (this.time.now < this.pointerPulseBlockedUntil || pointer.y < 105 || pointer.y > 540) return
    const direction = directionFromVector(
      pointer.worldX - this.player.x,
      pointer.worldY - this.player.y,
      this.player.facing,
    )
    this.player.facing = direction
    this.bufferAction(ACTION_PULSE)
  }

  private renderFrame() {
    if (!this.playerSprite?.active) return
    this.renderWorld()
    this.renderHud()
    this.touchContainer.setVisible(
      this.mode === 'playing' && this.isTouchLayout() && !this.isPortraitMobile(),
    )
  }

  private renderWorld() {
    const graphics = this.dynamicGraphics
    graphics.clear()
    const occupants = this.plateOccupants()
    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)

    for (const plate of this.stage.plates) {
      const occupant = occupants[plate.id]
      const active = occupant !== null || this.runtime.latches.includes(plate.id)
      const color = plate.accepts === 'actor' ? COLORS.magenta : COLORS.amber
      graphics.fillStyle(active ? color : COLORS.ink, active ? 0.42 : 0.9)
      graphics.fillCircle(plate.x, plate.y, 27)
      graphics.lineStyle(active ? 4 : 2, color, active ? 1 : 0.55)
      graphics.strokeCircle(plate.x, plate.y, active ? 29 : 27)
      graphics.lineStyle(1, color, 0.55)
      graphics.strokeCircle(plate.x, plate.y, 16)
      if (active) {
        graphics.fillStyle(color, 0.65)
        graphics.fillCircle(plate.x, plate.y, 6)
      }
    }

    if (this.stage.launchPad) {
      const launch = this.stage.launchPad
      graphics.fillStyle(COLORS.amberDark, 0.45)
      graphics.fillRect(launch.x - 25, launch.y - 25, 50, 50)
      graphics.lineStyle(2, COLORS.amber, 0.8)
      graphics.strokeRect(launch.x - 25, launch.y - 25, 50, 50)
      for (let offset = 0; offset < 125; offset += 18) {
        graphics.fillStyle(COLORS.amber, 0.4 + 0.4 * (1 - offset / 125))
        graphics.fillRect(launch.x - 2, launch.y - 38 - offset, 4, 9)
      }
      if (this.stage.receiver) {
        const cornerY = this.stage.receiver.y
        for (let x = launch.x + 14; x < this.stage.receiver.x; x += 18) {
          graphics.fillStyle(COLORS.cyan, 0.42)
          graphics.fillRect(x, cornerY - 2, 9, 4)
        }
      }
    }

    if (this.stage.receiver) {
      const latched = this.runtime.latches.includes('receiver')
      const receiver = this.stage.receiver
      const pulse = 3 + Math.sin(this.runtime.hazardTimeMs / 180) * 2
      graphics.fillStyle(latched ? COLORS.mint : COLORS.cyanDark, latched ? 0.32 : 0.18)
      graphics.fillCircle(receiver.x, receiver.y, receiver.radius + pulse)
      graphics.lineStyle(3, latched ? COLORS.mint : COLORS.cyan, latched ? 1 : 0.65)
      graphics.strokeCircle(receiver.x, receiver.y, receiver.radius)
      graphics.lineStyle(1, COLORS.mint, 0.5)
      graphics.strokeCircle(receiver.x, receiver.y, receiver.radius - 12)
    }

    for (const laser of this.stage.lasers) {
      const disabled = laser.disabledByPlate ? occupants[laser.disabledByPlate] === 'echo' : false
      const phase = getLaserPhase(laser, this.runtime.hazardTimeMs, disabled)
      const color = phase === 'active' ? COLORS.red : phase === 'warning' ? COLORS.violet : COLORS.cyanDark
      const alpha = phase === 'active' ? 0.94 : phase === 'warning' ? 0.48 : 0.2
      const width = phase === 'active' ? 6 : 3
      graphics.lineStyle(width + 6, color, alpha * 0.16)
      graphics.lineBetween(laser.x1, laser.y1, laser.x2, laser.y2)
      graphics.lineStyle(width, color, alpha)
      graphics.lineBetween(laser.x1, laser.y1, laser.x2, laser.y2)
      graphics.fillStyle(color, alpha)
      graphics.fillCircle(laser.x1, laser.y1, 8)
      graphics.fillCircle(laser.x2, laser.y2, 8)
    }

    const door = this.stage.door
    if (!evaluation.doorOpen) {
      graphics.fillStyle(0x170e25, 0.92)
      graphics.fillRect(door.x, door.y, door.width, door.height)
      for (let y = door.y + 6; y < door.y + door.height; y += 18) {
        graphics.lineStyle(3, COLORS.magenta, 0.68)
        graphics.lineBetween(door.x + 3, y, door.x + door.width - 3, y + 9)
      }
      graphics.lineStyle(2, COLORS.red, 0.55)
      graphics.strokeRect(door.x, door.y, door.width, door.height)
    } else {
      graphics.lineStyle(2, COLORS.mint, 0.55)
      graphics.lineBetween(door.x + door.width / 2, door.y, door.x + door.width / 2, door.y + door.height)
    }

    const portalFrame = Math.floor(this.runtime.hazardTimeMs / 120) % 6
    this.portalSprite.setFrame(portalFrame)
    this.portalSprite.setTint(evaluation.doorOpen ? COLORS.mint : 0x42616e)
    this.portalSprite.setAlpha(evaluation.doorOpen ? 1 : 0.55)
    const portalPulse = 28 + Math.sin(this.runtime.hazardTimeMs / 170) * 4
    graphics.lineStyle(2, evaluation.doorOpen ? COLORS.mint : COLORS.cyanDark, 0.65)
    graphics.strokeCircle(this.stage.exit.x, this.stage.exit.y, portalPulse)

    this.renderEchoPreview(graphics)
    this.renderGuardian(graphics)
    this.renderFx(graphics)
    this.renderActorsAndObjects()
  }

  private renderEchoPreview(graphics: Phaser.GameObjects.Graphics) {
    if (!this.echo.visible || this.echo.frames.length < 2) return
    const startIndex = this.echo.frames.findIndex((frame) => frame.t >= this.loopTimeMs)
    const first = startIndex < 0 ? this.echo.frames.length - 1 : startIndex
    for (let index = first; index < this.echo.frames.length; index += 45) {
      const frame = this.echo.frames[index]
      const remaining = Math.max(0, frame.t - this.loopTimeMs)
      const alpha = 0.18 + 0.38 * (1 - Math.min(1, remaining / 5_000))
      graphics.fillStyle(COLORS.magenta, alpha)
      graphics.fillRect(Math.round(frame.x) - 2, Math.round(frame.y) - 2, 4, 4)
    }
  }

  private renderGuardian(graphics: Phaser.GameObjects.Graphics) {
    const guardian = this.runtime.guardian
    const definition = this.stage.guardian
    if (!guardian || !definition || !this.guardianSprite) return
    this.guardianSprite.setVisible(!guardian.defeated)
    if (guardian.defeated) {
      graphics.lineStyle(3, COLORS.red, 0.5)
      graphics.strokeCircle(definition.rift.x, definition.rift.y, 34)
      return
    }
    this.guardianSprite.setPosition(guardian.x, guardian.y)
    const directionFrame = Math.floor(this.runtime.hazardTimeMs / 160) % 4
    this.guardianSprite.setFrame(directionFrame)
    const armed = guardian.firstStrike !== null
    this.guardianSprite.setTint(armed ? COLORS.red : 0xffffff)
    graphics.lineStyle(armed ? 4 : 2, armed ? COLORS.red : COLORS.violet, armed ? 0.95 : 0.55)
    graphics.strokeCircle(guardian.x, guardian.y, armed ? 34 : 29)
    graphics.lineStyle(2, COLORS.red, 0.42)
    graphics.strokeCircle(definition.rift.x, definition.rift.y, 30)
    if (armed && guardian.firstStrike) {
      const remaining = Math.max(0, 1_300 - (this.runtime.hazardTimeMs - guardian.firstStrike.timeMs))
      graphics.fillStyle(COLORS.red, 0.8)
      graphics.fillRect(guardian.x - 32, guardian.y - 48, 64 * (remaining / 1_300), 5)
      graphics.lineStyle(1, COLORS.red, 0.9)
      graphics.strokeRect(guardian.x - 32, guardian.y - 48, 64, 5)
    }
  }

  private renderActorsAndObjects() {
    for (const crate of this.runtime.crates) {
      const sprite = this.crateSprites.get(crate.id)
      if (!sprite) continue
      sprite.setVisible(crate.active)
      sprite.setPosition(crate.x, crate.y)
      if (crate.kind === 'core') {
        sprite.setFrame(Math.floor(this.runtime.hazardTimeMs / 90) % 10)
        sprite.setRotation(Math.atan2(crate.vy, crate.vx))
      }
      sprite.setAlpha(crate.carriedBy === 'echo' ? 0.72 : 1)
    }

    const playerFrame = this.player.moving ? Math.floor(this.player.animationTimeMs / 95) % 4 : 0
    this.playerSprite
      .setTexture(avatarTexture(this.player.facing, playerFrame))
      .setPosition(this.player.x, this.player.y)
      .setAlpha(this.mode === 'escape' ? this.playerSprite.alpha : 1)
      .setTint(this.player.dashRemainingMs > 0 ? 0xffffff : COLORS.cyan)
    this.playerShadow.setPosition(this.player.x, this.player.y + 17)
    this.echoSprite.setVisible(this.echo.visible)
    this.echoShadow.setVisible(this.echo.visible)
    if (this.echo.visible) {
      const echoFrame = this.echo.moving ? Math.floor(this.loopTimeMs / 105) % 4 : 0
      this.echoSprite
        .setTexture(avatarTexture(this.echo.facing, echoFrame))
        .setPosition(this.echo.x, this.echo.y)
        .setAlpha(this.echo.holdingFinalPosition ? 0.58 : 0.74)
      this.echoShadow.setPosition(this.echo.x, this.echo.y + 17)
      if (distanceSquared(this.echo, this.previousEchoPoint) > 2 && Math.floor(this.loopTimeMs / 90) % 2 === 0) {
        this.trails.push({ x: this.echo.x, y: this.echo.y, ageMs: 0, echo: true })
      }
    }
    if (this.player.dashRemainingMs > 0 && distanceSquared(this.player, this.previousPlayerPoint) > 2) {
      this.trails.push({ x: this.player.x, y: this.player.y, ageMs: 0, echo: false })
    }
  }

  private renderHud() {
    const visible = this.mode !== 'language-select' && this.mode !== 'title' && this.mode !== 'chapter-select'
    this.hudChapter.setVisible(visible)
    this.hudObjective.setVisible(visible)
    this.hudTimer.setVisible(visible)
    this.hudLoop.setVisible(visible)
    this.hudHint.setVisible(visible)
    this.hudPrompt.setVisible(this.mode === 'playing')
    this.hudNodes.setVisible(visible)
    this.soundButton.setVisible(visible)
    this.helpButton.setVisible(visible)
    this.fullscreenButton.setVisible(visible)
    this.uiGraphics.clear()
    if (!visible) return

    this.uiGraphics.fillStyle(0x040815, 0.96)
    this.uiGraphics.fillRect(0, 0, 960, 106)
    this.uiGraphics.lineStyle(1, COLORS.cyanDark, 0.45)
    this.uiGraphics.lineBetween(0, 105, 960, 105)
    const stageCopy = this.stageCopy()
    this.hudChapter.setText(`${this.stage.chapter} · ${stageCopy.title}`)
    this.hudObjective.setText(stageCopy.objective)
    const remaining = Math.max(0, LOOP_DURATION_MS - this.loopTimeMs)
    this.hudTimer.setText((remaining / 1000).toFixed(1))
    this.hudTimer.setColor(remaining < 5_000 ? '#ff6177' : COLORS.text)
    this.hudLoop.setText(`${this.ui('hud.loop')} ${this.loopNumber} · ${this.echo.visible ? this.ui('hud.echoLive') : this.ui('hud.recording')} · ${this.ui('hud.binds')} ${this.totalBinds}`)
    this.soundButton.setText(this.audio.isEnabled() ? this.ui('hud.soundOn') : this.ui('hud.soundOff'))
    this.fullscreenButton.setText(this.ui('hud.fullscreen'))

    const occupants = this.plateOccupants()
    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)
    const timelineX = 690
    const timelineY = 72
    const timelineWidth = 220
    this.uiGraphics.fillStyle(0x16233a, 1)
    this.uiGraphics.fillRect(timelineX, timelineY, timelineWidth, 5)
    this.uiGraphics.fillStyle(this.echo.visible ? COLORS.magenta : COLORS.cyan, 0.9)
    this.uiGraphics.fillRect(timelineX, timelineY, timelineWidth * (this.loopTimeMs / LOOP_DURATION_MS), 5)
    for (const frame of this.recording) {
      if (frame.actionMask === 0) continue
      const markerX = timelineX + timelineWidth * (frame.t / LOOP_DURATION_MS)
      const color = (frame.actionMask & ACTION_PULSE) !== 0
        ? COLORS.cyan
        : (frame.actionMask & ACTION_INTERACT) !== 0
          ? COLORS.amber
          : COLORS.violet
      this.uiGraphics.fillStyle(color, 0.9)
      this.uiGraphics.fillRect(markerX - 1, timelineY - 4, 3, 12)
    }

    this.hudNodes.setText(
      evaluation.objectives
        .map((objective) => `${objective.complete ? '◆' : '◇'} ${this.addObjectiveLabel(objective.id)}`)
        .join('    '),
    )

    const tutorial = stageCopy.tutorial[Math.min(this.tutorialStep, stageCopy.tutorial.length - 1)]
    this.hudHint.setText(this.stageMessageMs > 0 ? this.stageMessage : tutorial)
    this.hudHint.setColor(this.stageMessageMs > 0 ? '#ffcf75' : '#a9c7d8')
    this.hudPrompt.setText(this.contextPrompt())
  }

  private addObjectiveLabel(id: string) {
    return stageLabel(this.language, this.stage.id, id)
  }

  private contextPrompt() {
    const occupants = this.plateOccupants()
    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)
    if (evaluation.doorOpen && pointInRadius(this.player, this.stage.exit, 55)) {
      return this.ui('prompt.escape')
    }
    if (this.player.carryingId) return this.ui('prompt.dropThrow')
    const nearby = this.runtime.crates.some(
      (crate) => crate.active && !crate.carriedBy && distanceSquared(crate, this.player) <= 60 * 60,
    )
    if (nearby) return this.ui('prompt.pickup')
    if (this.runtime.guardian && !this.runtime.guardian.defeated && distanceSquared(this.runtime.guardian, this.player) <= 135 * 135) {
      return this.ui('prompt.sentinel')
    }
    return this.stageCopy().hint
  }

  private updateTutorialProgress() {
    if (this.stageIndex === 0) {
      const alpha = this.stage.plates[0]
      if (pointInRadius(this.player, alpha, 38)) this.tutorialStep = Math.max(this.tutorialStep, 1)
      if (this.echo.visible) this.tutorialStep = Math.max(this.tutorialStep, 2)
      return
    }
    if (this.learned.has('carry')) this.tutorialStep = Math.max(this.tutorialStep, 1)
    if (this.learned.has('throw') || this.learned.has('pulse') || this.echo.visible) {
      this.tutorialStep = Math.max(this.tutorialStep, 1)
    }
    if (this.learned.has('redirect') || this.learned.has('dash') || this.lastDoorOpen) {
      this.tutorialStep = Math.max(this.tutorialStep, 2)
    }
  }

  private updateFx(deltaMs: number) {
    for (const burst of this.bursts) burst.ageMs += deltaMs
    this.bursts = this.bursts.filter((burst) => burst.ageMs < burst.durationMs)
    for (const trail of this.trails) trail.ageMs += deltaMs
    this.trails = this.trails.filter((trail) => trail.ageMs < 360)
  }

  private renderFx(graphics: Phaser.GameObjects.Graphics) {
    for (const trail of this.trails) {
      const alpha = Math.max(0, 1 - trail.ageMs / 360) * 0.38
      graphics.fillStyle(trail.echo ? COLORS.magenta : COLORS.cyan, alpha)
      graphics.fillRect(Math.round(trail.x) - 9, Math.round(trail.y) - 12, 18, 24)
    }
    for (const burst of this.bursts) {
      const progress = Math.min(1, burst.ageMs / burst.durationMs)
      const radius = 6 + burst.radius * progress
      graphics.lineStyle(Math.max(1, 5 * (1 - progress)), burst.color, 1 - progress)
      graphics.strokeCircle(burst.x, burst.y, radius)
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + progress * 0.7
        const distance = radius * 0.74
        graphics.fillStyle(burst.color, (1 - progress) * 0.8)
        graphics.fillRect(
          Math.round(burst.x + Math.cos(angle) * distance) - 2,
          Math.round(burst.y + Math.sin(angle) * distance) - 2,
          4,
          4,
        )
      }
    }
  }

  private spawnBurst(point: Point, color: number, radius: number, durationMs: number) {
    this.bursts.push({ ...clonePoint(point), color, radius, durationMs, ageMs: 0 })
  }

  private setMessage(message: string, durationMs: number) {
    this.stageMessage = message
    this.stageMessageMs = durationMs
  }

  private unlockAudio() {
    void this.audio.unlock().catch(() => {
      this.audio.setEnabled(false)
    })
  }

  private toggleFullscreen() {
    if (document.fullscreenElement) {
      const exit = document.exitFullscreen?.()
      if (exit) void exit.catch(() => undefined)
      return
    }
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen()
      return
    }
    this.enterFullscreen()
  }

  private enterFullscreen() {
    if (document.fullscreenElement || this.scale.isFullscreen) return
    const request = document.documentElement.requestFullscreen?.()
    if (request) {
      void request
        .then(() => {
          const lock = screen.orientation?.lock?.('landscape')
          if (lock) void lock.catch(() => undefined)
        })
        .catch(() => undefined)
      return
    }
    try {
      this.scale.startFullscreen()
    } catch {
      // Some mobile browsers expose neither Fullscreen API nor Phaser fallback.
    }
  }

  private formatTime(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  private endingRank() {
    const minutes = this.totalElapsedMs / 60_000
    if (this.deaths === 0 && minutes < 18) return this.ui('rank.perfect')
    if (minutes < 25) return this.ui('rank.clean')
    return this.ui('rank.time')
  }

  private advanceForTest(milliseconds: number) {
    const safe = Math.max(0, Math.min(milliseconds, 120_000))
    if (this.mode === 'playing') {
      let remaining = safe
      while (remaining > 0 && this.mode === 'playing') {
        const chunk = Math.min(250, remaining)
        const fixed = fixedStepsForDelta(this.accumulatorMs, chunk)
        this.accumulatorMs = fixed.remainderMs
        for (let index = 0; index < fixed.steps && this.mode === 'playing'; index += 1) {
          this.simulate(FIXED_STEP_MS)
        }
        remaining -= chunk
      }
    } else if (this.mode === 'escape') {
      this.advanceEscape(safe)
    }
    this.updateFx(Math.min(safe, 2_000))
    this.renderFrame()
  }

  private installDebugHooks() {
    window.render_game_to_text = () => JSON.stringify(this.serializableState())
    window.advanceTime = (milliseconds) => this.advanceForTest(milliseconds)
    if (!import.meta.env.DEV) return
    window.echoHeistDebug = {
      start: () => {
        if (this.mode === 'title') this.startCampaign()
      },
      action: (action) => {
        if (action === 'interact') this.bufferAction(ACTION_INTERACT)
        else if (action === 'pulse') this.bufferAction(ACTION_PULSE)
        else if (action === 'dash') this.bufferAction(ACTION_DASH)
        else if (action === 'bind') this.bindEcho()
        else this.restartStage()
      },
      setStage: (index) => {
        this.loadStage(index, false)
        this.mode = 'playing'
        this.overlayContainer.removeAll(true)
      },
      teleportPlayer: (x, y, facing) => {
        this.player.x = x
        this.player.y = y
        this.player.vx = 0
        this.player.vy = 0
        if (facing) this.player.facing = facing
      },
      teleportEcho: (x, y, facing) => {
        this.echo.visible = true
        this.echo.x = x
        this.echo.y = y
        this.echo.frames = [{ t: 0, x, y, facing: facing ?? 'down', moving: false, actionMask: 0 }]
        this.echo.facing = facing ?? 'down'
      },
      teleportCrate: (id, x, y) => {
        const crate = this.runtime.crates.find((candidate) => candidate.id === id)
        if (!crate) return
        crate.x = x
        crate.y = y
        crate.vx = 0
        crate.vy = 0
        crate.carriedBy = null
        crate.airborne = false
      },
      addLatch: (id) => addLatch(this.runtime, id),
    }
  }

  private serializableState() {
    const occupants = this.plateOccupants()
    const evaluation = evaluateStage(this.stage, occupants, this.runtime.latches)
    return {
      mode: this.mode,
      language: this.language,
      stage: {
        index: this.stageIndex + 1,
        count: STAGES.length,
        id: this.stage.id,
        title: this.stageCopy().title,
      },
      loop: this.loopNumber,
      totalBinds: this.totalBinds,
      remainingMs: Math.max(0, LOOP_DURATION_MS - this.loopTimeMs),
      recordingSamples: this.recording.length,
      restartCount: this.restartCount,
      deaths: this.deaths,
      sound: this.audio.isEnabled(),
      touchControlsVisible: this.touchContainer.visible,
      orientationPaused: this.isPortraitMobile(),
      player: {
        x: Math.round(this.player.x * 10) / 10,
        y: Math.round(this.player.y * 10) / 10,
        facing: this.player.facing,
        moving: this.player.moving,
        dashing: this.player.dashRemainingMs > 0,
        carryingId: this.player.carryingId,
        inExit: pointInRadius(this.player, this.stage.exit, 43),
      },
      echo: {
        visible: this.echo.visible,
        x: Math.round(this.echo.x * 10) / 10,
        y: Math.round(this.echo.y * 10) / 10,
        facing: this.echo.facing,
        moving: this.echo.moving,
        samples: this.echo.frames.length,
        carryingId: this.echo.carryingId,
        holdingFinalPosition: this.echo.holdingFinalPosition,
      },
      plates: this.stage.plates.map((plate) => ({
        id: plate.id,
        occupiedBy: occupants[plate.id],
        latched: this.runtime.latches.includes(plate.id),
      })),
      crates: this.runtime.crates.map((crate) => ({
        id: crate.id,
        kind: crate.kind,
        x: Math.round(crate.x * 10) / 10,
        y: Math.round(crate.y * 10) / 10,
        carriedBy: crate.carriedBy,
        airborne: crate.airborne,
        active: crate.active,
      })),
      guardian: this.runtime.guardian
        ? {
            x: Math.round(this.runtime.guardian.x * 10) / 10,
            y: Math.round(this.runtime.guardian.y * 10) / 10,
            defeated: this.runtime.guardian.defeated,
            feedback: this.runtime.guardian.feedback,
            firstStrikeBy: this.runtime.guardian.firstStrike?.actor ?? null,
          }
        : null,
      lasers: this.stage.lasers.map((laser) => ({
        id: laser.id,
        phase: getLaserPhase(
          laser,
          this.runtime.hazardTimeMs,
          laser.disabledByPlate ? occupants[laser.disabledByPlate] === 'echo' : false,
        ),
      })),
      latches: [...this.runtime.latches],
      door: { open: evaluation.doorOpen },
      objectives: evaluation.objectives,
      stats: {
        elapsedMs: Math.round(this.totalElapsedMs),
        stageElapsedMs: Math.round(this.stageElapsedMs),
        stageTimesMs: [...this.stageTimesMs],
      },
    }
  }

  private shutdownScene() {
    this.input.off('pointerdown', this.handleWorldPointer, this)
    this.input.off('pointerup', this.releaseTouchMove, this)
    this.input.off('pointerupoutside', this.releaseTouchMove, this)
    this.input.off('pointercancel', this.releaseTouchMove, this)
    this.input.keyboard?.off('keydown', this.handleRawKeyDown, this)
    this.audio.dispose()
    delete window.render_game_to_text
    delete window.advanceTime
    delete window.echoHeistDebug
  }
}
