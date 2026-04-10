import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          blue: '#0176d3',
          'blue-dark': '#014486',
          'blue-light': '#1b96ff',
          teal: '#06a59a',
          'teal-dark': '#047a72',
          purple: '#9050e9',
          red: '#ba0517',
          green: '#2e844a',
          yellow: '#dd7a01',
          neutral: {
            10: '#fafaf9',
            20: '#f3f2f2',
            30: '#e5e5e4',
            50: '#b0adab',
            70: '#706e6b',
            90: '#3e3e3c',
            100: '#181818',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
