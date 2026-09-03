/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    { pattern: /.*/ },
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#223258',
          700: '#343b4c',
          500: '#3a4a70',
          50:  '#eef2fb',
        },
        orange: {
          DEFAULT: '#ff6332',
          dark:   '#e65a2d',
          50:    '#fff3ee',
        },
        brand: {
          50:"#eef2ff", 100:"#e0e7ff", 200:"#c7d2fe",
          300:"#a5b4fc", 500:"#6366f1", 600:"#4f46e5", 700:"#4338ca"
        },
        ok:   { 500: "#10b981" },
        warn: { 500: "#f59e0b" },
        danger:{ 500: "#ef4444" },
        rbtebg: {
          DEFAULT: '#f5f5f7',
          soft: '#e3e6ef',
        },
        rbtetext: {
          DEFAULT: '#5a606f',
          strong:  '#2e3034',
        },
        rbteborder: {
          DEFAULT: '#d8deeb',
          soft:  '#e3e6ef',
        },
      },
      borderRadius: {
        'rbte-pill': '9999px',
        'rbte-field': '0.9rem',
        'rbte-card': '1.25rem',
        'rbte-container': '1.5rem',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'rbte-card': '0 8px 24px rgba(34, 50, 88, 0.08)',
        'rbte-soft': '0 12px 30px rgba(34, 50, 88, 0.06)',
        'rbte-hover': '0 16px 40px rgba(34, 50, 88, 0.12)',
        'rbte-orange': '0 6px 18px rgba(255, 99, 50, 0.25)',
        'rbte-orange-hover': '0 8px 22px rgba(255, 99, 50, 0.32)',
        'rbte-navy': '0 6px 18px rgba(34, 50, 88, 0.22)',
      },
    },
  },
  plugins: [
    plugin(function({ addBase, addComponents, addUtilities, theme }) {
      addBase({
        ':root': {
          '--navy': '#223258',
          '--navy-700': '#343b4c',
          '--navy-500': '#3a4a70',
          '--navy-50': '#eef2fb',
          '--orange': '#ff6332',
          '--orange-dark': '#e65a2d',
          '--orange-50': '#fff3ee',
          '--bg': '#f5f5f7',
          '--bg-soft': '#e3e6ef',
          '--text': '#5a606f',
          '--text-strong': '#2e3034',
          '--border': '#d8deeb',
          '--border-soft': '#e3e6ef',
          '--radius-container': '1.5rem',
          '--radius-card': '1.25rem',
          '--radius-field': '0.9rem',
          '--radius-pill': '9999px',
        },
        'html, body': { height: '100%' },
        'body': {
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
          fontSmooth: 'antialiased',
          lineHeight: '1.55',
        },
        'h1,h2,h3,h4,h5,h6': {
          color: 'var(--text-strong)',
          fontFamily: '"Manrope", "Inter", sans-serif',
          letterSpacing: '-0.01em',
        },
      });

      addComponents({
        '.container-x': {
          width: '100%',
          maxWidth: '1160px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        },
        '@media (min-width: 640px)': {
          '.container-x': { paddingLeft: '1.5rem', paddingRight: '1.5rem' },
        },

        '.card': {
          background: '#fff',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 8px 24px rgba(34, 50, 88, 0.08)',
        },
        '.card-hover': {
          transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.15s ease',
        },
        '.card-hover:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 16px 40px rgba(34, 50, 88, 0.12)',
          borderColor: 'var(--border)',
        },

        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          paddingTop: '0.68rem',
          paddingBottom: '0.68rem',
          fontWeight: '600',
          fontSize: '0.92rem',
          borderRadius: '9999px',
          transition: 'transform 0.05s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
          userSelect: 'none',
        },
        '.btn:active': { transform: 'translateY(1px)' },

        '.btn-primary': {
          background: 'var(--orange)',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(255, 99, 50, 0.25)',
        },
        '.btn-primary:hover': {
          background: 'var(--orange-dark)',
          boxShadow: '0 8px 22px rgba(255, 99, 50, 0.32)',
        },
        '.btn-navy': {
          background: 'var(--navy)',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(34, 50, 88, 0.22)',
        },
        '.btn-navy:hover': { background: 'var(--navy-700)' },
        '.btn-ghost': {
          background: '#fff',
          color: 'var(--text-strong)',
          border: '1px solid var(--border)',
        },
        '.btn-ghost:hover': {
          background: 'var(--bg-soft)',
          borderColor: 'var(--navy-500)',
          color: 'var(--navy)',
        },
        '.btn-ghost-dark': {
          background: 'transparent',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)',
        },
        '.btn-ghost-dark:hover': {
          background: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(255,255,255,0.4)',
        },

        '.field label': {
          display: 'block',
          marginBottom: '0.4rem',
          fontWeight: '700',
          color: 'var(--navy-700)',
          fontSize: '0.83rem',
          letterSpacing: '0.005em',
        },
        '.field .hint': {
          display: 'block',
          marginTop: '0.3rem',
          lineHeight: '1.35',
          fontSize: '0.76rem',
          color: 'var(--text)',
        },
        '.field input, .field select, .field textarea': {
          width: '100%',
          display: 'block',
          background: '#fff',
          lineHeight: '1.5',
          border: '2px solid var(--border-soft)',
          borderRadius: 'var(--radius-field)',
          padding: '0.7rem 0.95rem',
          fontSize: '0.95rem',
          color: 'var(--text-strong)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
        },
        '.field input::placeholder, .field textarea::placeholder': { color: '#9ba2b5' },
        '.field input:focus, .field select:focus, .field textarea:focus': {
          outline: 'none',
          borderColor: 'var(--orange)',
          boxShadow: '0 0 0 4px rgba(255,99,50,0.12)',
          background: '#fff',
        },

        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          paddingTop: '0.28rem',
          paddingBottom: '0.28rem',
          fontWeight: '700',
          fontSize: '0.76rem',
          letterSpacing: '0.005em',
          borderRadius: '9999px',
          background: 'var(--navy-50)',
          color: 'var(--navy)',
        },
        '.badge-orange': { background:'var(--orange-50)', color:'var(--orange-dark)' },
        '.badge-ok':     { background:'#ecfdf5',      color:'#065f46' },
        '.badge-warn':   { background:'#fffbeb',      color:'#92400e' },
        '.badge-danger': { background:'#fef2f2',      color:'#991b1b' },

        '.hero': {
          background: 'radial-gradient(ellipse 120% 80% at 90% -10%, rgba(255, 99, 50, 0.18), transparent 60%), radial-gradient(ellipse 80% 100% at -10% 110%, rgba(255, 99, 50, 0.1), transparent 55%), linear-gradient(135deg, #223258 0%, #2c3f6c 55%, #34497a 100%)',
          color: '#fff',
        },
        '.hero h1,.hero h2,.hero h3': { color: '#fff' },
        '.hero-muted': { color: 'rgba(255,255,255,0.72)' },

        '.divider': { height: '1px', background: 'var(--border-soft)' },

        '.step-pill': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingTop: '0.55rem',
          paddingBottom: '0.55rem',
          fontWeight: '700',
          fontSize: '0.82rem',
          borderRadius: '9999px',
          background: 'var(--bg-soft)',
          color: 'var(--navy-700)',
          transition: 'all 0.18s ease',
        },
        '.step-pill.done': {
          background: 'var(--navy)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(34,50,88,0.18)',
        },
        '.step-pill.active': {
          background: 'var(--orange)',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(255,99,50,0.3)',
        },
        '.step-pill.upcoming': {
          background: 'var(--bg-soft)',
          color: 'var(--text)',
          opacity: '0.85',
        },

        '.breadcrumb': {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text)',
          fontSize: '0.8rem',
        },
        '.breadcrumb a': { color:'var(--navy)', fontWeight: '600' },
        '.breadcrumb a:hover': { color: 'var(--orange)' },
        '.breadcrumb .sep': { color: 'var(--border)' },

        '.row-item': {
          transition: 'all 0.15s ease',
          borderLeft: '3px solid transparent',
        },
        '.row-item:hover': {
          background: '#fbfbfe',
          borderLeftColor: 'var(--orange)',
        },

        '.tag': {
          display: 'inline-flex',
          alignItems: 'center',
          paddingLeft: '0.55rem',
          paddingRight: '0.55rem',
          paddingTop: '0.15rem',
          paddingBottom: '0.15rem',
          fontWeight: '600',
          fontSize: '0.72rem',
          borderRadius: '0.375rem',
          background: 'var(--bg-soft)',
          color: 'var(--navy-700)',
        },

        '.link-underline': {
          backgroundImage: 'linear-gradient(currentColor, currentColor)',
          backgroundSize: '0% 1px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0 100%',
          transition: 'backgroundSize 0.2s ease',
        },
        '.link-underline:hover': { backgroundSize: '100% 1px' },
      });

      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px', height: '1px',
          padding: '0', margin: '-1px',
          overflow: 'hidden', clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap', borderWidth: '0',
        },
      });
    }),
  ],
};