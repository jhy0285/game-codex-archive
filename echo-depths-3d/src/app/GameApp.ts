import * as THREE from 'three'
import { ActionBits, EchoTape, FixedStepAccumulator, createInputFrame, dequantizeMovement, dequantizeYaw, type InputFrame as EchoInputFrame } from '../game'
import { CHAPTER_LAYOUTS, type ChapterNumber, type StageNumber } from '../levels/layouts'
import { CharacterMotor, type MotorInput, type MotorSnapshot } from '../physics/CharacterMotor'
import { RapierWorld } from '../physics/RapierWorld'
import { AssetLibrary } from '../render/AssetLibrary'
import { CameraRig } from '../render/CameraRig'
import type { CharacterAnimator, CharacterState } from '../render/CharacterAnimator'
import { AudioDirector } from '../audio/AudioDirector'
import { DungeonWorld, type ActorContext, type DungeonWorldSnapshot, type WorldAudioEvent } from '../world/DungeonWorld'
import { HudController, InputRouter, LANGUAGE_STORAGE_KEY, chapterCopy, readStoredLanguage, translate, type ChapterId, type EndingStats, type FailureReason, type InputFrame as UiInputFrame, type Language, type ObjectiveId, type TranslationKey } from '../ui'
import { mapWorldFailureReason } from './failureReason'

type GameMode = 'loading' | 'language' | 'title' | 'playing' | 'paused' | 'chapter-complete' | 'ending' | 'error'

type EchoSnapshot = {
  chapter: StageNumber
  player: MotorSnapshot
  world: DungeonWorldSnapshot
}

type ActorRuntime = {
  motor: CharacterMotor
  animator: CharacterAnimator
  actionState: CharacterState | undefined
  actionTicks: number
}

type DebugInput = {
  moveX?: number
  moveZ?: number
  jump?: boolean
  interact?: boolean
  attack?: boolean
  throw?: boolean
  dash?: boolean
  echo?: boolean
  pause?: boolean
  fullscreen?: boolean
  cameraTurn?: number
}

type CampaignStats = {
  elapsedMs: number
  echoes: number
  failures: number
  restarts: number
  chaptersCleared: number
  completed: Set<ChapterNumber>
}

type TutorialStep = 'move' | 'camera' | 'jump' | 'interact' | 'carry' | 'echo'

const MAX_ECHO_SECONDS = 15
const FIXED_STEP_MS = 1000 / 60
const TRAJECTORY_POINT_CAPACITY = 22
const modelHeightOffset = 0.78
const STARTING_UNLOCKED_THROUGH: ChapterNumber = 5
const TUTORIAL_STEPS: readonly TutorialStep[] = ['move', 'camera', 'jump', 'interact', 'carry', 'echo']

const requiredCanvas = (): HTMLCanvasElement => {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  if (!canvas) throw new Error('Game canvas is missing')
  return canvas
}

const emptyStats = (): CampaignStats => ({
  elapsedMs: 0,
  echoes: 0,
  failures: 0,
  restarts: 0,
  chaptersCleared: 0,
  completed: new Set<ChapterNumber>(),
})

export class GameApp {
  private readonly canvas = requiredCanvas()
  private readonly scene = new THREE.Scene()
  private readonly renderer: THREE.WebGLRenderer
  private readonly camera: CameraRig
  private readonly assets = new AssetLibrary()
  private readonly audio = new AudioDirector()
  private readonly hud: HudController
  private readonly input: InputRouter
  private readonly fixedLoop = new FixedStepAccumulator()
  private readonly echoTape = new EchoTape<EchoSnapshot>({ maxFrames: MAX_ECHO_SECONDS * 60 })
  private readonly raycaster = new THREE.Raycaster()
  private readonly cameraRight = new THREE.Vector3()
  private readonly cameraForward = new THREE.Vector3()
  private readonly inputMovement = new THREE.Vector3()
  private readonly echoPathMaterial = new THREE.LineBasicMaterial({ color: 0x8d62ff, transparent: true, opacity: 0.7, depthWrite: false })
  private readonly trajectoryMaterial = new THREE.LineDashedMaterial({ color: 0xffd47a, transparent: true, opacity: 0.88, dashSize: 0.24, gapSize: 0.14, depthWrite: false })
  private readonly trajectoryPositions = new Float32Array(TRAJECTORY_POINT_CAPACITY * 3)
  private readonly trajectoryDistances = new Float32Array(TRAJECTORY_POINT_CAPACITY)
  private readonly trajectoryGeometry = new THREE.BufferGeometry()
  private readonly trajectoryLine = new THREE.Line(this.trajectoryGeometry, this.trajectoryMaterial)
  private readonly trajectoryDirection = new THREE.Vector3()
  private readonly trajectoryActor: ActorContext = {
    id: 'player',
    kind: 'player',
    position: new THREE.Vector3(),
    facingYaw: 0,
    carryYaw: 0,
    interactHeld: false,
  }
  private readonly transientObjects: { object: THREE.Object3D; ticks: number }[] = []
  private readonly abortController = new AbortController()
  private physics: RapierWorld | undefined
  private world: DungeonWorld | undefined
  private player: ActorRuntime | undefined
  private echo: ActorRuntime | undefined
  private echoPathLine: THREE.Line | undefined
  private mode: GameMode = 'loading'
  private language: Language
  private readonly hasSavedLanguage: boolean
  private chapter: StageNumber = 1
  private unlockedThrough: ChapterNumber = STARTING_UNLOCKED_THROUGH
  private stats = emptyStats()
  private tick = 0
  private animationFrame = 0
  private transitionPending = false
  private rotationPaused = false
  private lastTime = performance.now()
  private recordingPath: THREE.Vector3[] = []
  private debugInput: DebugInput | undefined
  private manualStepping = false
  private failRestartTicks = 0
  private destroyed = false
  private contextLost = false
  private throwWasHeld = false
  private rebuildGeneration = 0
  private runtimeStarted = false
  private activeObjective: ObjectiveId | undefined
  private readonly tutorialSteps = new Set<TutorialStep>()
  private readonly tutorialStart = new THREE.Vector3()
  private tutorialComplete = false

  private constructor(savedLanguage: Language | null) {
    this.language = savedLanguage ?? 'en'
    this.hasSavedLanguage = savedLanguage !== null
    this.hud = new HudController({
      language: this.language,
      callbacks: {
        onLanguageChange: (language) => this.selectLanguage(language),
        onStart: () => void this.startNewCampaign(),
        onChapterSelectRequested: () => this.refreshChapterSelect(),
        onChapterSelected: (chapter) => void this.selectChapter(chapter),
        onPause: () => this.pause(),
        onResume: () => this.resume(),
        onRestartChapter: () => void this.restartChapter(true),
        onReturnToTitle: () => this.returnToTitle(),
        onContinue: () => void this.continueCampaign(),
        onReplay: () => void this.startNewCampaign(),
        onTutorialContinue: () => void this.finishTutorial(),
        onTutorialSkip: () => void this.finishTutorial(),
        onFullscreenRequest: () => void this.requestFullscreen(),
        onSoundToggle: (enabled) => this.audio.setEnabled(enabled),
        onReload: () => window.location.reload(),
        onRotationPauseChange: (required) => { this.rotationPaused = required },
      },
    })
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.04
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.camera = new CameraRig(1)
    this.input = new InputRouter(this.canvas, {
      onPauseRequest: () => this.togglePause(),
      onFullscreenRequest: () => void this.requestFullscreen(),
    })
    this.input.setEnabled(false)
    this.installScene()
    this.installTrajectoryPreview()
    this.installWindowHandlers()
  }

  static async create(): Promise<GameApp> {
    const app = new GameApp(readStoredLanguage())
    await app.initialize()
    return app
  }

  private async initialize(): Promise<void> {
    this.hud.showLoading(0)
    this.assets.onProgress((loaded, total, label) => {
      this.hud.setLoadingProgress(total > 0 ? loaded / total : 0, label)
    })
    try {
      await this.assets.load()
    } catch {
      this.showInitializationError('errorAssets')
      return
    }
    try {
      if (!await this.rebuildChapter(1, false)) return
    } catch {
      this.showInitializationError('errorPhysics')
      return
    }
    this.resize()
    if (this.hasSavedLanguage) {
      this.mode = 'title'
      this.hud.showTitle()
    } else {
      this.mode = 'language'
      this.hud.showLanguage()
    }
    this.startRuntimeLoop()
  }

  private showInitializationError(key: TranslationKey): void {
    this.mode = 'error'
    this.input.setEnabled(false)
    this.hud.showError(translate(this.language, key))
    this.startRuntimeLoop()
  }

  private startRuntimeLoop(): void {
    if (this.runtimeStarted) return
    this.runtimeStarted = true
    this.installPublicApi()
    this.lastTime = performance.now()
    this.animationFrame = requestAnimationFrame((time) => this.frame(time))
  }

  private clearRuntimeInput(): void {
    this.debugInput = undefined
    this.throwWasHeld = false
    this.input.clear()
  }

  private installScene(): void {
    this.scene.background = new THREE.Color(0x07131b)
    this.scene.fog = new THREE.FogExp2(0x07131b, 0.026)
    const hemisphere = new THREE.HemisphereLight(0x87b9cb, 0x080711, 1.35)
    this.scene.add(hemisphere)
    const moon = new THREE.DirectionalLight(0xe1f4ff, 3.2)
    moon.position.set(-7, 14, 8)
    moon.castShadow = true
    moon.shadow.camera.left = -18
    moon.shadow.camera.right = 18
    moon.shadow.camera.top = 18
    moon.shadow.camera.bottom = -18
    moon.shadow.camera.near = 1
    moon.shadow.camera.far = 38
    moon.shadow.bias = -0.0008
    moon.shadow.mapSize.set(this.isMobileDevice() ? 1024 : 1536, this.isMobileDevice() ? 1024 : 1536)
    this.scene.add(moon)
    const fill = new THREE.PointLight(0x743eea, 8, 20)
    fill.position.set(5, 7, -4)
    this.scene.add(fill)
  }

  private installTrajectoryPreview(): void {
    const positions = new THREE.BufferAttribute(this.trajectoryPositions, 3)
    const distances = new THREE.BufferAttribute(this.trajectoryDistances, 1)
    positions.setUsage(THREE.DynamicDrawUsage)
    distances.setUsage(THREE.DynamicDrawUsage)
    this.trajectoryGeometry.setAttribute('position', positions)
    this.trajectoryGeometry.setAttribute('lineDistance', distances)
    this.trajectoryGeometry.setDrawRange(0, 0)
    this.trajectoryLine.name = 'CoreTrajectoryPreview'
    this.trajectoryLine.visible = false
    this.trajectoryLine.frustumCulled = false
    this.scene.add(this.trajectoryLine)
  }

  private async rebuildChapter(
    chapter: StageNumber,
    spawnEcho: boolean,
    snapshot?: EchoSnapshot,
  ): Promise<boolean> {
    const generation = ++this.rebuildGeneration
    this.transitionPending = true
    this.clearRuntimeInput()
    this.disposeRuntime()
    const nextPhysics = await RapierWorld.create()
    if (this.destroyed || generation !== this.rebuildGeneration) {
      nextPhysics.dispose()
      return false
    }
    this.physics = nextPhysics
    this.world = new DungeonWorld(this.scene, this.physics, this.assets, chapter)
    if (snapshot) this.world.restoreSnapshot(snapshot.world, spawnEcho)
    this.chapter = chapter
    const layout = CHAPTER_LAYOUTS[chapter]
    this.scene.background = new THREE.Color(layout.fog)
    this.scene.fog = new THREE.FogExp2(layout.fog, this.isMobileDevice() ? 0.032 : 0.025)
    const spawn = snapshot
      ? new THREE.Vector3(snapshot.player.position.x, snapshot.player.position.y, snapshot.player.position.z)
      : this.world.start
    this.player = this.createActor('player', spawn, false)
    if (snapshot) this.player.motor.restore(snapshot.player)
    if (spawnEcho) {
      this.echo = this.createActor('echo', spawn, true)
      if (snapshot) this.echo.motor.restore(snapshot.player)
    }
    this.camera.setObstructions(this.world.staticObstructions)
    if (chapter === 0) {
      if (!snapshot) {
        this.tutorialSteps.clear()
        this.tutorialStart.copy(spawn)
        this.tutorialComplete = false
      }
      this.hud.setTutorialProgress(TUTORIAL_STEPS, this.tutorialSteps, this.tutorialComplete)
    } else {
      this.hud.clearTutorial()
      this.hud.setChapter(chapter)
      this.hud.setObjective(chapterCopy(this.language, chapter).objective)
    }
    this.activeObjective = undefined
    this.updateChapterGuidance()
    this.tick = 0
    this.throwWasHeld = false
    this.failRestartTicks = 0
    this.fixedLoop.reset()
    this.transitionPending = false
    return true
  }

  private createActor(kind: 'player' | 'echo', position: THREE.Vector3, echo: boolean): ActorRuntime {
    if (!this.physics) throw new Error('Physics is unavailable')
    const record = this.physics.createActor(kind, kind, { x: position.x, y: position.y, z: position.z })
    const motor = new CharacterMotor(this.physics, record)
    motor.teleport({ x: position.x, y: position.y, z: position.z })
    const animator = this.assets.createCharacter(echo)
    animator.root.name = kind === 'echo' ? 'EchoCharacter' : 'PlayerCharacter'
    animator.root.scale.setScalar(1.05)
    this.scene.add(animator.root)
    return { motor, animator, actionState: undefined, actionTicks: 0 }
  }

  private frame(time: number): void {
    if (this.destroyed) return
    const delta = Math.min(100, Math.max(0, time - this.lastTime))
    this.lastTime = time
    if (this.mode === 'playing' && !this.manualStepping && !this.rotationPaused && !this.transitionPending && !this.contextLost) {
      this.fixedLoop.update(delta, () => this.fixedTick())
    }
    this.render(delta / 1000)
    this.animationFrame = requestAnimationFrame((next) => this.frame(next))
  }

  private fixedTick(): void {
    const physics = this.physics
    const world = this.world
    const player = this.player
    if (!physics || !world || !player) return
    this.tick += 1
    if (this.chapter !== 0) this.stats.elapsedMs += FIXED_STEP_MS
    const uiFrame = this.consumeInput()
    this.camera.rotate(uiFrame.cameraTurn * 0.032 + uiFrame.cameraYawDelta, uiFrame.cameraPitchDelta)
    const playerFrame = this.toEchoFrame(uiFrame, player.motor.facingYaw)
    if (uiFrame.pressed.echo && this.toggleEcho()) return

    const playerMovement = dequantizeMovement(playerFrame)
    let echoFrame: EchoInputFrame | undefined
    if (this.echo) {
      echoFrame = this.echoTape.nextReplayFrame()
      this.echo.motor.facingYaw = dequantizeYaw(echoFrame.aimYawQ)
    }

    const contexts = this.actorContexts(playerFrame, echoFrame)
    world.beforePhysics(this.tick, contexts)
    this.playWorldAudioEvents(world.takeAudioEvents())
    const playerSupport = world.supportMotion(player.motor.position)
    player.motor.setSupportDelta(playerSupport.delta, playerSupport.supported)
    player.motor.prepare(this.motorInput(playerFrame, playerMovement.x, playerMovement.z))
    if (this.echo && echoFrame) {
      const movement = dequantizeMovement(echoFrame)
      const echoSupport = world.supportMotion(this.echo.motor.position)
      this.echo.motor.setSupportDelta(echoSupport.delta, echoSupport.supported)
      this.echo.motor.prepare(this.motorInput(echoFrame, movement.x, movement.z))
    }
    this.resolveActions(player, playerFrame, contexts[0] as ActorContext)
    if (this.echo && echoFrame && contexts[1]) this.resolveActions(this.echo, echoFrame, contexts[1])
    physics.step()
    player.motor.syncAfterStep()
    this.echo?.motor.syncAfterStep()
    world.afterPhysics(this.actorContexts(playerFrame, echoFrame))
    this.playWorldAudioEvents(world.takeAudioEvents())
    this.updateTutorialProgress(player, uiFrame)

    if (this.echoTape.isRecording) {
      this.echoTape.record(playerFrame)
      if (this.tick % 4 === 0) this.recordingPath.push(player.motor.position.clone())
      if (this.echoTape.mode === 'ready') {
        void this.activateFinishedEcho()
        return
      }
    }

    this.updateActorState(player)
    if (this.echo) this.updateActorState(this.echo)
    this.updateTransientEffects()
    this.updateHud(uiFrame.held.throw)

    if (player.motor.position.y < -6) this.beginFailure('fall')
    if (world.failed) this.beginFailure(mapWorldFailureReason(world.failureReason))
    if (this.failRestartTicks > 0) {
      this.failRestartTicks -= 1
      if (this.failRestartTicks === 58 && this.player) {
        this.player.actionState = 'Defeat'
        this.player.actionTicks = 58
      }
      if (this.failRestartTicks === 0) void this.restartChapter(false)
    }
    if (world.complete && this.mode === 'playing') this.completeChapter()
  }

  private consumeInput(): UiInputFrame {
    const frame = this.input.consumeFrame()
    if (!this.debugInput) return frame
    const debug = this.debugInput
    this.debugInput = undefined
    const actions = ['jump', 'interact', 'attack', 'throw', 'dash', 'echo', 'pause', 'fullscreen'] as const
    const held = { ...frame.held }
    const pressed = { ...frame.pressed }
    for (const action of actions) {
      const value = debug[action]
      if (value !== undefined) {
        held[action] = value
        pressed[action] = value
      }
    }
    return {
      ...frame,
      moveX: debug.moveX ?? frame.moveX,
      moveZ: debug.moveZ ?? frame.moveZ,
      cameraTurn: debug.cameraTurn ?? frame.cameraTurn,
      held,
      pressed,
    }
  }

  private toEchoFrame(input: UiInputFrame, facingYaw: number): EchoInputFrame {
    this.camera.right(this.cameraRight)
    this.camera.forward(this.cameraForward)
    const movement = this.inputMovement
      .copy(this.cameraRight)
      .multiplyScalar(input.moveX)
      .addScaledVector(this.cameraForward, input.moveZ)
    if (movement.lengthSq() > 1) movement.normalize()
    const aimedYaw = movement.lengthSq() > 0.0001 ? Math.atan2(movement.x, movement.z) : facingYaw
    let heldMask = 0
    let pressedMask = 0
    if (input.held.interact) heldMask |= ActionBits.Interact
    if (input.pressed.jump) pressedMask |= ActionBits.Jump
    if (input.pressed.interact) pressedMask |= ActionBits.Interact
    if (input.pressed.attack) pressedMask |= ActionBits.Attack
    const throwReleased = this.throwWasHeld && !input.held.throw
    this.throwWasHeld = input.held.throw
    if (throwReleased || (input.pressed.throw && !input.held.throw)) pressedMask |= ActionBits.Throw
    if (input.pressed.dash) pressedMask |= ActionBits.Dash
    return createInputFrame({ moveX: movement.x, moveZ: movement.z, aimYaw: aimedYaw, heldMask, pressedMask })
  }

  private motorInput(frame: EchoInputFrame, moveX: number, moveZ: number): MotorInput {
    return {
      moveX,
      moveZ,
      jumpPressed: Boolean(frame.pressedMask & ActionBits.Jump),
      dashPressed: Boolean(frame.pressedMask & ActionBits.Dash),
    }
  }

  private actorContexts(playerFrame: EchoInputFrame, echoFrame?: EchoInputFrame): ActorContext[] {
    const contexts: ActorContext[] = []
    this.camera.forward(this.cameraForward)
    const playerCarryYaw = Math.atan2(this.cameraForward.x, this.cameraForward.z)
    if (this.player) contexts.push({
      id: 'player', kind: 'player', position: this.player.motor.position, facingYaw: this.player.motor.facingYaw,
      carryYaw: playerCarryYaw,
      interactHeld: Boolean(playerFrame.heldMask & ActionBits.Interact),
    })
    if (this.echo && echoFrame) contexts.push({
      id: 'echo', kind: 'echo', position: this.echo.motor.position, facingYaw: this.echo.motor.facingYaw,
      carryYaw: this.echo.motor.facingYaw,
      interactHeld: Boolean(echoFrame.heldMask & ActionBits.Interact),
    })
    return contexts
  }

  private resolveActions(runtime: ActorRuntime, frame: EchoInputFrame, context: ActorContext): void {
    const world = this.world
    if (!world) return
    const direction = new THREE.Vector3(Math.sin(runtime.motor.facingYaw), 0, Math.cos(runtime.motor.facingYaw))
    if (frame.pressedMask & ActionBits.Interact) {
      const carryingBeforeInteract = world.carriedBy(context.kind)
      const result = world.interact(context)
      if (result) {
        runtime.actionState = result === 'crate' || result === 'core' ? 'Carry' : 'Interact'
        runtime.actionTicks = 28
        if (result === 'lever') this.audio.cue('lever')
        else if (result === 'crate' || result === 'core') this.audio.cue(carryingBeforeInteract === result ? 'drop' : 'pickup')
        else if (result !== 'receiver') this.audio.cue('interact')
        if (result === 'lever') {
          const firstChapterLever = this.chapter === 1 && context.kind === 'player'
          this.hud.showFeedbackKey(firstChapterLever ? 'feedbackFirstLeverActive' : 'feedbackLeverActive', 'success', firstChapterLever ? 5_600 : 2_600)
        }
      }
    }
    if (frame.pressedMask & ActionBits.Throw) {
      const result = world.throwOrDrop(context, direction)
      if (result) {
        runtime.actionState = 'Throw'
        runtime.actionTicks = 28
        this.audio.cue('attack')
      }
    }
    if (frame.pressedMask & ActionBits.Attack) {
      const result = world.attack(context, direction)
      if (result === 'shield') this.hud.showFeedbackKey('feedbackGuardianShield', 'warning')
      runtime.actionState = 'Attack'
      runtime.actionTicks = 24
      this.audio.cue('attack')
      this.camera.nudgeShake(0.08)
    }
    if (runtime.motor.jumpedThisTick) {
      runtime.actionState = 'Jump'
      runtime.actionTicks = 18
      this.audio.cue('jump')
    }
    if (runtime.motor.dashedThisTick) {
      runtime.actionState = 'Dash'
      runtime.actionTicks = 14
      this.audio.cue('dash')
      this.spawnAfterimage(runtime)
    }
    if (runtime.motor.landedThisTick) {
      runtime.actionState = 'Land'
      runtime.actionTicks = 14
      this.audio.cue('land')
      this.spawnLandingDust(runtime.motor.position)
    }
  }

  private updateActorState(runtime: ActorRuntime): void {
    runtime.actionTicks = Math.max(0, runtime.actionTicks - 1)
    if (runtime.actionTicks === 0) runtime.actionState = undefined
    const horizontalSpeed = Math.hypot(runtime.motor.velocity.x, runtime.motor.velocity.z)
    let state: CharacterState
    if (runtime.actionState) state = runtime.actionState
    else if (!runtime.motor.grounded) state = runtime.motor.velocity.y > 0.1 ? 'Jump' : 'Fall'
    else if (this.world?.carriedBy(runtime === this.player ? 'player' : 'echo')) state = 'Carry'
    else if (horizontalSpeed > 3.15) state = 'Run'
    else if (horizontalSpeed > 0.16) state = 'Walk'
    else state = 'Idle'
    runtime.animator.play(state, horizontalSpeed)
  }

  private toggleEcho(): boolean {
    if (this.transitionPending) return true
    if (!this.echoTape.isRecording) {
      this.destroyEcho()
      const player = this.player
      const world = this.world
      if (!player || !world) return false
      this.echoTape.start({
        chapter: this.chapter,
        player: player.motor.snapshot(),
        world: world.captureSnapshot(),
      })
      this.spawnTemporalPulse(player.motor.position, 0x28e6d6)
      this.recordingPath = [player.motor.position.clone()]
      this.removeEchoPath()
      this.audio.cue('record')
      this.hud.showFeedbackKey('feedbackRecordStart', 'info')
      return false
    }
    this.echoTape.finish()
    void this.activateFinishedEcho()
    return true
  }

  private async activateFinishedEcho(): Promise<void> {
    if (this.transitionPending || this.echoTape.mode !== 'ready') return
    const recording = this.echoTape.exportRecording()
    if (!recording) return
    const path = this.recordingPath.map((point) => point.clone())
    if (recording.snapshot.chapter !== 0) this.stats.echoes += 1
    this.audio.cue('echo')
    if (!await this.rebuildChapter(recording.snapshot.chapter, true, recording.snapshot)) return
    this.echoTape.replace(recording)
    this.echoTape.beginReplay()
    this.createEchoPath(path)
    if (this.player) this.spawnTemporalPulse(this.player.motor.position, 0xc15bf2)
    this.hud.showFeedbackKey('feedbackRecordEnd', 'success')
    if (recording.snapshot.chapter === 0) {
      this.tutorialSteps.add('echo')
      this.tutorialComplete = TUTORIAL_STEPS.every((step) => this.tutorialSteps.has(step))
      this.updateChapterGuidance()
      if (this.tutorialComplete) this.hud.showFeedbackKey('feedbackTutorialReady', 'success', 4_200)
    }
  }

  private updateHud(throwPreviewVisible: boolean): void {
    const world = this.world
    if (!world) return
    this.updateChapterGuidance()
    this.hud.setEchoState({
      mode: this.echoTape.mode === 'idle' ? 'idle' : this.echoTape.mode,
      elapsedMs: (this.echoTape.mode === 'recording' ? this.echoTape.durationTicks : this.echoTape.playbackTick) * FIXED_STEP_MS,
      durationMs: Math.max(FIXED_STEP_MS, this.echoTape.durationTicks * FIXED_STEP_MS),
    })
    this.hud.setTimer(world.escapeTicks > 0 ? world.escapeTicks * FIXED_STEP_MS : this.stats.elapsedMs)
    const nearest = this.player ? world.nearestInteractable(this.player.motor.position) : undefined
    const carried = world.carriedBy('player')
    if (this.player) world.highlightInteractables(this.player.motor.position, this.echo?.motor.position)
    if (!nearest) this.hud.setInteractPrompt(null)
    else {
      const key = nearest.kind === 'exit' ? 'interactExit' : nearest.kind === 'crate' || nearest.kind === 'core'
        ? carried === nearest.kind ? 'interactDrop' : 'interactCarry'
        : nearest.kind === 'receiver' ? 'interactSynchronize' : nearest.kind === 'lever' ? 'interactLever' : 'interactUse'
      this.hud.setInteractPrompt(`E · ${translate(this.language, key)}`)
    }
    this.updateTrajectory(throwPreviewVisible)
  }

  private updateTrajectory(visible: boolean): void {
    const world = this.world
    const player = this.player
    if (!world || !player) return
    if (!visible || !world.isCarrying('player', 'core')) {
      this.trajectoryLine.visible = false
      this.trajectoryGeometry.setDrawRange(0, 0)
      return
    }
    this.trajectoryDirection.set(Math.sin(player.motor.facingYaw), 0, Math.cos(player.motor.facingYaw))
    this.trajectoryActor.position.copy(player.motor.position)
    this.trajectoryActor.facingYaw = player.motor.facingYaw
    const count = world.writeTrajectory(
      this.trajectoryActor,
      this.trajectoryDirection,
      this.trajectoryPositions,
      this.trajectoryDistances,
    )
    this.trajectoryGeometry.getAttribute('position').needsUpdate = true
    this.trajectoryGeometry.getAttribute('lineDistance').needsUpdate = true
    this.trajectoryGeometry.setDrawRange(0, count)
    this.trajectoryLine.visible = count > 1
  }

  private completeChapter(): void {
    if (this.chapter === 0) {
      void this.finishTutorial()
      return
    }
    const chapter = this.chapter
    this.mode = 'chapter-complete'
    this.input.setEnabled(false)
    this.stats.completed.add(chapter)
    this.stats.chaptersCleared = this.stats.completed.size
    this.unlockedThrough = Math.max(STARTING_UNLOCKED_THROUGH, Math.min(5, chapter + 1)) as ChapterNumber
    this.audio.cue('complete')
    this.hud.showChapterComplete(chapter)
    this.refreshChapterSelect()
  }

  private beginFailure(reason: FailureReason): void {
    if (this.failRestartTicks > 0 || this.mode !== 'playing') return
    this.stats.failures += 1
    this.failRestartTicks = 90
    this.audio.cue('fail')
    this.hud.showFailure(reason)
    if (this.player) {
      this.player.actionState = 'Hit'
      this.player.actionTicks = 24
    }
  }

  private async startNewCampaign(): Promise<void> {
    this.audio.reset()
    this.stats = emptyStats()
    this.unlockedThrough = STARTING_UNLOCKED_THROUGH
    this.echoTape.reset()
    this.removeEchoPath()
    if (!await this.rebuildChapter(0, false)) return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.hud.showPlaying()
    this.refreshChapterSelect()
    await this.audio.resume()
  }

  private async selectChapter(chapter: ChapterId): Promise<void> {
    if (chapter > this.unlockedThrough && import.meta.env.PROD) return
    this.audio.reset()
    this.echoTape.reset()
    this.removeEchoPath()
    if (!await this.rebuildChapter(chapter, false)) return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.hud.showPlaying()
    await this.audio.resume()
  }

  private async continueCampaign(): Promise<void> {
    if (this.chapter === 0) {
      await this.finishTutorial()
      return
    }
    if (this.chapter === 5) {
      this.showEnding()
      return
    }
    await this.selectChapter((this.chapter + 1) as ChapterId)
  }

  private showEnding(): void {
    this.mode = 'ending'
    this.input.setEnabled(false)
    const stats = this.endingStats()
    this.hud.showEnding(stats)
  }

  private endingStats(): EndingStats {
    const elapsedSeconds = this.stats.elapsedMs / 1000
    const penalty = this.stats.echoes * 25 + this.stats.failures * 220 + this.stats.restarts * 90 + elapsedSeconds
    const rank = penalty < 620 ? 'S' : penalty < 900 ? 'A' : penalty < 1300 ? 'B' : 'C'
    return {
      elapsedMs: this.stats.elapsedMs,
      echoes: this.stats.echoes,
      failures: this.stats.failures,
      restarts: this.stats.restarts,
      chaptersCleared: this.stats.chaptersCleared,
      rank,
    }
  }

  private async restartChapter(count: boolean): Promise<void> {
    if (count && this.chapter !== 0) this.stats.restarts += 1
    this.audio.reset()
    this.echoTape.reset()
    this.removeEchoPath()
    if (!await this.rebuildChapter(this.chapter, false)) return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.hud.showPlaying()
  }

  private returnToTitle(): void {
    this.audio.reset()
    this.mode = 'title'
    this.input.setEnabled(false)
    this.echoTape.reset()
    this.destroyEcho()
    this.removeEchoPath()
    this.hud.clearTutorial()
    this.hud.showTitle()
  }

  private pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.input.setEnabled(false)
    this.hud.showPause()
  }

  private resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.hud.showPlaying()
    this.lastTime = performance.now()
  }

  private togglePause(): void {
    if (this.mode === 'playing') this.pause()
    else if (this.mode === 'paused') this.resume()
  }

  private selectLanguage(language: Language): void {
    const leaveLanguageScreen = this.mode === 'language'
    this.language = language
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Storage may be unavailable in privacy-restricted browsing; the active language still applies.
    }
    this.hud.setLanguage(language)
    if (this.chapter === 0) this.hud.setTutorialProgress(TUTORIAL_STEPS, this.tutorialSteps, this.tutorialComplete)
    else this.hud.setChapter(this.chapter)
    this.activeObjective = undefined
    this.updateChapterGuidance()
    if (leaveLanguageScreen) {
      this.mode = 'title'
      this.hud.showTitle()
    }
  }

  private playWorldAudioEvents(events: readonly WorldAudioEvent[]): void {
    for (const event of events) {
      if (event.type === 'door') this.audio.cue(event.open ? 'doorOpen' : 'doorClose')
      else if (event.type === 'plate') this.audio.cue(event.pressed ? 'platePress' : 'plateRelease')
      else if (event.type === 'receiver') this.audio.cue('receiver')
      else {
        this.audio.cue(event.moving ? 'mechanismStart' : 'mechanismStop')
        this.audio.setMechanicalLoop(event.id, event.mechanism, event.moving)
      }
    }
  }

  private updateChapterGuidance(): void {
    if (!this.world) return
    if (this.chapter === 0) {
      this.hud.setTutorialProgress(TUTORIAL_STEPS, this.tutorialSteps, this.tutorialComplete)
      return
    }
    let objective: ObjectiveId
    if (this.chapter === 1) {
      objective = !this.world.facts.has('tutorial-lever')
        ? 'first-lever'
        : !this.world.facts.has('echo-plate')
          ? 'first-echo-plate'
          : 'reach-exit'
    } else if (this.chapter === 2) {
      objective = !this.world.facts.has('lift-lever-echo')
        ? 'counterweight-power'
        : !this.world.facts.has('elevator-ridden')
          ? 'counterweight-ride'
          : !this.world.facts.has('cargo-plate')
            ? 'counterweight-cargo'
            : 'reach-exit'
    } else {
      return
    }
    const previous = this.activeObjective
    if (previous === objective) return
    this.activeObjective = objective
    this.hud.setObjectiveId(objective)
    if (previous !== undefined && objective === 'reach-exit') this.hud.showFeedbackKey('feedbackDoorOpen', 'success')
  }

  private updateTutorialProgress(player: ActorRuntime, input: UiInputFrame): void {
    if (this.chapter !== 0 || this.tutorialComplete || !this.world) return
    let changed = false
    const mark = (step: TutorialStep, complete: boolean): void => {
      if (complete && !this.tutorialSteps.has(step)) {
        this.tutorialSteps.add(step)
        changed = true
      }
    }
    mark('move', player.motor.position.distanceToSquared(this.tutorialStart) > 0.75 * 0.75)
    mark('camera', Math.abs(input.cameraTurn) > 0 || Math.abs(input.cameraYawDelta) > 0.001 || Math.abs(input.cameraPitchDelta) > 0.001)
    mark('jump', player.motor.jumpedThisTick)
    mark('interact', this.world.facts.has('orientation-console:player'))
    mark('carry', this.world.carriedBy('player') === 'crate')
    if (!changed) return
    this.tutorialComplete = TUTORIAL_STEPS.every((step) => this.tutorialSteps.has(step))
    this.updateChapterGuidance()
  }

  private async finishTutorial(): Promise<void> {
    if (this.chapter !== 0 || this.transitionPending) return
    this.audio.reset()
    this.echoTape.reset()
    this.removeEchoPath()
    this.tutorialSteps.clear()
    this.tutorialComplete = false
    if (!await this.rebuildChapter(1, false)) return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.hud.showPlaying()
    this.hud.showFeedbackKey('feedbackTutorialComplete', 'success', 4_200)
    await this.audio.resume()
  }

  private async requestFullscreen(): Promise<void> {
    await this.hud.toggleFullscreen()
  }

  private refreshChapterSelect(): void {
    this.hud.setChapterSelectState({ unlockedThrough: this.unlockedThrough, completed: [...this.stats.completed] })
  }

  private render(deltaSeconds: number): void {
    const player = this.player
    if (player) {
      this.syncActorVisual(player, deltaSeconds)
      player.animator.update(deltaSeconds)
    }
    if (this.echo) {
      this.syncActorVisual(this.echo, deltaSeconds)
      this.echo.animator.update(deltaSeconds)
    }
    if (player) this.camera.update(player.motor.position, player.motor.velocity, deltaSeconds, this.raycaster)
    this.renderer.render(this.scene, this.camera.camera)
  }

  private syncActorVisual(actor: ActorRuntime, deltaSeconds: number): void {
    actor.animator.root.position.set(actor.motor.position.x, actor.motor.position.y - modelHeightOffset, actor.motor.position.z)
    const current = actor.animator.root.rotation.y
    const difference = Math.atan2(Math.sin(actor.motor.facingYaw - current), Math.cos(actor.motor.facingYaw - current))
    actor.animator.root.rotation.y = current + difference * (1 - Math.exp(-18 * Math.max(0, deltaSeconds)))
  }

  private createEchoPath(points: THREE.Vector3[]): void {
    this.removeEchoPath()
    if (points.length < 2) return
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => point.clone().add(new THREE.Vector3(0, 0.08, 0))))
    this.echoPathLine = new THREE.Line(geometry, this.echoPathMaterial)
    this.echoPathLine.name = 'EchoPathPreview'
    this.scene.add(this.echoPathLine)
  }

  private removeEchoPath(): void {
    if (!this.echoPathLine) return
    this.scene.remove(this.echoPathLine)
    this.echoPathLine.geometry.dispose()
    this.echoPathLine = undefined
  }

  private spawnLandingDust(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.2, 0.52, 24)
    const material = new THREE.MeshBasicMaterial({ color: 0xbecbd0, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide })
    const dust = new THREE.Mesh(geometry, material)
    dust.rotation.x = -Math.PI / 2
    dust.position.copy(position).add(new THREE.Vector3(0, -modelHeightOffset + 0.04, 0))
    this.scene.add(dust)
    this.transientObjects.push({ object: dust, ticks: 28 })
  }

  private spawnTemporalPulse(position: THREE.Vector3, color: number): void {
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.82, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
    )
    pulse.rotation.x = -Math.PI / 2
    pulse.position.copy(position).add(new THREE.Vector3(0, -modelHeightOffset + 0.055, 0))
    this.scene.add(pulse)
    this.transientObjects.push({ object: pulse, ticks: 42 })
  }

  private spawnAfterimage(actor: ActorRuntime): void {
    const ghost = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.72, 5, 10),
      new THREE.MeshBasicMaterial({ color: actor === this.echo ? 0xc15bf2 : 0x28e6d6, transparent: true, opacity: 0.25, depthWrite: false }),
    )
    ghost.position.copy(actor.motor.position).add(new THREE.Vector3(0, -0.1, 0))
    this.scene.add(ghost)
    this.transientObjects.push({ object: ghost, ticks: 20 })
  }

  private updateTransientEffects(): void {
    for (let index = this.transientObjects.length - 1; index >= 0; index -= 1) {
      const entry = this.transientObjects[index]
      if (!entry) continue
      entry.ticks -= 1
      entry.object.scale.multiplyScalar(1.035)
      entry.object.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.Material && 'opacity' in object.material) object.material.opacity *= 0.9
      })
      if (entry.ticks <= 0) {
        this.scene.remove(entry.object)
        entry.object.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        })
        this.transientObjects.splice(index, 1)
      }
    }
  }

  private destroyEcho(): void {
    if (!this.echo || !this.physics) return
    this.world?.releaseActor('echo')
    this.scene.remove(this.echo.animator.root)
    this.echo.motor.dispose()
    this.echo.animator.dispose()
    this.physics.remove('echo')
    this.echo = undefined
  }

  private disposeRuntime(): void {
    this.removeEchoPath()
    for (const entry of this.transientObjects.splice(0)) {
      this.scene.remove(entry.object)
      entry.object.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      })
    }
    this.trajectoryLine.visible = false
    this.trajectoryGeometry.setDrawRange(0, 0)
    if (this.player) {
      this.scene.remove(this.player.animator.root)
      this.player.motor.dispose()
      this.player.animator.dispose()
      this.player = undefined
    }
    if (this.echo) {
      this.scene.remove(this.echo.animator.root)
      this.echo.motor.dispose()
      this.echo.animator.dispose()
      this.echo = undefined
    }
    this.world?.dispose()
    this.world = undefined
    this.physics?.dispose()
    this.physics = undefined
  }

  private installWindowHandlers(): void {
    const signal = this.abortController.signal
    window.addEventListener('resize', () => this.resize(), { signal })
    window.addEventListener('orientationchange', () => this.resize(), { signal })
    document.addEventListener('fullscreenchange', () => this.resize(), { signal })
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.contextLost = true
      this.mode = 'error'
      this.hud.showError(translate(this.language, 'errorWebgl'))
    }, { signal })
    this.canvas.addEventListener('webglcontextrestored', () => window.location.reload(), { signal })
  }

  private resize(): void {
    const width = Math.max(1, window.innerWidth)
    const height = Math.max(1, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(width, height, false)
    this.camera.resize(width, height)
    const mobile = this.isMobileDevice()
    const portrait = mobile && height > width
    this.hud.setMobileControlsEnabled(mobile)
    this.hud.setRotationRequired(portrait)
    this.rotationPaused = portrait
  }

  private isMobileDevice(): boolean {
    return matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 620
  }

  private installPublicApi(): void {
    window.render_game_to_text = () => JSON.stringify(this.renderState())
    window.advanceTime = (milliseconds: number) => {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) return
      this.fixedLoop.advance(milliseconds, () => {
        if (this.mode === 'playing' && !this.transitionPending) this.fixedTick()
      })
      this.render(0)
    }
    if (import.meta.env.DEV) {
      window.echoDepthsDebug = {
        selectChapter: async (chapter: ChapterNumber) => this.selectChapter(chapter),
        finishTutorial: async () => this.finishTutorial(),
        setManualStepping: (enabled: boolean) => {
          this.manualStepping = enabled
          this.fixedLoop.reset()
          this.lastTime = performance.now()
          this.render(0)
        },
        setInput: (input: DebugInput) => { this.debugInput = { ...input } },
        advanceInput: (input: DebugInput, ticks: number) => {
          const count = Math.max(0, Math.trunc(ticks))
          for (let index = 0; index < count; index += 1) {
            if (this.mode !== 'playing' || this.transitionPending) break
            this.debugInput = { ...input }
            this.fixedTick()
          }
          this.render(0)
        },
        releaseAllInputs: () => { this.debugInput = undefined; this.input.clear() },
        advanceTicks: (ticks: number) => window.advanceTime?.(Math.max(0, Math.trunc(ticks)) * FIXED_STEP_MS),
        restartChapter: async () => this.restartChapter(false),
        solutionStep: (step: number) => {
          if (!this.world || !this.player) return
          const player: ActorContext = { id: 'player', kind: 'player', position: this.player.motor.position, facingYaw: this.player.motor.facingYaw, carryYaw: this.player.motor.facingYaw, interactHeld: false }
          const echo = this.echo ? { id: 'echo', kind: 'echo' as const, position: this.echo.motor.position, facingYaw: this.echo.motor.facingYaw, carryYaw: this.echo.motor.facingYaw, interactHeld: false } : undefined
          this.world.performDebugSolutionStep(step, player, echo)
          if (this.world.complete && this.mode === 'playing') this.completeChapter()
        },
        assetStatus: () => this.assets.status,
      }
    }
  }

  private renderState(): Record<string, unknown> {
    const player = this.player
    const world = this.world?.debugState()
    const mobileControls = document.querySelector<HTMLElement>('#mobile-controls')
    return {
      mode: this.mode,
      language: this.language,
      chapter: this.chapter,
      camera: { position: this.vec(this.camera.camera.position) },
      player: player ? { position: this.vec(player.motor.position), velocity: this.vec(player.motor.velocity), grounded: player.motor.grounded, animation: player.animator.state() } : null,
      echo: this.echo ? { mode: this.echoTape.mode, tick: this.echoTape.playbackTick, durationTicks: this.echoTape.durationTicks, position: this.vec(this.echo.motor.position), animation: this.echo.animator.state() } : { mode: this.echoTape.mode, tick: 0, durationTicks: this.echoTape.durationTicks },
      timer: this.stats.elapsedMs,
      pressurePlates: world?.pressurePlates ?? {},
      levers: world?.levers ?? {},
      doors: world?.doors ?? {},
      elevators: world?.elevators ?? {},
      cores: world?.cores ?? {},
      enemies: world?.enemies ?? {},
      objectives: { required: world?.objectiveFacts ?? [], facts: world?.facts ?? [], complete: world?.complete ?? false },
      tutorial: this.chapter === 0 ? { completed: [...this.tutorialSteps], ready: this.tutorialComplete } : null,
      score: Math.max(0, Math.round(10_000 - this.stats.elapsedMs / 100 - this.stats.failures * 350 - this.stats.restarts * 150)),
      resetCount: this.stats.restarts,
      failures: this.stats.failures,
      echoesCreated: this.stats.echoes,
      mobileControlsVisible: mobileControls ? !mobileControls.hidden : false,
      fullscreen: document.fullscreenElement !== null,
      assetStatus: this.assets.status,
      fixedTick: this.tick,
      escapeSeconds: world?.escapeSeconds ?? 0,
      render: {
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        pixelRatio: this.renderer.getPixelRatio(),
      },
    }
  }

  private vec(vector: THREE.Vector3): { x: number; y: number; z: number } {
    return { x: Number(vector.x.toFixed(3)), y: Number(vector.y.toFixed(3)), z: Number(vector.z.toFixed(3)) }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.rebuildGeneration += 1
    cancelAnimationFrame(this.animationFrame)
    this.abortController.abort()
    this.disposeRuntime()
    this.input.destroy()
    this.hud.destroy()
    this.audio.destroy()
    this.assets.dispose()
    this.renderer.dispose()
    this.scene.remove(this.trajectoryLine)
    this.trajectoryGeometry.dispose()
    this.echoPathMaterial.dispose()
    this.trajectoryMaterial.dispose()
    delete window.render_game_to_text
    delete window.advanceTime
    delete window.echoDepthsDebug
  }
}
