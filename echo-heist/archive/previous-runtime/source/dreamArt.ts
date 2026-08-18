import Phaser from 'phaser'

export const DREAM_PALETTE = {
  void: 0x090617,
  ink: 0x130c28,
  plum: 0x2a1944,
  violet: 0x4b2b65,
  parchment: 0xffd47a,
  pale: 0xfff0bd,
  rose: 0xe14d7b,
  roseDeep: 0x8d244f,
  mint: 0x78ead1,
  mintDeep: 0x259b92,
  ash: 0xa992b6,
} as const

const HEX = {
  void: '#090617',
  ink: '#130c28',
  plum: '#2a1944',
  violet: '#4b2b65',
  parchment: '#ffd47a',
  pale: '#fff0bd',
  rose: '#e14d7b',
  roseDeep: '#8d244f',
  mint: '#78ead1',
  mintDeep: '#259b92',
  ash: '#a992b6',
} as const

export type DreamFacing = 'down' | 'up' | 'left' | 'right'

const rect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) => {
  context.fillStyle = color
  context.fillRect(x, y, width, height)
}

const pixel = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = 1,
) => rect(context, x, y, size, size, color)

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
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  draw(context)
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
}

const paintPilgrim = (
  context: CanvasRenderingContext2D,
  facing: DreamFacing,
  frame: number,
) => {
  const strideCycle = [0, -1, 0, 1, 0, 1]
  const clothCycle = [0, 1, 2, 1, 0, -1]
  const stride = strideCycle[frame % strideCycle.length]!
  const cloth = clothCycle[frame % clothCycle.length]!
  const bob = frame === 1 || frame === 4 ? 1 : 0
  const top = 3 + bob

  // The pilgrim is an original torn-paper thief: a diamond memory mask over a
  // page-like cloak. The extra silhouette layers keep it readable at game scale.
  rect(context, 10 + stride, 35, 20, 3, 'rgba(5, 2, 14, 0.52)')
  rect(context, 8, top + 20, 24, 9, HEX.ink)
  rect(context, 10 - cloth, top + 17, 20 + cloth * 2, 11, HEX.plum)
  rect(context, 12, top + 15, 16, 11, HEX.violet)
  rect(context, 13, top + 20, 14, 7, HEX.roseDeep)
  rect(context, 9 - cloth, top + 27, 5, 4, HEX.ink)
  rect(context, 15, top + 28 + Math.max(0, cloth), 4, 4, HEX.ink)
  rect(context, 21, top + 28 + Math.max(0, -cloth), 4, 4, HEX.ink)
  rect(context, 27 + cloth, top + 27, 4, 4, HEX.ink)
  pixel(context, 10 - cloth, top + 28, HEX.parchment, 2)
  pixel(context, 28 + cloth, top + 28, HEX.rose, 2)

  rect(context, 6 + stride, top + 19, 6, 4, HEX.ink)
  rect(context, 28 - stride, top + 19, 6, 4, HEX.ink)
  rect(context, 7 + stride, top + 19, 4, 2, HEX.parchment)
  rect(context, 29 - stride, top + 19, 4, 2, HEX.parchment)

  rect(context, 11, top + 6, 18, 9, HEX.ink)
  rect(context, 13, top + 3, 14, 14, HEX.ink)
  rect(context, 17, top, 6, 3, HEX.ink)
  rect(context, 14, top + 5, 12, 10, HEX.parchment)
  rect(context, 12, top + 8, 16, 5, HEX.parchment)
  rect(context, 16, top + 3, 8, 3, HEX.pale)
  pixel(context, 13, top + 5, HEX.rose, 2)
  pixel(context, 25, top + 12, HEX.mintDeep, 2)

  if (facing === 'down') {
    rect(context, 15, top + 8, 10, 5, HEX.ink)
    pixel(context, 16, top + 9, HEX.mint, 2)
    pixel(context, 22, top + 9, HEX.mint, 2)
    rect(context, 19, top + 13, 2, 4, HEX.rose)
  } else if (facing === 'up') {
    rect(context, 16, top + 7, 8, 7, HEX.violet)
    rect(context, 19, top + 4, 2, 8, HEX.rose)
  } else if (facing === 'left') {
    rect(context, 13, top + 8, 8, 5, HEX.ink)
    pixel(context, 14, top + 9, HEX.mint, 2)
    rect(context, 25, top + 8, 3, 3, HEX.rose)
    pixel(context, 11 - cloth, top + 17, HEX.parchment, 2)
  } else {
    rect(context, 19, top + 8, 8, 5, HEX.ink)
    pixel(context, 24, top + 9, HEX.mint, 2)
    rect(context, 12, top + 8, 3, 3, HEX.rose)
    pixel(context, 28 + cloth, top + 17, HEX.parchment, 2)
  }

  rect(context, 18, top + 16, 4, 5, HEX.parchment)
  pixel(context, 19, top + 17, HEX.rose, 2)
  rect(context, 11 + stride, top + 31, 7, 4, HEX.ink)
  rect(context, 22 - stride, top + 31, 7, 4, HEX.ink)
  rect(context, 12 + stride, top + 31, 5, 2, HEX.parchment)
  rect(context, 23 - stride, top + 31, 5, 2, HEX.parchment)
}

const paintFractureShard = (
  context: CanvasRenderingContext2D,
  variant: number,
) => {
  const accent = variant === 0 ? HEX.mint : variant === 1 ? HEX.parchment : HEX.rose
  rect(context, 4, 0, 3, 3, accent)
  rect(context, 3, 3, 4, 4, HEX.pale)
  rect(context, 2, 7, 4, 5, accent)
  rect(context, 1, 12, 3, 3, HEX.ink)
  pixel(context, 7, 4 + variant * 2, accent, 2)
}

const paintMemoryWisp = (
  context: CanvasRenderingContext2D,
  frame: number,
) => {
  const offset = frame % 3
  pixel(context, 7, 7, HEX.pale, 2)
  rect(context, 5 - offset, 9, 5, 2, HEX.mint)
  rect(context, 3 + offset, 11, 5, 2, HEX.mintDeep)
  pixel(context, 10 + offset, 5 + offset, HEX.parchment, 1)
  pixel(context, 2 + offset, 4, HEX.rose, 1)
}

const paintDreamVeil = (context: CanvasRenderingContext2D) => {
  const glow = context.createRadialGradient(128, 52, 4, 128, 52, 122)
  glow.addColorStop(0, 'rgba(120, 234, 209, 0.28)')
  glow.addColorStop(0.34, 'rgba(75, 43, 101, 0.18)')
  glow.addColorStop(1, 'rgba(9, 6, 23, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 256, 104)
  for (let index = 0; index < 17; index += 1) {
    const x = (index * 47) % 256
    const y = 22 + ((index * 29) % 58)
    pixel(context, x, y, index % 4 === 0 ? HEX.parchment : HEX.mint, index % 5 === 0 ? 2 : 1)
  }
}

const paintRoomVignette = (context: CanvasRenderingContext2D) => {
  const vignette = context.createRadialGradient(444, 220, 108, 444, 220, 520)
  vignette.addColorStop(0, 'rgba(9, 6, 23, 0)')
  vignette.addColorStop(0.58, 'rgba(9, 6, 23, 0.06)')
  vignette.addColorStop(1, 'rgba(9, 6, 23, 0.72)')
  context.fillStyle = vignette
  context.fillRect(0, 0, 888, 440)
}

const paintKnot = (
  context: CanvasRenderingContext2D,
  active: boolean,
) => {
  const outer = active ? HEX.mint : HEX.parchment
  const inner = active ? HEX.mintDeep : HEX.roseDeep
  rect(context, 9, 1, 6, 4, HEX.ink)
  rect(context, 9, 19, 6, 4, HEX.ink)
  rect(context, 1, 9, 4, 6, HEX.ink)
  rect(context, 19, 9, 4, 6, HEX.ink)
  rect(context, 7, 3, 10, 4, outer)
  rect(context, 7, 17, 10, 4, outer)
  rect(context, 3, 7, 4, 10, outer)
  rect(context, 17, 7, 4, 10, outer)
  rect(context, 6, 6, 12, 12, HEX.ink)
  rect(context, 8, 8, 8, 8, inner)
  rect(context, 10, 10, 4, 4, active ? HEX.pale : HEX.rose)
  pixel(context, 5, 5, outer, 2)
  pixel(context, 17, 5, outer, 2)
  pixel(context, 5, 17, outer, 2)
  pixel(context, 17, 17, outer, 2)
}

const paintFracture = (
  context: CanvasRenderingContext2D,
  frame: number,
) => {
  const shift = frame % 2
  const points = [
    [8, 0],
    [7 + shift, 2],
    [9 - shift, 4],
    [6 + shift, 7],
    [8, 10],
    [7 - shift, 13],
    [8, 15],
  ]
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index]!
    const [x2, y2] = points[index + 1]!
    context.strokeStyle = HEX.rose
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(x1 + 0.5, y1)
    context.lineTo(x2 + 0.5, y2)
    context.stroke()
    context.strokeStyle = HEX.pale
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x1 + 0.5, y1)
    context.lineTo(x2 + 0.5, y2)
    context.stroke()
  }
  pixel(context, 3 + shift, 3, HEX.parchment, 2)
  pixel(context, 11 - shift, 8, HEX.mint, 2)
  pixel(context, 3, 13 - shift, HEX.rose, 2)
}

const paintMoonWell = (
  context: CanvasRenderingContext2D,
  frame: number,
) => {
  const shimmer = frame % 3
  rect(context, 12, 1, 8, 2, HEX.mint)
  rect(context, 8, 3, 16, 2, HEX.mintDeep)
  rect(context, 5, 6, 22, 2, HEX.mint)
  rect(context, 3, 10, 26, 12, HEX.ink)
  rect(context, 5, 8, 22, 16, HEX.plum)
  rect(context, 8, 6, 16, 20, HEX.violet)
  rect(context, 10, 8, 12, 16, HEX.ink)
  rect(context, 12, 10, 8, 12, HEX.mintDeep)
  rect(context, 14, 12, 4, 8, HEX.pale)
  pixel(context, 4 + shimmer * 4, 5 + shimmer, HEX.parchment, 2)
  pixel(context, 24 - shimmer * 3, 24 - shimmer, HEX.rose, 2)
  pixel(context, 5 + shimmer, 22 - shimmer * 2, HEX.mint, 2)
  pixel(context, 25 - shimmer, 7 + shimmer * 2, HEX.mint, 1)
}

const paintMemoryBook = (
  context: CanvasRenderingContext2D,
  variant: number,
) => {
  const accent = variant % 2 === 0 ? HEX.rose : HEX.mintDeep
  rect(context, 1, 3, 30, 25, HEX.ink)
  rect(context, 3, 2, 26, 25, HEX.plum)
  rect(context, 5, 4, 22, 19, HEX.violet)
  rect(context, 15, 4, 2, 19, HEX.ink)
  rect(context, 7, 7, 6, 1, HEX.parchment)
  rect(context, 19, 7, 6, 1, HEX.parchment)
  rect(context, 7, 11, 5, 1, accent)
  rect(context, 20, 11, 5, 1, accent)
  rect(context, 7, 15, 6, 1, HEX.ash)
  rect(context, 19, 15, 6, 1, HEX.ash)
  rect(context, 4, 24, 24, 2, HEX.parchment)
  pixel(context, 6 + variant * 3, 19, accent, 2)
}

export const createDreamTextures = (scene: Phaser.Scene) => {
  const facings: DreamFacing[] = ['down', 'up', 'left', 'right']
  for (const facing of facings) {
    for (let frame = 0; frame < 6; frame += 1) {
      createCanvasTexture(scene, `dreamer-${facing}-${frame}`, 40, 40, (context) =>
        paintPilgrim(context, facing, frame),
      )
    }
  }

  for (let variant = 0; variant < 3; variant += 1) {
    createCanvasTexture(scene, `fracture-shard-${variant}`, 10, 16, (context) =>
      paintFractureShard(context, variant),
    )
  }
  for (let frame = 0; frame < 6; frame += 1) {
    createCanvasTexture(scene, `memory-wisp-${frame}`, 16, 16, (context) =>
      paintMemoryWisp(context, frame),
    )
  }
  createCanvasTexture(scene, 'dream-veil', 256, 104, paintDreamVeil)
  createCanvasTexture(scene, 'room-vignette', 888, 440, paintRoomVignette)

  createCanvasTexture(scene, 'memory-knot-idle', 24, 24, (context) =>
    paintKnot(context, false),
  )
  createCanvasTexture(scene, 'memory-knot-active', 24, 24, (context) =>
    paintKnot(context, true),
  )
  for (let frame = 0; frame < 2; frame += 1) {
    createCanvasTexture(scene, `fracture-segment-${frame}`, 16, 16, (context) =>
      paintFracture(context, frame),
    )
  }
  for (let frame = 0; frame < 6; frame += 1) {
    createCanvasTexture(scene, `moon-well-${frame}`, 32, 32, (context) =>
      paintMoonWell(context, frame),
    )
  }
  for (let variant = 0; variant < 3; variant += 1) {
    createCanvasTexture(scene, `memory-book-${variant}`, 32, 32, (context) =>
      paintMemoryBook(context, variant),
    )
  }
}
