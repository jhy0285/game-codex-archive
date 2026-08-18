import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './chapters'
import {
  EN_TRANSLATIONS,
  assertTranslationCompleteness,
  translate,
  translations,
  type TranslationKey,
} from './i18n'

describe('Korean and English text completeness', () => {
  it('contains a non-empty translation for every required key', () => {
    expect(assertTranslationCompleteness()).toEqual([])
    const englishKeys = Object.keys(translations.en).sort()
    const koreanKeys = Object.keys(translations.ko).sort()
    expect(koreanKeys).toEqual(englishKeys)
    expect(englishKeys.length).toBeGreaterThan(100)
  })

  it('reports missing or empty runtime catalog values', () => {
    expect(assertTranslationCompleteness({
      en: EN_TRANSLATIONS,
      ko: { 'start.title': '' },
    })).toContain('ko:start.title')
  })

  it('resolves every chapter and objective text key', () => {
    const keys = new Set(Object.keys(EN_TRANSLATIONS) as TranslationKey[])
    for (const chapter of CHAPTERS) {
      expect(keys.has(chapter.titleKey)).toBe(true)
      expect(keys.has(chapter.subtitleKey)).toBe(true)
      expect(keys.has(chapter.objectiveKey)).toBe(true)
      expect(keys.has(chapter.hintKey)).toBe(true)
      for (const objective of chapter.objectives) {
        expect(keys.has(objective.labelKey)).toBe(true)
      }
    }
  })

  it('substitutes HUD variables in both languages', () => {
    expect(translate('en', 'hud.chapter', { current: 2, total: 5 })).toBe('Chapter 2 / 5')
    expect(translate('ko', 'loading.progress', { progress: 75 })).toBe('불러오는 중 75%')
  })
})
