import Phaser from 'phaser'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  LOOP_DURATION_MS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  ROOM,
  SECTORS,
  createFreshRun,
  getSwitchOccupancy,
  isInsideCircle,
  resolvePlayerMovement,
  sampleEcho,
  updateRelayState,
  type EchoFrame,
  type Point,
  type RelayState,
  type SectorDefinition,
  type SwitchOccupancy,
} from '../logic.ts'
import {
  GOTHIC_PALETTE,
  createGothicTextures,
  type GothicFacing,
} from '../gothicArt.ts'

const COLORS = {
  ink: GOTHIC_PALETTE.void,
  panel: GOTHIC_PALETTE.ink,
  wall: GOTHIC_PALETTE.wine,
  cyan: GOTHIC_PALETTE.teal,
  cyanDeep: GOTHIC_PALETTE.tealDeep,
  amber: GOTHIC_PALETTE.ivory,
  coral: GOTHIC_PALETTE.mulberry,
  white: GOTHIC_PALETTE.pale,
  muted: GOTHIC_PALETTE.ash,
} as const

const FONT_DISPLAY = 'Georgia, Times New Roman, serif'
const FONT_TEXT = 'Trebuchet MS, Segoe UI, sans-serif'

type SceneMode = 'tutorial' | 'playing' | 'sector-clear' | 'victory'
type Facing = GothicFacing
type ActorAnimationState =
  | 'idle'
  | 'walk'
  | 'turn'
  | 'echo-replay'
  | 'echo-hold'
  | 'hidden'
type TutorialObject = Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle

const PILGRIM_MOTION = {
  framesPerFacing: 12,
  walkFrames: 6,
  idleStart: 6,
  idleFrames: 3,
  turnStart: 9,
  turnFrames: 2,
  echoHoldFrame: 11,
  walkFrameMs: 92,
  idleFrameMs: 420,
  turnDurationMs: 160,
} as const

const FACING_ROW: Record<Facing, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}
type AmbientVeil = {
  sprite: Phaser.GameObjects.Image
  baseX: number
  baseY: number
  phase: number
  driftX: number
  driftY: number
}
type FxParticle = {
  sprite: Phaser.GameObjects.Sprite
  kind: 'shard' | 'wisp'
  velocityX: number
  velocityY: number
  spin: number
  life: number
  duration: number
  startScale: number
}

export class EchoScene extends Phaser.Scene {
  private sectorIndex = 0
  private sector: SectorDefinition = SECTORS[0]!
  private mode: SceneMode = 'playing'
  private playerPosition: Point = { ...SECTORS[0]!.spawn }
  private ghostPosition: Point | null = null
  private recording: EchoFrame[] = []
  private previousRecording: EchoFrame[] = []
  private switchOccupancy: SwitchOccupancy[] = []
  private relayState: RelayState = { chargeMs: 0, latched: false }
  private loopNumber = 1
  private totalLocks = 0
  private loopElapsed = 0
  private recordAccumulator = 0
  private restartCount = 0
  private interactionQueued = false
  private doorOpen = false
  private playerInGoal = false
  private bannerRemaining = 0
  private lockPulseRemaining = 0
  private lockPulsePosition: Point = { x: 0, y: 0 }
  private doorVisualOpen = 0
  private deterministicTestMode = false
  private playerFacing: Facing = 'down'
  private playerMoving = false
  private playerTurnRemaining = 0
  private playerAnimationState: ActorAnimationState = 'idle'
  private playerAnimationFrame: number = PILGRIM_MOTION.idleStart
  private ghostFacing: Facing = 'down'
  private ghostMoving = false
  private ghostTurnRemaining = 0
  private ghostAnimationState: ActorAnimationState = 'hidden'
  private ghostAnimationFrame: number = PILGRIM_MOTION.idleStart
  private presentationTime = 0
  private footstepAccumulator = 0
  private ghostWispAccumulator = 0
  private relayFxAccumulator = 0
  private fxSequence = 0
  private cameraImpulseRemaining = 0
  private cameraImpulseDuration = 1
  private cameraImpulseStrength = 0
  private memoryFlashRemaining = 0
  private memoryFlashDuration = 1
  private memoryFlashAlpha = 0
  private previousSwitchActive: boolean[] = []
  private lastDoorOpen = false

  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyE!: Phaser.Input.Keyboard.Key
  private keyEnter!: Phaser.Input.Keyboard.Key
  private keySpace!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private keyF!: Phaser.Input.Keyboard.Key
  private keyEsc!: Phaser.Input.Keyboard.Key

  private roomGraphics!: Phaser.GameObjects.Graphics
  private ghostTrail!: Phaser.GameObjects.Graphics
  private threadGraphics!: Phaser.GameObjects.Graphics
  private background!: Phaser.GameObjects.Image
  private headerShade!: Phaser.GameObjects.Rectangle
  private roomVignette!: Phaser.GameObjects.Image
  private foregroundRoots: Phaser.GameObjects.Image[] = []
  private ambientVeils: AmbientVeil[] = []
  private memoryMotes: Phaser.GameObjects.Arc[] = []
  private fxParticles: FxParticle[] = []
  private playerHalo!: Phaser.GameObjects.Ellipse
  private player!: Phaser.GameObjects.Sprite
  private ghost!: Phaser.GameObjects.Sprite
  private ghostAfterimages: Phaser.GameObjects.Sprite[] = []
  private ghostHalo!: Phaser.GameObjects.Arc
  private lockPulse!: Phaser.GameObjects.Arc
  private memoryFlash!: Phaser.GameObjects.Rectangle
  private goalOuter!: Phaser.GameObjects.Arc
  private goalInner!: Phaser.GameObjects.Arc
  private goalPortal!: Phaser.GameObjects.Sprite
  private goalText!: Phaser.GameObjects.Text
  private switchPads: Phaser.GameObjects.Arc[] = []
  private switchCores: Phaser.GameObjects.Sprite[] = []
  private switchTexts: Phaser.GameObjects.Text[] = []
  private doorTopLeaf!: Phaser.GameObjects.Sprite
  private doorBottomLeaf!: Phaser.GameObjects.Sprite
  private doorText!: Phaser.GameObjects.Text
  private relayBack!: Phaser.GameObjects.Rectangle
  private relayFill!: Phaser.GameObjects.Rectangle
  private relayText!: Phaser.GameObjects.Text
  private timerBar!: Phaser.GameObjects.Rectangle
  private timerText!: Phaser.GameObjects.Text
  private loopText!: Phaser.GameObjects.Text
  private sectorText!: Phaser.GameObjects.Text
  private objectiveText!: Phaser.GameObjects.Text
  private recordDot!: Phaser.GameObjects.Arc
  private bannerText!: Phaser.GameObjects.Text
  private overlayShade!: Phaser.GameObjects.Rectangle
  private overlayPanel!: Phaser.GameObjects.Arc
  private overlaySigil!: Phaser.GameObjects.Sprite
  private overlayTitle!: Phaser.GameObjects.Text
  private overlayDetail!: Phaser.GameObjects.Text
  private tutorialPrompt!: Phaser.GameObjects.Text
  private tutorialObjects: TutorialObject[] = []
  private gateVeils: Phaser.GameObjects.Sprite[] = []
  private sectorAssets: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super('echo-heist')
  }

  preload() {
    this.load.image(
      'woven-reliquary',
      '/assets/woven-reliquary/woven-reliquary.png',
    )
    this.load.image(
      'bellroot-ossuary',
      '/assets/woven-reliquary/bellroot-ossuary.png',
    )
    this.load.spritesheet(
      'memory-pilgrim-motion',
      '/assets/woven-reliquary/pilgrim-motion/memory-pilgrim-motion-atlas.png',
      { frameWidth: 256, frameHeight: 256 },
    )
  }

  create() {
    createGothicTextures(this)
    this.createEnvironment()
    this.createEntities()
    this.createHud()
    this.createOverlay()
    this.bindInput()
    this.loadSector(0, true)
    this.showTutorial()

    window.render_game_to_text = () => this.renderGameToText()
    window.advanceTime = (milliseconds: number) =>
      this.advanceForTest(milliseconds)
  }

  update(_time: number, delta: number) {
    if (this.deterministicTestMode) return
    this.simulate(Math.min(delta, 50))
  }

  advanceForTest(milliseconds: number) {
    this.deterministicTestMode = true
    let remaining = Math.max(0, milliseconds)
    while (remaining > 0) {
      const step = Math.min(1000 / 60, remaining)
      this.simulate(step)
      remaining -= step
    }
  }

  private createEnvironment() {
    this.background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'woven-reliquary')
      .setDisplaySize(GAME_WIDTH + 48, GAME_HEIGHT + 30)
      .setAlpha(0.98)
      .setDepth(-8)
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        COLORS.ink,
        0.13,
      )
      .setDepth(-7)
    const veilLayout = [
      { x: 190, y: 186, scale: 1.36, alpha: 0.16, phase: 0.1, dx: 14, dy: 7 },
      { x: 720, y: 210, scale: 1.58, alpha: 0.13, phase: 1.8, dx: -18, dy: 9 },
      { x: 430, y: 455, scale: 1.9, alpha: 0.11, phase: 3.4, dx: 20, dy: -7 },
      { x: 820, y: 492, scale: 1.22, alpha: 0.14, phase: 4.9, dx: -12, dy: -5 },
    ]
    for (const veil of veilLayout) {
      const sprite = this.add
        .image(veil.x, veil.y, 'mist-veil')
        .setScale(veil.scale)
        .setAlpha(veil.alpha)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(-5.5)
      this.ambientVeils.push({
        sprite,
        baseX: veil.x,
        baseY: veil.y,
        phase: veil.phase,
        driftX: veil.dx,
        driftY: veil.dy,
      })
    }
    this.headerShade = this.add
      .rectangle(0, 0, GAME_WIDTH, 118, COLORS.ink, 0.72)
      .setOrigin(0)
      .setDepth(-2)
    this.roomGraphics = this.add.graphics().setDepth(-3)
    this.ghostTrail = this.add.graphics().setDepth(-0.2)
    this.threadGraphics = this.add.graphics().setDepth(-0.08)
    this.roomVignette = this.add
      .image(
        (ROOM.left + ROOM.right) / 2,
        (ROOM.top + ROOM.bottom) / 2,
        'room-vignette',
      )
      .setDepth(-1.8)
      .setAlpha(0.7)

    this.foregroundRoots.push(
      this.add
        .image(34, 578, 'foreground-root-left')
        .setOrigin(0.5, 1)
        .setScale(0.72)
        .setAlpha(0.9)
        .setDepth(12),
      this.add
        .image(926, 578, 'foreground-root-right')
        .setOrigin(0.5, 1)
        .setScale(0.72)
        .setAlpha(0.9)
        .setDepth(12),
    )

    for (let index = 0; index < 22; index += 1) {
      const color =
        index % 6 === 0
          ? COLORS.coral
          : index % 3 === 0
            ? COLORS.amber
            : COLORS.cyan
      this.memoryMotes.push(
        this.add
          .circle(
            ROOM.left + 24 + ((index * 83) % (ROOM.right - ROOM.left - 48)),
            ROOM.top + 18 + ((index * 47) % (ROOM.bottom - ROOM.top - 36)),
            index % 5 === 0 ? 1.8 : 1,
            color,
            0.2,
          )
          .setDepth(-0.7),
      )
    }
  }

  private createEntities() {
    this.goalOuter = this.add
      .circle(0, 0, 55, COLORS.cyanDeep, 0.08)
      .setStrokeStyle(1.5, COLORS.amber, 0.5)
      .setDepth(-0.05)
    this.goalInner = this.add
      .circle(0, 0, 38, COLORS.ink, 0.28)
      .setStrokeStyle(1, COLORS.cyan, 0.42)
      .setDepth(-0.04)
    this.goalPortal = this.add
      .sprite(0, 0, 'thread-well-0')
      .setScale(1.08)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(-0.02)
    this.goalText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '14px',
        fontStyle: 'italic',
        color: '#dce9df',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)

    for (let index = 0; index < 2; index += 1) {
      this.switchPads.push(
        this.add
          .circle(0, 0, 30, COLORS.ink, 0.34)
          .setStrokeStyle(1, COLORS.amber, 0.34)
          .setDepth(-0.06),
      )
      this.switchCores.push(
        this.add
          .sprite(0, 0, 'glyph-shrine-idle')
          .setScale(1.05)
          .setDepth(-0.03),
      )
      this.switchTexts.push(
        this.add
          .text(0, 0, '', {
            fontFamily: FONT_DISPLAY,
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#e7dcc0',
          })
          .setOrigin(0.5)
          .setDepth(2),
      )
    }

    this.doorTopLeaf = this.add
      .sprite(0, 0, 'veil-fold-0')
      .setDepth(1)
    this.doorBottomLeaf = this.add
      .sprite(0, 0, 'veil-fold-1')
      .setDepth(1)
      .setFlipY(true)
    for (let index = 0; index < 5; index += 1) {
      this.gateVeils.push(
        this.add
          .sprite(0, 0, `veil-fold-${index % 2}`)
          .setBlendMode(Phaser.BlendModes.NORMAL)
          .setDepth(0.8),
      )
    }
    this.doorText = this.add
      .text(0, 0, 'Veiled', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#c5adba',
      })
      .setOrigin(0.5)
      .setDepth(2)

    this.relayBack = this.add
      .rectangle(0, 0, 230, 2, COLORS.amber, 0.14)
    this.relayFill = this.add
      .rectangle(0, 0, 0, 2, COLORS.amber, 0.82)
      .setOrigin(0, 0.5)
    this.relayText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#b6aaa0',
      })
      .setOrigin(0.5)

    this.ghostHalo = this.add
      .circle(0, 0, PLAYER_RADIUS + 11, COLORS.cyan, 0.1)
      .setStrokeStyle(1.5, COLORS.cyan, 0.42)
      .setDepth(0.2)
    for (let index = 0; index < 2; index += 1) {
      this.ghostAfterimages.push(
        this.add
          .sprite(0, 0, 'memory-pilgrim-motion', PILGRIM_MOTION.idleStart)
          .setDisplaySize(132 - index * 8, 132 - index * 8)
          .setTint(COLORS.cyan)
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setAlpha(0)
          .setVisible(false)
          .setDepth(0.38 - index * 0.03),
      )
    }
    this.ghost = this.add
      .sprite(0, 0, 'memory-pilgrim-motion', PILGRIM_MOTION.idleStart)
      .setDisplaySize(132, 132)
      .setTint(COLORS.cyan)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(0.5)

    this.playerHalo = this.add
      .ellipse(0, 0, 42, 18, COLORS.ink, 0.38)
      .setStrokeStyle(1, COLORS.amber, 0.18)
      .setDepth(0.15)
    this.player = this.add
      .sprite(0, 0, 'memory-pilgrim-motion', PILGRIM_MOTION.idleStart)
      .setDisplaySize(140, 140)
      .setDepth(0.55)

    this.lockPulse = this.add
      .circle(0, 0, 20, COLORS.cyan, 0)
      .setStrokeStyle(1.5, COLORS.cyan, 0)
      .setDepth(7)
    this.memoryFlash = this.add
      .rectangle(
        GAME_WIDTH / 2,
        (ROOM.top + ROOM.bottom) / 2,
        GAME_WIDTH,
        ROOM.bottom - ROOM.top,
        COLORS.white,
        0,
      )
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD)

    for (let index = 0; index < 56; index += 1) {
      this.fxParticles.push({
        sprite: this.add
          .sprite(0, 0, `silk-petal-${index % 3}`)
          .setVisible(false)
          .setDepth(9)
          .setBlendMode(Phaser.BlendModes.ADD),
        kind: 'shard',
        velocityX: 0,
        velocityY: 0,
        spin: 0,
        life: 0,
        duration: 1,
        startScale: 1,
      })
    }
  }

  private createHud() {
    this.add
      .text(42, 18, 'E C H O   H E I S T', {
        fontFamily: FONT_DISPLAY,
        fontSize: '22px',
        color: '#eee4cd',
      })
      .setLetterSpacing(1.5)
    this.sectorText = this.add
      .text(43, 55, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#b4a9a0',
      })
      .setLetterSpacing(0.7)

    this.recordDot = this.add.circle(413, 35, 2.5, COLORS.coral, 0.9)
    this.loopText = this.add
      .text(425, 27, 'First weaving', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#c8a8b8',
      })
      .setLetterSpacing(0.5)

    this.timerText = this.add
      .text(916, 15, '20.0', {
        fontFamily: FONT_DISPLAY,
        fontSize: '28px',
        color: '#dce9df',
      })
      .setOrigin(1, 0)
    this.timerBar = this.add
      .rectangle(916, 58, 144, 1.5, COLORS.cyan, 0.72)
      .setOrigin(1, 0.5)

    this.objectiveText = this.add
      .text(GAME_WIDTH / 2, 94, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#e7dcc0',
      })
      .setOrigin(0.5)
      .setLetterSpacing(0.35)

    this.add
      .text(
        914,
        585,
        'WASD  move     SPACE  bind echo     E  enter     R  restart     F  fullscreen',
        {
          fontFamily: FONT_TEXT,
          fontSize: '10px',
          color: '#8f8b84',
        },
      )
      .setOrigin(1, 0.5)

    this.bannerText = this.add
      .text(GAME_WIDTH / 2, 154, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '22px',
        fontStyle: 'italic',
        color: '#f2e8d0',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setLetterSpacing(1.4)
  }

  private createOverlay() {
    this.overlayShade = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        COLORS.ink,
        0.84,
      )
      .setDepth(30)
    this.overlaySigil = this.add
      .sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 78, 'thread-well-0')
      .setScale(2.2)
      .setAlpha(0.17)
      .setTint(COLORS.cyan)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(31)
    this.overlayPanel = this.add
      .circle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, 164, COLORS.ink, 0.22)
      .setStrokeStyle(1, COLORS.amber, 0.18)
      .setDepth(31)
    this.overlayTitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '32px',
        fontStyle: 'italic',
        color: '#eee4cd',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(1.8)
    this.overlayDetail = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 112, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#cbc2af',
        align: 'center',
        lineSpacing: 11,
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(0.5)

    const tutorialKicker = this.add
      .text(GAME_WIDTH / 2, 72, 'FIRST WEAVING  ·  A MEMORY RITE', {
        fontFamily: FONT_TEXT,
        fontSize: '10px',
        color: '#a8bdb5',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(2.2)
    const tutorialTitle = this.add
      .text(GAME_WIDTH / 2, 238, 'How the thread remembers', {
        fontFamily: FONT_DISPLAY,
        fontSize: '34px',
        fontStyle: 'italic',
        color: '#f1e7cf',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(1.2)
    const tutorialPromise = this.add
      .text(
        GAME_WIDTH / 2,
        282,
        'Your path becomes a companion. Cut it at the moment you choose.',
        {
          fontFamily: FONT_DISPLAY,
          fontSize: '13px',
          fontStyle: 'italic',
          color: '#c9c1b0',
        },
      )
      .setOrigin(0.5)
      .setDepth(32)

    const tutorialRuleLeft = this.add
      .rectangle(116, 316, 286, 1, COLORS.amber, 0.2)
      .setOrigin(0, 0.5)
      .setDepth(32)
    const tutorialRuleRight = this.add
      .rectangle(558, 316, 286, 1, COLORS.amber, 0.2)
      .setOrigin(0, 0.5)
      .setDepth(32)
    const tutorialSteps: TutorialObject[] = []
    const steps = [
      {
        x: 244,
        heading: 'I  ·  MOVE',
        detail: 'WASD\nEvery step is remembered.',
      },
      {
        x: 480,
        heading: 'II  ·  BIND',
        detail: 'SPACE\nCut the route. Return to start.',
      },
      {
        x: 716,
        heading: 'III  ·  WEAVE',
        detail: 'ECHO\nIt repeats, then holds.',
      },
    ]
    for (const step of steps) {
      tutorialSteps.push(
        this.add
          .text(step.x, 342, step.heading, {
            fontFamily: FONT_TEXT,
            fontSize: '11px',
            color: '#b9d0c6',
          })
          .setOrigin(0.5)
          .setDepth(32)
          .setLetterSpacing(1.4),
        this.add
          .text(step.x, 378, step.detail, {
            fontFamily: FONT_DISPLAY,
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#e0d6c0',
            align: 'center',
            lineSpacing: 7,
          })
          .setOrigin(0.5)
          .setDepth(32),
      )
    }

    const tutorialGoal = this.add
      .text(
        GAME_WIDTH / 2,
        444,
        'Leave the echo on a glyph  ·  cross the parted veil  ·  press E at the well',
        {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          fontStyle: 'italic',
          color: '#c8c0ad',
        },
      )
      .setOrigin(0.5)
      .setDepth(32)
    this.tutorialPrompt = this.add
      .text(GAME_WIDTH / 2, 500, 'E / ENTER / CLICK  ·  BEGIN THE WEAVING', {
        fontFamily: FONT_TEXT,
        fontSize: '14px',
        color: '#e8dfca',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(1.3)
    const tutorialUtility = this.add
      .text(
        GAME_WIDTH / 2,
        558,
        'R  restart     F  fullscreen     ESC  leave fullscreen',
        {
          fontFamily: FONT_TEXT,
          fontSize: '9px',
          color: '#858781',
        },
      )
      .setOrigin(0.5)
      .setDepth(32)
      .setLetterSpacing(0.6)

    this.tutorialObjects = [
      tutorialKicker,
      tutorialTitle,
      tutorialPromise,
      tutorialRuleLeft,
      tutorialRuleRight,
      ...tutorialSteps,
      tutorialGoal,
      this.tutorialPrompt,
      tutorialUtility,
    ]
    this.setOverlayVisible(false)
  }

  private bindInput() {
    this.input.on('pointerdown', () => {
      if (this.mode === 'tutorial') this.dismissTutorial()
    })

    const keyboard = this.input.keyboard
    if (!keyboard) return
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.keyEnter = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.keyF = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this.keyE.on('down', () => {
      if (this.mode === 'tutorial') this.dismissTutorial()
      else if (this.mode === 'sector-clear') this.loadSector(this.sectorIndex + 1)
      else if (this.mode === 'victory') this.loadSector(0, true)
      else this.interactionQueued = true
    })
    this.keyEnter.on('down', () => {
      if (this.mode === 'tutorial') this.dismissTutorial()
    })
    this.keySpace.on('down', () => {
      if (this.mode === 'playing' && this.loopElapsed >= 100) {
        this.commitLoop('manual')
      }
    })
    this.keyR.on('down', () => {
      if (this.mode === 'tutorial') return
      this.restartCount += 1
      this.loadSector(this.sectorIndex, this.sectorIndex === 0)
    })
    this.keyF.on('down', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
      else this.scale.startFullscreen()
    })
    this.keyEsc.on('down', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
    })
  }

  private simulate(delta: number) {
    this.bannerRemaining = Math.max(0, this.bannerRemaining - delta)
    this.lockPulseRemaining = Math.max(0, this.lockPulseRemaining - delta)
    this.playerTurnRemaining = Math.max(0, this.playerTurnRemaining - delta)
    this.ghostTurnRemaining = Math.max(0, this.ghostTurnRemaining - delta)

    if (this.mode !== 'playing') {
      this.updatePresentation(delta)
      return
    }

    let horizontal = 0
    let vertical = 0
    if (this.keyA?.isDown) horizontal -= 1
    if (this.keyD?.isDown) horizontal += 1
    if (this.keyW?.isDown) vertical -= 1
    if (this.keyS?.isDown) vertical += 1
    if (horizontal !== 0 && vertical !== 0) {
      horizontal *= Math.SQRT1_2
      vertical *= Math.SQRT1_2
    }
    let requestedPlayerFacing = this.playerFacing
    if (Math.abs(vertical) > Math.abs(horizontal)) {
      requestedPlayerFacing = vertical < 0 ? 'up' : 'down'
    } else if (horizontal !== 0) {
      requestedPlayerFacing = horizontal < 0 ? 'left' : 'right'
    }
    if (requestedPlayerFacing !== this.playerFacing) {
      this.playerFacing = requestedPlayerFacing
      this.playerTurnRemaining = PILGRIM_MOTION.turnDurationMs
    }

    const seconds = delta / 1000
    const previousPlayerPosition = { ...this.playerPosition }
    this.playerPosition = resolvePlayerMovement(
      this.playerPosition,
      {
        x: horizontal * PLAYER_SPEED * seconds,
        y: vertical * PLAYER_SPEED * seconds,
      },
      this.doorOpen,
      this.sector,
    )
    const travelDistance = Phaser.Math.Distance.Between(
      previousPlayerPosition.x,
      previousPlayerPosition.y,
      this.playerPosition.x,
      this.playerPosition.y,
    )
    // Animation follows resolved travel, not requested input. A pilgrim pressing
    // into stone therefore settles instead of running in place.
    this.playerMoving = travelDistance > 0.05
    if (travelDistance > 0.05) {
      this.footstepAccumulator += delta
      while (this.footstepAccumulator >= 82) {
        this.footstepAccumulator -= 82
        this.emitWisp(
          this.playerPosition.x - horizontal * 10,
          this.playerPosition.y - vertical * 10 + 9,
          COLORS.amber,
        )
      }
    } else {
      this.footstepAccumulator = Math.min(this.footstepAccumulator, 82)
    }

    this.loopElapsed += delta
    this.recordAccumulator += delta
    const previousGhost = this.ghostPosition
    const echo = sampleEcho(this.previousRecording, this.loopElapsed)
    this.ghostPosition = echo ? { x: echo.x, y: echo.y } : null
    if (previousGhost && this.ghostPosition) {
      const ghostDx = this.ghostPosition.x - previousGhost.x
      const ghostDy = this.ghostPosition.y - previousGhost.y
      this.ghostMoving = Math.abs(ghostDx) + Math.abs(ghostDy) > 0.05
      let requestedGhostFacing = this.ghostFacing
      if (Math.abs(ghostDy) > Math.abs(ghostDx)) {
        requestedGhostFacing = ghostDy < 0 ? 'up' : 'down'
      } else if (Math.abs(ghostDx) > 0.05) {
        requestedGhostFacing = ghostDx < 0 ? 'left' : 'right'
      }
      if (requestedGhostFacing !== this.ghostFacing) {
        this.ghostFacing = requestedGhostFacing
        this.ghostTurnRemaining = PILGRIM_MOTION.turnDurationMs
      }
      if (this.ghostMoving) {
        this.ghostWispAccumulator += delta
        while (this.ghostWispAccumulator >= 116) {
          this.ghostWispAccumulator -= 116
          this.emitWisp(
            this.ghostPosition.x - ghostDx * 0.9,
            this.ghostPosition.y - ghostDy * 0.9 + 8,
            COLORS.cyan,
          )
        }
      }
    } else {
      this.ghostMoving = false
      this.ghostWispAccumulator = 0
    }
    this.switchOccupancy = getSwitchOccupancy(
      this.sector.switches,
      this.playerPosition,
      this.ghostPosition,
    )
    for (let index = 0; index < this.switchOccupancy.length; index += 1) {
      const occupancy = this.switchOccupancy[index]!
      if (occupancy.active && !this.previousSwitchActive[index]) {
        const zone = this.sector.switches[index]!
        this.emitBurst(zone.x, zone.y, COLORS.cyan, 9, 52)
      }
    }
    this.previousSwitchActive = this.switchOccupancy.map((item) => item.active)

    const allActive = this.switchOccupancy.every((item) => item.active)
    if (this.sector.relayRequiredMs > 0) {
      this.relayState = updateRelayState(
        this.relayState,
        delta,
        allActive,
        this.sector.relayRequiredMs,
      )
      this.doorOpen = this.relayState.latched
      if (allActive && !this.relayState.latched) {
        this.relayFxAccumulator += delta
        while (this.relayFxAccumulator >= 125) {
          this.relayFxAccumulator -= 125
          const alpha = this.sector.switches[0]!
          const beta = this.sector.switches[1]!
          const progress =
            this.sector.relayRequiredMs > 0
              ? this.relayState.chargeMs / this.sector.relayRequiredMs
              : 0
          this.emitWisp(
            Phaser.Math.Linear(alpha.x, beta.x, progress),
            Phaser.Math.Linear(alpha.y, beta.y, progress),
            COLORS.amber,
          )
        }
      } else {
        this.relayFxAccumulator = 0
      }
    } else {
      this.doorOpen = this.switchOccupancy.some((item) => item.active)
    }
    if (this.doorOpen && !this.lastDoorOpen) {
      const doorCenterY = (this.sector.door.doorTop + this.sector.door.doorBottom) / 2
      this.emitBurst(
        this.sector.door.x + this.sector.door.width / 2,
        doorCenterY,
        COLORS.cyan,
        this.relayState.latched ? 22 : 14,
        this.relayState.latched ? 108 : 76,
      )
      this.triggerCameraImpulse(
        this.relayState.latched ? 420 : 220,
        this.relayState.latched ? 4.2 : 2.1,
      )
      this.triggerMemoryFlash(
        COLORS.cyan,
        this.relayState.latched ? 360 : 220,
        this.relayState.latched ? 0.19 : 0.11,
      )
    }
    this.lastDoorOpen = this.doorOpen

    this.playerInGoal = isInsideCircle(
      this.playerPosition,
      this.sector.goal,
      -PLAYER_RADIUS / 2,
    )
    if (this.interactionQueued && this.playerInGoal) {
      this.completeSector()
      this.interactionQueued = false
      this.updatePresentation(delta)
      return
    }

    while (this.recordAccumulator >= 50) {
      this.recordAccumulator -= 50
      this.recording.push({
        time: Math.min(this.loopElapsed, LOOP_DURATION_MS),
        x: this.playerPosition.x,
        y: this.playerPosition.y,
        interacting: this.keyE?.isDown ?? false,
      })
    }
    this.interactionQueued = false

    if (this.loopElapsed >= LOOP_DURATION_MS) this.commitLoop('automatic')
    this.updatePresentation(delta)
  }

  private commitLoop(trigger: 'manual' | 'automatic') {
    if (this.mode !== 'playing') return
    const finalTime = Math.min(this.loopElapsed, LOOP_DURATION_MS)
    this.recording.push({
      time: finalTime,
      x: this.playerPosition.x,
      y: this.playerPosition.y,
      interacting: this.keyE?.isDown ?? false,
    })
    this.previousRecording = this.recording.map((frame) => ({ ...frame }))
    this.lockPulsePosition = { ...this.playerPosition }
    this.lockPulseRemaining = 560
    this.emitBurst(
      this.lockPulsePosition.x,
      this.lockPulsePosition.y,
      COLORS.cyan,
      20,
      94,
    )
    this.triggerCameraImpulse(320, 3.4)
    this.triggerMemoryFlash(COLORS.cyan, 260, 0.16)
    this.totalLocks += 1
    this.loopNumber += 1
    this.loopElapsed = 0
    this.recordAccumulator = 0
    this.playerPosition = { ...this.sector.spawn }
    this.ghostPosition = { ...this.sector.spawn }
    this.recording = [
      {
        time: 0,
        x: this.sector.spawn.x,
        y: this.sector.spawn.y,
        interacting: false,
      },
    ]
    this.switchOccupancy = getSwitchOccupancy(
      this.sector.switches,
      this.playerPosition,
      this.ghostPosition,
    )
    if (!this.relayState.latched) this.relayState.chargeMs = 0
    this.doorOpen = this.relayState.latched
    this.playerInGoal = false
    this.playerFacing = 'down'
    this.playerMoving = false
    this.playerTurnRemaining = 0
    this.playerAnimationState = 'idle'
    this.playerAnimationFrame = PILGRIM_MOTION.idleStart
    this.ghostFacing = 'down'
    this.ghostMoving = false
    this.ghostTurnRemaining = 0
    this.ghostAnimationState = 'echo-replay'
    this.ghostAnimationFrame = PILGRIM_MOTION.idleStart
    this.bannerRemaining = 1350
    this.bannerText.setText(
      trigger === 'manual'
        ? `The echo remembers · weaving ${this.loopNumber}`
        : `The thread turns · weaving ${this.loopNumber}`,
    )
    this.drawGhostTrail()
    this.updatePresentation(0)
  }

  private completeSector() {
    this.emitBurst(
      this.sector.goal.x,
      this.sector.goal.y,
      this.sectorIndex < SECTORS.length - 1 ? COLORS.amber : COLORS.cyan,
      30,
      128,
    )
    this.triggerCameraImpulse(520, 4.8)
    this.triggerMemoryFlash(COLORS.white, 520, 0.28)
    if (this.sectorIndex < SECTORS.length - 1) {
      this.mode = 'sector-clear'
      this.overlayTitle.setText('The first veil parts')
      this.overlayDetail.setText(
        `The shrine remembers after ${this.loopNumber} weavings.\n\nPress E to descend into the Bellroot Ossuary`,
      )
    } else {
      this.mode = 'victory'
      this.overlayTitle.setText('The memory holds')
      this.overlayDetail.setText(
        `${this.totalLocks} echoes bound\nTwo forgotten threads are joined again.\n\nPress E to begin another weaving`,
      )
    }
    this.setOverlayVisible(true)
  }

  private loadSector(index: number, resetRun = false) {
    this.sectorIndex = Math.max(0, Math.min(SECTORS.length - 1, index))
    this.sector = SECTORS[this.sectorIndex]!
    if (resetRun) this.totalLocks = 0
    const fresh = createFreshRun(this.sector.spawn)
    this.mode = 'playing'
    this.loopNumber = fresh.loop
    this.loopElapsed = fresh.elapsed
    this.playerPosition = fresh.player
    this.recording = fresh.recording
    this.previousRecording = fresh.previous
    this.ghostPosition = null
    this.recordAccumulator = 0
    this.interactionQueued = false
    this.relayState = { chargeMs: 0, latched: false }
    this.doorOpen = false
    this.doorVisualOpen = 0
    this.playerInGoal = false
    this.playerFacing = 'down'
    this.playerMoving = false
    this.playerTurnRemaining = 0
    this.playerAnimationState = 'idle'
    this.playerAnimationFrame = PILGRIM_MOTION.idleStart
    this.ghostFacing = 'down'
    this.ghostMoving = false
    this.ghostTurnRemaining = 0
    this.ghostAnimationState = 'hidden'
    this.ghostAnimationFrame = PILGRIM_MOTION.idleStart
    this.footstepAccumulator = 0
    this.ghostWispAccumulator = 0
    this.relayFxAccumulator = 0
    this.lastDoorOpen = false
    this.cameraImpulseRemaining = 0
    this.cameras.main.setScroll(0, 0)
    this.memoryFlashRemaining = 0
    this.memoryFlash.setAlpha(0)
    for (const particle of this.fxParticles) {
      particle.life = 0
      particle.sprite.setVisible(false)
    }
    this.switchOccupancy = getSwitchOccupancy(
      this.sector.switches,
      this.playerPosition,
      null,
    )
    this.previousSwitchActive = this.switchOccupancy.map(() => false)
    this.bannerRemaining = 1650
    this.bannerText.setText(
      this.sectorIndex === 0 ? 'The Woven Reliquary' : 'The Bellroot Ossuary',
    )
    this.setOverlayVisible(false)
    this.ghostTrail.clear()
    this.background.setTexture(
      this.sectorIndex === 0
        ? 'woven-reliquary'
        : 'bellroot-ossuary',
    )
    this.drawSector()
    this.updatePresentation(0)
  }

  private drawSector() {
    const { door } = this.sector
    for (const asset of this.sectorAssets) asset.destroy()
    this.sectorAssets = []
    this.roomGraphics.clear()
    this.roomGraphics.lineStyle(1, COLORS.amber, 0.16)
    this.roomGraphics.lineBetween(ROOM.left + 70, ROOM.top, ROOM.right - 70, ROOM.top)
    this.roomGraphics.lineStyle(1, COLORS.cyan, 0.1)
    this.roomGraphics.lineBetween(
      ROOM.left + 110,
      ROOM.bottom,
      ROOM.right - 110,
      ROOM.bottom,
    )

    const doorCenterX = door.x + door.width / 2
    const topSpan = door.doorTop - ROOM.top
    const bottomSpan = ROOM.bottom - door.doorBottom
    this.sectorAssets.push(
      this.add
        .sprite(doorCenterX, ROOM.top + topSpan / 2, 'gate-spine')
        .setDisplaySize(58, topSpan + 20)
        .setDepth(-0.3),
      this.add
        .sprite(doorCenterX, door.doorBottom + bottomSpan / 2, 'gate-spine')
        .setDisplaySize(58, bottomSpan + 22)
        .setFlipY(true)
        .setDepth(-0.3),
      this.add
        .sprite(doorCenterX, door.doorTop, 'gate-threshold')
        .setDisplaySize(88, 40)
        .setDepth(-0.22),
      this.add
        .sprite(doorCenterX, door.doorBottom, 'gate-threshold')
        .setDisplaySize(88, 40)
        .setFlipY(true)
        .setDepth(-0.22),
    )

    for (let index = 0; index < this.sector.obstacles.length; index += 1) {
      const obstacle = this.sector.obstacles[index]!
      this.sectorAssets.push(
        this.add
          .sprite(
            obstacle.x + obstacle.width / 2,
            obstacle.y + obstacle.height / 2,
            `reliquary-stone-${index % 3}`,
          )
          .setDisplaySize(obstacle.width + 12, obstacle.height + 12)
          .setAlpha(0.96)
          .setDepth(-0.3),
      )
    }

    for (const y of [door.doorTop - 38, door.doorBottom + 38]) {
      this.sectorAssets.push(
        this.add
          .sprite(doorCenterX, y, 'glyph-shrine-idle')
          .setScale(0.42)
          .setAlpha(0.62)
          .setDepth(-0.2),
      )
    }
  }

  private drawGhostTrail() {
    this.ghostTrail.clear()
    if (this.previousRecording.length < 2) return
    const drawThread = (width: number, color: number, alpha: number) => {
      this.ghostTrail.lineStyle(width, color, alpha)
      this.ghostTrail.beginPath()
      this.ghostTrail.moveTo(
        this.previousRecording[0]!.x,
        this.previousRecording[0]!.y,
      )
      for (let index = 4; index < this.previousRecording.length; index += 4) {
        const frame = this.previousRecording[index]!
        this.ghostTrail.lineTo(frame.x, frame.y)
      }
      const finalFrame = this.previousRecording.at(-1)!
      this.ghostTrail.lineTo(finalFrame.x, finalFrame.y)
      this.ghostTrail.strokePath()
    }
    drawThread(7, COLORS.cyan, 0.08)
    drawThread(1.2, COLORS.cyan, 0.5)
    const last = this.previousRecording.at(-1)!
    this.ghostTrail.fillStyle(COLORS.amber, 0.44)
    for (let index = 10; index < this.previousRecording.length; index += 14) {
      const frame = this.previousRecording[index]!
      this.ghostTrail.fillCircle(frame.x, frame.y, 1.4)
    }
    this.ghostTrail.lineStyle(1.5, COLORS.cyan, 0.72)
    this.ghostTrail.strokeCircle(last.x, last.y, 9)
    this.ghostTrail.lineStyle(1, COLORS.amber, 0.48)
    this.ghostTrail.strokeCircle(last.x, last.y, 13)
  }

  private emitBurst(
    x: number,
    y: number,
    color: number,
    count: number,
    power: number,
  ) {
    for (let index = 0; index < count; index += 1) {
      const particle = this.fxParticles.find((candidate) => candidate.life <= 0)
      if (!particle) return
      const sequence = this.fxSequence
      this.fxSequence += 1
      const angle = sequence * 2.399963229728653
      const variation = ((sequence * 37) % 101) / 100
      const speed = power * (0.48 + variation * 0.62)
      const duration = 360 + ((sequence * 53) % 280)
      particle.kind = 'shard'
      particle.velocityX = Math.cos(angle) * speed
      particle.velocityY = Math.sin(angle) * speed
      particle.spin = (sequence % 2 === 0 ? 1 : -1) * (90 + variation * 210)
      particle.life = duration
      particle.duration = duration
      particle.startScale = 0.62 + variation * 0.58
      particle.sprite
        .setTexture(`silk-petal-${sequence % 3}`)
        .setPosition(x, y)
        .setScale(particle.startScale)
        .setAngle((angle * 180) / Math.PI)
        .setTint(color)
        .setAlpha(0.95)
        .setVisible(true)
    }
  }

  private emitWisp(x: number, y: number, color: number) {
    const particle = this.fxParticles.find((candidate) => candidate.life <= 0)
    if (!particle) return
    const sequence = this.fxSequence
    this.fxSequence += 1
    const variation = ((sequence * 41) % 97) / 96
    const duration = 430 + ((sequence * 29) % 240)
    particle.kind = 'wisp'
    particle.velocityX = (variation - 0.5) * 18
    particle.velocityY = -18 - variation * 22
    particle.spin = (variation - 0.5) * 80
    particle.life = duration
    particle.duration = duration
    particle.startScale = 0.72 + variation * 0.32
    particle.sprite
      .setTexture(`memory-wisp-${sequence % 6}`)
      .setPosition(x, y)
      .setScale(particle.startScale)
      .setAngle((variation - 0.5) * 24)
      .setTint(color)
      .setAlpha(0.72)
      .setVisible(true)
  }

  private triggerCameraImpulse(duration: number, strength: number) {
    if (strength < this.cameraImpulseStrength && this.cameraImpulseRemaining > 0) {
      return
    }
    this.cameraImpulseDuration = duration
    this.cameraImpulseRemaining = duration
    this.cameraImpulseStrength = strength
  }

  private triggerMemoryFlash(color: number, duration: number, alpha: number) {
    this.memoryFlashDuration = duration
    this.memoryFlashRemaining = duration
    this.memoryFlashAlpha = alpha
    this.memoryFlash.setFillStyle(color, 1)
  }

  private updateVisualEffects(delta: number) {
    const seconds = delta / 1000
    for (const particle of this.fxParticles) {
      if (particle.life <= 0) continue
      particle.life = Math.max(0, particle.life - delta)
      const progress = 1 - particle.life / particle.duration
      const drag = particle.kind === 'wisp' ? 0.985 : 0.972
      particle.velocityX *= Math.pow(drag, delta / (1000 / 60))
      particle.velocityY *= Math.pow(drag, delta / (1000 / 60))
      particle.sprite
        .setPosition(
          particle.sprite.x + particle.velocityX * seconds,
          particle.sprite.y + particle.velocityY * seconds,
        )
        .setAngle(particle.sprite.angle + particle.spin * seconds)
        .setScale(
          particle.kind === 'wisp'
            ? particle.startScale * (0.92 + progress * 0.46)
            : particle.startScale * (1 - progress * 0.38),
        )
        .setAlpha(
          (particle.kind === 'wisp' ? 0.64 : 0.92) *
            Math.sin(Math.max(0, Math.min(1, 1 - progress)) * Math.PI * 0.5),
        )
      if (particle.life <= 0) particle.sprite.setVisible(false)
    }

    if (this.memoryFlashRemaining > 0) {
      this.memoryFlashRemaining = Math.max(0, this.memoryFlashRemaining - delta)
      const ratio = this.memoryFlashRemaining / this.memoryFlashDuration
      this.memoryFlash.setAlpha(this.memoryFlashAlpha * ratio * ratio)
    } else {
      this.memoryFlash.setAlpha(0)
    }

    if (this.cameraImpulseRemaining > 0) {
      this.cameraImpulseRemaining = Math.max(0, this.cameraImpulseRemaining - delta)
      const ratio = this.cameraImpulseRemaining / this.cameraImpulseDuration
      const phase = this.presentationTime * 0.105
      this.cameras.main.setScroll(
        Math.sin(phase) * this.cameraImpulseStrength * ratio,
        Math.cos(phase * 1.37) * this.cameraImpulseStrength * ratio,
      )
    } else {
      this.cameraImpulseStrength = 0
      this.cameras.main.setScroll(0, 0)
    }
  }

  private pilgrimFrame(
    facing: Facing,
    state: ActorAnimationState,
    turnRemaining: number,
    clock = this.presentationTime,
  ) {
    const rowStart = FACING_ROW[facing] * PILGRIM_MOTION.framesPerFacing
    if (state === 'walk' || state === 'echo-replay') {
      return (
        rowStart +
        (Math.floor(clock / PILGRIM_MOTION.walkFrameMs) %
          PILGRIM_MOTION.walkFrames)
      )
    }
    if (state === 'turn') {
      const progress = Phaser.Math.Clamp(
        1 - turnRemaining / PILGRIM_MOTION.turnDurationMs,
        0,
        0.999,
      )
      return (
        rowStart +
        PILGRIM_MOTION.turnStart +
        Math.floor(progress * PILGRIM_MOTION.turnFrames)
      )
    }
    if (state === 'echo-hold') {
      return rowStart + PILGRIM_MOTION.echoHoldFrame
    }
    return (
      rowStart +
      PILGRIM_MOTION.idleStart +
      (Math.floor(clock / PILGRIM_MOTION.idleFrameMs) %
        PILGRIM_MOTION.idleFrames)
    )
  }

  private updatePresentation(delta: number) {
    this.presentationTime += delta
    this.updateVisualEffects(delta)
    const { door, goal, switches } = this.sector
    const pulse = 0.5 + 0.5 * Math.sin(this.presentationTime / 180)
    const parallaxX =
      (GAME_WIDTH / 2 - this.playerPosition.x) * 0.016 +
      Math.sin(this.presentationTime / 3700) * 2.2
    const parallaxY =
      ((ROOM.top + ROOM.bottom) / 2 - this.playerPosition.y) * 0.011 +
      Math.cos(this.presentationTime / 4100) * 1.7
    this.background.setPosition(
      GAME_WIDTH / 2 + parallaxX,
      GAME_HEIGHT / 2 + parallaxY,
    )
    this.background.setAlpha(0.95 + pulse * 0.025)
    this.headerShade.setAlpha(0.68 + pulse * 0.04)
    this.roomVignette.setAlpha(0.66 + pulse * 0.07)
    for (const veil of this.ambientVeils) {
      veil.sprite
        .setPosition(
          veil.baseX +
            Math.sin(this.presentationTime / 2800 + veil.phase) * veil.driftX -
            parallaxX * 0.35,
          veil.baseY +
            Math.cos(this.presentationTime / 3400 + veil.phase) * veil.driftY -
            parallaxY * 0.28,
        )
        .setAlpha(0.075 + pulse * 0.095)
        .setRotation(Math.sin(this.presentationTime / 5200 + veil.phase) * 0.018)
    }
    this.foregroundRoots[0]
      ?.setPosition(
        34 - parallaxX * 0.72,
        580 - parallaxY * 0.45 + Math.sin(this.presentationTime / 3100) * 2,
      )
      .setRotation(Math.sin(this.presentationTime / 4600) * 0.006)
    this.foregroundRoots[1]
      ?.setPosition(
        926 - parallaxX * 0.72,
        580 - parallaxY * 0.45 + Math.cos(this.presentationTime / 3300) * 2,
      )
      .setRotation(Math.cos(this.presentationTime / 4900) * 0.006)
    for (let index = 0; index < this.memoryMotes.length; index += 1) {
      const mote = this.memoryMotes[index]!
      const baseX =
        ROOM.left + 24 + ((index * 83) % (ROOM.right - ROOM.left - 48))
      const baseY =
        ROOM.top + 18 + ((index * 47) % (ROOM.bottom - ROOM.top - 36))
      mote
        .setPosition(
          baseX + Math.sin(this.presentationTime / 940 + index * 1.7) * 7,
          baseY + Math.cos(this.presentationTime / 1180 + index * 0.9) * 5,
        )
        .setAlpha(0.1 + pulse * 0.22)
    }

    this.playerAnimationState =
      this.playerTurnRemaining > 0
        ? 'turn'
        : this.playerMoving
          ? 'walk'
          : 'idle'
    this.playerAnimationFrame = this.pilgrimFrame(
      this.playerFacing,
      this.playerAnimationState,
      this.playerTurnRemaining,
    )
    const playerWalkPhase =
      this.playerAnimationState === 'walk'
        ? Math.sin(
            ((this.playerAnimationFrame % PILGRIM_MOTION.framesPerFacing) /
              PILGRIM_MOTION.walkFrames) *
              Math.PI *
              2,
          )
        : 0
    this.playerHalo
      .setPosition(this.playerPosition.x, this.playerPosition.y + 8)
      .setAlpha(0.16 + pulse * 0.08)
      .setDisplaySize(42 + Math.abs(playerWalkPhase) * 3, 18)
    const playerBob =
      this.playerAnimationState === 'idle'
        ? Math.sin(this.presentationTime / 520) * 0.45
        : 0
    this.player
      .setPosition(this.playerPosition.x, this.playerPosition.y - 20 + playerBob)
      .setFrame(this.playerAnimationFrame)
      .setDisplaySize(
        140 * (1 + playerWalkPhase * 0.018),
        140 * (1 - playerWalkPhase * 0.012),
      )
      .setFlipX(false)
      .setAngle(
        this.playerAnimationState === 'walk'
          ? playerWalkPhase * 1.25
          : this.playerAnimationState === 'turn'
            ? (this.playerFacing === 'left' ? -1 : 1) * 0.8
            : 0,
      )

    const ghostVisible = this.ghostPosition !== null
    this.ghost.setVisible(ghostVisible)
    this.ghostHalo.setVisible(ghostVisible)
    if (this.ghostPosition) {
      const replayEnd = this.previousRecording.at(-1)?.time ?? 0
      const settled = this.loopElapsed >= replayEnd
      this.ghostAnimationState =
        this.ghostTurnRemaining > 0
          ? 'turn'
          : settled
            ? 'echo-hold'
            : this.ghostMoving
              ? 'echo-replay'
              : 'idle'
      this.ghostAnimationFrame = this.pilgrimFrame(
        this.ghostFacing,
        this.ghostAnimationState,
        this.ghostTurnRemaining,
      )
      const ghostWalkPhase =
        this.ghostAnimationState === 'echo-replay'
          ? Math.sin(
              ((this.ghostAnimationFrame % PILGRIM_MOTION.framesPerFacing) /
                PILGRIM_MOTION.walkFrames) *
                Math.PI *
                2,
            )
          : 0
      const holdPulse =
        this.ghostAnimationState === 'echo-hold'
          ? Math.sin(this.presentationTime / 260)
          : 0
      this.ghost
        .setPosition(
          this.ghostPosition.x,
          this.ghostPosition.y - 20 + holdPulse * 0.8,
        )
        .setFrame(this.ghostAnimationFrame)
        .setDisplaySize(
          (132 + holdPulse * 2.5) * (1 + ghostWalkPhase * 0.018),
          (132 + holdPulse * 2.5) * (1 - ghostWalkPhase * 0.012),
        )
        .setFlipX(false)
        .setAngle(ghostWalkPhase * 1.15)
        .setAlpha(settled ? 0.7 + pulse * 0.09 : 0.46 + pulse * 0.12)
      this.ghostHalo
        .setPosition(this.ghostPosition.x, this.ghostPosition.y + 5)
        .setAlpha(settled ? 0.16 + pulse * 0.08 : 0.08 + pulse * 0.05)

      for (let index = 0; index < this.ghostAfterimages.length; index += 1) {
        const afterimage = this.ghostAfterimages[index]!
        const delay = (index + 1) * 92
        const echoSample = sampleEcho(
          this.previousRecording,
          Math.max(0, this.loopElapsed - delay),
        )
        const visible =
          this.ghostAnimationState === 'echo-replay' && echoSample !== null
        afterimage.setVisible(visible)
        if (!visible || !echoSample) continue
        afterimage
          .setPosition(echoSample.x, echoSample.y - 20)
          .setFrame(
            this.pilgrimFrame(
              this.ghostFacing,
              'echo-replay',
              0,
              Math.max(0, this.presentationTime - delay),
            ),
          )
          .setDisplaySize(124 - index * 7, 124 - index * 7)
          .setAngle(ghostWalkPhase * 0.85)
          .setAlpha(index === 0 ? 0.16 : 0.075)
      }
    } else {
      this.ghostAnimationState = 'hidden'
      this.ghostAnimationFrame = this.pilgrimFrame(
        this.ghostFacing,
        'idle',
        0,
      )
      for (const afterimage of this.ghostAfterimages) {
        afterimage.setVisible(false)
      }
    }

    this.goalOuter
      .setPosition(goal.x, goal.y)
      .setRadius(goal.radius)
      .setFillStyle(COLORS.cyanDeep, this.playerInGoal ? 0.26 : 0.08)
    this.goalInner
      .setPosition(goal.x, goal.y)
      .setRadius(goal.radius - 14)
      .setAlpha(0.28 + pulse * 0.24)
    this.goalPortal
      .setPosition(goal.x, goal.y)
      .setTexture(`thread-well-${Math.floor(this.presentationTime / 140) % 6}`)
      .setScale(1.03 + pulse * 0.06)
      .setAlpha(this.playerInGoal ? 0.95 : 0.72)
    this.goalText
      .setPosition(goal.x, goal.y + goal.radius + 15)
      .setText(
        this.playerInGoal
          ? `${goal.id === 'vault' ? 'Memory vault' : 'Descent well'}  ·  press E`
          : goal.id === 'vault'
            ? 'Memory vault'
            : 'Descent well',
      )

    this.threadGraphics.clear()
    if (switches.length > 1) {
      const alpha = switches[0]!
      const beta = switches[1]!
      const ratio = Math.min(
        1,
        this.relayState.chargeMs / Math.max(1, this.sector.relayRequiredMs),
      )
      this.threadGraphics.lineStyle(6, COLORS.ink, 0.5)
      this.threadGraphics.lineBetween(alpha.x, alpha.y, beta.x, beta.y)
      this.threadGraphics.lineStyle(
        1.4,
        this.relayState.latched ? COLORS.cyan : COLORS.amber,
        0.32 + ratio * 0.5,
      )
      this.threadGraphics.lineBetween(alpha.x, alpha.y, beta.x, beta.y)
      if (ratio > 0) {
        const tipX = Phaser.Math.Linear(alpha.x, beta.x, ratio)
        const tipY = Phaser.Math.Linear(alpha.y, beta.y, ratio)
        this.threadGraphics.fillStyle(COLORS.white, 0.75)
        this.threadGraphics.fillCircle(tipX, tipY, 2.2 + pulse)
      }
    }

    for (let index = 0; index < this.switchPads.length; index += 1) {
      const zone = switches[index]
      const visible = zone !== undefined
      const occupancy = this.switchOccupancy[index]
      const pad = this.switchPads[index]!
      const core = this.switchCores[index]!
      const label = this.switchTexts[index]!
      pad.setVisible(visible)
      core.setVisible(visible)
      label.setVisible(visible)
      if (!zone || !occupancy) continue

      const activeColor = occupancy.active ? COLORS.cyan : COLORS.amber
      pad
        .setPosition(zone.x, zone.y)
        .setRadius(zone.radius + (occupancy.active ? pulse * 2 : 0))
        .setFillStyle(activeColor, occupancy.active ? 0.18 : 0.06)
        .setStrokeStyle(1, activeColor, occupancy.active ? 0.62 : 0.3)
      core
        .setPosition(zone.x, zone.y)
        .setTexture(
          occupancy.active ? 'glyph-shrine-active' : 'glyph-shrine-idle',
        )
        .clearTint()
        .setScale(occupancy.active ? 1.04 + pulse * 0.035 : 1)
      const holder = occupancy.ghost
        ? 'echo bound'
        : occupancy.player
          ? 'pilgrim present'
          : 'sleeping'
      label
        .setPosition(zone.x, zone.y + zone.radius + 18)
        .setText(`${zone.id === 'alpha' ? 'Glyph I' : 'Glyph II'}  ·  ${holder}`)
        .setColor(occupancy.active ? '#dce9df' : '#c9bea7')
    }

    const targetDoorOpen = this.doorOpen ? 1 : 0
    this.doorVisualOpen +=
      (targetDoorOpen - this.doorVisualOpen) * Math.min(1, delta / 105)
    const doorHeight = door.doorBottom - door.doorTop
    const halfHeight = doorHeight / 2
    const leafHeight = Phaser.Math.Linear(halfHeight, 8, this.doorVisualOpen)
    const topClosedY = door.doorTop + halfHeight / 2
    const bottomClosedY = door.doorBottom - halfHeight / 2
    this.doorTopLeaf
      .setPosition(
        door.x + door.width / 2,
        Phaser.Math.Linear(topClosedY, door.doorTop - 5, this.doorVisualOpen),
      )
      .setDisplaySize(door.width + 22, leafHeight)
      .setTexture(`veil-fold-${Math.floor(this.presentationTime / 260) % 2}`)
      .setAlpha(0.9 - this.doorVisualOpen * 0.28)
    this.doorBottomLeaf
      .setPosition(
        door.x + door.width / 2,
        Phaser.Math.Linear(
          bottomClosedY,
          door.doorBottom + 5,
          this.doorVisualOpen,
        ),
      )
      .setDisplaySize(door.width + 22, leafHeight)
      .setTexture(`veil-fold-${(Math.floor(this.presentationTime / 260) + 1) % 2}`)
      .setAlpha(0.9 - this.doorVisualOpen * 0.28)
    for (let index = 0; index < this.gateVeils.length; index += 1) {
      this.gateVeils[index]!
        .setPosition(
          door.x + door.width / 2,
          door.doorTop +
            ((index + 0.5) / this.gateVeils.length) * doorHeight,
        )
        .setTexture(
          `veil-fold-${(Math.floor(this.presentationTime / 230) + index) % 2}`,
        )
        .setDisplaySize(door.width + 16, doorHeight / this.gateVeils.length + 9)
        .setAlpha((0.56 + pulse * 0.08) * (1 - this.doorVisualOpen))
        .setVisible(this.doorVisualOpen < 0.98)
    }
    this.doorText
      .setPosition(door.x + door.width / 2, door.doorTop - 16)
      .setText(
        this.relayState.latched
          ? 'Memory sealed'
          : this.doorOpen
            ? 'Veil parted'
            : 'Veil sleeping',
      )
      .setColor(this.doorOpen ? '#dce9df' : '#b99aaa')

    const relayVisible = this.sector.relayRequiredMs > 0
    this.relayBack.setVisible(relayVisible)
    this.relayFill.setVisible(relayVisible)
    this.relayText.setVisible(relayVisible)
    if (relayVisible) {
      const ratio = Math.min(
        1,
        this.relayState.chargeMs / this.sector.relayRequiredMs,
      )
      this.relayBack.setPosition(500, 148)
      this.relayFill
        .setPosition(385, 148)
        .setDisplaySize(230 * ratio, 2)
        .setFillStyle(this.relayState.latched ? COLORS.cyan : COLORS.amber, 0.94)
      this.relayText
        .setPosition(500, 166)
        .setText(
          this.relayState.latched
            ? 'The twin glyph remembers'
            : `Braiding the twin thread · ${Math.round(ratio * 100)}%`,
        )
        .setColor(this.relayState.latched ? '#dce9df' : '#b6aaa0')
    }

    const remaining = Math.max(0, LOOP_DURATION_MS - this.loopElapsed)
    this.timerText.setText((remaining / 1000).toFixed(1))
    this.timerBar
      .setDisplaySize(144 * (remaining / LOOP_DURATION_MS), 1.5)
      .setFillStyle(remaining < 5000 ? COLORS.coral : COLORS.cyan, 0.9)
    this.loopText.setText(
      `Weaving ${this.loopNumber}  ·  memory recording`,
    )
    this.sectorText.setText(
      this.sectorIndex === 0
        ? 'I  ·  The Woven Reliquary'
        : 'II  ·  The Bellroot Ossuary',
    )
    this.recordDot.setAlpha(0.4 + pulse * 0.6)
    this.objectiveText.setText(this.currentObjective())

    this.bannerText.setVisible(this.bannerRemaining > 0)
    if (this.bannerRemaining > 0) {
      this.bannerText.setAlpha(Math.min(1, this.bannerRemaining / 360))
    }

    const pulseVisible = this.lockPulseRemaining > 0
    this.lockPulse.setVisible(pulseVisible)
    if (pulseVisible) {
      const progress = 1 - this.lockPulseRemaining / 560
      this.lockPulse
        .setPosition(this.lockPulsePosition.x, this.lockPulsePosition.y)
        .setRadius(18 + progress * 64)
        .setStrokeStyle(1.5, COLORS.cyan, 1 - progress)
        .setFillStyle(COLORS.cyan, 0)
    }

    if (this.overlaySigil.visible) {
      this.overlaySigil
        .setTexture(`thread-well-${Math.floor(this.presentationTime / 150) % 6}`)
        .setRotation(Math.sin(this.presentationTime / 1800) * 0.08)
        .setScale(2.08 + pulse * 0.16)
        .setAlpha(0.12 + pulse * 0.1)
    }
    if (this.tutorialPrompt.visible) {
      this.tutorialPrompt.setAlpha(0.66 + pulse * 0.34)
    }
  }

  private currentObjective() {
    if (this.mode === 'tutorial') return 'E / Enter / click to begin the weaving'

    if (this.playerInGoal) {
      return this.sectorIndex === SECTORS.length - 1
        ? 'The memory vault is listening · press E'
        : 'The descent well is open · press E'
    }

    if (this.sector.relayRequiredMs === 0) {
      if (this.previousRecording.length === 0) {
        return 'Stand upon Glyph I, then press Space to bind your echo'
      }
      return this.doorOpen
        ? 'Your echo holds the glyph · cross the parted veil'
        : 'Follow the pale thread until the echo reaches the glyph'
    }

    if (this.relayState.latched) return 'The twin thread holds · enter the memory vault'
    if (this.switchOccupancy.every((item) => item.active)) {
      return 'Both glyphs remember · hold still while the thread is braided'
    }
    if (this.previousRecording.length === 0) {
      return 'Bind an echo upon Glyph I, then carry yourself to Glyph II'
    }
    return 'Stand upon the sleeping glyph and let both memories meet'
  }

  private setOverlayVisible(visible: boolean) {
    this.overlayShade.setVisible(visible)
    this.overlayPanel.setVisible(visible)
    this.overlaySigil.setVisible(visible)
    this.overlayTitle.setVisible(visible)
    this.overlayDetail.setVisible(visible)
    if (!visible) {
      for (const object of this.tutorialObjects) object.setVisible(false)
    }
  }

  private showTutorial() {
    this.mode = 'tutorial'
    this.interactionQueued = false
    this.setOverlayVisible(true)
    this.overlayTitle.setVisible(false)
    this.overlayDetail.setVisible(false)
    for (const object of this.tutorialObjects) object.setVisible(true)
    this.updatePresentation(0)
  }

  private dismissTutorial() {
    if (this.mode !== 'tutorial') return
    this.mode = 'playing'
    this.interactionQueued = false
    this.bannerRemaining = 1650
    this.bannerText.setText('The Woven Reliquary')
    this.setOverlayVisible(false)
    this.updatePresentation(0)
  }

  private renderGameToText() {
    const remaining = Math.max(0, LOOP_DURATION_MS - this.loopElapsed)
    const replayDuration = this.previousRecording.at(-1)?.time ?? 0
    return JSON.stringify({
      coordinateSystem: 'origin top-left; +x right; +y down; canvas 960x600',
      mode: this.mode,
      sector: {
        index: this.sectorIndex + 1,
        count: SECTORS.length,
        id: this.sector.id,
        name: this.sector.name,
      },
      loop: this.loopNumber,
      totalLocks: this.totalLocks,
      loopDurationMs: LOOP_DURATION_MS,
      remainingMs: Math.round(remaining),
      recording: this.mode === 'playing',
      recordingSamples: this.recording.length,
      tutorial: {
        visible: this.mode === 'tutorial',
        dismissControls: ['e', 'enter', 'pointer'],
      },
      player: {
        x: Math.round(this.playerPosition.x),
        y: Math.round(this.playerPosition.y),
        radius: PLAYER_RADIUS,
        inGoal: this.playerInGoal,
        facing: this.playerFacing,
        moving: this.playerMoving,
        animationState: this.playerAnimationState,
        animationFrame: this.playerAnimationFrame,
      },
      ghost: this.ghostPosition
        ? {
            visible: true,
            x: Math.round(this.ghostPosition.x),
            y: Math.round(this.ghostPosition.y),
            samples: this.previousRecording.length,
            replayDurationMs: Math.round(replayDuration),
            holdingFinalPosition: this.loopElapsed >= replayDuration,
            facing: this.ghostFacing,
            moving: this.ghostMoving,
            animationState: this.ghostAnimationState,
            animationFrame: this.ghostAnimationFrame,
          }
        : {
            visible: false,
            samples: 0,
            holdingFinalPosition: false,
            facing: this.ghostFacing,
            moving: false,
            animationState: this.ghostAnimationState,
            animationFrame: this.ghostAnimationFrame,
          },
      switches: this.sector.switches.map((zone, index) => ({
        id: zone.id,
        x: zone.x,
        y: zone.y,
        active: this.switchOccupancy[index]?.active ?? false,
        occupiedBy: this.switchOccupancy[index]?.ghost
          ? 'ghost'
          : this.switchOccupancy[index]?.player
            ? 'player'
            : null,
      })),
      relay: {
        requiredMs: this.sector.relayRequiredMs,
        chargeMs: Math.round(this.relayState.chargeMs),
        latched: this.relayState.latched,
      },
      door: {
        x: this.sector.door.x,
        y1: this.sector.door.doorTop,
        y2: this.sector.door.doorBottom,
        open: this.doorOpen,
      },
      obstacles: this.sector.obstacles.map((obstacle) => ({ ...obstacle })),
      goal: { ...this.sector.goal },
      restartCount: this.restartCount,
      fullscreen: this.scale.isFullscreen,
      objective: this.currentObjective(),
      controls:
        'E/Enter/pointer begin tutorial; WASD move; Space lock echo; E interact; R restart; F fullscreen; Esc exit fullscreen',
    })
  }
}

declare global {
  interface Window {
    render_game_to_text: () => string
    advanceTime: (milliseconds: number) => void
  }
}
