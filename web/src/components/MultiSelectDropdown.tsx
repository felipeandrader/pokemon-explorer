import { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  id:       string
  label:    string
  count:    number
}

interface Props {
  options:     DropdownOption[]
  selected:    Set<string>
  onToggle:    (id: string) => void
  onSelectAll: () => void
  onClear:     () => void
  placeholder?: string
}

export function MultiSelectDropdown({
  options, selected, onToggle, onSelectAll, onClear, placeholder = 'Any',
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef   = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedList = options.filter(o => selected.has(o.id))

  function trigger() {
    return (
      <button
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        className="w-full flex items-center justify-between gap-1.5 bg-gray-800/50 border border-gray-700 hover:border-gray-600 rounded px-2 py-1.5 text-left transition-colors focus:outline-none focus:border-gray-500"
      >
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          {selectedList.length === 0 && (
            <span className="text-xs text-gray-500">{placeholder}</span>
          )}
          {selectedList.length === 1 && (
            <span className="text-xs text-gray-300 capitalize">{selectedList[0].label}</span>
          )}
          {selectedList.length === 2 && selectedList.map(o => (
            <span key={o.id} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded capitalize">
              {o.label}
            </span>
          ))}
          {selectedList.length > 2 && (
            <span className="text-xs text-gray-200">{selectedList.length} selected</span>
          )}
        </div>
        <span className="text-gray-600 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {trigger()}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg z-30 shadow-xl overflow-hidden">
          {/* Header: select all / clear */}
          <div className="flex justify-between px-2.5 py-1.5 border-b border-gray-800">
            <button
              onClick={onSelectAll}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Select all
            </button>
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Options */}
          {options.map(opt => {
            const isSelected = selected.has(opt.id)
            const isDisabled = opt.count === 0 && !isSelected
            return (
              <button
                key={opt.id}
                tabIndex={0}
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) onToggle(opt.id) }}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                    e.preventDefault()
                    onToggle(opt.id)
                  }
                  if (e.key === 'Escape') setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors focus:outline-none focus:bg-gray-800 ${
                  isDisabled
                    ? 'opacity-25 cursor-not-allowed'
                    : isSelected
                      ? 'bg-gray-800/70 hover:bg-gray-800'
                      : 'hover:bg-gray-800/50 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 5l2.5 2.5L8 3" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs capitalize ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
                    {opt.label}
                  </span>
                </div>
                <span className={`text-xs tabular-nums ${isDisabled ? 'text-gray-700' : 'text-gray-600'}`}>
                  {opt.count}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
