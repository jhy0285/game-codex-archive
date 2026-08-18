export type PatchId = 'RICOCHET' | 'GROWTH' | 'FRIENDLY FIRE'

export interface ScheduledPatch {
  id: PatchId
  atMs: number
}

export const PATCH_SCHEDULE: readonly ScheduledPatch[] = [
  { id: 'RICOCHET', atMs: 20_000 },
  { id: 'GROWTH', atMs: 40_000 },
  { id: 'FRIENDLY FIRE', atMs: 60_000 },
]

export const PATCH_DESCRIPTIONS: Readonly<Record<PatchId, string>> = {
  RICOCHET: 'CURSE SEEDS REBOUND FROM THE SANCTUARY WALL ONCE.',
  GROWTH: 'EACH REBOUND DOUBLES A SEED\u2019S SIZE AND DAMAGE.',
  'FRIENDLY FIRE': 'REBOUNDED SEEDS ARE NOW ARMED AGAINST ENEMIES: THE PURSUING HUSKS.',
}

export function patchesDue(elapsedMs: number): PatchId[] {
  return PATCH_SCHEDULE.filter((patch) => elapsedMs >= patch.atMs).map((patch) => patch.id)
}

export function nextScheduledPatch(elapsedMs: number): ScheduledPatch | null {
  return PATCH_SCHEDULE.find((patch) => elapsedMs < patch.atMs) ?? null
}

export function secondsUntilNextPatch(elapsedMs: number): number {
  const next = nextScheduledPatch(elapsedMs)
  return next ? Math.max(0, Math.ceil((next.atMs - elapsedMs) / 1_000)) : 0
}

export function bounceStats(
  damage: number,
  scale: number,
  growthActive: boolean,
): { damage: number; scale: number } {
  if (!growthActive) return { damage, scale }
  return { damage: Math.round(damage * 2.25), scale: scale * 2.1 }
}

export function canDamageEnemyAfterBounce(bounced: boolean, friendlyFireActive: boolean): boolean {
  return !bounced || friendlyFireActive
}
