import { useState, useRef, useEffect } from 'react'
import type { Pokemon } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  pokemon: Pokemon[]
}

function formatName(name: string): string {
  if (name === 'nidoran-f') return 'Nidoran ♀'
  if (name === 'nidoran-m') return 'Nidoran ♂'
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function SearchBar({ pokemon }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const setSelectedPokemon = useStore(s => s.setSelectedPokemon)
  const setPendingPan      = useStore(s => s.setPendingPan)
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = query.length === 0 ? [] : pokemon
    .filter(p => p.name.includes(query.toLowerCase().replace(/ /g, '-')))
    .slice(0, 8)

  function selectPokemon(p: Pokemon) {
    setSelectedPokemon(p)
    setPendingPan(p)
    setQuery('')
    setOpen(false)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => query.length > 0 && setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && matches.length > 0) selectPokemon(matches[0])
          if (e.key === 'Escape') { setOpen(false); setQuery('') }
        }}
        placeholder="Search Pokémon…"
        className="w-32 focus:w-48 transition-all duration-200 text-xs bg-tk-surface border border-tk-b1 text-tk-t2 placeholder:text-tk-t5 px-2 py-1 outline-none focus:border-tk-accent"
      />
      {open && matches.length > 0 && (
        <div className="absolute right-0 top-full mt-0.5 bg-tk-surface border border-tk-b2 shadow-lg z-50 w-48">
          {matches.map(p => (
            <button
              key={p.name}
              onMouseDown={e => { e.preventDefault(); selectPokemon(p) }}
              className="w-full text-left px-2 py-1 text-xs text-tk-t2 hover:bg-tk-s3 flex items-center gap-2"
            >
              <span className="text-tk-t4 font-pixel text-[9px] shrink-0">
                #{String(p.id).padStart(4, '0')}
              </span>
              <span className="truncate">{formatName(p.name)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
