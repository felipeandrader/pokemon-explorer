import { useMemo, useState } from 'react'
import type { Pokemon } from '../types'
import { type ColorMode, getLegend, isContinuousMode, AB_COLORS } from '../constants/colorModes'
import { useStore, type SizeMode } from '../store/useStore'
import { EMPTY_FILTER, type FilterState } from '../filters/predicates'
import { TYPE_COLORS } from '../constants/typeColors'

// ─── constants (shared with A/B editors) ─────────────────────────────────────

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const CATEGORIES = [
  { id: 'normal',           label: 'Normal'      },
  { id: 'baby',             label: 'Baby'         },
  { id: 'pseudo_legendary', label: 'Pseudo-leg.'  },
  { id: 'legendary',        label: 'Legendary'    },
  { id: 'mythical',         label: 'Mythical'     },
]

// ─── SetEditor ────────────────────────────────────────────────────────────────

interface SetEditorProps {
  label:       string
  accent:      string
  filterState: FilterState
  onChange:    (f: FilterState) => void
}

function SetEditor({ label, accent, filterState, onChange }: SetEditorProps) {
  const [open,     setOpen]     = useState(true)
  const [openSect, setOpenSect] = useState({ types: true, gens: false, cats: false })

  const toggleType = (t: string) => {
    const next = new Set(filterState.types)
    next.has(t) ? next.delete(t) : next.add(t)
    onChange({ ...filterState, types: next })
  }
  const toggleGen = (g: number) => {
    const next = new Set(filterState.generations)
    next.has(g) ? next.delete(g) : next.add(g)
    onChange({ ...filterState, generations: next })
  }
  const toggleCat = (c: string) => {
    const next = new Set(filterState.categories)
    next.has(c) ? next.delete(c) : next.add(c)
    onChange({ ...filterState, categories: next })
  }

  const hasAny = filterState.types.size > 0 || filterState.generations.size > 0 || filterState.categories.size > 0

  return (
    <div className="rounded border" style={{ borderColor: accent + '44' }}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-xs font-semibold flex-1" style={{ color: accent }}>{label}</span>
        {hasAny && (
          <button onClick={() => onChange(EMPTY_FILTER)}
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
            Clear
          </button>
        )}
        <button onClick={() => setOpen(v => !v)} className="text-[10px] text-gray-700 hover:text-gray-500">
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="border-t pb-1" style={{ borderColor: accent + '22' }}>

          {/* Type */}
          <button
            onClick={() => setOpenSect(s => ({ ...s, types: !s.types }))}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold text-tk-t4 uppercase tracking-widest hover:text-tk-t3"
          >
            <span>Type{filterState.types.size > 0 && ` (${filterState.types.size})`}</span>
            <span className="text-tk-t5">{openSect.types ? '▲' : '▼'}</span>
          </button>
          {openSect.types && (
            <div className="px-2 grid grid-cols-2 gap-0.5 pb-1">
              {ALL_TYPES.map(t => {
                const active = filterState.types.has(t)
                const color  = TYPE_COLORS[t] ?? '#888'
                return (
                  <button key={t} onClick={() => toggleType(t)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded text-left cursor-pointer transition-all"
                    style={{
                      backgroundColor: active ? color + '22' : 'transparent',
                      border: `1px solid ${active ? color + '55' : '#374151'}`,
                      color:  active ? color : '#6b7280',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="capitalize truncate">{t}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Generation */}
          <button
            onClick={() => setOpenSect(s => ({ ...s, gens: !s.gens }))}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold text-tk-t4 uppercase tracking-widest hover:text-tk-t3"
          >
            <span>Generation{filterState.generations.size > 0 && ` (${filterState.generations.size})`}</span>
            <span className="text-tk-t5">{openSect.gens ? '▲' : '▼'}</span>
          </button>
          {openSect.gens && (
            <div className="px-2 flex flex-wrap gap-0.5 pb-1">
              {GENERATIONS.map(g => {
                const active = filterState.generations.has(g)
                return (
                  <button key={g} onClick={() => toggleGen(g)}
                    className="w-7 h-7 text-xs rounded transition-all"
                    style={{
                      backgroundColor: active ? accent + '33' : '#1F2937',
                      border: `1px solid ${active ? accent + '66' : '#374151'}`,
                      color:  active ? accent : 'var(--color-t4)',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          )}

          {/* Category */}
          <button
            onClick={() => setOpenSect(s => ({ ...s, cats: !s.cats }))}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold text-tk-t4 uppercase tracking-widest hover:text-tk-t3"
          >
            <span>Category{filterState.categories.size > 0 && ` (${filterState.categories.size})`}</span>
            <span className="text-tk-t5">{openSect.cats ? '▲' : '▼'}</span>
          </button>
          {openSect.cats && (
            <div className="px-2 flex flex-col gap-0.5 pb-1">
              {CATEGORIES.map(({ id, label: catLabel }) => {
                const active = filterState.categories.has(id)
                return (
                  <button key={id} onClick={() => toggleCat(id)}
                    className="px-2 py-1 text-xs rounded text-left transition-all"
                    style={{
                      backgroundColor: active ? accent + '22' : 'transparent',
                      border: `1px solid ${active ? accent + '55' : '#374151'}`,
                      color:  active ? accent : 'var(--color-t4)',
                    }}
                  >
                    {catLabel}
                  </button>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props { pokemon: Pokemon[] }

export function ColorBySelector({ pokemon }: Props) {
  const colorMode       = useStore(s => s.colorMode)
  const setColorMode    = useStore(s => s.setColorMode)
  const sizeMode        = useStore(s => s.sizeMode)
  const setSizeMode     = useStore(s => s.setSizeMode)
  const showEvoLines    = useStore(s => s.showEvoLines)
  const setShowEvoLines = useStore(s => s.setShowEvoLines)
  const [legendOpen, setLegendOpen] = useState(true)

  const filterStateA    = useStore(s => s.filterStateA)
  const filterStateB    = useStore(s => s.filterStateB)
  const activeFilterA   = useStore(s => s.activeFilterA)
  const activeFilterB   = useStore(s => s.activeFilterB)
  const setFilterStateA = useStore(s => s.setFilterStateA)
  const setFilterStateB = useStore(s => s.setFilterStateB)

  const legend = useMemo(() => getLegend(colorMode, pokemon), [colorMode, pokemon])

  const abCounts = useMemo(() => {
    if (colorMode !== 'ab') return null
    const a  = activeFilterA ? pokemon.filter(activeFilterA).length : null
    const b  = activeFilterB ? pokemon.filter(activeFilterB).length : null
    const ab = (activeFilterA !== null || activeFilterB !== null)
      ? pokemon.filter(p =>
          (activeFilterA === null || activeFilterA(p)) &&
          (activeFilterB === null || activeFilterB(p))
        ).length
      : null
    return { a, b, ab }
  }, [colorMode, activeFilterA, activeFilterB, pokemon])

  const isAb         = colorMode === 'ab'
  const isContinuous = isContinuousMode(colorMode)

  return (
    <div className="select-none space-y-4">

      {/* ── Color by ── */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-tk-t4 uppercase tracking-widest flex-1 font-pixel">Color by</span>
          {!isContinuous && !isAb && (
            <button onClick={() => setLegendOpen(v => !v)}
              className="text-tk-t4 hover:text-tk-t3 transition-colors text-xs"
              title={legendOpen ? 'Hide legend' : 'Show legend'}
            >
              {legendOpen ? '▲' : '▼'}
            </button>
          )}
        </div>
        <select
          value={colorMode}
          onChange={e => setColorMode(e.target.value as ColorMode)}
          className="w-full bg-tk-s2 border border-tk-b1 text-tk-t1 text-xs rounded px-2 py-1.5 outline-none cursor-pointer focus:border-tk-b2"
          style={{ backgroundColor: 'var(--color-s2)', color: 'var(--color-t1)' }}
        >
          <optgroup label="Categorical" className="bg-tk-surface">
            <option value="type"       className="bg-tk-surface">Type</option>
            <option value="generation" className="bg-tk-surface">Generation</option>
            <option value="category"   className="bg-tk-surface">Category</option>
            <option value="ab"         className="bg-tk-surface">A/B Compare</option>
          </optgroup>
          <optgroup label="Continuous" className="bg-tk-surface">
            <option value="bst"   className="bg-tk-surface">BST (power)</option>
            <option value="speed" className="bg-tk-surface">Speed</option>
          </optgroup>
        </select>

        {/* A/B editors (shown when mode = ab) */}
        {isAb && (
          <div className="mt-3 space-y-2">
            {/* Legend row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {([
                { color: AB_COLORS.aOnly, label: 'Set A' },
                { color: AB_COLORS.bOnly, label: 'Set B' },
                { color: AB_COLORS.both,  label: 'A ∩ B' },
              ] as const).map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                  <span className="text-tk-t4">{label}</span>
                </span>
              ))}
            </div>

            <SetEditor
              label="Set A"
              accent={AB_COLORS.aOnly}
              filterState={filterStateA}
              onChange={setFilterStateA}
            />
            <SetEditor
              label="Set B"
              accent={AB_COLORS.bOnly}
              filterState={filterStateB}
              onChange={setFilterStateB}
            />

            {/* A/B counts */}
            {abCounts && (abCounts.a !== null || abCounts.b !== null) && (
              <div className="text-xs space-y-0.5 pt-1.5 border-t border-tk-b1">
                {abCounts.a !== null && (
                  <div className="flex justify-between">
                    <span className="text-tk-t4">Set A</span>
                    <span style={{ color: AB_COLORS.aOnly }} className="tabular-nums font-medium">{abCounts.a}</span>
                  </div>
                )}
                {abCounts.b !== null && (
                  <div className="flex justify-between">
                    <span className="text-tk-t4">Set B</span>
                    <span style={{ color: AB_COLORS.bOnly }} className="tabular-nums font-medium">{abCounts.b}</span>
                  </div>
                )}
                {abCounts.ab !== null && (
                  <div className="flex justify-between">
                    <span className="text-tk-t4">A ∩ B</span>
                    <span style={{ color: AB_COLORS.both }} className="tabular-nums font-medium">{abCounts.ab}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Normal legend (continuous: gradient bar; categorical: bullets) */}
        {!isAb && (
          isContinuous ? (
            <div className="mt-2">
              <div className="h-3 rounded" style={{ background: `linear-gradient(to right, ${(legend as { stops: string[] }).stops.join(', ')})` }} />
              <div className="flex justify-between mt-1 text-[10px] text-tk-t4">
                <span>{(legend as { minLabel: string }).minLabel}</span>
                <span>{(legend as { maxLabel: string }).maxLabel}</span>
              </div>
            </div>
          ) : legendOpen ? (
            <div className="mt-2">
              {colorMode === 'type' ? (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {(legend as { items: { label: string; color: string }[] }).items.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-tk-t3 capitalize truncate">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {(legend as { items: { label: string; color: string }[] }).items.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-tk-t3 capitalize">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* ── Size by ── */}
      <div>
        <span className="text-xs text-tk-t4 uppercase tracking-widest block mb-1.5 font-pixel">Size by</span>
        <div className="flex gap-1">
          {(['none', 'bst', 'speed'] as SizeMode[]).map(m => (
            <button key={m} onClick={() => setSizeMode(m)}
              className={`flex-1 py-1 rounded text-xs transition-colors ${
                sizeMode === m
                  ? 'bg-tk-s3 border border-tk-b2 text-tk-t1'
                  : 'bg-tk-s2 border border-tk-b1 text-tk-t3 hover:border-tk-b2 hover:text-tk-t1'
              }`}
            >
              {m === 'none' ? 'None' : m === 'bst' ? 'BST' : 'Speed'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Evolution lines ── */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            onClick={() => setShowEvoLines(!showEvoLines)}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${showEvoLines ? 'bg-blue-600' : 'bg-tk-s3'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showEvoLines ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-tk-t3 group-hover:text-tk-t2 transition-colors select-none">
            Evolution lines
          </span>
        </label>
      </div>

    </div>
  )
}
