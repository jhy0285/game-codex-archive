import { describe, expect, it } from 'vitest'
import { CHAPTERS, ObjectiveFacts } from './chapters'
import {
  evaluateChapterObjectives,
  objectiveFactsFromWorld,
} from './objectives'

describe('authored chapter objectives', () => {
  it('defines five ordered chapters with unique authored devices', () => {
    expect(CHAPTERS).toHaveLength(5)
    expect(CHAPTERS.map((chapter) => chapter.index)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(CHAPTERS.map((chapter) => chapter.id)).size).toBe(5)
    for (const chapter of CHAPTERS) {
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(2)
      expect(chapter.victoryFacts.length).toBeGreaterThanOrEqual(2)
      expect(chapter.echoMaxTicks).toBeGreaterThan(0)
    }
  })

  it.each(CHAPTERS)('$id completes only when every victory fact is present', (chapter) => {
    const complete = evaluateChapterObjectives(chapter, chapter.victoryFacts)
    expect(complete.complete).toBe(true)
    expect(complete.objectives.every((objective) => objective.complete)).toBe(true)

    for (const omitted of chapter.victoryFacts) {
      const partial = chapter.victoryFacts.filter((fact) => fact !== omitted)
      const evaluation = evaluateChapterObjectives(chapter, partial)
      expect(evaluation.complete).toBe(false)
      expect(evaluation.missingVictoryFacts).toContain(omitted)
    }
  })

  it('requires hazard defeat rather than ordinary watcher damage', () => {
    const evaluation = evaluateChapterObjectives('watchers-gallery', [
      ObjectiveFacts.WatcherLuredByEcho,
      ObjectiveFacts.PlayerAtExit,
    ])
    expect(evaluation.complete).toBe(false)
    expect(evaluation.missingVictoryFacts).toEqual([ObjectiveFacts.WatcherDefeatedByHazard])
  })

  it('keeps finale victory facts to physical outcomes rather than solution history', () => {
    const evaluation = evaluateChapterObjectives('paradox-well', [
      ObjectiveFacts.CoreInWellReceiver,
      ObjectiveFacts.GuardianDistractedByEcho,
      ObjectiveFacts.EchoOnFinalPlate,
      ObjectiveFacts.PlayerHoldingFinalLever,
      ObjectiveFacts.PlayerAtExit,
    ])
    expect(evaluation.complete).toBe(false)
    expect(evaluation.missingVictoryFacts).toEqual([
      ObjectiveFacts.GuardianRearSealBrokenFromHeight,
      ObjectiveFacts.FinalDoorReleased,
    ])
  })

  it('does not require an internal throw-history fact after the real Core reaches its receiver', () => {
    const chapter = CHAPTERS[4]
    if (!chapter) throw new Error('Paradox Well definition is missing')
    expect(chapter.victoryFacts).not.toContain('core-thrown-down-well')
    expect(chapter.victoryFacts).not.toContain(ObjectiveFacts.GuardianDistractedByEcho)
    expect(chapter.victoryFacts).toEqual([
      ObjectiveFacts.CoreInWellReceiver,
      ObjectiveFacts.GuardianRearSealBrokenFromHeight,
      ObjectiveFacts.FinalDoorReleased,
      ObjectiveFacts.PlayerAtExit,
    ])
  })

  it('maps renderer/world facts into typed objective facts', () => {
    // Ch3 removed: core-caught, core-redirected, core-route-complete facts are no longer produced.
    expect(objectiveFactsFromWorld([
      'bridge-lever-echo',
      'receiver-filled',
    ], true)).toEqual([
      ObjectiveFacts.EchoHoldingBridgeLever,
      ObjectiveFacts.CoreInAtriumReceiver,
      ObjectiveFacts.PlayerAtExit,
    ])
  })
})
