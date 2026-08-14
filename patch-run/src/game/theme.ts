export type VisualTheme = 'pixel' | 'overdrive'

const pathname = window.location.pathname.toLowerCase()

// The premium illustrated build is now the canonical experience. BITSHIFT stays
// available as the deliberately lo-fi comparison route.
export const ACTIVE_THEME: VisualTheme = pathname.startsWith('/pixel')
  ? 'pixel'
  : 'overdrive'

export const THEME_LABELS: Record<VisualTheme, string> = {
  pixel: 'BITSHIFT',
  overdrive: 'OVERDRIVE',
}
