import type { FailureReason } from '../ui/i18n'

export function mapWorldFailureReason(reason: string): FailureReason {
  switch (reason) {
    case 'collapse':
      return 'timeout'
    case 'seen':
      return 'seen'
    case 'trap':
      return 'trap'
    case 'guardian':
    case 'guardian-shield':
      return 'guardian'
    case 'core-lost':
      return 'core-lost'
    case 'echo-desync':
      return 'echo-desync'
    default:
      return 'defeat'
  }
}
