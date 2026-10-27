import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { TYPE_COLORS } from '../constants/typeColors'
import type { Pokemon } from '../types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatName(raw: string): string {
  return raw
    .replace('nidoran-f', 'Nidoran ♀')
    .replace('nidoran-m', 'Nidoran ♂')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function TypeChip({ type, size = 'sm' }: { type: string; size?: 'xs' | 'sm' }) {
  const color = TYPE_COLORS[type] ?? '#888'
  return (
    <span
      className={`capitalize font-medium rounded ${size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
      style={{
        backgroundColor: color + '33',
        color,
        border: `1px solid ${color}66`,
      }}
    >
      {type}
    </span>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">
      {children}
    </div>
  )
}

const STAT_META = [
  { key: 'hp'         as const, label: 'HP',  color: '#FF5959' },
  { key: 'attack'     as const, label: 'Atk', color: '#F5AC78' },
  { key: 'defense'    as const, label: 'Def', color: '#FAE078' },
  { key: 'sp_attack'  as const, label: 'SpA', color: '#9DB7F5' },
  { key: 'sp_defense' as const, label: 'SpD', color: '#A7DB8D' },
  { key: 'speed'      as const, label: 'Spe', color: '#FA92B2' },
]

const EVO_TRIGGER_LABELS: Record<string, string> = {
  level:      'Level up',
  friendship: 'Friendship',
  item:       'Use item',
  trade:      'Trade',
  other:      'Other',
}

// ─── panel content ────────────────────────────────────────────────────────────

function PanelContent({ pokemon, onClose }: { pokemon: Pokemon; onClose: () => void }) {
  const name = formatName(pokemon.name)

  const heightM  = pokemon.height != null  ? (pokemon.height / 10).toFixed(1) + ' m'  : '—'
  const weightKg = pokemon.weight != null  ? (pokemon.weight / 10).toFixed(1) + ' kg' : '—'

  const categoryLabel = pokemon.category
    .replace('pseudo_legendary', 'Pseudo-leg.')
    .replace('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex flex-col h-full">

      {/* Close button */}
      <div className="flex justify-end px-3 pt-3 pb-1 shrink-0">
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 transition-colors text-xl leading-none"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">

        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center mb-4">
          {pokemon.sprite ? (
            <img
              src={pokemon.sprite}
              alt={name}
              width={160}
              height={160}
              style={{ imageRendering: 'pixelated' }}
              className="drop-shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-800 rounded" />
          )}
          <div className="mt-1 text-[10px] text-gray-600 tabular-nums">
            #{String(pokemon.id).padStart(4, '0')}
          </div>
          <h2 className="text-base font-bold text-white mt-0.5 leading-tight">
            {name}
          </h2>
          <div className="flex gap-1.5 mt-1.5 flex-wrap justify-center">
            {pokemon.types.map(t => <TypeChip key={t} type={t} />)}
          </div>
          <div className="flex gap-2 mt-1.5 text-[11px] text-gray-500">
            <span>Gen {pokemon.generation}</span>
            <span className="text-gray-700">·</span>
            <span className="capitalize">{categoryLabel}</span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3 space-y-3">

          {/* ── Stats ── */}
          <div>
            <SectionLabel>Base stats</SectionLabel>
            <div className="space-y-1">
              {STAT_META.map(({ key, label, color }) => {
                const value = pokemon.stats[key]
                const pct   = Math.round((value / 255) * 100)
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-7 text-right text-gray-500 text-xs shrink-0">{label}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="w-7 text-right text-gray-300 text-xs tabular-nums shrink-0">{value}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>BST</span>
              <span className="text-gray-200 font-semibold tabular-nums">{pokemon.bst}</span>
            </div>
          </div>

          {/* ── Physical info ── */}
          <div>
            <SectionLabel>Info</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Height</span>
                <span className="text-gray-300">{heightM}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weight</span>
                <span className="text-gray-300">{weightKg}</span>
              </div>
              {pokemon.capture_rate != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Catch rate</span>
                  <span className="text-gray-300">{pokemon.capture_rate}</span>
                </div>
              )}
              {pokemon.base_happiness != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Happiness</span>
                  <span className="text-gray-300">{pokemon.base_happiness}</span>
                </div>
              )}
              {pokemon.growth_rate && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600">Growth</span>
                  <span className="text-gray-300 capitalize">{pokemon.growth_rate.replace('-', ' ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Abilities ── */}
          {(pokemon.abilities.length > 0 || pokemon.has_hidden_ability) && (
            <div>
              <SectionLabel>Abilities</SectionLabel>
              <div className="flex flex-col gap-1">
                {pokemon.abilities.map(ab => (
                  <span key={ab} className="text-xs text-gray-300 capitalize">
                    {ab.replace(/-/g, ' ')}
                  </span>
                ))}
                {pokemon.hidden_ability && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-800/60 font-medium">
                      HA
                    </span>
                    <span className="text-xs text-purple-300 capitalize">
                      {pokemon.hidden_ability.replace(/-/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Breeding ── */}
          <div>
            <SectionLabel>Breeding</SectionLabel>
            <div className="text-xs space-y-1">
              {pokemon.egg_groups.length > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-gray-600 shrink-0">Egg groups</span>
                  <span className="text-gray-300 capitalize">
                    {pokemon.egg_groups.map(g => g.replace(/-/g, ' ')).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="text-gray-600 shrink-0">Gender</span>
                <span className="text-gray-300 capitalize">{pokemon.gender.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* ── Type matchups ── */}
          {(pokemon.weaknesses.length > 0 || pokemon.immunities.length > 0 || pokemon.resistances.length > 0) && (
            <div>
              <SectionLabel>Type matchups</SectionLabel>
              <div className="space-y-2">
                {pokemon.weaknesses.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-700 mb-1">Weak to</div>
                    <div className="flex flex-wrap gap-1">
                      {pokemon.weaknesses.map(t => <TypeChip key={t} type={t} size="xs" />)}
                    </div>
                  </div>
                )}
                {pokemon.resistances.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-700 mb-1">Resists</div>
                    <div className="flex flex-wrap gap-1">
                      {pokemon.resistances.map(t => <TypeChip key={t} type={t} size="xs" />)}
                    </div>
                  </div>
                )}
                {pokemon.immunities.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-700 mb-1">Immune to</div>
                    <div className="flex flex-wrap gap-1">
                      {pokemon.immunities.map(t => (
                        <span key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded capitalize bg-gray-800 text-gray-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Evolution ── */}
          <div>
            <SectionLabel>Evolution</SectionLabel>
            <div className="text-xs text-gray-400 space-y-0.5">
              <div>
                Stage{' '}
                <span className="text-gray-200 font-medium">{pokemon.evo.stage}</span>
                <span className="text-gray-600"> / {pokemon.evo.line_stages}</span>
                {pokemon.evo.is_baby && (
                  <span className="ml-2 text-pink-400 text-[10px]">Baby</span>
                )}
              </div>
              {pokemon.evo.evo_trigger && (
                <div>
                  Evolved by{' '}
                  <span className="text-gray-300">
                    {EVO_TRIGGER_LABELS[pokemon.evo.evo_trigger] ?? pokemon.evo.evo_trigger}
                  </span>
                </div>
              )}
              {!pokemon.evo.evolves && pokemon.evo.stage === pokemon.evo.line_stages && pokemon.evo.line_stages > 1 && (
                <div className="text-gray-600">Final form</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── exported panel ───────────────────────────────────────────────────────────

export function PokemonDetailPanel() {
  const pokemon    = useStore(s => s.selectedPokemon)
  const setSelected = useStore(s => s.setSelectedPokemon)

  return (
    <div
      className={`
        absolute right-0 top-0 bottom-0 w-72 z-20
        bg-gray-900/95 backdrop-blur-sm border-l border-gray-800
        transition-transform duration-200
        ${pokemon ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {pokemon && (
        <PanelContent pokemon={pokemon} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
