import type { Pokemon } from '../types'
import { TYPE_COLORS } from '../constants/typeColors'
import { spriteUrl } from '../utils/spriteUrl'

interface HoverCardProps {
  pokemon: Pokemon
  mouseX:  number
  mouseY:  number
}

function formatName(name: string): string {
  if (name === 'nidoran-f') return 'Nidoran ♀'
  if (name === 'nidoran-m') return 'Nidoran ♂'
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function typeTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.50 ? '#1a1a2e' : '#f0f0ff'
}

const STAT_META: { key: keyof Pokemon['stats']; label: string; color: string }[] = [
  { key: 'hp',         label: 'HP',  color: '#FF5959' },
  { key: 'attack',     label: 'Atk', color: '#F5AC78' },
  { key: 'defense',    label: 'Def', color: '#FAE078' },
  { key: 'sp_attack',  label: 'SpA', color: '#9DB7F5' },
  { key: 'sp_defense', label: 'SpD', color: '#A7DB8D' },
  { key: 'speed',      label: 'Spe', color: '#FA92B2' },
]

const CARD_W = 208
const CARD_H = 196
const GAP    = 14

export function HoverCard({ pokemon, mouseX, mouseY }: HoverCardProps) {
  const left = mouseX + GAP + CARD_W > window.innerWidth  ? mouseX - GAP - CARD_W : mouseX + GAP
  const top  = mouseY + GAP + CARD_H > window.innerHeight ? mouseY - GAP - CARD_H : mouseY + GAP

  return (
    <div
      className="fixed z-50 pointer-events-none border bg-tk-surface border-tk-b2 shadow-2xl p-3"
      style={{ left, top, width: CARD_W, boxShadow: '3px 3px 0 var(--color-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <img
          src={spriteUrl(pokemon.id)}
          alt={pokemon.name}
          width={48}
          height={48}
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="min-w-0">
          <div className="text-tk-t1 font-semibold text-sm leading-tight truncate">
            {formatName(pokemon.name)}
          </div>
          <div className="text-[10px] text-tk-t4 font-pixel">
            #{String(pokemon.id).padStart(4, '0')} · Gen {pokemon.generation}
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {pokemon.types.map(t => {
              const bg = TYPE_COLORS[t] ?? '#888'
              return (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 font-semibold font-pixel capitalize"
                  style={{ backgroundColor: bg, color: typeTextColor(bg) }}
                >
                  {t}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-0.5">
        {STAT_META.map(({ key, label, color }) => {
          const value = pokemon.stats[key]
          const pct   = Math.round((value / 255) * 100)
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-7 text-right text-tk-t4 text-xs shrink-0">{label}</span>
              <div className="flex-1 bg-tk-s3 h-1.5">
                <div className="h-1.5" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <span className="w-6 text-right text-tk-t2 text-xs shrink-0">{value}</span>
            </div>
          )
        })}
      </div>

      {/* BST */}
      <div className="mt-1.5 text-right text-[10px] text-tk-t4 font-pixel">
        BST <span className="text-tk-t1 font-bold">{pokemon.bst}</span>
      </div>
    </div>
  )
}
