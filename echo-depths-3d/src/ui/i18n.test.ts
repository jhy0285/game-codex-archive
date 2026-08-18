import { describe, expect, it } from 'vitest'
import { LANGUAGE_STORAGE_KEY, TRANSLATIONS, readStoredLanguage, translate, type TranslationKey } from './i18n'

describe('UI localization coverage', () => {
  it('keeps every English and Korean loading, error, and settings value complete', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en).sort()
    expect(Object.keys(TRANSLATIONS.ko).sort()).toEqual(englishKeys)
    for (const language of ['en', 'ko'] as const) {
      for (const value of Object.values(TRANSLATIONS[language])) expect(value.trim()).not.toBe('')
      for (const key of [
        'loadingEyebrow',
        'loading',
        'loadingDetail',
        'errorTitle',
        'errorAssets',
        'errorPhysics',
        'errorInitialization',
        'settingsTitle',
        'settingsBody',
        'settingsLanguage',
        'settingsSound',
        'settingsDisplay',
        'feedbackGuardianShield',
      ] satisfies TranslationKey[]) {
        expect(translate(language, key).trim()).not.toBe('')
      }
    }
  })

  it('reads only supported saved languages and tolerates unavailable storage', () => {
    const storage = (value: string | null): Pick<Storage, 'getItem'> => ({
      getItem: (key) => key === LANGUAGE_STORAGE_KEY ? value : null,
    })

    expect(readStoredLanguage(storage('ko'))).toBe('ko')
    expect(readStoredLanguage(storage('en'))).toBe('en')
    expect(readStoredLanguage(storage('fr'))).toBeNull()
    expect(readStoredLanguage(undefined)).toBeNull()
    expect(readStoredLanguage({ getItem: () => { throw new Error('blocked') } })).toBeNull()
  })
})
