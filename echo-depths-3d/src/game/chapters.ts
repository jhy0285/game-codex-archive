import type { TranslationKey } from './i18n'
import type { ReadonlyVector3 } from './types'

export type ChapterId =
  | 'first-descent'
  | 'counterweight-hall'
  | 'split-atrium'
  | 'watchers-gallery'
  | 'paradox-well'

export const ObjectiveFacts = {
  TutorialLeverUsed: 'tutorial-lever-used',
  EchoOnFirstPlate: 'echo-on-first-plate',
  EchoHoldingCounterweightLever: 'echo-holding-counterweight-lever',
  ElevatorReachedUpper: 'elevator-reached-upper',
  CargoOnWeightPlate: 'cargo-on-weight-plate',
  CoreCaughtByPlayer: 'core-caught-by-player',
  CoreRedirectedByAttack: 'core-redirected-by-attack',
  CoreInAtriumReceiver: 'core-in-atrium-receiver',
  EchoHoldingBridgeLever: 'echo-holding-bridge-lever',
  BridgeLocked: 'bridge-locked',
  WatcherLuredByEcho: 'watcher-lured-by-echo',
  WatcherDefeatedByHazard: 'watcher-defeated-by-hazard',
  CoreThrownDownWell: 'core-thrown-down-well',
  CoreInWellReceiver: 'core-in-well-receiver',
  GuardianDistractedByEcho: 'guardian-distracted-by-echo',
  GuardianRearSealBrokenFromHeight: 'guardian-rear-seal-broken-from-height',
  EchoOnFinalPlate: 'echo-on-final-plate',
  PlayerHoldingFinalLever: 'player-holding-final-lever',
  EscapeTimerActive: 'escape-timer-active',
  PlayerAtExit: 'player-at-exit',
} as const

export type ObjectiveFact = (typeof ObjectiveFacts)[keyof typeof ObjectiveFacts]

export type ChapterMechanic =
  | 'move'
  | 'camera'
  | 'jump'
  | 'interact'
  | 'echo'
  | 'carry'
  | 'elevator'
  | 'height'
  | 'throw'
  | 'catch'
  | 'redirect'
  | 'rotating-bridge'
  | 'sight'
  | 'cover'
  | 'lure'
  | 'knockback'
  | 'hazard'
  | 'moving-platform'
  | 'guardian'
  | 'timed-escape'

export type PlateAuthoredDefinition = Readonly<{
  id: string
  accepts: 'actor' | 'cargo' | 'core' | 'any'
  requiredMass: number
}>

export type LeverAuthoredDefinition = Readonly<{
  id: string
  mode: 'momentary' | 'toggle' | 'latch'
}>

export type CoreAuthoredDefinition = Readonly<{
  id: string
  spawn: ReadonlyVector3
}>

export type CrateAuthoredDefinition = Readonly<{
  id: string
  spawn: ReadonlyVector3
  mass: number
}>

export type EnemyAuthoredDefinition = Readonly<{
  id: string
  spawn: ReadonlyVector3
  role: 'watcher' | 'guardian'
}>

export type ChapterObjectiveDefinition = Readonly<{
  id: string
  labelKey: TranslationKey
  requiredFacts: readonly ObjectiveFact[]
}>

export type ChapterDefinition = Readonly<{
  id: ChapterId
  index: number
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  objectiveKey: TranslationKey
  hintKey: TranslationKey
  echoMaxTicks: number
  escapeTimeTicks: number | null
  playerSpawn: ReadonlyVector3
  exitCenter: ReadonlyVector3
  mechanics: readonly ChapterMechanic[]
  plates: readonly PlateAuthoredDefinition[]
  levers: readonly LeverAuthoredDefinition[]
  doorIds: readonly string[]
  elevatorIds: readonly string[]
  platformIds: readonly string[]
  bridgeIds: readonly string[]
  trapIds: readonly string[]
  crates: readonly CrateAuthoredDefinition[]
  cores: readonly CoreAuthoredDefinition[]
  enemies: readonly EnemyAuthoredDefinition[]
  objectives: readonly ChapterObjectiveDefinition[]
  victoryFacts: readonly ObjectiveFact[]
}>

const v = (x: number, y: number, z: number): ReadonlyVector3 => ({ x, y, z })

export const CHAPTERS: readonly ChapterDefinition[] = [
  {
    id: 'first-descent',
    index: 1,
    titleKey: 'chapter.first.title',
    subtitleKey: 'chapter.first.subtitle',
    objectiveKey: 'chapter.first.objective',
    hintKey: 'chapter.first.hint',
    echoMaxTicks: 12 * 60,
    escapeTimeTicks: null,
    playerSpawn: v(-7, 0.9, 5),
    exitCenter: v(7, 2.4, -5),
    mechanics: ['move', 'camera', 'jump', 'interact', 'echo'],
    plates: [{ id: 'echo-plate', accepts: 'actor', requiredMass: 1 }],
    levers: [{ id: 'tutorial-lever', mode: 'latch' }],
    doorIds: ['first-door'],
    elevatorIds: [],
    platformIds: [],
    bridgeIds: [],
    trapIds: [],
    crates: [],
    cores: [],
    enemies: [],
    objectives: [
      {
        id: 'learn-interaction',
        labelKey: 'objective.first.interact',
        requiredFacts: [ObjectiveFacts.TutorialLeverUsed],
      },
      {
        id: 'leave-echo',
        labelKey: 'objective.first.echoPlate',
        requiredFacts: [ObjectiveFacts.EchoOnFirstPlate],
      },
      {
        id: 'reach-exit',
        labelKey: 'objective.common.exit',
        requiredFacts: [ObjectiveFacts.PlayerAtExit],
      },
    ],
    victoryFacts: [
      ObjectiveFacts.TutorialLeverUsed,
      ObjectiveFacts.EchoOnFirstPlate,
      ObjectiveFacts.PlayerAtExit,
    ],
  },
  {
    id: 'counterweight-hall',
    index: 2,
    titleKey: 'chapter.counterweight.title',
    subtitleKey: 'chapter.counterweight.subtitle',
    objectiveKey: 'chapter.counterweight.objective',
    hintKey: 'chapter.counterweight.hint',
    echoMaxTicks: 15 * 60,
    escapeTimeTicks: null,
    playerSpawn: v(-7, 0.9, 4),
    exitCenter: v(7, 4.1, -4),
    mechanics: ['echo', 'interact', 'carry', 'elevator', 'height'],
    plates: [{ id: 'weight-plate', accepts: 'any', requiredMass: 1 }],
    levers: [{ id: 'lift-lever', mode: 'momentary' }],
    doorIds: ['counter-door'],
    elevatorIds: ['counter-elevator'],
    platformIds: [],
    bridgeIds: [],
    trapIds: [],
    crates: [{ id: 'cargo-crate', spawn: v(5.7, 5, 1.6), mass: 2 }],
    cores: [],
    enemies: [],
    objectives: [
      {
        id: 'power-elevator',
        labelKey: 'objective.counterweight.power',
        requiredFacts: [ObjectiveFacts.EchoHoldingCounterweightLever],
      },
      {
        id: 'raise-elevator',
        labelKey: 'objective.counterweight.ride',
        requiredFacts: [ObjectiveFacts.ElevatorReachedUpper],
      },
      {
        id: 'place-cargo',
        labelKey: 'objective.counterweight.cargo',
        requiredFacts: [ObjectiveFacts.CargoOnWeightPlate],
      },
      {
        id: 'reach-exit',
        labelKey: 'objective.common.exit',
        requiredFacts: [ObjectiveFacts.PlayerAtExit],
      },
    ],
    victoryFacts: [
      ObjectiveFacts.EchoHoldingCounterweightLever,
      ObjectiveFacts.ElevatorReachedUpper,
      ObjectiveFacts.CargoOnWeightPlate,
      ObjectiveFacts.PlayerAtExit,
    ],
  },
  {
    id: 'split-atrium',
    index: 3,
    titleKey: 'chapter.atrium.title',
    subtitleKey: 'chapter.atrium.subtitle',
    objectiveKey: 'chapter.atrium.objective',
    hintKey: 'chapter.atrium.hint',
    echoMaxTicks: 18 * 60,
    escapeTimeTicks: null,
    playerSpawn: v(-6, 4.1, 5),
    exitCenter: v(7, 2.6, -5),
    mechanics: ['move', 'carry', 'throw', 'redirect', 'height'],
    plates: [],
    levers: [],
    doorIds: ['atrium-door'],
    elevatorIds: [],
    platformIds: [],
    bridgeIds: [],
    trapIds: [],
    crates: [],
    cores: [{ id: 'memory-core', spawn: v(-3.0, 3.75, 1.6) }],
    enemies: [],
    objectives: [
      {
        id: 'redirect-core',
        labelKey: 'objective.atrium.redirect',
        requiredFacts: [ObjectiveFacts.CoreRedirectedByAttack],
      },
      {
        id: 'place-core',
        labelKey: 'objective.atrium.catch',
        requiredFacts: [ObjectiveFacts.CoreInAtriumReceiver],
      },
      {
        id: 'reach-exit',
        labelKey: 'objective.common.exit',
        requiredFacts: [ObjectiveFacts.PlayerAtExit],
      },
    ],
    victoryFacts: [
      ObjectiveFacts.CoreRedirectedByAttack,
      ObjectiveFacts.CoreInAtriumReceiver,
      ObjectiveFacts.PlayerAtExit,
    ],
  },
  {
    id: 'watchers-gallery',
    index: 4,
    titleKey: 'chapter.watcher.title',
    subtitleKey: 'chapter.watcher.subtitle',
    objectiveKey: 'chapter.watcher.objective',
    hintKey: 'chapter.watcher.hint',
    echoMaxTicks: 18 * 60,
    escapeTimeTicks: null,
    playerSpawn: v(-7, 0.9, 5),
    exitCenter: v(7, 3.2, -5),
    mechanics: ['echo', 'sight', 'cover', 'lure', 'knockback', 'hazard', 'height'],
    plates: [],
    levers: [{ id: 'lure-bell', mode: 'momentary' }],
    doorIds: ['gallery-door'],
    elevatorIds: [],
    platformIds: [],
    bridgeIds: [],
    trapIds: ['spike-trap', 'gallery-void'],
    crates: [],
    cores: [],
    enemies: [{ id: 'watcher', spawn: v(2.4, 0.98, -0.4), role: 'watcher' }],
    objectives: [
      {
        id: 'lure-watcher',
        labelKey: 'objective.watcher.lure',
        requiredFacts: [ObjectiveFacts.WatcherLuredByEcho],
      },
      {
        id: 'defeat-with-hazard',
        labelKey: 'objective.watcher.hazard',
        requiredFacts: [ObjectiveFacts.WatcherDefeatedByHazard],
      },
      {
        id: 'reach-exit',
        labelKey: 'objective.common.exit',
        requiredFacts: [ObjectiveFacts.PlayerAtExit],
      },
    ],
    victoryFacts: [
      ObjectiveFacts.WatcherLuredByEcho,
      ObjectiveFacts.WatcherDefeatedByHazard,
      ObjectiveFacts.PlayerAtExit,
    ],
  },
  {
    id: 'paradox-well',
    index: 5,
    titleKey: 'chapter.paradox.title',
    subtitleKey: 'chapter.paradox.subtitle',
    objectiveKey: 'chapter.paradox.objective',
    hintKey: 'chapter.paradox.hint',
    echoMaxTicks: 20 * 60,
    escapeTimeTicks: 35 * 60,
    playerSpawn: v(-7, 0.9, 6),
    exitCenter: v(8, 6.2, -7),
    mechanics: [
      'echo',
      'carry',
      'throw',
      'elevator',
      'moving-platform',
      'sight',
      'cover',
      'guardian',
      'height',
      'timed-escape',
    ],
    plates: [{ id: 'lower-seal', accepts: 'actor', requiredMass: 1 }],
    levers: [{ id: 'upper-seal', mode: 'momentary' }],
    doorIds: ['final-door'],
    elevatorIds: ['well-elevator'],
    platformIds: ['well-platform'],
    bridgeIds: [],
    trapIds: ['well-void'],
    crates: [],
    cores: [{ id: 'paradox-core', spawn: v(-5.7, 1.1, 2) }],
    enemies: [{ id: 'guardian', spawn: v(1.7, 3.58, 2.5), role: 'guardian' }],
    objectives: [
      {
        id: 'power-well',
        labelKey: 'objective.paradox.core',
        requiredFacts: [ObjectiveFacts.CoreThrownDownWell, ObjectiveFacts.CoreInWellReceiver],
      },
      {
        id: 'break-guardian-seal',
        labelKey: 'objective.paradox.guardian',
        requiredFacts: [
          ObjectiveFacts.GuardianDistractedByEcho,
          ObjectiveFacts.GuardianRearSealBrokenFromHeight,
        ],
      },
      {
        id: 'synchronize',
        labelKey: 'objective.paradox.sync',
        requiredFacts: [
          ObjectiveFacts.EchoOnFinalPlate,
          ObjectiveFacts.PlayerHoldingFinalLever,
        ],
      },
      {
        id: 'escape',
        labelKey: 'objective.paradox.escape',
        requiredFacts: [ObjectiveFacts.EscapeTimerActive, ObjectiveFacts.PlayerAtExit],
      },
    ],
    victoryFacts: [
      ObjectiveFacts.CoreThrownDownWell,
      ObjectiveFacts.CoreInWellReceiver,
      ObjectiveFacts.GuardianDistractedByEcho,
      ObjectiveFacts.GuardianRearSealBrokenFromHeight,
      ObjectiveFacts.EchoOnFinalPlate,
      ObjectiveFacts.PlayerHoldingFinalLever,
      ObjectiveFacts.EscapeTimerActive,
      ObjectiveFacts.PlayerAtExit,
    ],
  },
]

export const CHAPTER_BY_ID: Readonly<Record<ChapterId, ChapterDefinition>> = {
  'first-descent': CHAPTERS[0] as ChapterDefinition,
  'counterweight-hall': CHAPTERS[1] as ChapterDefinition,
  'split-atrium': CHAPTERS[2] as ChapterDefinition,
  'watchers-gallery': CHAPTERS[3] as ChapterDefinition,
  'paradox-well': CHAPTERS[4] as ChapterDefinition,
}

export const isChapterId = (value: string): value is ChapterId => value in CHAPTER_BY_ID
