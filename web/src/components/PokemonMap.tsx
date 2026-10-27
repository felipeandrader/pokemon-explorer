import { useEffect, useRef, useState } from 'react'
import { select } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'
import type { ZoomTransform, D3ZoomEvent } from 'd3-zoom'
import { Delaunay } from 'd3-delaunay'
import type { PokemonData, Pokemon } from '../types'
import { HoverCard } from './HoverCard'
import { MapControls } from './MapControls'
import { useStore, type SizeMode } from '../store/useStore'
import { type ColorMode, buildColorGroups, buildAbColorGroups } from '../constants/colorModes'

const POINT_RADIUS    = 4    // default screen px
const SIZE_MIN_PX     = 2
const SIZE_MAX_PX     = 7
const HOVER_RADIUS    = 7
const SELECTED_RADIUS = 8
const HOVER_THRESHOLD = 20
const PADDING         = 48
const TWO_PI          = Math.PI * 2

// ─── pure helpers ─────────────────────────────────────────────────────────────

function toBase(pcaX: number, pcaY: number, w: number, h: number): [number, number] {
  const x = ((pcaX + 1) / 2) * (w - 2 * PADDING) + PADDING
  const y = (1 - (pcaY + 1) / 2) * (h - 2 * PADDING) + PADDING
  return [x, y]
}

function computeFitTransform(
  p2x: number, p2y: number, p98x: number, p98y: number, w: number, h: number,
): ZoomTransform {
  const [bx0]   = toBase(p2x,  0,    w, h)
  const [bx1]   = toBase(p98x, 0,    w, h)
  const [, by0] = toBase(0,    p98y, w, h)
  const [, by1] = toBase(0,    p2y,  w, h)
  const margin  = 32
  const kx = (w - 2 * margin) / (bx1 - bx0)
  const ky = (h - 2 * margin) / (by1 - by0)
  const k  = Math.min(kx, ky)
  return zoomIdentity.translate(w / 2 - k * (bx0 + bx1) / 2, h / 2 - k * (by0 + by1) / 2).scale(k)
}

function getAxisLabels(
  components: number[][], features: string[],
): { xLeft: string; xRight: string; yTop: string; yBot: string } {
  const abbrev = (f: string) => ({ hp: 'HP', attack: 'Atk', defense: 'Def', sp_attack: 'SpA', sp_defense: 'SpD', speed: 'Spe' }[f] ?? f)
  const pc1 = components[0]
  const pc2 = components[1]
  const allPos = pc1.every(l => l > 0)
  const xLeft  = allPos ? '← weak' : `← ${abbrev(features[pc1.indexOf(Math.min(...pc1))])}`
  const xRight = allPos ? 'strong →' : `${abbrev(features[pc1.indexOf(Math.max(...pc1))])} →`
  return {
    xLeft, xRight,
    yTop: `${abbrev(features[pc2.indexOf(Math.max(...pc2))])} ↑`,
    yBot: `↓ ${abbrev(features[pc2.indexOf(Math.min(...pc2))])}`,
  }
}

function computeRadii(pokemon: Pokemon[], sizeMode: SizeMode): Float32Array {
  const arr = new Float32Array(pokemon.length)
  if (sizeMode === 'none') {
    arr.fill(POINT_RADIUS)
    return arr
  }
  const values = pokemon.map(p => sizeMode === 'bst' ? p.bst : p.stats.speed)
  const min = Math.min(...values)
  const range = (Math.max(...values) - min) || 1
  for (let i = 0; i < pokemon.length; i++)
    arr[i] = SIZE_MIN_PX + ((values[i] - min) / range) * (SIZE_MAX_PX - SIZE_MIN_PX)
  return arr
}

function buildEvoPairs(pokemon: Pokemon[]): [number, number][] {
  const nameToIdx = new Map(pokemon.map((p, i) => [p.name, i]))
  const pairs: [number, number][] = []
  for (let i = 0; i < pokemon.length; i++) {
    const parentName = pokemon[i].evo.parent_name
    if (parentName) {
      const pi = nameToIdx.get(parentName)
      if (pi !== undefined) pairs.push([pi, i])
    }
  }
  return pairs
}

// ─── types ────────────────────────────────────────────────────────────────────

interface HoverState { pokemon: Pokemon; mouseX: number; mouseY: number }
interface Props { data: PokemonData }

// ─── component ────────────────────────────────────────────────────────────────

export function PokemonMap({ data }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scheduleDrawRef  = useRef<(() => void) | null>(null)
  const matchingSetRef   = useRef<Set<number> | null>(null)
  const colorGroupsRef   = useRef<Map<string, number[]>>(new Map())
  const colorModeRef       = useRef<ColorMode>('type')
  const activeFilterARef   = useRef<((p: Pokemon) => boolean) | null>(null)
  const activeFilterBRef   = useRef<((p: Pokemon) => boolean) | null>(null)
  const axisXRef         = useRef(0)
  const axisYRef         = useRef(0)
  const fitToViewRef     = useRef<() => void>(() => {})
  const zoomInRef        = useRef<() => void>(() => {})
  const zoomOutRef       = useRef<() => void>(() => {})
  const selectedIdxRef   = useRef(-1)
  const radiiRef         = useRef<Float32Array>(new Float32Array())
  const showEvoLinesRef  = useRef(false)

  const [hover, setHover]           = useState<HoverState | null>(null)
  const [matchCount, setMatchCount] = useState(data.pokemon.length)

  const { pokemon } = data

  const idToIdxRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    const m = new Map<string, number>()
    pokemon.forEach((p, i) => m.set(p.name, i))
    idToIdxRef.current = m
  }, [pokemon])

  // ── active filter → matchingSet ──────────────────────────────────────────
  const activeFilter = useStore(s => s.activeFilter)
  useEffect(() => {
    if (activeFilter === null) {
      matchingSetRef.current = null
      setMatchCount(pokemon.length)
    } else {
      const set = new Set<number>()
      pokemon.forEach((p, i) => { if (activeFilter(p)) set.add(i) })
      matchingSetRef.current = set
      setMatchCount(set.size)
    }
    scheduleDrawRef.current?.()
  }, [activeFilter, pokemon])

  // ── color mode + A/B filters → colorGroups ────────────────────────────────
  const colorMode     = useStore(s => s.colorMode)
  const activeFilterA = useStore(s => s.activeFilterA)
  const activeFilterB = useStore(s => s.activeFilterB)
  useEffect(() => {
    colorModeRef.current     = colorMode
    activeFilterARef.current = activeFilterA
    activeFilterBRef.current = activeFilterB

    colorGroupsRef.current = colorMode === 'ab'
      ? buildAbColorGroups(pokemon, activeFilterA, activeFilterB)
      : buildColorGroups(pokemon, colorMode)
    scheduleDrawRef.current?.()
  }, [colorMode, activeFilterA, activeFilterB, pokemon])

  // ── size mode → radii ──────────────────────────────────────────────────────
  const sizeMode = useStore(s => s.sizeMode)
  useEffect(() => {
    radiiRef.current = computeRadii(pokemon, sizeMode)
    scheduleDrawRef.current?.()
  }, [sizeMode, pokemon])

  // ── evo lines toggle ───────────────────────────────────────────────────────
  const showEvoLines = useStore(s => s.showEvoLines)
  useEffect(() => {
    showEvoLinesRef.current = showEvoLines
    scheduleDrawRef.current?.()
  }, [showEvoLines])

  // ── selectedPokemon → selectedIdx ─────────────────────────────────────────
  const selectedPokemon = useStore(s => s.selectedPokemon)
  useEffect(() => {
    selectedIdxRef.current = selectedPokemon
      ? (idToIdxRef.current.get(selectedPokemon.name) ?? -1)
      : -1
    scheduleDrawRef.current?.()
  }, [selectedPokemon])

  // ── main canvas setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let transform: ZoomTransform = zoomIdentity
    let baseCoords: [number, number][] = []
    let delaunay: Delaunay<readonly [number, number]> | null = null
    let hoveredIdx = -1
    let rafId: number | null = null

    const pcaXs = [...pokemon.map(p => p.pca[0])].sort((a, b) => a - b)
    const pcaYs = [...pokemon.map(p => p.pca[1])].sort((a, b) => a - b)
    const n     = pokemon.length
    const p2x   = pcaXs[Math.floor(n * 0.02)]
    const p98x  = pcaXs[Math.min(Math.floor(n * 0.98), n - 1)]
    const p2y   = pcaYs[Math.floor(n * 0.02)]
    const p98y  = pcaYs[Math.min(Math.floor(n * 0.98), n - 1)]

    const axisLabels = getAxisLabels(data.meta.pca.components, data.meta.features)
    const evoPairs   = buildEvoPairs(pokemon)
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>().scaleExtent([0.3, 40])

    function updateZoomExtent(w: number, h: number) {
      const m = Math.max(w, h) * 0.4
      zoomBehavior.translateExtent([[-m, -m], [w + m, h + m]])
    }

    function setupGeometry(w: number, h: number) {
      baseCoords = pokemon.map(pk => toBase(pk.pca[0], pk.pca[1], w, h))
      let sumX = 0, sumY = 0
      for (const [x, y] of baseCoords) { sumX += x; sumY += y }
      axisXRef.current = sumX / baseCoords.length
      axisYRef.current = sumY / baseCoords.length
      colorGroupsRef.current = colorModeRef.current === 'ab'
        ? buildAbColorGroups(pokemon, activeFilterARef.current, activeFilterBRef.current)
        : buildColorGroups(pokemon, colorModeRef.current)
      delaunay = Delaunay.from(baseCoords)
    }

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx || baseCoords.length === 0) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(transform.x, transform.y)
      ctx.scale(transform.k, transform.k)

      // Axes
      const axX = axisXRef.current
      const axY = axisYRef.current
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)'
      ctx.lineWidth   = 1 / transform.k
      ctx.setLineDash([5 / transform.k, 4 / transform.k])
      ctx.beginPath(); ctx.moveTo(-99999, axY); ctx.lineTo(99999, axY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(axX, -99999); ctx.lineTo(axX, 99999); ctx.stroke()
      ctx.setLineDash([])

      // Evolution lines (drawn before points so points appear on top)
      if (showEvoLinesRef.current && evoPairs.length > 0) {
        const matchSet = matchingSetRef.current
        ctx.lineWidth = 0.6 / transform.k

        if (matchSet === null) {
          // No filter: all lines at low opacity
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
          ctx.beginPath()
          for (const [pi, ci] of evoPairs) {
            const [px, py] = baseCoords[pi]
            const [cx, cy] = baseCoords[ci]
            ctx.moveTo(px, py)
            ctx.lineTo(cx, cy)
          }
          ctx.stroke()
        } else {
          // Filter active: only draw lines where both endpoints match
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
          ctx.beginPath()
          for (const [pi, ci] of evoPairs) {
            if (!matchSet.has(pi) || !matchSet.has(ci)) continue
            const [px, py] = baseCoords[pi]
            const [cx, cy] = baseCoords[ci]
            ctx.moveTo(px, py)
            ctx.lineTo(cx, cy)
          }
          ctx.stroke()
        }
      }

      // Points
      const radii       = radiiRef.current
      const matchSet    = matchingSetRef.current
      const colorGroups = colorGroupsRef.current

      if (matchSet !== null) {
        // Non-matching: dim gray, smaller
        ctx.globalAlpha = 0.08
        ctx.fillStyle   = '#6b7280'
        ctx.beginPath()
        for (let i = 0; i < pokemon.length; i++) {
          if (matchSet.has(i)) continue
          const [x, y] = baseCoords[i]
          const sr = (radii[i] ?? POINT_RADIUS) * 0.6 / transform.k
          ctx.moveTo(x + sr, y)
          ctx.arc(x, y, sr, 0, TWO_PI)
        }
        ctx.fill()
        ctx.globalAlpha = 1.0

        // Matching: colored fill (batched by color, variable radius)
        for (const [color, indices] of colorGroups) {
          ctx.beginPath()
          ctx.fillStyle = color
          for (const i of indices) {
            if (!matchSet.has(i)) continue
            const [x, y] = baseCoords[i]
            const r = (radii[i] ?? POINT_RADIUS) / transform.k
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, TWO_PI)
          }
          ctx.fill()
        }

        // White outline on matching
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth   = 0.8 / transform.k
        ctx.beginPath()
        for (const [, indices] of colorGroups) {
          for (const i of indices) {
            if (!matchSet.has(i)) continue
            const [x, y] = baseCoords[i]
            const r = (radii[i] ?? POINT_RADIUS) / transform.k
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, TWO_PI)
          }
        }
        ctx.stroke()
      } else {
        for (const [color, indices] of colorGroups) {
          ctx.beginPath()
          ctx.fillStyle = color
          for (const i of indices) {
            const [x, y] = baseCoords[i]
            const r = (radii[i] ?? POINT_RADIUS) / transform.k
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, TWO_PI)
          }
          ctx.fill()
        }
      }

      // Selected ring (amber)
      const selIdx = selectedIdxRef.current
      if (selIdx >= 0) {
        const [x, y] = baseCoords[selIdx]
        const pr = (radii[selIdx] ?? POINT_RADIUS)
        const sr = Math.max(SELECTED_RADIUS, pr + 2) / transform.k
        ctx.beginPath()
        ctx.arc(x, y, sr, 0, TWO_PI)
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth   = 2.5 / transform.k
        ctx.stroke()
      }

      // Hover ring (white)
      if (hoveredIdx >= 0) {
        const [x, y] = baseCoords[hoveredIdx]
        const pr = (radii[hoveredIdx] ?? POINT_RADIUS)
        const hr = Math.max(HOVER_RADIUS, pr + 1) / transform.k
        ctx.beginPath()
        ctx.arc(x, y, hr, 0, TWO_PI)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth   = 2 / transform.k
        ctx.stroke()
      }

      ctx.restore()

      // Axis labels (screen space)
      const screenAY = transform.k * axisYRef.current + transform.y
      const screenAX = transform.k * axisXRef.current + transform.x
      ctx.save()
      ctx.font      = '10px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(107, 114, 128, 0.55)'
      if (screenAY > 16 && screenAY < height - 12) {
        ctx.textAlign = 'left';  ctx.fillText(axisLabels.xLeft,  8,         screenAY - 4)
        ctx.textAlign = 'right'; ctx.fillText(axisLabels.xRight, width - 8, screenAY - 4)
      }
      if (screenAX > 8 && screenAX < width - 60) {
        ctx.textAlign = 'left'
        ctx.fillText(axisLabels.yTop, screenAX + 4, 13)
        ctx.fillText(axisLabels.yBot, screenAX + 4, height - 6)
      }
      ctx.restore()
    }

    function scheduleDraw() {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => { draw(); rafId = null })
    }

    scheduleDrawRef.current = scheduleDraw

    const sel = select(canvas)

    fitToViewRef.current = () => {
      zoomBehavior.transform(sel, computeFitTransform(p2x, p2y, p98x, p98y, canvas.width, canvas.height))
    }
    zoomInRef.current  = () => { zoomBehavior.scaleBy(sel, 1.4) }
    zoomOutRef.current = () => { zoomBehavior.scaleBy(sel, 1 / 1.4) }

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w; canvas.height = h
      setupGeometry(w, h); updateZoomExtent(w, h)
      zoomBehavior.transform(sel, computeFitTransform(p2x, p2y, p98x, p98y, w, h))
    })
    ro.observe(container)

    canvas.width  = container.clientWidth
    canvas.height = container.clientHeight
    setupGeometry(canvas.width, canvas.height)
    updateZoomExtent(canvas.width, canvas.height)

    zoomBehavior.on('zoom', (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
      transform = event.transform
      scheduleDraw()
    })
    sel.call(zoomBehavior)
    zoomBehavior.transform(sel, computeFitTransform(p2x, p2y, p98x, p98y, canvas.width, canvas.height))

    function onMouseMove(e: MouseEvent) {
      if (!delaunay) return
      const [mx, my] = transform.invert([e.offsetX, e.offsetY] as [number, number])
      const idx = delaunay.find(mx, my)
      const [bx, by] = baseCoords[idx]
      const dist = Math.hypot(e.offsetX - (transform.k * bx + transform.x), e.offsetY - (transform.k * by + transform.y))
      if (idx !== hoveredIdx) { hoveredIdx = idx; scheduleDraw() }
      if (dist < HOVER_THRESHOLD) {
        setHover({ pokemon: pokemon[idx], mouseX: e.clientX, mouseY: e.clientY })
      } else {
        setHover(null)
      }
    }

    function onMouseLeave() {
      hoveredIdx = -1
      setHover(null)
      scheduleDraw()
    }

    function onClick(e: MouseEvent) {
      if (!delaunay) return
      const [mx, my] = transform.invert([e.offsetX, e.offsetY] as [number, number])
      const idx = delaunay.find(mx, my)
      const [bx, by] = baseCoords[idx]
      const dist = Math.hypot(e.offsetX - (transform.k * bx + transform.x), e.offsetY - (transform.k * by + transform.y))
      if (dist < HOVER_THRESHOLD) {
        const { selectedPokemon, setSelectedPokemon } = useStore.getState()
        const clicked = pokemon[idx]
        setSelectedPokemon(selectedPokemon?.name === clicked.name ? null : clicked)
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('click', onClick)

    return () => {
      scheduleDrawRef.current = null
      fitToViewRef.current = () => {}
      zoomInRef.current    = () => {}
      zoomOutRef.current   = () => {}
      ro.disconnect()
      sel.on('.zoom', null)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('click', onClick)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [data])

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-950">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <MapControls
        onZoomIn={() => zoomInRef.current()}
        onZoomOut={() => zoomOutRef.current()}
        onFit={() => fitToViewRef.current()}
        panelOpen={selectedPokemon !== null}
      />
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <span className="text-sm font-semibold text-gray-200">{matchCount.toLocaleString()}</span>
        <span className="text-xs text-gray-600"> / {pokemon.length.toLocaleString()}</span>
      </div>
      {hover && <HoverCard pokemon={hover.pokemon} mouseX={hover.mouseX} mouseY={hover.mouseY} />}
    </div>
  )
}
