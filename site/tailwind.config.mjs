import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // opensubscriptionplatforms.com-inspired palette: clean white, charcoal, blue accent
        ink: {
          DEFAULT: '#16181c',
          soft: '#3a3f46',
          mute: '#697078',
          line: '#e3e6ea',
        },
        accent: {
          DEFAULT: '#1d4ed8', // brand blue
          soft: '#dbeafe',
          ink: '#0c2a78',
        },
        ok: '#15803d',
        no: '#b91c1c',
        paper: '#ffffff',
        paperAlt: '#f6f7f9',
        codebg: '#16181c',
        codefg: '#f6f7f9',
      },
      fontFamily: {
        // marketing/UI: clean sans-serif, like opensubscriptionplatforms.com
        sans: ['Inter', 'Helvetica Neue', 'Segoe UI', 'system-ui', 'sans-serif'],
        // spec/docs body: Harvard-style serif
        serif: ['Charter', 'Iowan Old Style', 'Source Serif 4', 'Source Serif Pro', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        prose: '720px',
        container: '1040px',
      },
      typography: ({ theme }) => ({
        spec: {
          css: {
            '--tw-prose-body': theme('colors.ink.DEFAULT'),
            '--tw-prose-headings': theme('colors.ink.DEFAULT'),
            '--tw-prose-lead': theme('colors.ink.soft'),
            '--tw-prose-links': theme('colors.accent.DEFAULT'),
            '--tw-prose-bold': theme('colors.ink.DEFAULT'),
            '--tw-prose-counters': theme('colors.ink.mute'),
            '--tw-prose-bullets': theme('colors.ink.mute'),
            '--tw-prose-hr': theme('colors.ink.line'),
            '--tw-prose-quotes': theme('colors.ink.soft'),
            '--tw-prose-quote-borders': theme('colors.ink.line'),
            '--tw-prose-captions': theme('colors.ink.mute'),
            '--tw-prose-code': theme('colors.ink.DEFAULT'),
            '--tw-prose-pre-code': theme('colors.codefg'),
            '--tw-prose-pre-bg': theme('colors.codebg'),
            '--tw-prose-th-borders': theme('colors.ink.line'),
            '--tw-prose-td-borders': theme('colors.ink.line'),
            fontFamily: theme('fontFamily.serif').join(', '),
            fontSize: '17px',
            lineHeight: '1.65',
            maxWidth: '720px',
            h1: { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: 600, fontSize: '2rem', marginTop: 0 },
            h2: {
              fontFamily: theme('fontFamily.sans').join(', '),
              fontWeight: 600,
              fontSize: '1.45rem',
              borderTop: `1px solid ${theme('colors.ink.line')}`,
              paddingTop: '1rem',
              marginTop: '2.5em',
            },
            h3: { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: 600, fontSize: '1.15rem' },
            h4: {
              fontFamily: theme('fontFamily.sans').join(', '),
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: theme('colors.ink.soft'),
            },
            'h2 a, h3 a, h4 a': { textDecoration: 'none', fontWeight: 'inherit' },
            'a.anchor': {
              color: theme('colors.ink.mute'),
              textDecoration: 'none',
              fontWeight: 400,
              marginLeft: '0.4em',
              opacity: 0,
              transition: 'opacity 120ms ease',
            },
            'h1:hover a.anchor, h2:hover a.anchor, h3:hover a.anchor, h4:hover a.anchor': { opacity: 1 },
            code: {
              fontFamily: theme('fontFamily.mono').join(', '),
              backgroundColor: theme('colors.paperAlt'),
              padding: '0.1em 0.35em',
              borderRadius: '3px',
              fontWeight: 'inherit',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: { fontFamily: theme('fontFamily.mono').join(', '), fontSize: '0.9rem' },
            table: { fontSize: '0.95rem' },
            'th, td': { padding: '0.5em 0.75em', verticalAlign: 'top' },
            blockquote: { fontStyle: 'normal', borderLeftWidth: '3px' },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
