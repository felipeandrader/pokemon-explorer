/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tk-bg':      'var(--color-bg)',
        'tk-surface': 'var(--color-surface)',
        'tk-s2':      'var(--color-s2)',
        'tk-s3':      'var(--color-s3)',
        'tk-b1':      'var(--color-b1)',
        'tk-b2':      'var(--color-b2)',
        'tk-ba':      'var(--color-ba)',
        'tk-t1':      'var(--color-t1)',
        'tk-t2':      'var(--color-t2)',
        'tk-t3':      'var(--color-t3)',
        'tk-t4':      'var(--color-t4)',
        'tk-t5':      'var(--color-t5)',
        'tk-accent':  'var(--color-accent)',
        'tk-accent2': 'var(--color-accent2)',
        'tk-overlay': 'var(--color-surface-overlay)',
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'monospace'],
      },
    },
  },
  plugins: [],
}
