import { useEffect, useState } from 'react'
import type { PokemonData } from './types'
import { PokemonMap } from './components/PokemonMap'
import { Sidebar } from './components/Sidebar'
import { FilterChips } from './components/FilterChips'
import { PokemonDetailPanel } from './components/PokemonDetailPanel'

export default function App() {
  const [data,  setData]  = useState<PokemonData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/pokemon.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PokemonData>
      })
      .then(setData)
      .catch((e: unknown) => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-red-400 text-sm">
        Failed to load data: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
        Loading Pokémon data…
      </div>
    )
  }

  const { pca } = data.meta
  const pc1 = (pca.explained_variance_ratio[0] * 100).toFixed(1)
  const pc2 = (pca.explained_variance_ratio[1] * 100).toFixed(1)

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-10 border-b border-gray-800 bg-gray-950 shrink-0">
        <h1 className="text-sm font-semibold text-white tracking-wide">
          Pokémon Space Explorer
        </h1>
        <span className="text-gray-700">·</span>
        <span className="text-xs text-gray-500">
          {data.pokemon.length} Pokémon · PCA of 6 base stats
        </span>
        <span className="ml-auto text-xs text-gray-600">
          PC1 {pc1}%&nbsp;&nbsp;PC2 {pc2}%
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <Sidebar pokemon={data.pokemon} />
        <div className="flex flex-col flex-1 min-w-0">
          <FilterChips />
          <div className="flex-1 relative min-h-0">
            <PokemonMap data={data} />
            <PokemonDetailPanel />
          </div>
        </div>
      </div>

    </div>
  )
}
