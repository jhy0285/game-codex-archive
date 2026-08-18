import { describe, expect, it } from 'vitest'
import { mapWorldFailureReason } from './failureReason'

describe('world failure copy routing', () => {
  it.each([
    ['trap', 'trap'],
    ['core-lost', 'core-lost'],
    ['collapse', 'timeout'],
    ['seen', 'seen'],
    ['guardian', 'guardian'],
    ['guardian-shield', 'guardian'],
    ['echo-desync', 'echo-desync'],
    ['', 'defeat'],
  ] as const)('maps %j to %j', (worldReason, failureReason) => {
    expect(mapWorldFailureReason(worldReason)).toBe(failureReason)
  })
})
