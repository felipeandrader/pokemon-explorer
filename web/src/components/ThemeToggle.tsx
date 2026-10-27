import type { Theme } from '../hooks/useTheme'

interface Props { theme: Theme; onToggle: () => void }

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={`Switch to ${theme === 'pixel' ? 'clean' : 'pixel'} theme`}
      className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded transition-colors font-pixel
        bg-tk-s2 border-tk-b2 text-tk-t3 hover:text-tk-t1 hover:border-tk-ba"
    >
      {theme === 'pixel' ? '◆ PIXEL' : '○ Clean'}
    </button>
  )
}
