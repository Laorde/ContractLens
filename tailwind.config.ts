import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      colors: {
        gold: '#c9a84c',
        goldDark: '#8b6914',
        paper: '#e8e4dc',
        muted: '#8b8b99',
        line: '#23232d',
        ink: '#09090c',
        panel: '#111118',
      },

      boxShadow: {
        glow: '0 0 50px rgba(201,168,76,0.18)',
      },
    },
  },

  plugins: [],
}

export default config
