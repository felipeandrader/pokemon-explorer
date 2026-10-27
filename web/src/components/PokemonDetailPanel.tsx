import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { TYPE_COLORS } from '../constants/typeColors'
import type { Pokemon } from '../types'

// ── Contrast helper ───────────────────────────────────────────────────────

function typeTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.50 ? '#1a1a2e' : '#f0f0ff'
}

// ── Type pill ─────────────────────────────────────────────────────────────

function TypePill({ type, size = 'sm' }: { type: string; size?: 'xs' | 'sm' }) {
  const bg = TYPE_COLORS[type] ?? '#888888'
  const fg = typeTextColor(bg)
  const cls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[11px] px-2 py-0.5'
  return (
    <span
      className={`capitalize font-semibold font-pixel ${cls}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {type}
    </span>
  )
}

// ── Segmented stat bar ────────────────────────────────────────────────────

const SEGMENTS = 20

function statColor(v: number): string {
  if (v <  50) return '#FF5959'
  if (v < 100) return '#F8D030'
  if (v < 150) return '#78C850'
  return '#6890F0'
}

function SegmentedBar({ value, max = 255 }: { value: number; max?: number }) {
  const filled = Math.round((value / max) * SEGMENTS)
  const color  = statColor(value)
  return (
    <div className="flex gap-px flex-1">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 10,
            backgroundColor: i < filled ? color : 'var(--color-s3)',
          }}
        />
      ))}
    </div>
  )
}

// ── Pokémon cry button ────────────────────────────────────────────────────

function CryButton({ pokemonId }: { pokemonId: number }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cryUrl =
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`

  function toggle() {
    if (playing) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      setPlaying(false)
      return
    }
    const audio = new Audio(cryUrl)
    audioRef.current = audio
    audio.onended  = () => setPlaying(false)
    audio.onerror  = () => setPlaying(false)
    audio.play().catch(() => setPlaying(false))
    setPlaying(true)
  }

  return (
    <button
      onClick={toggle}
      title={playing ? 'Stop cry' : 'Play Pokémon cry'}
      aria-label={playing ? 'Stop cry' : 'Play cry'}
      className="btn-pixel text-[11px] w-7 h-7 border border-tk-b1 bg-tk-s2 text-tk-t3 hover:text-tk-accent hover:border-tk-b2 transition-colors font-pixel flex items-center justify-center"
    >
      {playing ? '■' : '♪'}
    </button>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────

function Divider() {
  return <div className="px-divider" />
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[9px] text-tk-t4 uppercase tracking-widest mb-2 font-pixel">
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-tk-t4 shrink-0">{label}</span>
      <span className="text-tk-t2 text-right capitalize">{value}</span>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────

const STAT_META = [
  { key: 'hp'         as const, label: 'HP'  },
  { key: 'attack'     as const, label: 'ATK' },
  { key: 'defense'    as const, label: 'DEF' },
  { key: 'sp_attack'  as const, label: 'SPA' },
  { key: 'sp_defense' as const, label: 'SPD' },
  { key: 'speed'      as const, label: 'SPE' },
]

const EVO_LABELS: Record<string, string> = {
  level: 'Level up', friendship: 'Friendship', item: 'Use item',
  trade: 'Trade', other: 'Other',
}

function formatName(raw: string): string {
  return raw
    .replace('nidoran-f', 'Nidoran ♀')
    .replace('nidoran-m', 'Nidoran ♂')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Panel content ─────────────────────────────────────────────────────────

function PanelContent({ pokemon, onClose }: { pokemon: Pokemon; onClose: () => void }) {
  const name     = formatName(pokemon.name)
  const heightM  = pokemon.height != null ? (pokemon.height / 10).toFixed(1) + ' m'  : '—'
  const weightKg = pokemon.weight != null ? (pokemon.weight / 10).toFixed(1) + ' kg' : '—'
  const catLabel = pokemon.category
    .replace('pseudo_legendary', 'Pseudo-legendary')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  const hasMatchups =
    pokemon.weaknesses.length > 0 ||
    pokemon.resistances.length > 0 ||
    pokemon.immunities.length > 0
  const hasAbilities = pokemon.abilities.length > 0 || pokemon.has_hidden_ability

  return (
    <div className="flex flex-col h-full">

      {/* Header: dex number + cry + close */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
        <span className="text-2xl font-pixel text-tk-t4 tabular-nums tracking-wide flex-1 leading-none">
          #{String(pokemon.id).padStart(4, '0')}
        </span>
        <CryButton pokemonId={pokemon.id} />
        <button
          onClick={onClose}
          className="text-tk-t4 hover:text-tk-t2 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center"
          title="Close"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">

        {/* Sprite screen */}
        <div className="sprite-screen w-full py-5 mb-3">
          {pokemon.sprite ? (
            <img
              src={pokemon.sprite}
              alt={name}
              width={192}
              height={192}
              style={{ imageRendering: 'pixelated', display: 'block' }}
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-tk-t5 font-pixel text-xs">?</div>
          )}
        </div>

        {/* Name, gen, types */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
            <h2 className="text-base font-bold text-tk-t1 leading-tight">{name}</h2>
            <span className="text-[10px] text-tk-t4 font-pixel ml-auto">
              Gen {pokemon.generation}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {pokemon.types.map(t => <TypePill key={t} type={t} />)}
            {pokemon.evo.is_baby && (
              <span className="text-[9px] px-1.5 py-0.5 font-pixel border border-pink-700/50 text-pink-400">
                Baby
              </span>
            )}
          </div>
        </div>

        <Divider />

        {/* Stats */}
        <div>
          <SectionLabel>Base Stats</SectionLabel>
          <div className="space-y-1.5">
            {STAT_META.map(({ key, label }) => {
              const val = pokemon.stats[key]
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-6 text-right text-[9px] text-tk-t4 font-pixel shrink-0 leading-none">
                    {label}
                  </span>
                  <SegmentedBar value={val} />
                  <span
                    className="w-7 text-right text-[11px] tabular-nums font-pixel shrink-0"
                    style={{ color: statColor(val) }}
                  >
                    {val}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-pixel">
            <span className="text-tk-t5">BST</span>
            <span className="text-tk-t1 font-bold tabular-nums">{pokemon.bst}</span>
          </div>
        </div>

        <Divider />

        {/* Pokédex entry */}
        <div>
          <SectionLabel>Pokédex</SectionLabel>
          <div className="space-y-1">
            <Row label="Category" value={catLabel} />
            <Row label="Height"   value={heightM}  />
            <Row label="Weight"   value={weightKg} />
            {pokemon.capture_rate != null && (
              <Row label="Catch rate" value={pokemon.capture_rate} />
            )}
            {pokemon.base_happiness != null && (
              <Row label="Happiness" value={pokemon.base_happiness} />
            )}
            {pokemon.growth_rate && (
              <Row label="Growth" value={pokemon.growth_rate.replace(/-/g, ' ')} />
            )}
          </div>
        </div>

        {hasAbilities && <Divider />}

        {/* Abilities */}
        {hasAbilities && (
          <div>
            <SectionLabel>Abilities</SectionLabel>
            <div className="space-y-1">
              {pokemon.abilities.map(ab => (
                <div key={ab} className="text-xs text-tk-t2 capitalize">
                  {ab.replace(/-/g, ' ')}
                </div>
              ))}
              {pokemon.hidden_ability && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1 py-0.5 font-pixel border border-purple-700/50 text-purple-400">
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

        <Divider />

        {/* Breeding */}
        <div>
          <SectionLabel>Breeding</SectionLabel>
          <div className="space-y-1">
            {pokemon.egg_groups.length > 0 && (
              <Row
                label="Egg groups"
                value={pokemon.egg_groups.map(g => g.replace(/-/g, ' ')).join(', ')}
              />
            )}
            <Row label="Gender" value={pokemon.gender.replace(/_/g, ' ')} />
          </div>
        </div>

        {hasMatchups && <Divider />}

        {/* Type matchups */}
        {hasMatchups && (
          <div>
            <SectionLabel>Type Matchups</SectionLabel>
            <div className="space-y-2">
              {pokemon.weaknesses.length > 0 && (
                <div>
                  <div className="text-[9px] text-tk-t5 font-pixel mb-1">WEAK TO</div>
                  <div className="flex flex-wrap gap-1">
                    {pokemon.weaknesses.map(t => <TypePill key={t} type={t} size="xs" />)}
                  </div>
                </div>
              )}
              {pokemon.resistances.length > 0 && (
                <div>
                  <div className="text-[9px] text-tk-t5 font-pixel mb-1">RESISTS</div>
                  <div className="flex flex-wrap gap-1">
                    {pokemon.resistances.map(t => <TypePill key={t} type={t} size="xs" />)}
                  </div>
                </div>
              )}
              {pokemon.immunities.length > 0 && (
                <div>
                  <div className="text-[9px] text-tk-t5 font-pixel mb-1">IMMUNE</div>
                  <div className="flex flex-wrap gap-1">
                    {pokemon.immunities.map(t => <TypePill key={t} type={t} size="xs" />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Divider />

        {/* Evolution */}
        <div>
          <SectionLabel>Evolution</SectionLabel>
          <div className="text-xs text-tk-t3 space-y-0.5">
            <div>
              Stage{' '}
              <span className="text-tk-t1 font-medium font-pixel">{pokemon.evo.stage}</span>
              <span className="text-tk-t5 font-pixel"> / {pokemon.evo.line_stages}</span>
            </div>
            {pokemon.evo.evo_trigger && (
              <div>
                Via{' '}
                <span className="text-tk-t2">
                  {EVO_LABELS[pokemon.evo.evo_trigger] ?? pokemon.evo.evo_trigger}
                </span>
              </div>
            )}
            {!pokemon.evo.evolves &&
              pokemon.evo.stage === pokemon.evo.line_stages &&
              pokemon.evo.line_stages > 1 && (
                <div className="text-tk-t4 font-pixel text-[10px]">FINAL FORM</div>
              )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Exported panel ────────────────────────────────────────────────────────

export function PokemonDetailPanel() {
  const pokemon     = useStore(s => s.selectedPokemon)
  const setSelected = useStore(s => s.setSelectedPokemon)

  return (
    <div
      className={`
        absolute right-0 top-0 bottom-0 w-72 z-20
        bg-tk-overlay backdrop-blur-sm border-l border-tk-ba
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
