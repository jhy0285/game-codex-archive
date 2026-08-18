import { describe, expect, it } from 'vitest'
import { getStageCopy, stageLabel, tr, UI_KEYS } from './i18n.ts'

const STAGE_IDS = ['first-cut', 'dead-weight', 'cross-signal', 'sentinel-shift', 'fracture-run', 'zero-hour']

describe('language patch', () => {
  it('keeps a Korean translation for every visible UI key', () => {
    for (const key of UI_KEYS) {
      expect(tr('ko', key), `missing Korean translation for ${key}`).not.toBe(key)
    }
  })

  it('provides localized copy and world labels for all six chapters', () => {
    for (const stageId of STAGE_IDS) {
      const english = getStageCopy('en', stageId)
      const korean = getStageCopy('ko', stageId)
      expect(korean.title).not.toBe(english.title)
      expect(korean.subtitle).not.toBe(english.subtitle)
      expect(korean.objective).not.toBe(english.objective)
      expect(korean.tutorial).toHaveLength(3)
      expect(Object.keys(korean.labels).length).toBeGreaterThan(0)
    }
    expect(stageLabel('ko', 'zero-hour', 'cargo')).toBe('화물')
    expect(stageLabel('ko', 'cross-signal', 'receiver')).toBe('수신기')
  })
})
