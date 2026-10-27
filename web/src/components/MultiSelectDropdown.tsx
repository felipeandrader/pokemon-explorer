import { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  id:    string
  label: string
  count: number
}

interface Props {
  options:      DropdownOption[]
  selected:     Set<string>
  onToggle:     (id: string) => void
  onSelectAll:  () => void
  onClear:      () => void
  placeholder?: string
}

export function MultiSelectDropdown({
  options, selected, onToggle, onSelectAll, onClear, placeholder = 'Any',
}: Props) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number; left: number; width: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMousedown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onMousedown)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function handleTriggerClick() {
    if (open) { setOpen(false); return }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
    }
    setOpen(true)
  }

  const selectedList = options.filter(o => selected.has(o.id))

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={handleTriggerClick}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        className="w-full flex items-center justify-between gap-1.5 bg-tk-s2 border border-tk-b1 hover:border-tk-b2 px-2 py-1.5 text-left transition-colors focus:outline-none focus:border-tk-b2"
      >
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          {selectedList.length === 0 && (
            <span className="text-xs text-tk-t4">{placeholder}</span>
          )}
          {selectedList.length === 1 && (
            <span className="text-xs text-tk-t2 capitalize">{selectedList[0].label}</span>
          )}
          {selectedList.length === 2 && selectedList.map(o => (
            <span key={o.id} className="text-xs bg-tk-s3 text-tk-t2 px-1.5 py-0.5 capitalize">
              {o.label}
            </span>
          ))}
          {selectedList.length > 2 && (
            <span className="text-xs text-tk-t1">{selectedList.length} selected</span>
          )}
        </div>
        <span className="text-tk-t4 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown — fixed so it escapes overflow:auto containers */}
      {open && dropdownPos && (
        <div
          className="fixed bg-tk-surface border border-tk-b1 z-50 shadow-xl overflow-hidden"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <div className="flex justify-between px-2.5 py-1.5 border-b border-tk-b1">
            <button
              onClick={onSelectAll}
              className="text-xs text-tk-t4 hover:text-tk-t2 transition-colors"
            >
              Select all
            </button>
            <button
              onClick={onClear}
              className="text-xs text-tk-t4 hover:text-tk-t2 transition-colors"
            >
              Clear
            </button>
          </div>

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
                    e.preventDefault(); onToggle(opt.id)
                  }
                  if (e.key === 'Escape') setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors focus:outline-none focus:bg-tk-s2 ${
                  isDisabled
                    ? 'opacity-25 cursor-not-allowed'
                    : isSelected
                      ? 'bg-tk-s2 hover:bg-tk-s2'
                      : 'hover:bg-tk-s2 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-tk-b2'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 5l2.5 2.5L8 3" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs capitalize ${isSelected ? 'text-tk-t1' : 'text-tk-t3'}`}>
                    {opt.label}
                  </span>
                </div>
                <span className={`text-xs tabular-nums ${isDisabled ? 'text-tk-t5' : 'text-tk-t4'}`}>
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
