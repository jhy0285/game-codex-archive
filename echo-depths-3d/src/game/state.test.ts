import { describe, expect, it } from 'vitest'
import { ObjectiveFacts } from './chapters'
import {
  advanceChapterClock,
  advanceCampaignClock,
  calculateFinalRank,
  createInitialCampaignState,
  createInitialChapterState,
  markChapterComplete,
  recordEchoCreation,
  recordFailure,
  recordFact,
  resetCampaignState,
  resetChapterState,
  restartCurrentChapter,
  setObjectiveFact,
  startEscapeTimer,
} from './state'

describe('localization-independent state reset', () => {
  it('recreates every chapter-owned state category with fresh references', () => {
    const state = createInitialChapterState('paradox-well')
    state.simulationTick = 800
    state.chapterElapsedTicks = 800
    state.escapeTicksRemaining = 10
    state.player.position.x = 99
    state.player.velocity.y = -8
    state.player.carryingId = 'paradox-core'
    state.echoActor = structuredClone(state.player)
    state.echoActor.id = 'echo'
    state.echo.mode = 'holding'
    state.echo.durationTicks = 240
    state.facts.push(ObjectiveFacts.CoreInWellReceiver)
    state.plates[0]!.pressed = true
    state.levers[0]!.active = true
    state.doors[0]!.open = true
    state.platforms[0]!.phaseTick = 91
    state.cores[0]!.velocity.x = 12
    state.enemies[0]!.mode = 'alert'
    state.traps[0]!.triggered = true

    const elevatorState = createInitialChapterState('counterweight-hall')
    elevatorState.elevators[0]!.positionY = 4
    elevatorState.elevators[0]!.active = true

    const reset = resetChapterState(state)
    const elevatorReset = resetChapterState(elevatorState)
    expect(reset).not.toBe(state)
    expect(reset.player).not.toBe(state.player)
    expect(reset.plates).not.toBe(state.plates)
    expect(reset.levers).not.toBe(state.levers)
    expect(reset.cores).not.toBe(state.cores)
    expect(reset.enemies).not.toBe(state.enemies)
    expect(reset).toMatchObject({
      phase: 'active',
      simulationTick: 0,
      chapterElapsedTicks: 0,
      escapeTicksRemaining: null,
      resetCount: 1,
      echoActor: null,
      facts: [],
    })
    expect(reset.player.carryingId).toBeNull()
    expect(reset.plates.every((plate) => !plate.pressed)).toBe(true)
    expect(reset.levers.every((lever) => !lever.active && !lever.latched)).toBe(true)
    expect(reset.doors.every((door) => !door.open && door.progress === 0)).toBe(true)
    expect(elevatorReset.elevators).not.toBe(elevatorState.elevators)
    expect(elevatorReset.elevators.every((elevator) => elevator.positionY === 0 && !elevator.active)).toBe(true)
    expect(reset.platforms.every((platform) => platform.phaseTick === 0 && !platform.active)).toBe(true)
    expect(reset.cores.every((core) => core.carriedBy === null && !core.redirected)).toBe(true)
    expect(reset.enemies.every((enemy) => enemy.mode === 'patrol' && enemy.detection === 0)).toBe(true)
    expect(reset.traps.every((trap) => trap.armed && !trap.triggered)).toBe(true)
  })

  it('fully resets campaign metrics while retaining the selected language', () => {
    const state = createInitialCampaignState('ko', 'split-atrium')
    state.stats.elapsedTicks = 50_000
    state.stats.echoesCreated = 8
    state.stats.failures = 3
    state.stats.chapterRestarts = 4
    state.stats.score = 900
    state.completedChapterIds.push('first-descent')
    const reset = resetCampaignState(state)
    expect(reset.language).toBe('ko')
    expect(reset.languageSelected).toBe(true)
    expect(reset.mode).toBe('title')
    expect(reset.chapter.chapterId).toBe('first-descent')
    expect(reset.completedChapterIds).toEqual([])
    expect(reset.stats).toEqual({
      elapsedTicks: 0,
      echoesCreated: 0,
      failures: 0,
      chapterRestarts: 0,
      score: 0,
      chapterTimesTicks: {},
    })
  })

  it('adds and removes transient objective facts without duplicates', () => {
    let state = createInitialChapterState()
    state = recordFact(state, ObjectiveFacts.EchoOnFirstPlate)
    state = recordFact(state, ObjectiveFacts.EchoOnFirstPlate)
    expect(state.facts).toEqual([ObjectiveFacts.EchoOnFirstPlate])
    state = setObjectiveFact(state, ObjectiveFacts.EchoOnFirstPlate, false)
    expect(state.facts).toEqual([])
  })

  it('fails a timed escape exactly when the fixed-tick countdown reaches zero', () => {
    let state = startEscapeTimer(createInitialChapterState('paradox-well'))
    expect(state.escapeTicksRemaining).toBe(15 * 60)
    state = advanceChapterClock(state, 15 * 60 - 1)
    expect(state.phase).toBe('active')
    expect(state.escapeTicksRemaining).toBe(1)
    state = advanceChapterClock(state)
    expect(state.phase).toBe('failed')
    expect(state.escapeTicksRemaining).toBe(0)
  })

  it('marks completion only after the pure chapter victory rule passes', () => {
    let campaign = createInitialCampaignState('en')
    campaign.mode = 'playing'
    const incomplete = markChapterComplete(campaign)
    expect(incomplete.mode).toBe('playing')
    for (const fact of [
      ObjectiveFacts.TutorialLeverUsed,
      ObjectiveFacts.EchoOnFirstPlate,
      ObjectiveFacts.PlayerAtExit,
    ]) {
      campaign.chapter = recordFact(campaign.chapter, fact)
    }
    const complete = markChapterComplete(campaign)
    expect(complete.mode).toBe('chapter-complete')
    expect(complete.chapter.phase).toBe('complete')
    expect(complete.completedChapterIds).toContain('first-descent')
  })

  it('calculates stable final ranks from fixed-tick metrics', () => {
    const state = createInitialCampaignState('en')
    expect(calculateFinalRank(state.stats)).toBe('S')
    state.stats.failures = 2
    state.stats.elapsedTicks = 23 * 60 * 60
    expect(calculateFinalRank(state.stats)).toBe('A')
    state.stats.elapsedTicks = 35 * 60 * 60
    expect(calculateFinalRank(state.stats)).toBe('B')
    state.stats.elapsedTicks = 45 * 60 * 60
    expect(calculateFinalRank(state.stats)).toBe('C')
  })

  it('tracks fixed-time, echo, failure, and restart statistics independently', () => {
    let state = createInitialCampaignState('en')
    state.mode = 'playing'
    state = advanceCampaignClock(state, 120)
    state = recordEchoCreation(state)
    state = recordFailure(state)
    state = restartCurrentChapter(state)
    expect(state.stats).toMatchObject({
      elapsedTicks: 120,
      echoesCreated: 1,
      failures: 1,
      chapterRestarts: 1,
    })
    expect(state.chapter.phase).toBe('active')
    expect(state.chapter.resetCount).toBe(1)
  })
})
