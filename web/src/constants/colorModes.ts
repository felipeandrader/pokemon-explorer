import type { Pokemon, PokemonCategory } from '../types'
import { TYPE_COLORS } from './typeColors'

export type ColorMode = 'type' | 'generation' | 'category' | 'bst' | 'speed' | 'ab'

export const GENERATION_COLORS: Record<number, string> = {
  1: '#F87171', 2: '#FB923C', 3: '#FBBF24', 4: '#4ADE80',
  5: '#22D3EE', 6: '#60A5FA', 7: '#A78BFA', 8: '#F472B6', 9: '#E879F9',
}

export const CATEGORY_COLORS: Record<PokemonCategory, string> = {
  normal:           '#9CA3AF',
  baby:             '#F9A8D4',
  pseudo_legendary: '#60A5FA',
  legendary:        '#FCD34D',
  mythical:         '#C084FC',
}

// ─── viridis gradient ────────────────────────────────────────────────────────
// Key stops sampled from matplotlib's viridis colormap.
const _VIRIDIS_RGB: [number, number, number][] = [
  [68,  1,   84],
  [72,  40,  120],
  [62,  74,  137],
  [49,  104, 142],
  [38,  130, 142],
  [53,  183, 121],
  [144, 215, 68],
  [253, 231, 37],
]

function viridisColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const n = _VIRIDIS_RGB.length - 1
  const pos = clamped * n
  const lo = Math.floor(pos)
  const hi = Math.min(lo + 1, n)
  const f = pos - lo
  const [r1, g1, b1] = _VIRIDIS_RGB[lo]
  const [r2, g2, b2] = _VIRIDIS_RGB[hi]
  return `rgb(${Math.round(r1 + (r2-r1)*f)},${Math.round(g1 + (g2-g1)*f)},${Math.round(b1 + (b2-b1)*f)})`
}

export const VIRIDIS_STOPS: string[] = [0, .143, .286, .429, .571, .714, .857, 1].map(viridisColor)

export function isContinuousMode(mode: ColorMode): boolean {
  return mode === 'bst' || mode === 'speed'
}

function getContinuousValue(p: Pokemon, mode: ColorMode): number {
  return mode === 'speed' ? p.stats.speed : p.bst
}

// ─── color groups (batched by color for canvas draw calls) ───────────────────

const N_BUCKETS = 32

export function buildColorGroups(
  pokemon: Pokemon[],
  mode: ColorMode,
): Map<string, number[]> {
  if (mode === 'ab') return new Map()  // handled separately via buildAbColorGroups
  const groups = new Map<string, number[]>()

  if (!isContinuousMode(mode)) {
    pokemon.forEach((pk, i) => {
      const color = _categoricalColor(pk, mode)
      const g = groups.get(color)
      if (g) { g.push(i) } else { groups.set(color, [i]) }
    })
    return groups
  }

  // Continuous: N_BUCKETS discrete color steps
  const values = pokemon.map(p => getContinuousValue(p, mode))
  const min = Math.min(...values)
  const range = (Math.max(...values) - min) || 1
  pokemon.forEach((_, i) => {
    const t = (values[i] - min) / range
    const bucket = Math.min(N_BUCKETS - 1, Math.floor(t * N_BUCKETS))
    const color = viridisColor(bucket / (N_BUCKETS - 1))
    const g = groups.get(color)
    if (g) { g.push(i) } else { groups.set(color, [i]) }
  })
  return groups
}

function _categoricalColor(p: Pokemon, mode: ColorMode): string {
  switch (mode) {
    case 'type':       return TYPE_COLORS[p.types[0]] ?? '#888888'
    case 'generation': return GENERATION_COLORS[p.generation] ?? '#888888'
    case 'category':   return CATEGORY_COLORS[p.category] ?? '#888888'
    default:           return '#888888'
  }
}

// ─── legend ──────────────────────────────────────────────────────────────────

export interface BulletsLegend { kind: 'bullets'; items: { label: string; color: string }[] }
export interface GradientLegend { kind: 'gradient'; stops: string[]; minLabel: string; maxLabel: string }
export type Legend = BulletsLegend | GradientLegend

export function getLegend(mode: ColorMode, pokemon: Pokemon[]): Legend {
  if (isContinuousMode(mode)) {
    const values = pokemon.map(p => getContinuousValue(p, mode))
    const min = Math.min(...values)
    const max = Math.max(...values)
    return { kind: 'gradient', stops: VIRIDIS_STOPS, minLabel: String(min), maxLabel: String(max) }
  }

  switch (mode) {
    case 'type': {
      const seen = new Set(pokemon.flatMap(p => p.types))
      return {
        kind: 'bullets',
        items: Object.entries(TYPE_COLORS)
          .filter(([t]) => seen.has(t))
          .map(([t, c]) => ({ label: t, color: c })),
      }
    }
    case 'generation':
      return {
        kind: 'bullets',
        items: Object.entries(GENERATION_COLORS)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([g, c]) => ({ label: `Gen ${g}`, color: c })),
      }
    case 'category':
      return {
        kind: 'bullets',
        items: (Object.entries(CATEGORY_COLORS) as [PokemonCategory, string][])
          .map(([cat, c]) => ({ label: cat.replace(/_/g, ' '), color: c })),
      }
    default:
      return { kind: 'bullets', items: [] }
  }
}

// ─── A/B comparison colors ───────────────────────────────────────────────────

export const AB_COLORS = {
  aOnly:   '#60A5FA', // blue-400
  bOnly:   '#FB923C', // orange-400
  both:    '#FCD34D', // amber-300
  neither: '#4B5563', // gray-600
} as const

export function buildAbColorGroups(
  pokemon: Pokemon[],
  filterA: ((p: Pokemon) => boolean) | null,
  filterB: ((p: Pokemon) => boolean) | null,
): Map<string, number[]> {
  const groups = new Map<string, number[]>([
    [AB_COLORS.aOnly,   []],
    [AB_COLORS.bOnly,   []],
    [AB_COLORS.both,    []],
    [AB_COLORS.neither, []],
  ])
  pokemon.forEach((p, i) => {
    const inA = filterA !== null && filterA(p)
    const inB = filterB !== null && filterB(p)
    const color =
      inA && inB ? AB_COLORS.both  :
      inA        ? AB_COLORS.aOnly :
      inB        ? AB_COLORS.bOnly :
                   AB_COLORS.neither
    groups.get(color)!.push(i)
  })
  return groups
}

// Keep getLegendItems as a compat shim (used nowhere else, but avoids import errors)
export interface LegendItem { label: string; color: string }
export function getLegendItems(mode: ColorMode, pokemon: Pokemon[]): LegendItem[] {
  const l = getLegend(mode, pokemon)
  if (l.kind === 'bullets') return l.items
  return [{ label: l.minLabel, color: l.stops[0] }, { label: l.maxLabel, color: l.stops[l.stops.length - 1] }]
}
