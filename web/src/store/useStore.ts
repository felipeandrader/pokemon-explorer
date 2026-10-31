import { create } from 'zustand'
import type { Pokemon } from '../types'
import { buildPredicate, EMPTY_FILTER, type FilterState } from '../filters/predicates'
import { type ColorMode } from '../constants/colorModes'

export type SizeMode = 'none' | 'bst' | 'speed'

interface AppState {
  showAltForms: boolean
  setShowAltForms: (v: boolean) => void

  filterState: FilterState
  activeFilter: ((p: Pokemon) => boolean) | null
  toggleType:       (type: string) => void
  toggleGeneration: (gen: number) => void
  toggleCategory:   (cat: string) => void
  toggleWeakTo:     (type: string) => void
  toggleEvoTrigger: (trigger: string) => void
  toggleGender:     (gender: string) => void
  setTypeFilter:       (types: Set<string>) => void
  setGenerationFilter: (gens:  Set<number>) => void
  setCategoryFilter:   (cats:  Set<string>) => void
  setWeakToFilter:     (types: Set<string>) => void
  setEvoTriggerFilter: (triggers: Set<string>) => void
  setGenderFilter:     (genders: Set<string>) => void
  setHasHiddenAbility: (v: boolean | null) => void
  clearFilters: () => void

  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void

  sizeMode: SizeMode
  setSizeMode: (mode: SizeMode) => void

  showEvoLines: boolean
  setShowEvoLines: (v: boolean) => void

  selectedPokemon: Pokemon | null
  setSelectedPokemon: (p: Pokemon | null) => void

  pendingPan: Pokemon | null
  setPendingPan: (p: Pokemon | null) => void

  viewMode: 'pca' | 'umap'
  setViewMode: (m: 'pca' | 'umap') => void

  filterStateA: FilterState
  activeFilterA: ((p: Pokemon) => boolean) | null
  filterStateB: FilterState
  activeFilterB: ((p: Pokemon) => boolean) | null
  setFilterStateA: (f: FilterState) => void
  setFilterStateB: (f: FilterState) => void
}

function withFilter(filterState: FilterState) {
  return { filterState, activeFilter: buildPredicate(filterState) }
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

export const useStore = create<AppState>((set) => ({
  showAltForms: false,
  setShowAltForms: (v) => set({ showAltForms: v }),

  filterState: EMPTY_FILTER,
  activeFilter: null,

  toggleType:       (type)    => set((s) => withFilter({ ...s.filterState, types:       toggle(s.filterState.types,       type)    })),
  toggleGeneration: (gen)     => set((s) => withFilter({ ...s.filterState, generations: toggle(s.filterState.generations, gen)     })),
  toggleCategory:   (cat)     => set((s) => withFilter({ ...s.filterState, categories:  toggle(s.filterState.categories,  cat)     })),
  toggleWeakTo:     (type)    => set((s) => withFilter({ ...s.filterState, weakTo:      toggle(s.filterState.weakTo,      type)    })),
  toggleEvoTrigger: (trigger) => set((s) => withFilter({ ...s.filterState, evoTriggers: toggle(s.filterState.evoTriggers, trigger) })),
  toggleGender:     (gender)  => set((s) => withFilter({ ...s.filterState, genders:     toggle(s.filterState.genders,     gender)  })),

  setTypeFilter:       (types)       => set((s) => withFilter({ ...s.filterState, types })),
  setGenerationFilter: (generations) => set((s) => withFilter({ ...s.filterState, generations })),
  setCategoryFilter:   (categories)  => set((s) => withFilter({ ...s.filterState, categories })),
  setWeakToFilter:     (weakTo)      => set((s) => withFilter({ ...s.filterState, weakTo })),
  setEvoTriggerFilter: (evoTriggers) => set((s) => withFilter({ ...s.filterState, evoTriggers })),
  setGenderFilter:     (genders)     => set((s) => withFilter({ ...s.filterState, genders })),
  setHasHiddenAbility: (hasHiddenAbility) => set((s) => withFilter({ ...s.filterState, hasHiddenAbility })),

  clearFilters: () => set({ filterState: EMPTY_FILTER, activeFilter: null }),

  colorMode: 'type',
  setColorMode: (mode) => set({ colorMode: mode }),

  sizeMode: 'none',
  setSizeMode: (mode) => set({ sizeMode: mode }),

  showEvoLines: false,
  setShowEvoLines: (v) => set({ showEvoLines: v }),

  selectedPokemon: null,
  setSelectedPokemon: (p) => set({ selectedPokemon: p }),

  pendingPan: null,
  setPendingPan: (p) => set({ pendingPan: p }),

  viewMode: 'pca',
  setViewMode: (m) => set({ viewMode: m }),

  filterStateA: EMPTY_FILTER,
  activeFilterA: null,
  filterStateB: EMPTY_FILTER,
  activeFilterB: null,
  setFilterStateA: (f) => set({ filterStateA: f, activeFilterA: buildPredicate(f) }),
  setFilterStateB: (f) => set({ filterStateB: f, activeFilterB: buildPredicate(f) }),
}))
