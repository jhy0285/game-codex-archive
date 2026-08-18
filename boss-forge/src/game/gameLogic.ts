export const ATTACK_MODULES = [
  {
    id: 'RADIAL_BURST',
    name: 'RADIAL BURST',
    description: 'Eight ember-seeds bloom from the keeper.',
  },
  {
    id: 'AIMED_SHOT',
    name: 'AIMED SHOT',
    description: 'Marks where you stood, then looses a thorn.',
  },
  {
    id: 'ROTATING_BEAM',
    name: 'ROTATING BEAM',
    description: 'A warned furnace ray circles the sanctum.',
  },
] as const

export type AttackModuleId = (typeof ATTACK_MODULES)[number]['id']

export const MAX_SELECTED_MODULES = 2

export function toggleModuleSelection(
  selected: readonly AttackModuleId[],
  module: AttackModuleId,
): AttackModuleId[] {
  if (selected.includes(module)) {
    return selected.filter((item) => item !== module)
  }
  if (selected.length >= MAX_SELECTED_MODULES) return [...selected]
  return [...selected, module]
}

export function nextAttackModule(
  selected: readonly AttackModuleId[],
  attackIndex: number,
): AttackModuleId | null {
  if (selected.length === 0) return null
  return selected[attackIndex % selected.length] ?? null
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export function pointToSegmentDistance(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const segmentX = endX - startX
  const segmentY = endY - startY
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY
  if (segmentLengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY)
  const projection = clamp(
    ((pointX - startX) * segmentX + (pointY - startY) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  )
  const closestX = startX + projection * segmentX
  const closestY = startY + projection * segmentY
  return Math.hypot(pointX - closestX, pointY - closestY)
}
