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
import { spriteUrl } from '../utils/spriteUrl'

// ─── constants ────────────────────────────────────────────────────────────────

const POINT_HALF    = 3.5   // half-side of squares (px at zoom 1)
const SIZE_MIN_PX   = 2
const SIZE_MAX_PX   = 7
const HOVER_HALF    = 7
const SELECTED_HALF = 9
const HOVER_THRESHOLD     = 20
const STACK_THRESHOLD     = POINT_HALF * 2    // canvas-px radius for overlap grouping
const PADDING             = 48
const TWO_PI              = Math.PI * 2
const SPRITE_ZOOM_THRESHOLD = 4
const SPRITE_SCREEN_SIZE    = 56
const GRID_STEP             = 40   // world units

type SpriteState = 'loading' | 'error' | HTMLImageElement

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
  const abbrev = (f: string) =>
    ({ hp: 'HP', attack: 'Atk', defense: 'Def', sp_attack: 'SpA', sp_defense: 'SpD', speed: 'Spe' }[f] ?? f)
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
  if (sizeMode === 'none') { arr.fill(POINT_HALF); return arr }
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

// ─── canvas drawing helpers ───────────────────────────────────────────────────

function drawPokeball(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number, k: number,
  pixel: boolean,
) {
  const lw = 1.5 / k

  // Top half — red
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = '#cc2233'
  ctx.fill()

  // Bottom half — white
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = '#f0f0f0'
  ctx.fill()

  // Outer ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TWO_PI)
  ctx.strokeStyle = '#0a1214'
  ctx.lineWidth = lw
  ctx.stroke()

  // Center divider
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.strokeStyle = '#0a1214'
  ctx.lineWidth = lw
  ctx.stroke()

  // Inner circle
  const ir = r * 0.32
  ctx.beginPath()
  ctx.arc(cx, cy, ir, 0, TWO_PI)
  ctx.fillStyle = '#f8f8f8'
  ctx.fill()
  ctx.strokeStyle = '#0a1214'
  ctx.lineWidth = lw * 0.7
  ctx.stroke()

  // Selection accent ring
  ctx.beginPath()
  ctx.arc(cx, cy, r + lw * 2.5, 0, TWO_PI)
  ctx.strokeStyle = pixel ? '#f8d030' : '#f59e0b'
  ctx.lineWidth = lw * 1.5
  ctx.stroke()
}

// ─── types ────────────────────────────────────────────────────────────────────

interface HoverState { pokemon: Pokemon; mouseX: number; mouseY: number }
interface Props { data: PokemonData }

// ─── component ────────────────────────────────────────────────────────────────

export function PokemonMap({ data }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scheduleDrawRef    = useRef<(() => void) | null>(null)
  const matchingSetRef     = useRef<Set<number> | null>(null)
  const colorGroupsRef     = useRef<Map<string, number[]>>(new Map())
  const colorModeRef       = useRef<ColorMode>('type')
  const activeFilterARef   = useRef<((p: Pokemon) => boolean) | null>(null)
  const activeFilterBRef   = useRef<((p: Pokemon) => boolean) | null>(null)
  const axisXRef           = useRef(0)
  const axisYRef           = useRef(0)
  const fitToViewRef       = useRef<() => void>(() => {})
  const zoomInRef          = useRef<() => void>(() => {})
  const zoomOutRef         = useRef<() => void>(() => {})
  const selectedIdxRef     = useRef(-1)
  const radiiRef           = useRef<Float32Array>(new Float32Array())
  const showEvoLinesRef    = useRef(false)
  const spriteCacheRef     = useRef<Map<number, SpriteState>>(new Map())
  const viewModeRef        = useRef<'pca' | 'umap'>('pca')
  const selectedChainRef   = useRef<Set<number>>(new Set())
  const updateViewModeRef  = useRef<(() => void)>(() => {})
  const panToRef           = useRef<((p: Pokemon) => void)>(() => {})

  const [hover, setHover]           = useState<HoverState | null>(null)
  const [matchCount, setMatchCount] = useState(data.pokemon.length)

  const { pokemon } = data

  const idToIdxRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    const m = new Map<string, number>()
    pokemon.forEach((p, i) => m.set(p.name, i))
    idToIdxRef.current = m
  }, [pokemon])

  // ── theme MutationObserver — triggers redraw on theme switch ──────────────
  useEffect(() => {
    const observer = new MutationObserver(() => scheduleDrawRef.current?.())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

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

  // ── selectedPokemon → selectedIdx + chain set ─────────────────────────────
  const selectedPokemon = useStore(s => s.selectedPokemon)
  useEffect(() => {
    const idx = selectedPokemon
      ? (idToIdxRef.current.get(selectedPokemon.name) ?? -1)
      : -1
    selectedIdxRef.current = idx
    if (selectedPokemon?.evo.chain_id != null) {
      const chainId = selectedPokemon.evo.chain_id
      const chainSet = new Set<number>()
      pokemon.forEach((p, i) => {
        if (p.evo.chain_id === chainId && i !== idx) chainSet.add(i)
      })
      selectedChainRef.current = chainSet
    } else {
      selectedChainRef.current = new Set()
    }
    scheduleDrawRef.current?.()
  }, [selectedPokemon, pokemon])

  // ── viewMode ───────────────────────────────────────────────────────────────
  const viewMode = useStore(s => s.viewMode)
  useEffect(() => {
    viewModeRef.current = viewMode
    updateViewModeRef.current()
  }, [viewMode])

  // ── pendingPan ─────────────────────────────────────────────────────────────
  const pendingPan    = useStore(s => s.pendingPan)
  const setPendingPan = useStore(s => s.setPendingPan)
  useEffect(() => {
    if (!pendingPan) return
    panToRef.current(pendingPan)
    setPendingPan(null)
  }, [pendingPan, setPendingPan])

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
    let userHasInteracted = false
    let prevW = container.clientWidth
    let prevH = container.clientHeight

    const pcaXs = [...pokemon.map(p => p.pca[0])].sort((a, b) => a - b)
    const pcaYs = [...pokemon.map(p => p.pca[1])].sort((a, b) => a - b)
    const n     = pokemon.length
    const pcaBounds = {
      p2x:  pcaXs[Math.floor(n * 0.02)],
      p98x: pcaXs[Math.min(Math.floor(n * 0.98), n - 1)],
      p2y:  pcaYs[Math.floor(n * 0.02)],
      p98y: pcaYs[Math.min(Math.floor(n * 0.98), n - 1)],
    }
    const umapPokemon = pokemon.filter(p => p.umap != null)
    let umapBounds = pcaBounds
    if (umapPokemon.length > 0) {
      const uxs = umapPokemon.map(p => p.umap![0]).sort((a, b) => a - b)
      const uys = umapPokemon.map(p => p.umap![1]).sort((a, b) => a - b)
      const nu  = umapPokemon.length
      umapBounds = {
        p2x:  uxs[Math.floor(nu * 0.02)],
        p98x: uxs[Math.min(Math.floor(nu * 0.98), nu - 1)],
        p2y:  uys[Math.floor(nu * 0.02)],
        p98y: uys[Math.min(Math.floor(nu * 0.98), nu - 1)],
      }
    }
    function getBounds() {
      return viewModeRef.current === 'umap' ? umapBounds : pcaBounds
    }

    const axisLabels  = getAxisLabels(data.meta.pca.components, data.meta.features)
    const evoPairs    = buildEvoPairs(pokemon)
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.3, 40])
      .filter((event) => {
        if (event.type === 'dblclick' && delaunay && baseCoords.length > 0) {
          const me = event as MouseEvent
          const [mx, my] = transform.invert([me.offsetX, me.offsetY] as [number, number])
          const idx = delaunay.find(mx, my)
          const [bx, by] = baseCoords[idx]
          const dist = Math.hypot(
            me.offsetX - (transform.k * bx + transform.x),
            me.offsetY - (transform.k * by + transform.y),
          )
          if (dist < HOVER_THRESHOLD) return false
        }
        return !(event as MouseEvent).button
      })

    function updateZoomExtent(w: number, h: number) {
      const m = Math.max(w, h) * 0.4
      zoomBehavior.translateExtent([[-m, -m], [w + m, h + m]])
    }

    function setupGeometry(w: number, h: number) {
      baseCoords = viewModeRef.current === 'umap'
        ? pokemon.map(pk => (pk.umap != null)
            ? toBase(pk.umap[0], pk.umap[1], w, h)
            : toBase(pk.pca[0], pk.pca[1], w, h))
        : pokemon.map(pk => toBase(pk.pca[0], pk.pca[1], w, h))
      let sumX = 0, sumY = 0
      for (const [x, y] of baseCoords) { sumX += x; sumY += y }
      axisXRef.current = sumX / baseCoords.length
      axisYRef.current = sumY / baseCoords.length
      colorGroupsRef.current = colorModeRef.current === 'ab'
        ? buildAbColorGroups(pokemon, activeFilterARef.current, activeFilterBRef.current)
        : buildColorGroups(pokemon, colorModeRef.current)
      delaunay = Delaunay.from(baseCoords)
    }

    function loadSprite(i: number, url: string) {
      spriteCacheRef.current.set(i, 'loading')
      const img = new Image()
      img.onload  = () => { spriteCacheRef.current.set(i, img); scheduleDraw() }
      img.onerror = () => { spriteCacheRef.current.set(i, 'error') }
      img.src = url
    }

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx || baseCoords.length === 0) return

      const { width, height } = canvas
      const k      = transform.k
      const pixel  = document.documentElement.getAttribute('data-theme') === 'pixel'
      const radii      = radiiRef.current
      const matchSet   = matchingSetRef.current
      const colorGroups = colorGroupsRef.current

      ctx.clearRect(0, 0, width, height)

      // ── A. Scanlines (screen space, before world content) ───────────────
      if (pixel) {
        ctx.save()
        ctx.globalAlpha = 0.025
        ctx.fillStyle   = '#000000'
        for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1)
        ctx.restore()
      }

      // ── B. Enter world space ────────────────────────────────────────────
      ctx.save()
      ctx.translate(transform.x, transform.y)
      ctx.scale(k, k)

      // ── C. Dotted background grid ───────────────────────────────────────
      {
        const minScreenGap = 25
        const gs = Math.max(GRID_STEP, Math.ceil(minScreenGap / k / 10) * 10)
        const [wx0, wy0] = transform.invert([0, 0] as [number, number])
        const [wx1, wy1] = transform.invert([width, height] as [number, number])
        const dotR = 1 / k
        ctx.fillStyle = pixel
          ? 'rgba(46, 74, 106, 0.30)'
          : 'rgba(107, 114, 128, 0.10)'
        for (let gx = Math.floor(wx0 / gs) * gs; gx <= wx1; gx += gs)
          for (let gy = Math.floor(wy0 / gs) * gs; gy <= wy1; gy += gs)
            ctx.fillRect(gx - dotR, gy - dotR, dotR * 2, dotR * 2)
      }

      // ── D. Radar rings ──────────────────────────────────────────────────
      {
        const cx = axisXRef.current
        const cy = axisYRef.current
        ctx.strokeStyle = pixel ? 'rgba(46, 74, 106, 0.22)' : 'rgba(107, 114, 128, 0.08)'
        ctx.lineWidth = 1 / k
        ctx.setLineDash([])
        for (let r = 80; r < 1500; r += 80) {
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, TWO_PI)
          ctx.stroke()
        }
      }

      // ── E. Dashed axes ──────────────────────────────────────────────────
      const axX = axisXRef.current
      const axY = axisYRef.current
      ctx.strokeStyle = pixel ? 'rgba(46, 74, 106, 0.5)' : 'rgba(75, 85, 99, 0.4)'
      ctx.lineWidth   = 1 / k
      ctx.setLineDash([5 / k, 4 / k])
      ctx.beginPath(); ctx.moveTo(-99999, axY); ctx.lineTo(99999, axY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(axX, -99999); ctx.lineTo(axX, 99999); ctx.stroke()
      ctx.setLineDash([])

      // ── F. Evolution lines ──────────────────────────────────────────────
      if (showEvoLinesRef.current && evoPairs.length > 0) {
        ctx.lineWidth = 0.6 / k
        if (matchSet === null) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
          ctx.beginPath()
          for (const [pi, ci] of evoPairs) {
            const [px, py] = baseCoords[pi]
            const [cx, cy] = baseCoords[ci]
            ctx.moveTo(px, py); ctx.lineTo(cx, cy)
          }
          ctx.stroke()
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
          ctx.beginPath()
          for (const [pi, ci] of evoPairs) {
            if (!matchSet.has(pi) || !matchSet.has(ci)) continue
            const [px, py] = baseCoords[pi]
            const [cx, cy] = baseCoords[ci]
            ctx.moveTo(px, py); ctx.lineTo(cx, cy)
          }
          ctx.stroke()
        }
      }

      // ── G. Non-matching squares (dim gray) ─────────────────────────────
      if (k < SPRITE_ZOOM_THRESHOLD) {
        // ── G. Non-matching squares (dim gray) ────────────────────────────
        if (matchSet !== null) {
          ctx.globalAlpha = 0.08
          ctx.fillStyle   = '#6b7280'
          ctx.beginPath()
          for (let i = 0; i < pokemon.length; i++) {
            if (matchSet.has(i)) continue
            const [x, y] = baseCoords[i]
            const h = ((radii[i] ?? POINT_HALF) * 0.6) / k
            ctx.rect(x - h, y - h, h * 2, h * 2)
          }
          ctx.fill()
          ctx.globalAlpha = 1.0
        }

        // ── H. Matching squares (colored, batched by color group) ─────────
        for (const [color, indices] of colorGroups) {
          ctx.fillStyle = color
          ctx.beginPath()
          for (const i of indices) {
            if (matchSet !== null && !matchSet.has(i)) continue
            const [x, y] = baseCoords[i]
            const h = (radii[i] ?? POINT_HALF) / k
            ctx.rect(x - h, y - h, h * 2, h * 2)
          }
          ctx.fill()
        }

        // ── I. Dark outline on all visible squares ────────────────────────
        ctx.strokeStyle = 'rgba(6, 14, 22, 0.55)'
        ctx.lineWidth   = 0.5 / k
        ctx.beginPath()
        for (const [, indices] of colorGroups) {
          for (const i of indices) {
            if (matchSet !== null && !matchSet.has(i)) continue
            const [x, y] = baseCoords[i]
            const h = (radii[i] ?? POINT_HALF) / k
            ctx.rect(x - h, y - h, h * 2, h * 2)
          }
        }
        ctx.stroke()

        // ── I-chain. Evolution chain highlight rings ──────────────────────
        {
          const chainSet = selectedChainRef.current
          if (chainSet.size > 0) {
            ctx.strokeStyle = 'rgba(248, 208, 48, 0.55)'
            ctx.lineWidth   = 1.2 / k
            ctx.beginPath()
            for (const ci of chainSet) {
              const [x, y] = baseCoords[ci]
              const h = ((radii[ci] ?? POINT_HALF) + 2.5) / k
              ctx.rect(x - h, y - h, h * 2, h * 2)
            }
            ctx.stroke()
          }
        }

        // ── J. Hover outline ──────────────────────────────────────────────
        if (hoveredIdx >= 0) {
          const [x, y] = baseCoords[hoveredIdx]
          const pr = radii[hoveredIdx] ?? POINT_HALF
          const hh = Math.max(HOVER_HALF, pr + 1) / k
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth   = 1.5 / k
          ctx.strokeRect(x - hh, y - hh, hh * 2, hh * 2)
        }

        // ── K. Selected — Pokéball marker ─────────────────────────────────
        const selIdx = selectedIdxRef.current
        if (selIdx >= 0) {
          const [x, y] = baseCoords[selIdx]
          const pr = radii[selIdx] ?? POINT_HALF
          const ballR = Math.max(SELECTED_HALF, pr + 3) / k
          drawPokeball(ctx, x, y, ballR, k, pixel)
        }
      }

      ctx.restore()  // exit world space

      // ── L. Sprites at high zoom (screen space) ──────────────────────────
      if (k >= SPRITE_ZOOM_THRESHOLD) {
        ctx.imageSmoothingEnabled = false
        const screenSize = SPRITE_SCREEN_SIZE * (k / SPRITE_ZOOM_THRESHOLD)
        const half = screenSize / 2
        for (let i = 0; i < pokemon.length; i++) {
          const [wx, wy] = baseCoords[i]
          const sx = wx * k + transform.x
          const sy = wy * k + transform.y
          if (sx < -half * 2 || sx > width + half * 2 ||
              sy < -half * 2 || sy > height + half * 2) continue

          const url = spriteUrl(pokemon[i].id)
          const cached = spriteCacheRef.current.get(i)
          if (cached instanceof HTMLImageElement) {
            ctx.globalAlpha = (matchSet !== null && !matchSet.has(i)) ? 0.12 : 1.0
            ctx.drawImage(cached, sx - half, sy - half, screenSize, screenSize)
            ctx.globalAlpha = 1.0
          } else if (cached === undefined) {
            loadSprite(i, url)
          }
        }
        // ── L-chain. Evolution chain rings in sprite mode ──────────────────
        {
          const chainSet = selectedChainRef.current
          if (chainSet.size > 0) {
            ctx.strokeStyle = 'rgba(248, 208, 48, 0.7)'
            ctx.lineWidth = 2.5
            const spriteHalf = SPRITE_SCREEN_SIZE * (k / SPRITE_ZOOM_THRESHOLD) / 2 + 4
            ctx.beginPath()
            for (const ci of chainSet) {
              const [wx, wy] = baseCoords[ci]
              const sx = wx * k + transform.x
              const sy = wy * k + transform.y
              ctx.rect(sx - spriteHalf, sy - spriteHalf, spriteHalf * 2, spriteHalf * 2)
            }
            ctx.stroke()
          }
        }
        ctx.imageSmoothingEnabled = true
      }

      // ── M. Axis labels / UMAP legend (screen space) ──────────────────────
      ctx.save()
      ctx.font      = '10px "Pixelify Sans", monospace'
      ctx.fillStyle = pixel
        ? 'rgba(74, 106, 136, 0.65)'
        : 'rgba(107, 114, 128, 0.55)'

      if (viewModeRef.current === 'pca') {
        const screenAY = k * axisYRef.current + transform.y
        const screenAX = k * axisXRef.current + transform.x
        if (screenAY > 16 && screenAY < height - 12) {
          ctx.textAlign = 'left';  ctx.fillText(axisLabels.xLeft,  8,         screenAY - 4)
          ctx.textAlign = 'right'; ctx.fillText(axisLabels.xRight, width - 8, screenAY - 4)
        }
        if (screenAX > 8 && screenAX < width - 60) {
          ctx.textAlign = 'left'
          ctx.fillText(axisLabels.yTop, screenAX + 4, 13)
          ctx.fillText(axisLabels.yBot, screenAX + 4, height - 6)
        }
      } else {
        // UMAP: axes have no linear meaning — show proximity legend
        ctx.textAlign = 'left'
        ctx.fillText('UMAP — proximity ≈ similarity', 10, height - 18)
        ctx.fillText('clusters = similar stat profiles', 10, height - 6)

        // corner dots: nearby (top-left) and far (bottom-right)
        const dotColor = pixel ? 'rgba(74, 106, 136, 0.5)' : 'rgba(107, 114, 128, 0.45)'
        ctx.fillStyle = dotColor
        ctx.beginPath(); ctx.arc(width - 24, 8, 3, 0, TWO_PI); ctx.fill()
        ctx.beginPath(); ctx.arc(width - 14, 8, 3, 0, TWO_PI); ctx.fill()
        ctx.beginPath(); ctx.arc(width - 19, 8, 3, 0, TWO_PI); ctx.fill()
        ctx.fillStyle = pixel ? 'rgba(74, 106, 136, 0.65)' : 'rgba(107, 114, 128, 0.55)'
        ctx.textAlign = 'right'
        ctx.fillText('← close = alike', width - 8, 22)

        ctx.beginPath(); ctx.arc(width - 30, height - 10, 3, 0, TWO_PI); ctx.fill()
        ctx.beginPath(); ctx.arc(width - 14, height - 10, 3, 0, TWO_PI); ctx.fill()
        ctx.fillStyle = pixel ? 'rgba(74, 106, 136, 0.65)' : 'rgba(107, 114, 128, 0.55)'
        ctx.fillText('far = different →', width - 8, height - 18)
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
      userHasInteracted = false
      const b = getBounds()
      zoomBehavior.transform(sel, computeFitTransform(b.p2x, b.p2y, b.p98x, b.p98y, canvas.width, canvas.height))
    }
    zoomInRef.current  = () => { userHasInteracted = true; zoomBehavior.scaleBy(sel, 1.4) }
    zoomOutRef.current = () => { userHasInteracted = true; zoomBehavior.scaleBy(sel, 1 / 1.4) }
    updateViewModeRef.current = () => {
      userHasInteracted = false
      setupGeometry(canvas.width, canvas.height)
      const b = getBounds()
      zoomBehavior.transform(sel, computeFitTransform(b.p2x, b.p2y, b.p98x, b.p98y, canvas.width, canvas.height))
    }
    panToRef.current = (p: Pokemon) => {
      const idx = idToIdxRef.current.get(p.name)
      if (idx === undefined || !baseCoords[idx]) return
      const [wx, wy] = baseCoords[idx]
      userHasInteracted = true
      zoomBehavior.transform(sel,
        zoomIdentity
          .translate(canvas.width / 2 - transform.k * wx, canvas.height / 2 - transform.k * wy)
          .scale(transform.k)
      )
    }

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w; canvas.height = h

      if (!userHasInteracted) {
        prevW = w; prevH = h
        setupGeometry(w, h); updateZoomExtent(w, h)
        const b0 = getBounds()
        zoomBehavior.transform(sel, computeFitTransform(b0.p2x, b0.p2y, b0.p98x, b0.p98y, w, h))
        return
      }

      // Compute the PCA coordinate currently at the viewport center
      const worldCx = (prevW / 2 - transform.x) / transform.k
      const worldCy = (prevH / 2 - transform.y) / transform.k
      const pcaCx = (worldCx - PADDING) * 2 / (prevW - 2 * PADDING) - 1
      const pcaCy = 1 - (worldCy - PADDING) * 2 / (prevH - 2 * PADDING)

      prevW = w; prevH = h
      setupGeometry(w, h); updateZoomExtent(w, h)

      // Reposition so the same world coordinate stays at the new viewport center
      const newWorldCx = ((pcaCx + 1) / 2) * (w - 2 * PADDING) + PADDING
      const newWorldCy = (1 - (pcaCy + 1) / 2) * (h - 2 * PADDING) + PADDING
      zoomBehavior.transform(sel,
        zoomIdentity.translate(w / 2 - transform.k * newWorldCx, h / 2 - transform.k * newWorldCy).scale(transform.k)
      )
    })
    ro.observe(container)

    canvas.width  = container.clientWidth
    canvas.height = container.clientHeight
    setupGeometry(canvas.width, canvas.height)
    updateZoomExtent(canvas.width, canvas.height)

    zoomBehavior.on('zoom', (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
      transform = event.transform
      if (event.sourceEvent !== null) userHasInteracted = true
      scheduleDraw()
    })
    sel.call(zoomBehavior)
    const initB = getBounds()
    zoomBehavior.transform(sel, computeFitTransform(initB.p2x, initB.p2y, initB.p98x, initB.p98y, canvas.width, canvas.height))

    function onMouseMove(e: MouseEvent) {
      if (!delaunay) return
      const [mx, my] = transform.invert([e.offsetX, e.offsetY] as [number, number])
      const idx = delaunay.find(mx, my)
      const [bx, by] = baseCoords[idx]
      const dist = Math.hypot(
        e.offsetX - (transform.k * bx + transform.x),
        e.offsetY - (transform.k * by + transform.y),
      )
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
      const dist = Math.hypot(
        e.offsetX - (transform.k * bx + transform.x),
        e.offsetY - (transform.k * by + transform.y),
      )
      if (dist < HOVER_THRESHOLD) {
        // collect all pokemon within STACK_THRESHOLD canvas pixels of the nearest
        const stack: number[] = []
        for (let i = 0; i < pokemon.length; i++) {
          const [xi, yi] = baseCoords[i]
          if (Math.hypot(xi - bx, yi - by) < STACK_THRESHOLD) stack.push(i)
        }
        stack.sort((a, b) =>
          Math.hypot(baseCoords[a][0] - bx, baseCoords[a][1] - by) -
          Math.hypot(baseCoords[b][0] - bx, baseCoords[b][1] - by)
        )

        const { selectedPokemon, setSelectedPokemon } = useStore.getState()
        const stackPokemon = stack.map(i => pokemon[i])

        if (stackPokemon.length <= 1) {
          const clicked = pokemon[idx]
          setSelectedPokemon(selectedPokemon?.name === clicked.name ? null : clicked)
        } else {
          const curPos = selectedPokemon
            ? stackPokemon.findIndex(p => p.name === selectedPokemon.name)
            : -1
          const nextPos = curPos >= 0 ? (curPos + 1) % stackPokemon.length : 0
          setSelectedPokemon(stackPokemon[nextPos])
        }
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('click', onClick)

    return () => {
      scheduleDrawRef.current    = null
      fitToViewRef.current       = () => {}
      zoomInRef.current          = () => {}
      zoomOutRef.current         = () => {}
      updateViewModeRef.current  = () => {}
      panToRef.current           = () => {}
      ro.disconnect()
      sel.on('.zoom', null)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('click', onClick)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [data])

  return (
    <div ref={containerRef} className="w-full h-full relative bg-tk-bg">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <MapControls
        onZoomIn={() => zoomInRef.current()}
        onZoomOut={() => zoomOutRef.current()}
        onFit={() => fitToViewRef.current()}
        panelOpen={selectedPokemon !== null}
      />
      {hover && <HoverCard pokemon={hover.pokemon} mouseX={hover.mouseX} mouseY={hover.mouseY} />}
    </div>
  )
}
