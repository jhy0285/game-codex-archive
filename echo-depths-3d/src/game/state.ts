import {
  CHAPTERS,
  CHAPTER_BY_ID,
  type ChapterId,
  type ObjectiveFact,
} from './chapters'
import { evaluateChapterObjectives } from './objectives'
import {
  cloneVector3,
  vector3,
  type ActorState,
  type BridgeRuntimeState,
  type CrateRuntimeState,
  type CoreRuntimeState,
  type DoorRuntimeState,
  type EchoRuntimeState,
  type ElevatorRuntimeState,
  type EnemyRuntimeState,
  type GameMode,
  type Language,
  type LeverRuntimeState,
  type PlateRuntimeState,
  type PlatformRuntimeState,
  type TrapRuntimeState,
} from './types'

export type CampaignStats = {
  elapsedTicks: number
  echoesCreated: number
  failures: number
  chapterRestarts: number
  score: number
  chapterTimesTicks: Partial<Record<ChapterId, number>>
}

export type ChapterRuntimeState = {
  chapterId: ChapterId
  phase: 'active' | 'complete' | 'failed'
  simulationTick: number
  chapterElapsedTicks: number
  escapeTicksRemaining: number | null
  resetCount: number
  player: ActorState
  echoActor: ActorState | null
  echo: EchoRuntimeState
  facts: ObjectiveFact[]
  plates: PlateRuntimeState[]
  levers: LeverRuntimeState[]
  doors: DoorRuntimeState[]
  elevators: ElevatorRuntimeState[]
  platforms: PlatformRuntimeState[]
  bridges: BridgeRuntimeState[]
  traps: TrapRuntimeState[]
  crates: CrateRuntimeState[]
  cores: CoreRuntimeState[]
  enemies: EnemyRuntimeState[]
}

export type CampaignState = {
  mode: GameMode
  language: Language
  languageSelected: boolean
  chapter: ChapterRuntimeState
  completedChapterIds: ChapterId[]
  unlockedChapterIds: ChapterId[]
  stats: CampaignStats
}

const createActor = (
  id: ActorState['id'],
  position: ActorState['position'],
): ActorState => ({
  id,
  position: cloneVector3(position),
  velocity: vector3(),
  grounded: false,
  facingYaw: 0,
  carryingId: null,
  defeated: false,
})

const createInitialStats = (): CampaignStats => ({
  elapsedTicks: 0,
  echoesCreated: 0,
  failures: 0,
  chapterRestarts: 0,
  score: 0,
  chapterTimesTicks: {},
})

export const createInitialChapterState = (
  chapterId: ChapterId = 'first-descent',
  resetCount = 0,
): ChapterRuntimeState => {
  const chapter = CHAPTER_BY_ID[chapterId]
  return {
    chapterId,
    phase: 'active',
    simulationTick: 0,
    chapterElapsedTicks: 0,
    escapeTicksRemaining: null,
    resetCount,
    player: createActor('player', chapter.playerSpawn),
    echoActor: null,
    echo: {
      mode: 'absent',
      tick: 0,
      durationTicks: 0,
      pathSamples: 0,
    },
    facts: [],
    plates: chapter.plates.map((plate) => ({
      id: plate.id,
      pressed: false,
      totalMass: 0,
      occupantIds: [],
    })),
    levers: chapter.levers.map((lever) => ({
      id: lever.id,
      active: false,
      latched: false,
      heldBy: null,
    })),
    doors: chapter.doorIds.map((id) => ({ id, open: false, progress: 0 })),
    elevators: chapter.elevatorIds.map((id) => ({
      id,
      floor: 0,
      targetFloor: 0,
      positionY: 0,
      active: false,
    })),
    platforms: chapter.platformIds.map((id) => ({
      id,
      position: vector3(),
      phaseTick: 0,
      active: false,
    })),
    bridges: chapter.bridgeIds.map((id) => ({
      id,
      angle: 0,
      targetAngle: 0,
      locked: false,
    })),
    traps: chapter.trapIds.map((id) => ({ id, armed: true, triggered: false })),
    crates: chapter.crates.map((crate) => ({
      id: crate.id,
      position: cloneVector3(crate.spawn),
      velocity: vector3(),
      carriedBy: null,
      mass: crate.mass,
    })),
    cores: chapter.cores.map((core) => ({
      id: core.id,
      position: cloneVector3(core.spawn),
      velocity: vector3(),
      carriedBy: null,
      socketId: null,
      redirected: false,
    })),
    enemies: chapter.enemies.map((enemy) => ({
      id: enemy.id,
      position: cloneVector3(enemy.spawn),
      velocity: vector3(),
      mode: 'patrol',
      sightTarget: null,
      detection: 0,
      defeatedBy: null,
    })),
  }
}

export const createInitialCampaignState = (
  language?: Language,
  chapterId: ChapterId = 'first-descent',
): CampaignState => ({
  mode: language === undefined ? 'language-select' : 'title',
  language: language ?? 'en',
  languageSelected: language !== undefined,
  chapter: createInitialChapterState(chapterId),
  completedChapterIds: [],
  unlockedChapterIds: CHAPTERS.map((chapter) => chapter.id),
  stats: createInitialStats(),
})

export const resetChapterState = (
  current: Readonly<ChapterRuntimeState>,
): ChapterRuntimeState => createInitialChapterState(current.chapterId, current.resetCount + 1)

export const resetCampaignState = (
  current?: Readonly<CampaignState>,
): CampaignState => {
  const language = current?.language
  const reset = createInitialCampaignState(language)
  if (current && !current.languageSelected) {
    reset.mode = 'language-select'
    reset.languageSelected = false
  }
  return reset
}

export const selectLanguage = (
  current: Readonly<CampaignState>,
  language: Language,
): CampaignState => ({
  ...structuredClone(current),
  mode: 'title',
  language,
  languageSelected: true,
})

export const setObjectiveFact = (
  current: Readonly<ChapterRuntimeState>,
  fact: ObjectiveFact,
  active: boolean,
): ChapterRuntimeState => {
  const facts = new Set(current.facts)
  if (active) facts.add(fact)
  else facts.delete(fact)
  return { ...structuredClone(current), facts: [...facts] }
}

export const recordFact = (
  current: Readonly<ChapterRuntimeState>,
  fact: ObjectiveFact,
): ChapterRuntimeState => setObjectiveFact(current, fact, true)

export const advanceChapterClock = (
  current: Readonly<ChapterRuntimeState>,
  ticks = 1,
): ChapterRuntimeState => {
  const safeTicks = Math.max(0, Math.trunc(ticks))
  if (safeTicks === 0 || current.phase !== 'active') return structuredClone(current)
  const escapeTicksRemaining = current.escapeTicksRemaining === null
    ? null
    : Math.max(0, current.escapeTicksRemaining - safeTicks)
  return {
    ...structuredClone(current),
    simulationTick: current.simulationTick + safeTicks,
    chapterElapsedTicks: current.chapterElapsedTicks + safeTicks,
    escapeTicksRemaining,
    phase: escapeTicksRemaining === 0 ? 'failed' : current.phase,
  }
}

export const startEscapeTimer = (
  current: Readonly<ChapterRuntimeState>,
): ChapterRuntimeState => {
  const duration = CHAPTER_BY_ID[current.chapterId].escapeTimeTicks
  if (duration === null) return structuredClone(current)
  return { ...structuredClone(current), escapeTicksRemaining: duration }
}

export const getChapterObjectiveState = (current: Readonly<ChapterRuntimeState>) =>
  evaluateChapterObjectives(current.chapterId, current.facts)

export const markChapterComplete = (
  current: Readonly<CampaignState>,
): CampaignState => {
  const evaluation = getChapterObjectiveState(current.chapter)
  if (!evaluation.complete) return structuredClone(current)
  const completed = new Set(current.completedChapterIds)
  completed.add(current.chapter.chapterId)
  const chapterTimesTicks = {
    ...current.stats.chapterTimesTicks,
    [current.chapter.chapterId]: current.chapter.chapterElapsedTicks,
  }
  return {
    ...structuredClone(current),
    mode: current.chapter.chapterId === 'paradox-well' ? 'ending' : 'chapter-complete',
    chapter: { ...structuredClone(current.chapter), phase: 'complete' },
    completedChapterIds: [...completed],
    stats: { ...structuredClone(current.stats), chapterTimesTicks },
  }
}

export const calculateFinalRank = (
  stats: Readonly<CampaignStats>,
): 'S' | 'A' | 'B' | 'C' => {
  const minutes = stats.elapsedTicks / 60 / 60
  if (stats.failures === 0 && stats.chapterRestarts <= 1 && minutes < 18) return 'S'
  if (stats.failures <= 3 && minutes < 25) return 'A'
  if (minutes < 40) return 'B'
  return 'C'
}

export const advanceCampaignClock = (
  current: Readonly<CampaignState>,
  ticks = 1,
): CampaignState => {
  const safeTicks = Math.max(0, Math.trunc(ticks))
  if (safeTicks === 0 || current.mode !== 'playing') return structuredClone(current)
  return {
    ...structuredClone(current),
    chapter: advanceChapterClock(current.chapter, safeTicks),
    stats: {
      ...structuredClone(current.stats),
      elapsedTicks: current.stats.elapsedTicks + safeTicks,
    },
  }
}

export const recordEchoCreation = (
  current: Readonly<CampaignState>,
): CampaignState => ({
  ...structuredClone(current),
  stats: {
    ...structuredClone(current.stats),
    echoesCreated: current.stats.echoesCreated + 1,
  },
})

export const recordFailure = (
  current: Readonly<CampaignState>,
): CampaignState => ({
  ...structuredClone(current),
  chapter: { ...structuredClone(current.chapter), phase: 'failed' },
  stats: {
    ...structuredClone(current.stats),
    failures: current.stats.failures + 1,
  },
})

export const restartCurrentChapter = (
  current: Readonly<CampaignState>,
): CampaignState => ({
  ...structuredClone(current),
  mode: 'playing',
  chapter: resetChapterState(current.chapter),
  stats: {
    ...structuredClone(current.stats),
    chapterRestarts: current.stats.chapterRestarts + 1,
  },
})

export const startChapter = (
  current: Readonly<CampaignState>,
  chapterId: ChapterId,
): CampaignState => ({
  ...structuredClone(current),
  mode: 'playing',
  chapter: createInitialChapterState(chapterId),
})
