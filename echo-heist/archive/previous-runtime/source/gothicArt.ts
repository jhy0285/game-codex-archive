import Phaser from 'phaser'

export const GOTHIC_PALETTE = {
  void: 0x090b0d,
  ink: 0x121416,
  charcoal: 0x202225,
  wine: 0x3b2634,
  mulberry: 0x6c4057,
  ivory: 0xe7dcc0,
  pale: 0xfff6df,
  teal: 0x78b9ad,
  tealDeep: 0x2d6d68,
  brass: 0x9e8054,
  ash: 0xa79e92,
} as const

const HEX = {
  void: '#090b0d',
  ink: '#121416',
  charcoal: '#202225',
  wine: '#3b2634',
  mulberry: '#6c4057',
  ivory: '#e7dcc0',
  pale: '#fff6df',
  teal: '#78b9ad',
  tealDeep: '#2d6d68',
  brass: '#9e8054',
  ash: '#a79e92',
} as const

export type GothicFacing = 'down' | 'up' | 'left' | 'right'

const createCanvasTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) => {
  if (scene.textures.exists(key)) return
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) return
  const context = texture.context
  context.imageSmoothingEnabled = true
  context.clearRect(0, 0, width, height)
  draw(context)
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
}

const irregularRing = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  seed: number,
) => {
  context.beginPath()
  for (let index = 0; index <= 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2
    const wobble =
      Math.sin(angle * 3 + seed) * 0.035 +
      Math.cos(angle * 7 - seed * 0.7) * 0.025
    const x = cx + Math.cos(angle) * radiusX * (1 + wobble)
    const y = cy + Math.sin(angle) * radiusY * (1 + wobble)
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.closePath()
}

const paintPetal = (context: CanvasRenderingContext2D, variant: number) => {
  context.translate(10, 11)
  context.rotate((variant - 1) * 0.18)
  const glow = context.createRadialGradient(0, 0, 1, 0, 0, 10)
  glow.addColorStop(0, 'rgba(255,246,223,0.92)')
  glow.addColorStop(0.4, 'rgba(120,185,173,0.62)')
  glow.addColorStop(1, 'rgba(45,109,104,0)')
  context.fillStyle = glow
  context.fillRect(-10, -10, 20, 20)
  context.fillStyle = variant === 1 ? HEX.ivory : HEX.teal
  context.beginPath()
  context.moveTo(0, -7)
  context.bezierCurveTo(5, -4, 5, 3, 0, 8)
  context.bezierCurveTo(-5, 3, -5, -4, 0, -7)
  context.fill()
  context.strokeStyle = 'rgba(255,246,223,0.72)'
  context.lineWidth = 0.8
  context.beginPath()
  context.moveTo(0, -5)
  context.lineTo(0, 6)
  context.stroke()
}

const paintWisp = (context: CanvasRenderingContext2D, frame: number) => {
  const drift = (frame % 3) - 1
  const glow = context.createRadialGradient(12, 11, 1, 12, 11, 11)
  glow.addColorStop(0, 'rgba(255,246,223,0.8)')
  glow.addColorStop(0.35, 'rgba(120,185,173,0.42)')
  glow.addColorStop(1, 'rgba(45,109,104,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 24, 24)
  context.strokeStyle = 'rgba(231,220,192,0.88)'
  context.lineWidth = 1.5
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(8 + drift, 18)
  context.bezierCurveTo(3, 13, 18, 11, 11 + drift, 5)
  context.stroke()
  context.fillStyle = HEX.teal
  context.beginPath()
  context.ellipse(12 + drift, 7, 2.4, 3.8, 0.3, 0, Math.PI * 2)
  context.fill()
}

const paintMistVeil = (context: CanvasRenderingContext2D) => {
  const fog = context.createRadialGradient(180, 88, 8, 180, 88, 176)
  fog.addColorStop(0, 'rgba(214,232,219,0.22)')
  fog.addColorStop(0.42, 'rgba(91,139,133,0.13)')
  fog.addColorStop(1, 'rgba(9,11,13,0)')
  context.fillStyle = fog
  context.fillRect(0, 0, 360, 180)
  context.strokeStyle = 'rgba(231,220,192,0.12)'
  context.lineCap = 'round'
  for (let index = 0; index < 7; index += 1) {
    context.lineWidth = 1 + (index % 2) * 0.7
    context.beginPath()
    context.moveTo(-20, 44 + index * 14)
    context.bezierCurveTo(
      72,
      4 + index * 16,
      252,
      164 - index * 10,
      382,
      46 + index * 13,
    )
    context.stroke()
  }
}

const paintVignette = (context: CanvasRenderingContext2D) => {
  const vignette = context.createRadialGradient(444, 218, 118, 444, 218, 530)
  vignette.addColorStop(0, 'rgba(9,11,13,0)')
  vignette.addColorStop(0.58, 'rgba(9,11,13,0.08)')
  vignette.addColorStop(1, 'rgba(5,6,7,0.86)')
  context.fillStyle = vignette
  context.fillRect(0, 0, 888, 440)
}

const paintShrine = (context: CanvasRenderingContext2D, active: boolean) => {
  const cx = 40
  const cy = 34
  const halo = context.createRadialGradient(cx, cy, 3, cx, cy, 37)
  halo.addColorStop(
    0,
    active ? 'rgba(120,185,173,0.58)' : 'rgba(158,128,84,0.34)',
  )
  halo.addColorStop(1, 'rgba(9,11,13,0)')
  context.fillStyle = halo
  context.fillRect(0, 0, 80, 72)

  irregularRing(context, cx, cy + 6, 29, 20, active ? 2.7 : 1.4)
  context.fillStyle = active ? '#466f69' : '#38332f'
  context.fill()
  context.strokeStyle = active ? HEX.teal : HEX.brass
  context.lineWidth = 2.2
  context.stroke()

  irregularRing(context, cx, cy + 4, 20, 14, 4.3)
  context.fillStyle = HEX.ink
  context.fill()
  context.strokeStyle = active
    ? 'rgba(255,246,223,0.86)'
    : 'rgba(231,220,192,0.54)'
  context.lineWidth = 1.2
  context.stroke()

  context.strokeStyle = active ? HEX.pale : HEX.ivory
  context.lineWidth = active ? 2.3 : 1.5
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(29, 38)
  context.bezierCurveTo(31, 23, 49, 23, 51, 38)
  context.bezierCurveTo(46, 32, 35, 32, 29, 38)
  context.stroke()
  context.beginPath()
  context.moveTo(40, 27)
  context.bezierCurveTo(34, 36, 35, 43, 40, 49)
  context.bezierCurveTo(45, 43, 46, 36, 40, 27)
  context.stroke()

  if (active) {
    context.fillStyle = HEX.pale
    context.beginPath()
    context.ellipse(40, 38, 3.5, 5.5, 0, 0, Math.PI * 2)
    context.fill()
  }
}

const paintVeilFold = (context: CanvasRenderingContext2D, frame: number) => {
  const sway = frame === 0 ? -2 : 2
  const fabric = context.createLinearGradient(0, 0, 28, 0)
  fabric.addColorStop(0, 'rgba(18,20,22,0.94)')
  fabric.addColorStop(0.36, 'rgba(108,64,87,0.92)')
  fabric.addColorStop(0.58, 'rgba(231,220,192,0.52)')
  fabric.addColorStop(0.76, 'rgba(59,38,52,0.94)')
  fabric.addColorStop(1, 'rgba(9,11,13,0.96)')
  context.fillStyle = fabric
  context.beginPath()
  context.moveTo(4, -4)
  context.bezierCurveTo(20 + sway, 12, 8 - sway, 28, 18 + sway, 43)
  context.bezierCurveTo(25, 53, 13, 60, 23 + sway, 70)
  context.lineTo(3, 70)
  context.bezierCurveTo(12, 52, 1, 39, 9 + sway, 23)
  context.bezierCurveTo(15, 10, 1, 3, 4, -4)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(231,220,192,0.28)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(9, 0)
  context.bezierCurveTo(22 + sway, 20, 5, 40, 17 + sway, 67)
  context.stroke()
}

const paintThreadWell = (context: CanvasRenderingContext2D, frame: number) => {
  const pulse = frame / 5
  const cx = 48
  const cy = 44
  const glow = context.createRadialGradient(cx, cy, 4, cx, cy, 45)
  glow.addColorStop(0, `rgba(255,246,223,${0.56 + pulse * 0.18})`)
  glow.addColorStop(0.34, 'rgba(120,185,173,0.32)')
  glow.addColorStop(1, 'rgba(45,109,104,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 96, 88)

  for (let ring = 0; ring < 3; ring += 1) {
    context.strokeStyle =
      ring === 0 ? 'rgba(231,220,192,0.72)' : 'rgba(120,185,173,0.52)'
    context.lineWidth = 2 - ring * 0.35
    context.beginPath()
    context.ellipse(cx, cy + 3, 30 - ring * 7, 23 - ring * 5, 0, 0, Math.PI * 2)
    context.stroke()
  }
  context.strokeStyle = HEX.pale
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(32, 51)
  context.bezierCurveTo(34, 31 - pulse * 3, 62, 31 + pulse * 3, 64, 51)
  context.stroke()
  context.fillStyle = HEX.teal
  context.beginPath()
  context.ellipse(cx, cy + 3, 5 + pulse * 2, 8 + pulse * 2, 0, 0, Math.PI * 2)
  context.fill()
}

const paintReliquaryStone = (
  context: CanvasRenderingContext2D,
  variant: number,
) => {
  const stone = context.createLinearGradient(6, 4, 58, 58)
  stone.addColorStop(0, variant === 1 ? '#655059' : '#625d55')
  stone.addColorStop(0.5, '#2d2d2c')
  stone.addColorStop(1, '#121416')
  irregularRing(context, 32, 32, 27, 25, 1.3 + variant * 0.9)
  context.fillStyle = stone
  context.fill()
  context.strokeStyle = 'rgba(231,220,192,0.48)'
  context.lineWidth = 2
  context.stroke()

  context.strokeStyle = variant === 2 ? HEX.teal : HEX.brass
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(19, 37)
  context.bezierCurveTo(20, 20, 42, 18, 45, 37)
  context.bezierCurveTo(39, 32, 27, 32, 19, 37)
  context.stroke()
  context.beginPath()
  context.moveTo(32, 18)
  context.bezierCurveTo(25, 29, 26, 43, 32, 49)
  context.bezierCurveTo(38, 43, 39, 29, 32, 18)
  context.stroke()
  context.fillStyle = 'rgba(9,11,13,0.36)'
  context.beginPath()
  context.ellipse(32, 54, 21, 5, 0, 0, Math.PI * 2)
  context.fill()
}

const paintForegroundRoot = (
  context: CanvasRenderingContext2D,
  mirrored: boolean,
) => {
  if (mirrored) {
    context.translate(300, 0)
    context.scale(-1, 1)
  }
  context.lineCap = 'round'
  context.strokeStyle = 'rgba(4,5,6,0.98)'
  context.lineWidth = 54
  context.beginPath()
  context.moveTo(-28, 224)
  context.bezierCurveTo(42, 152, 76, 154, 116, 78)
  context.bezierCurveTo(154, 8, 220, 20, 306, -24)
  context.stroke()
  context.strokeStyle = 'rgba(35,31,33,0.94)'
  context.lineWidth = 20
  context.beginPath()
  context.moveTo(-30, 224)
  context.bezierCurveTo(46, 159, 78, 154, 116, 78)
  context.bezierCurveTo(155, 13, 223, 19, 306, -22)
  context.stroke()
  context.strokeStyle = 'rgba(108,64,87,0.24)'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(-18, 214)
  context.bezierCurveTo(52, 158, 91, 139, 124, 76)
  context.bezierCurveTo(164, 22, 226, 19, 298, -16)
  context.stroke()
  for (let index = 0; index < 6; index += 1) {
    const x = 46 + index * 39
    const y = 169 - index * 27
    context.strokeStyle = 'rgba(5,6,7,0.92)'
    context.lineWidth = 12 - index * 0.8
    context.beginPath()
    context.moveTo(x, y)
    context.quadraticCurveTo(x + 20, y - 34, x + 41, y - 45)
    context.stroke()
  }
}

const paintGateSpine = (context: CanvasRenderingContext2D) => {
  const stone = context.createLinearGradient(5, 0, 59, 0)
  stone.addColorStop(0, '#090b0d')
  stone.addColorStop(0.32, '#302c2d')
  stone.addColorStop(0.52, '#514849')
  stone.addColorStop(0.76, '#242528')
  stone.addColorStop(1, '#080a0b')
  context.fillStyle = stone
  context.beginPath()
  context.moveTo(24, -8)
  context.bezierCurveTo(10, 14, 23, 34, 13, 54)
  context.bezierCurveTo(2, 76, 22, 94, 11, 119)
  context.bezierCurveTo(4, 141, 24, 159, 17, 188)
  context.lineTo(49, 188)
  context.bezierCurveTo(56, 161, 40, 141, 53, 116)
  context.bezierCurveTo(62, 96, 45, 72, 55, 51)
  context.bezierCurveTo(62, 31, 45, 13, 48, -8)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(231,220,192,0.24)'
  context.lineWidth = 1.3
  context.stroke()

  context.strokeStyle = 'rgba(108,64,87,0.42)'
  context.lineWidth = 3
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(34, -4)
  context.bezierCurveTo(20, 28, 43, 45, 28, 73)
  context.bezierCurveTo(17, 96, 43, 120, 29, 148)
  context.bezierCurveTo(23, 162, 36, 177, 31, 188)
  context.stroke()

  for (let index = 0; index < 5; index += 1) {
    const y = 26 + index * 32
    const left = index % 2 === 0
    context.strokeStyle = 'rgba(8,10,11,0.94)'
    context.lineWidth = 7 - index * 0.45
    context.beginPath()
    context.moveTo(left ? 20 : 44, y)
    context.quadraticCurveTo(left ? 5 : 59, y + 9, left ? -7 : 71, y + 25)
    context.stroke()
  }
}

const paintGateThreshold = (context: CanvasRenderingContext2D) => {
  const wood = context.createLinearGradient(0, 5, 0, 39)
  wood.addColorStop(0, '#15171a')
  wood.addColorStop(0.48, '#514448')
  wood.addColorStop(1, '#111315')
  context.fillStyle = wood
  context.beginPath()
  context.moveTo(-5, 25)
  context.bezierCurveTo(13, 7, 31, 16, 48, 9)
  context.bezierCurveTo(65, 2, 81, 12, 105, 20)
  context.bezierCurveTo(80, 22, 67, 34, 49, 29)
  context.bezierCurveTo(29, 24, 15, 37, -5, 25)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(231,220,192,0.3)'
  context.lineWidth = 1.3
  context.stroke()
  context.strokeStyle = 'rgba(158,128,84,0.48)'
  context.lineWidth = 1.2
  context.beginPath()
  context.moveTo(14, 24)
  context.bezierCurveTo(34, 13, 57, 23, 87, 17)
  context.stroke()
  context.fillStyle = HEX.tealDeep
  context.beginPath()
  context.ellipse(50, 22, 4, 7, 0.2, 0, Math.PI * 2)
  context.fill()
}

export const createGothicTextures = (scene: Phaser.Scene) => {
  for (let variant = 0; variant < 3; variant += 1) {
    createCanvasTexture(scene, `silk-petal-${variant}`, 20, 22, (context) =>
      paintPetal(context, variant),
    )
  }
  for (let frame = 0; frame < 6; frame += 1) {
    createCanvasTexture(scene, `memory-wisp-${frame}`, 24, 24, (context) =>
      paintWisp(context, frame),
    )
    createCanvasTexture(scene, `thread-well-${frame}`, 96, 88, (context) =>
      paintThreadWell(context, frame),
    )
  }
  createCanvasTexture(scene, 'mist-veil', 360, 180, paintMistVeil)
  createCanvasTexture(scene, 'room-vignette', 888, 440, paintVignette)
  createCanvasTexture(scene, 'glyph-shrine-idle', 80, 72, (context) =>
    paintShrine(context, false),
  )
  createCanvasTexture(scene, 'glyph-shrine-active', 80, 72, (context) =>
    paintShrine(context, true),
  )
  for (let frame = 0; frame < 2; frame += 1) {
    createCanvasTexture(scene, `veil-fold-${frame}`, 28, 68, (context) =>
      paintVeilFold(context, frame),
    )
  }
  for (let variant = 0; variant < 3; variant += 1) {
    createCanvasTexture(scene, `reliquary-stone-${variant}`, 64, 64, (context) =>
      paintReliquaryStone(context, variant),
    )
  }
  createCanvasTexture(scene, 'foreground-root-left', 300, 220, (context) =>
    paintForegroundRoot(context, false),
  )
  createCanvasTexture(scene, 'foreground-root-right', 300, 220, (context) =>
    paintForegroundRoot(context, true),
  )
  createCanvasTexture(scene, 'gate-spine', 64, 180, paintGateSpine)
  createCanvasTexture(scene, 'gate-threshold', 100, 44, paintGateThreshold)
}
