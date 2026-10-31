import { useEffect, useState } from 'react'
import type { PokemonData } from './types'
import { PokemonMap } from './components/PokemonMap'
import { Sidebar } from './components/Sidebar'
import { FilterChips } from './components/FilterChips'
import { PokemonDetailPanel } from './components/PokemonDetailPanel'
import { SearchBar } from './components/SearchBar'
import { useStore } from './store/useStore'

export default function App() {
  const [data,  setData]  = useState<PokemonData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const viewMode    = useStore(s => s.viewMode)
  const setViewMode = useStore(s => s.setViewMode)

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
      <div className="flex flex-col items-center justify-center w-full h-full gap-3">
        <svg className="pokeball-spin" viewBox="0 0 24 24" width={40} height={40} aria-label="Loading" role="img">
          <path d="M4 12 A8 8 0 0 1 20 12 Z" fill="#cc2233" />
          <path d="M4 12 A8 8 0 0 0 20 12 Z" fill="#e8f0ff" />
          <circle cx="12" cy="12" r="8" fill="none" stroke="#0f1923" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="#0f1923" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" fill="#e8f0ff" stroke="#0f1923" strokeWidth="1" />
        </svg>
        <span className="text-tk-t4 text-xs font-pixel">Loading Pokémon data…</span>
      </div>
    )
  }

  const { pca } = data.meta
  const pc1 = (pca.explained_variance_ratio[0] * 100).toFixed(1)
  const pc2 = (pca.explained_variance_ratio[1] * 100).toFixed(1)
  const hasUmap = data.pokemon.some(p => p.umap != null)

  return (
    <div className="flex flex-col h-full bg-tk-bg text-tk-t1">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-11 border-b-2 border-tk-ba bg-tk-surface shrink-0">
        {/* Pokédex LED dot */}
        <div className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--color-ba)', boxShadow: '0 0 4px var(--color-ba)' }} />
        <h1 className="text-sm font-bold text-tk-t1 tracking-wide uppercase">
          Pokémon Space Explorer
        </h1>
        <span className="text-tk-t5">·</span>
        <span className="text-xs text-tk-t4">
          {data.pokemon.length} Pokémon
        </span>
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={() => setViewMode('pca')}
            className={`text-[10px] font-pixel px-2 py-0.5 border transition-colors ${
              viewMode === 'pca'
                ? 'border-tk-ba bg-tk-ba/20 text-tk-t1'
                : 'border-tk-b1 text-tk-t4 hover:text-tk-t2'
            }`}
          >
            PCA
          </button>
          <button
            onClick={() => setViewMode('umap')}
            disabled={!hasUmap}
            title={hasUmap ? undefined : 'Run pipeline with umap-learn to enable'}
            className={`text-[10px] font-pixel px-2 py-0.5 border transition-colors ${
              viewMode === 'umap'
                ? 'border-tk-ba bg-tk-ba/20 text-tk-t1'
                : 'border-tk-b1 text-tk-t4 hover:text-tk-t2'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            UMAP
          </button>
        </div>
        <span className="ml-auto text-xs text-tk-t5 tabular-nums">
          {viewMode === 'pca' ? `PC1 ${pc1}%  PC2 ${pc2}%` : 'UMAP'}
        </span>
        <SearchBar pokemon={data.pokemon} />
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

      {/* Credits */}
      <div className="px-4 h-5 border-t border-tk-b1 bg-tk-bg flex items-center gap-2 shrink-0 overflow-hidden">
        <span className="text-[9px] text-tk-t5 font-pixel whitespace-nowrap">Data: PokéAPI</span>
        <span className="text-tk-t5 text-[9px]">·</span>
        <span className="text-[9px] text-tk-t5 font-pixel whitespace-nowrap">Pokémon © Nintendo / Game Freak / The Pokémon Company</span>
        <span className="text-tk-t5 text-[9px]">·</span>
        <span className="text-[9px] text-tk-t5 font-pixel whitespace-nowrap">Fan project — educational, non-commercial</span>
      </div>

    </div>
  )
}
