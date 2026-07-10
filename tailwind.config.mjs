export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Pacifico', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        base: 'var(--c-base)',
        card: 'var(--c-card)',
        border: 'var(--c-border)',
        text: {
          soft: 'var(--c-text-soft)',
          DEFAULT: 'var(--c-text)',
        },
        accent: {
          soft: 'var(--c-accent-soft)',
          DEFAULT: 'var(--c-accent)',
          text: 'var(--c-accent-text)',
        },
        gold: {
          soft: 'var(--c-gold-soft)',
          DEFAULT: 'var(--c-gold)',
          text: 'var(--c-gold-text)',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        blob: 'blob 9s ease-in-out infinite alternate',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(20px,30px) scale(1.08)' },
        },
      },
    },
  },
  plugins: [],
};
