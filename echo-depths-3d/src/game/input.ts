import { NEUTRAL_INPUT, type InputFrame } from './types'

const TAU = Math.PI * 2
const YAW_STEPS = 65_536
const AXIS_STEPS = 127

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

export const quantizeYaw = (radians: number) => {
  if (!Number.isFinite(radians)) return 0
  const normalized = ((radians % TAU) + TAU) % TAU
  return Math.round((normalized / TAU) * YAW_STEPS) % YAW_STEPS
}

export const dequantizeYaw = (quantized: number) =>
  ((Math.round(quantized) & 0xffff) / YAW_STEPS) * TAU

export const quantizeMovement = (x: number, z: number) => {
  const safeX = Number.isFinite(x) ? x : 0
  const safeZ = Number.isFinite(z) ? z : 0
  const length = Math.hypot(safeX, safeZ)
  const scale = length > 1 ? 1 / length : 1
  return {
    moveX: Math.round(clamp(safeX * scale, -1, 1) * AXIS_STEPS),
    moveZ: Math.round(clamp(safeZ * scale, -1, 1) * AXIS_STEPS),
  }
}

export const dequantizeMovement = (frame: Pick<InputFrame, 'moveX' | 'moveZ'>) => ({
  x: clamp(Math.round(frame.moveX), -AXIS_STEPS, AXIS_STEPS) / AXIS_STEPS,
  z: clamp(Math.round(frame.moveZ), -AXIS_STEPS, AXIS_STEPS) / AXIS_STEPS,
})

export type InputFrameSource = Readonly<{
  moveX?: number
  moveZ?: number
  aimYaw?: number
  aimYawQ?: number
  heldMask?: number
  pressedMask?: number
}>

export const createInputFrame = (source: InputFrameSource = {}): InputFrame => {
  const movement = quantizeMovement(source.moveX ?? 0, source.moveZ ?? 0)
  const aimYawQ = source.aimYawQ === undefined
    ? quantizeYaw(source.aimYaw ?? 0)
    : Math.round(source.aimYawQ) & 0xffff

  return Object.freeze({
    ...movement,
    aimYawQ,
    heldMask: Math.max(0, Math.trunc(source.heldMask ?? 0)),
    pressedMask: Math.max(0, Math.trunc(source.pressedMask ?? 0)),
  })
}

export const cloneInputFrame = (frame: InputFrame): InputFrame =>
  createInputFrame({
    moveX: frame.moveX / AXIS_STEPS,
    moveZ: frame.moveZ / AXIS_STEPS,
    aimYawQ: frame.aimYawQ,
    heldMask: frame.heldMask,
    pressedMask: frame.pressedMask,
  })

export const inputFramesEqual = (first: InputFrame, second: InputFrame) =>
  first.moveX === second.moveX &&
  first.moveZ === second.moveZ &&
  first.aimYawQ === second.aimYawQ &&
  first.heldMask === second.heldMask &&
  first.pressedMask === second.pressedMask

export const neutralInputWithYaw = (aimYawQ: number): InputFrame =>
  aimYawQ === 0 ? NEUTRAL_INPUT : createInputFrame({ aimYawQ })
