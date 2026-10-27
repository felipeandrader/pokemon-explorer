import { useMemo, useState } from 'react'
import type { Pokemon } from '../types'
import { TYPE_COLORS } from '../constants/typeColors'
import { useStore } from '../store/useStore'
import { buildPredicate, type FilterState } from '../filters/predicates'
import { MultiSelectDropdown } from './MultiSelectDropdown'
import { ColorBySelector } from './ColorBySelector'

// ─── constants ───────────────────────────────────────────────────────────────

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const CATEGORIES = [
  { id: 'normal',           label: 'Normal'       },
  { id: 'baby',             label: 'Baby'          },
  { id: 'pseudo_legendary', label: 'Pseudo-leg.'   },
  { id: 'legendary',        label: 'Legendary'     },
  { id: 'mythical',         label: 'Mythical'      },
]

const EVO_TRIGGERS = [
  { id: 'base',       label: 'Base form'   },
  { id: 'level',      label: 'By level'    },
  { id: 'friendship', label: 'Friendship'  },
  { id: 'item',       label: 'By item'     },
  { id: 'trade',      label: 'Trade'       },
  { id: 'other',      label: 'Other'       },
]

const GENDERS = [
  { id: 'mixed',      label: 'Mixed'       },
  { id: 'male_only',  label: 'Male-only'   },
  { id: 'female_only',label: 'Female-only' },
  { id: 'genderless', label: 'Genderless'  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

function useFacetCounts(pokemon: Pokemon[], filterState: FilterState) {
  return useMemo(() => {
    const { types, generations, categories, weakTo, evoTriggers, genders, hasHiddenAbility } = filterState

    const make = (partial: Partial<FilterState>) =>
      buildPredicate({ types, generations, categories, weakTo, evoTriggers, genders, hasHiddenAbility, ...partial })

    const count = (f: ReturnType<typeof make>) =>
      f ? pokemon.filter(f).length : pokemon.length

    // AND semantics: show how many would remain if t were added to current selection
    const typeCounts: Record<string, number> = {}
    for (const t of ALL_TYPES)
      typeCounts[t] = count(make({ types: new Set([...types, t]) }))

    const genCounts: Record<number, number> = {}
    for (const g of GENERATIONS)
      genCounts[g] = count(make({ generations: new Set([g]) }))

    const catCounts: Record<string, number> = {}
    for (const { id } of CATEGORIES)
      catCounts[id] = count(make({ categories: new Set([id]) }))

    const weakToCounts: Record<string, number> = {}
    for (const t of ALL_TYPES)
      weakToCounts[t] = count(make({ weakTo: new Set([t]) }))

    const evoTriggerCounts: Record<string, number> = {}
    for (const { id } of EVO_TRIGGERS)
      evoTriggerCounts[id] = count(make({ evoTriggers: new Set([id]) }))

    const genderCounts: Record<string, number> = {}
    for (const { id } of GENDERS)
      genderCounts[id] = count(make({ genders: new Set([id]) }))

    const hiddenYes = count(make({ hasHiddenAbility: true  }))
    const hiddenNo  = count(make({ hasHiddenAbility: false }))

    return { typeCounts, genCounts, catCounts, weakToCounts, evoTriggerCounts, genderCounts, hiddenYes, hiddenNo }
  }, [filterState, pokemon])
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AccordionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors"
    >
      <span>{title}</span>
      <span className="text-gray-700">{open ? '▲' : '▼'}</span>
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface SidebarProps { pokemon: Pokemon[] }

export function Sidebar({ pokemon }: SidebarProps) {
  const [sectOpen, setSectOpen] = useState({
    types: true, gens: true, cats: true,
    weak: false, evo: false, gender: false, hidden: false,
  })

  const filterState        = useStore(s => s.filterState)
  const toggleType         = useStore(s => s.toggleType)
  const toggleGeneration   = useStore(s => s.toggleGeneration)
  const toggleCategory     = useStore(s => s.toggleCategory)
  const toggleWeakTo       = useStore(s => s.toggleWeakTo)
  const toggleEvoTrigger   = useStore(s => s.toggleEvoTrigger)
  const toggleGender       = useStore(s => s.toggleGender)
  const setTypeFilter      = useStore(s => s.setTypeFilter)
  const setCategoryFilter  = useStore(s => s.setCategoryFilter)
  const setWeakToFilter    = useStore(s => s.setWeakToFilter)
  const setHasHiddenAbility = useStore(s => s.setHasHiddenAbility)
  const clearFilters       = useStore(s => s.clearFilters)

  const counts = useFacetCounts(pokemon, filterState)

  const activeCount =
    filterState.types.size + filterState.generations.size + filterState.categories.size +
    filterState.weakTo.size + filterState.evoTriggers.size + filterState.genders.size +
    (filterState.hasHiddenAbility !== null ? 1 : 0)

  const matchCount = useMemo(() => {
    const { activeFilter } = useStore.getState()
    return activeFilter ? pokemon.filter(activeFilter).length : pokemon.length
  }, [filterState, pokemon])

  function toggle(k: keyof typeof sectOpen) {
    setSectOpen(s => ({ ...s, [k]: !s[k] }))
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-gray-800 bg-gray-950">

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <>
          {/* Visual controls */}
            <div className="p-3 border-b border-gray-800">
              <ColorBySelector pokemon={pokemon} />
            </div>

            {/* Type */}
            <TypeSection
              filterState={filterState}
              counts={counts.typeCounts}
              open={sectOpen.types}
              onToggle={() => toggle('types')}
              onToggleType={toggleType}
              onClear={() => setTypeFilter(new Set())}
            />

            {/* Generation */}
            <div className="border-b border-gray-800">
              <AccordionHeader title="Generation" open={sectOpen.gens} onToggle={() => toggle('gens')} />
              {sectOpen.gens && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-3 gap-1">
                    {GENERATIONS.map(gen => {
                      const active   = filterState.generations.has(gen)
                      const count    = counts.genCounts[gen] ?? 0
                      const disabled = count === 0 && !active
                      return (
                        <button key={gen} disabled={disabled}
                          onClick={() => !disabled && toggleGeneration(gen)}
                          className={`flex flex-col items-center py-1.5 rounded text-xs transition-all ${
                            disabled ? 'opacity-25 cursor-not-allowed bg-gray-800/30 border border-gray-800'
                              : active ? 'bg-gray-700 border border-gray-500 text-white'
                              : 'bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 cursor-pointer'
                          }`}
                        >
                          <span className="font-semibold leading-none">{gen}</span>
                          <span className="text-[10px] text-gray-600 tabular-nums mt-0.5">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="border-b border-gray-800">
              <AccordionHeader title="Category" open={sectOpen.cats} onToggle={() => toggle('cats')} />
              {sectOpen.cats && (
                <div className="px-3 pb-3">
                  <MultiSelectDropdown
                    options={CATEGORIES.map(({ id, label }) => ({ id, label, count: counts.catCounts[id] ?? 0 }))}
                    selected={filterState.categories}
                    onToggle={toggleCategory}
                    onSelectAll={() => setCategoryFilter(new Set(CATEGORIES.map(c => c.id)))}
                    onClear={() => setCategoryFilter(new Set())}
                    placeholder="Any category"
                  />
                </div>
              )}
            </div>

            {/* Weak to */}
            <TypeSection
              label="Weak to"
              filterState={filterState}
              counts={counts.weakToCounts}
              open={sectOpen.weak}
              onToggle={() => toggle('weak')}
              onToggleType={toggleWeakTo}
              selectedSet={filterState.weakTo}
              onClear={() => setWeakToFilter(new Set())}
            />

            {/* Evo method */}
            <div className="border-b border-gray-800">
              <AccordionHeader title="Evo method" open={sectOpen.evo} onToggle={() => toggle('evo')} />
              {sectOpen.evo && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-2 gap-1">
                    {EVO_TRIGGERS.map(({ id, label }) => {
                      const active   = filterState.evoTriggers.has(id)
                      const count    = counts.evoTriggerCounts[id] ?? 0
                      const disabled = count === 0 && !active
                      return (
                        <button key={id} disabled={disabled}
                          onClick={() => !disabled && toggleEvoTrigger(id)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all ${
                            disabled ? 'opacity-25 cursor-not-allowed bg-gray-800/30 border border-gray-800'
                              : active ? 'bg-gray-700 border border-gray-500 text-white'
                              : 'bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 cursor-pointer'
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          <span className="text-[10px] text-gray-600 tabular-nums ml-1 shrink-0">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="border-b border-gray-800">
              <AccordionHeader title="Gender" open={sectOpen.gender} onToggle={() => toggle('gender')} />
              {sectOpen.gender && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-2 gap-1">
                    {GENDERS.map(({ id, label }) => {
                      const active   = filterState.genders.has(id)
                      const count    = counts.genderCounts[id] ?? 0
                      const disabled = count === 0 && !active
                      return (
                        <button key={id} disabled={disabled}
                          onClick={() => !disabled && toggleGender(id)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all ${
                            disabled ? 'opacity-25 cursor-not-allowed bg-gray-800/30 border border-gray-800'
                              : active ? 'bg-gray-700 border border-gray-500 text-white'
                              : 'bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 cursor-pointer'
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          <span className="text-[10px] text-gray-600 tabular-nums ml-1 shrink-0">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hidden ability */}
            <div className="border-b border-gray-800">
              <AccordionHeader title="Hidden ability" open={sectOpen.hidden} onToggle={() => toggle('hidden')} />
              {sectOpen.hidden && (
                <div className="px-3 pb-3 flex gap-1">
                  {([
                    { value: null,  label: 'Any',    count: pokemon.length },
                    { value: true,  label: 'Has one', count: counts.hiddenYes },
                    { value: false, label: 'None',   count: counts.hiddenNo  },
                  ] as const).map(({ value, label, count }) => {
                    const active = filterState.hasHiddenAbility === value
                    return (
                      <button key={String(value)}
                        onClick={() => setHasHiddenAbility(value)}
                        className={`flex-1 flex flex-col items-center py-1.5 rounded text-xs transition-all ${
                          active
                            ? 'bg-gray-700 border border-gray-500 text-white'
                            : 'bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 cursor-pointer'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-[10px] text-gray-600 tabular-nums mt-0.5">{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
        </>

      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-800 text-xs flex items-center justify-between shrink-0">
        <span>
          <span className="text-gray-200 font-semibold">{matchCount.toLocaleString()}</span>
          <span className="text-gray-600"> / {pokemon.length.toLocaleString()}</span>
        </span>
        {activeCount > 0 && (
          <button onClick={clearFilters} className="text-gray-600 hover:text-gray-400 transition-colors">
            Clear
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── TypeSection (shared between "Type" and "Weak to") ───────────────────────

interface TypeSectionProps {
  label?: string
  filterState: FilterState
  counts: Record<string, number>
  open: boolean
  onToggle: () => void
  onToggleType: (t: string) => void
  /** If not provided, falls back to filterState.types */
  selectedSet?: Set<string>
  onClear: () => void
}

function TypeSection({ label = 'Type', filterState, counts, open, onToggle, onToggleType, selectedSet, onClear }: TypeSectionProps) {
  const selected = selectedSet ?? filterState.types
  return (
    <div className="border-b border-gray-800">
      <AccordionHeader title={label} open={open} onToggle={onToggle} />
      {open && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-1">
            {ALL_TYPES.map(type => {
              const active   = selected.has(type)
              const count    = counts[type] ?? 0
              const color    = TYPE_COLORS[type] ?? '#888'
              const disabled = count === 0 && !active
              return (
                <button
                  key={type} disabled={disabled}
                  onClick={() => !disabled && onToggleType(type)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded text-left transition-all ${
                    disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  style={{
                    backgroundColor: active ? color + '1e' : 'transparent',
                    border:          `1px solid ${active ? color + '55' : '#374151'}`,
                    color:           active ? color : '#9ca3af',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="flex-1 capitalize truncate">{type}</span>
                  <span className="text-gray-600 tabular-nums shrink-0 text-[10px]">{count}</span>
                </button>
              )
            })}
          </div>
          {selected.size > 0 && (
            <button onClick={onClear} className="mt-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

