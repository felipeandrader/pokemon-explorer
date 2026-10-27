import { useStore } from '../store/useStore'
import { TYPE_COLORS } from '../constants/typeColors'

const GEN_LABELS: Record<number, string> = {
  1:'Gen I', 2:'Gen II', 3:'Gen III', 4:'Gen IV', 5:'Gen V',
  6:'Gen VI', 7:'Gen VII', 8:'Gen VIII', 9:'Gen IX',
}

const CAT_LABELS: Record<string, string> = {
  normal: 'Normal', baby: 'Baby',
  pseudo_legendary: 'Pseudo-leg.', legendary: 'Legendary', mythical: 'Mythical',
}

const EVO_LABELS: Record<string, string> = {
  base: 'Base form', level: 'By level', friendship: 'Friendship',
  item: 'By item', trade: 'Trade', other: 'Evo: other',
}

const GENDER_LABELS: Record<string, string> = {
  mixed: 'Mixed', male_only: 'Male-only', female_only: 'Female-only', genderless: 'Genderless',
}

export function FilterChips() {
  const filterState        = useStore(s => s.filterState)
  const toggleType         = useStore(s => s.toggleType)
  const toggleGeneration   = useStore(s => s.toggleGeneration)
  const toggleCategory     = useStore(s => s.toggleCategory)
  const toggleWeakTo       = useStore(s => s.toggleWeakTo)
  const toggleEvoTrigger   = useStore(s => s.toggleEvoTrigger)
  const toggleGender       = useStore(s => s.toggleGender)
  const setHasHiddenAbility = useStore(s => s.setHasHiddenAbility)
  const clearFilters       = useStore(s => s.clearFilters)

  const total =
    filterState.types.size + filterState.generations.size + filterState.categories.size +
    filterState.weakTo.size + filterState.evoTriggers.size + filterState.genders.size +
    (filterState.hasHiddenAbility !== null ? 1 : 0)

  if (total === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-3 py-1.5 border-b border-gray-800 bg-gray-950 shrink-0">

      {/* Own type chips */}
      {[...filterState.types].map(type => {
        const color = TYPE_COLORS[type] ?? '#888'
        return (
          <button key={type} onClick={() => toggleType(type)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs capitalize transition-colors"
            style={{ backgroundColor: color + '22', border: `1px solid ${color}66`, color }}
          >
            {type} <span className="opacity-60 text-[10px]">×</span>
          </button>
        )
      })}

      {/* Gen chips */}
      {[...filterState.generations].sort((a, b) => a - b).map(gen => (
        <button key={gen} onClick={() => toggleGeneration(gen)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-800 border border-gray-600 text-gray-300 hover:border-gray-500"
        >
          {GEN_LABELS[gen] ?? `Gen ${gen}`} <span className="opacity-60 text-[10px]">×</span>
        </button>
      ))}

      {/* Category chips */}
      {[...filterState.categories].map(cat => (
        <button key={cat} onClick={() => toggleCategory(cat)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:border-purple-600"
        >
          {CAT_LABELS[cat] ?? cat} <span className="opacity-60 text-[10px]">×</span>
        </button>
      ))}

      {/* Weak-to chips */}
      {[...filterState.weakTo].map(type => {
        const color = TYPE_COLORS[type] ?? '#888'
        return (
          <button key={`weak-${type}`} onClick={() => toggleWeakTo(type)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs capitalize transition-colors"
            style={{ backgroundColor: color + '15', border: `1px dashed ${color}66`, color }}
          >
            ⚡ {type} <span className="opacity-60 text-[10px]">×</span>
          </button>
        )
      })}

      {/* Evo trigger chips */}
      {[...filterState.evoTriggers].map(trigger => (
        <button key={trigger} onClick={() => toggleEvoTrigger(trigger)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-900/30 border border-amber-700/40 text-amber-300 hover:border-amber-600"
        >
          {EVO_LABELS[trigger] ?? trigger} <span className="opacity-60 text-[10px]">×</span>
        </button>
      ))}

      {/* Gender chips */}
      {[...filterState.genders].map(gender => (
        <button key={gender} onClick={() => toggleGender(gender)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-teal-900/30 border border-teal-700/40 text-teal-300 hover:border-teal-600"
        >
          {GENDER_LABELS[gender] ?? gender} <span className="opacity-60 text-[10px]">×</span>
        </button>
      ))}

      {/* Hidden ability chip */}
      {filterState.hasHiddenAbility !== null && (
        <button onClick={() => setHasHiddenAbility(null)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 hover:border-indigo-600"
        >
          {filterState.hasHiddenAbility ? 'Has hidden ability' : 'No hidden ability'}
          <span className="opacity-60 text-[10px]">×</span>
        </button>
      )}

      {/* Clear all */}
      {total > 1 && (
        <button onClick={clearFilters} className="ml-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
          Clear all
        </button>
      )}
    </div>
  )
}
