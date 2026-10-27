import type { Pokemon } from '../types'
import { TYPE_COLORS } from '../constants/typeColors'

interface HoverCardProps {
  pokemon: Pokemon
  mouseX: number
  mouseY: number
}

function formatName(name: string): string {
  if (name === 'nidoran-f') return 'Nidoran ♀'
  if (name === 'nidoran-m') return 'Nidoran ♂'
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const STAT_META: { key: keyof Pokemon['stats']; label: string; color: string }[] = [
  { key: 'hp',         label: 'HP',  color: '#FF5959' },
  { key: 'attack',     label: 'Atk', color: '#F5AC78' },
  { key: 'defense',    label: 'Def', color: '#FAE078' },
  { key: 'sp_attack',  label: 'SpA', color: '#9DB7F5' },
  { key: 'sp_defense', label: 'SpD', color: '#A7DB8D' },
  { key: 'speed',      label: 'Spe', color: '#FA92B2' },
]

const CARD_W = 204
const CARD_H = 190
const GAP = 14

export function HoverCard({ pokemon, mouseX, mouseY }: HoverCardProps) {
  const left =
    mouseX + GAP + CARD_W > window.innerWidth
      ? mouseX - GAP - CARD_W
      : mouseX + GAP
  const top =
    mouseY + GAP + CARD_H > window.innerHeight
      ? mouseY - GAP - CARD_H
      : mouseY + GAP

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl p-3"
      style={{ left, top, width: CARD_W }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {pokemon.sprite ? (
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            width={48}
            height={48}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-12 h-12 bg-gray-800 rounded" />
        )}
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm leading-tight truncate">
            {formatName(pokemon.name)}
          </div>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {pokemon.types.map(t => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded font-medium capitalize"
                style={{
                  backgroundColor: (TYPE_COLORS[t] ?? '#888') + '33',
                  color: TYPE_COLORS[t] ?? '#888',
                  border: `1px solid ${TYPE_COLORS[t] ?? '#888'}66`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-0.5">
        {STAT_META.map(({ key, label, color }) => {
          const value = pokemon.stats[key]
          const pct = Math.round((value / 255) * 100)
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-7 text-right text-gray-400 text-xs shrink-0">{label}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-6 text-right text-gray-300 text-xs shrink-0">{value}</span>
            </div>
          )
        })}
      </div>

      {/* BST */}
      <div className="mt-1.5 text-right text-xs text-gray-500">
        BST <span className="text-gray-300 font-medium">{pokemon.bst}</span>
      </div>
    </div>
  )
}
