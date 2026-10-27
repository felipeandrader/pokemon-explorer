import type { Pokemon } from '../types'

export interface FilterState {
  types:            Set<string>
  generations:      Set<number>
  categories:       Set<string>
  /** Attacking types the pokemon must be weak to (≥2x). OR within the set. */
  weakTo:           Set<string>
  /** How the pokemon evolved from its pre-evo. 'base' = no pre-evo. OR within the set. */
  evoTriggers:      Set<string>
  /** Gender categories. OR within the set. */
  genders:          Set<string>
  /** null = no filter; true = only pokemon with a hidden ability; false = only without. */
  hasHiddenAbility: boolean | null
}

export const EMPTY_FILTER: FilterState = {
  types:            new Set(),
  generations:      new Set(),
  categories:       new Set(),
  weakTo:           new Set(),
  evoTriggers:      new Set(),
  genders:          new Set(),
  hasHiddenAbility: null,
}

/**
 * Between groups: AND  (types AND generation AND ... AND weakTo AND ...)
 * Within types:   AND  (fire + ground = must have BOTH types)
 * Within others:  OR   (gen 1 OR gen 2 = belongs to either)
 * Returns null when no filters are active (all Pokémon match).
 */
export function buildPredicate(f: FilterState): ((p: Pokemon) => boolean) | null {
  const hasType   = f.types.size > 0
  const hasGen    = f.generations.size > 0
  const hasCat    = f.categories.size > 0
  const hasWeak   = f.weakTo.size > 0
  const hasEvo    = f.evoTriggers.size > 0
  const hasGender = f.genders.size > 0
  const hasHidden = f.hasHiddenAbility !== null

  if (!hasType && !hasGen && !hasCat && !hasWeak && !hasEvo && !hasGender && !hasHidden) return null

  return (p: Pokemon) => {
    if (hasType   && ![...f.types].every(t => p.types.includes(t)))   return false
    if (hasGen    && !f.generations.has(p.generation))                 return false
    if (hasCat    && !f.categories.has(p.category))                    return false
    if (hasWeak   && !p.weaknesses.some(w => f.weakTo.has(w)))        return false
    if (hasEvo    && !f.evoTriggers.has(p.evo.evo_trigger ?? 'base')) return false
    if (hasGender && !f.genders.has(p.gender))                         return false
    if (hasHidden && p.has_hidden_ability !== f.hasHiddenAbility)      return false
    return true
  }
}
