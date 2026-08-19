/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Designens brytpunkt ligger på 760px, inte Tailwinds 768. Egen skärm
      // i stället för att skriva om md, så inget annat påverkas.
      screens: {
        wide: '760px',
      },
      fontFamily: {
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Designens textsteg, ett namn per steg. Siffran är storleken i
      // standardläget; själva värdet ligger i en CSS-variabel i globals.css,
      // eftersom inställningen "Större text" skalar hela trappan på en gång.
      // Skriv aldrig text-[13px] igen — en storlek som står i klassen står
      // utanför inställningen och blir kvar liten när allt annat växer.
      fontSize: {
        10: 'var(--fs-10)',
        11: 'var(--fs-11)',
        12: 'var(--fs-12)',
        13: 'var(--fs-13)',
        14: 'var(--fs-14)',
        16: 'var(--fs-16)',
        18: 'var(--fs-18)',
        // Radavståndet är kvoten 2rem/1.5rem ur Tailwinds text-2xl, alltså
        // exakt vad de sex rubrikerna hade förut — men som faktor, så det
        // följer med när storleken växer i stället för att strypa raden.
        24: ['var(--fs-24)', '1.333'],
        30: 'var(--fs-30)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
