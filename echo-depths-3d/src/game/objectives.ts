import {
  CHAPTER_BY_ID,
  type ChapterDefinition,
  type ChapterId,
  type ObjectiveFact,
} from './chapters'

export const WORLD_FACT_TO_OBJECTIVE_FACT: Readonly<Record<string, ObjectiveFact>> = {
  'tutorial-lever': 'tutorial-lever-used',
  'echo-plate': 'echo-on-first-plate',
  'lift-lever-echo': 'echo-holding-counterweight-lever',
  'elevator-ridden': 'elevator-reached-upper',
  'cargo-plate': 'cargo-on-weight-plate',
  'core-caught': 'core-caught-by-player',
  'core-redirected': 'core-redirected-by-attack',
  'receiver-filled': 'core-in-atrium-receiver',
  'bridge-lever-echo': 'echo-holding-bridge-lever',
  'core-route-complete': 'bridge-locked',
  'lured-by-echo': 'watcher-lured-by-echo',
  'watcher-trapped': 'watcher-defeated-by-hazard',
  'core-thrown-down': 'core-thrown-down-well',
  'core-receiver': 'core-in-well-receiver',
  'guardian-target-echo': 'guardian-distracted-by-echo',
  'guardian-defeated': 'guardian-rear-seal-broken-from-height',
  'lower-seal-echo': 'echo-on-final-plate',
  'upper-seal-player': 'player-holding-final-lever',
  'dual-seal': 'escape-timer-active',
}

export const objectiveFactsFromWorld = (
  worldFacts: readonly string[],
  playerAtExit = false,
): ObjectiveFact[] => {
  const mapped = new Set<ObjectiveFact>()
  for (const fact of worldFacts) {
    const objectiveFact = WORLD_FACT_TO_OBJECTIVE_FACT[fact]
    if (objectiveFact) mapped.add(objectiveFact)
  }
  if (playerAtExit) mapped.add('player-at-exit')
  return [...mapped]
}

export type ObjectiveEvaluation = Readonly<{
  id: string
  labelKey: ChapterDefinition['objectives'][number]['labelKey']
  complete: boolean
  missingFacts: readonly ObjectiveFact[]
}>

export type ChapterObjectiveEvaluation = Readonly<{
  chapterId: ChapterId
  complete: boolean
  objectives: readonly ObjectiveEvaluation[]
  missingVictoryFacts: readonly ObjectiveFact[]
}>

const toFactSet = (facts: ReadonlySet<ObjectiveFact> | readonly ObjectiveFact[]) =>
  facts instanceof Set ? facts : new Set(facts)

export const evaluateChapterObjectives = (
  chapterOrId: ChapterDefinition | ChapterId,
  facts: ReadonlySet<ObjectiveFact> | readonly ObjectiveFact[],
): ChapterObjectiveEvaluation => {
  const chapter = typeof chapterOrId === 'string' ? CHAPTER_BY_ID[chapterOrId] : chapterOrId
  const factSet = toFactSet(facts)
  const objectives = chapter.objectives.map((objective) => {
    const missingFacts = objective.requiredFacts.filter((fact) => !factSet.has(fact))
    return {
      id: objective.id,
      labelKey: objective.labelKey,
      complete: missingFacts.length === 0,
      missingFacts,
    }
  })
  const missingVictoryFacts = chapter.victoryFacts.filter((fact) => !factSet.has(fact))
  return {
    chapterId: chapter.id,
    complete: missingVictoryFacts.length === 0,
    objectives,
    missingVictoryFacts,
  }
}
