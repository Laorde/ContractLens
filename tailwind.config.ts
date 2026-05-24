import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: '#c9a84c',
        goldDark: '#8b6914',
        ink: '#0c0c10',
        panel: '#13131a',
        panel2: '#1a1a24',
        line: '#2a2a38',
        paper: '#e8e4dc',
        muted: '#7a7a8a'
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif']
      }
    }
  },
  plugins: []
}
export default config
