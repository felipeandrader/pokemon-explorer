interface Props {
  onZoomIn:  () => void
  onZoomOut: () => void
  onFit:     () => void
  panelOpen?: boolean
}

const BUTTONS = [
  { label: '+', title: 'Zoom in',     key: 'in'  },
  { label: '⊡', title: 'Fit to view', key: 'fit' },
  { label: '−', title: 'Zoom out',    key: 'out' },
] as const

export function MapControls({ onZoomIn, onZoomOut, onFit, panelOpen = false }: Props) {
  const handlers: Record<typeof BUTTONS[number]['key'], () => void> = {
    in: onZoomIn, fit: onFit, out: onZoomOut,
  }

  return (
    <div
      className="absolute bottom-4 z-30 flex flex-col gap-1 pointer-events-auto transition-all duration-200"
      style={{ right: panelOpen ? '304px' : '16px' }}
    >
      {BUTTONS.map(({ label, title, key }) => (
        <button
          key={key}
          onClick={handlers[key]}
          title={title}
          className="w-8 h-8 bg-gray-800/85 hover:bg-gray-700 border border-gray-700/70 text-gray-300 hover:text-white text-sm rounded flex items-center justify-center transition-colors backdrop-blur-sm shadow select-none"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
