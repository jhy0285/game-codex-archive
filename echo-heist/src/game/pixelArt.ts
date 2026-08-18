import Phaser from 'phaser'
import type { Direction } from './logic.ts'

export const AVATAR_TEXTURE_PREFIX = 'echo-runner'

const setPixel = (
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  context.fillStyle = color
  context.fillRect(x, y, width, height)
}

const drawAvatar = (
  context: CanvasRenderingContext2D,
  direction: Direction,
  frame: number,
) => {
  context.clearRect(0, 0, 32, 32)
  const step = frame % 4
  const bob = step === 1 || step === 3 ? 1 : 0
  const leftLeg = step === 1 ? 1 : step === 3 ? -1 : 0
  const rightLeg = -leftLeg

  setPixel(context, '#050a12', 7, 27, 18, 3)
  setPixel(context, '#0b1526', 10 + leftLeg, 22, 5, 6)
  setPixel(context, '#0b1526', 17 + rightLeg, 22, 5, 6)
  setPixel(context, '#55e8ff', 10 + leftLeg, 27, 5, 2)
  setPixel(context, '#55e8ff', 17 + rightLeg, 27, 5, 2)

  setPixel(context, '#13253c', 8, 11 + bob, 16, 13)
  setPixel(context, '#1f4f67', 10, 9 + bob, 12, 5)
  setPixel(context, '#08111f', 11, 8 + bob, 10, 3)
  setPixel(context, '#b9f8ff', 12, 9 + bob, 8, 2)
  setPixel(context, '#55e8ff', 8, 15 + bob, 2, 6)
  setPixel(context, '#287c95', 22, 15 + bob, 2, 6)
  setPixel(context, '#f8c15f', 14, 16 + bob, 4, 4)
  setPixel(context, '#7b3dd2', 17, 20 + bob, 7, 2)

  if (direction === 'up') {
    setPixel(context, '#07101c', 11, 8 + bob, 10, 3)
    setPixel(context, '#287c95', 13, 10 + bob, 6, 2)
    setPixel(context, '#7b3dd2', 14, 22 + bob, 4, 3)
  } else if (direction === 'down') {
    setPixel(context, '#e9fdff', 12, 8 + bob, 8, 3)
    setPixel(context, '#16384c', 13, 9 + bob, 2, 2)
    setPixel(context, '#16384c', 17, 9 + bob, 2, 2)
    setPixel(context, '#7b3dd2', 21, 18 + bob, 6, 2)
  } else if (direction === 'left') {
    setPixel(context, '#e9fdff', 10, 9 + bob, 7, 3)
    setPixel(context, '#16384c', 11, 10 + bob, 2, 2)
    setPixel(context, '#7b3dd2', 21, 17 + bob, 7, 2)
    setPixel(context, '#55e8ff', 7, 16 + bob, 3, 3)
  } else {
    setPixel(context, '#e9fdff', 15, 9 + bob, 7, 3)
    setPixel(context, '#16384c', 19, 10 + bob, 2, 2)
    setPixel(context, '#7b3dd2', 4, 17 + bob, 7, 2)
    setPixel(context, '#55e8ff', 22, 16 + bob, 3, 3)
  }

  setPixel(context, '#d9fbff', 6, 13 + bob, 2, 3)
  setPixel(context, '#d9fbff', 24, 13 + bob, 2, 3)
}

export const createPixelTextures = (scene: Phaser.Scene) => {
  const directions: readonly Direction[] = ['down', 'up', 'left', 'right']
  for (const direction of directions) {
    for (let frame = 0; frame < 4; frame += 1) {
      const key = `${AVATAR_TEXTURE_PREFIX}-${direction}-${frame}`
      if (scene.textures.exists(key)) continue
      const texture = scene.textures.createCanvas(key, 32, 32)
      if (!texture) continue
      const context = texture.getContext()
      context.imageSmoothingEnabled = false
      drawAvatar(context, direction, frame)
      texture.refresh()
    }
  }

  if (!scene.textures.exists('pixel-particle')) {
    const texture = scene.textures.createCanvas('pixel-particle', 4, 4)
    if (texture) {
      const context = texture.getContext()
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, 4, 4)
      texture.refresh()
    }
  }
}

export const avatarTexture = (
  direction: Direction,
  frame: number,
) => `${AVATAR_TEXTURE_PREFIX}-${direction}-${Math.abs(frame) % 4}`
