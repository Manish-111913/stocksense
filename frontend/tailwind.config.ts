import containerQueries from '@tailwindcss/container-queries'
import forms from '@tailwindcss/forms'
import type { Config } from 'tailwindcss'
import type { CSSRuleObject } from 'tailwindcss/types/config.js'
import plugin from 'tailwindcss/plugin.js'

type CssRules = CSSRuleObject[]

// Prefixes every top-level selector so the rule skips the Dashboard; :where() adds no specificity
function skipDashboard(rules: CssRules): CssRules {
  return rules.map((rule) =>
    Object.fromEntries(
      Object.entries(rule).map(([selectorList, styles]) => [
        selectorList
          .split(/,(?![^(]*\))/)
          .map((selector) => `:where(html:not(.ss-dashboard)) ${selector.trim()}`)
          .join(', '),
        styles,
      ]),
    ),
  )
}

// The Dashboard design was built without the forms plugin, so its base input styles must not reach it
const formsOutsideDashboard = plugin((api) => {
  const { handler } = forms() as unknown as { handler: (api: unknown) => void }
  handler({ ...api, addBase: (rules: CssRules) => api.addBase(skipDashboard(rules)) })
})

// Theme and plugins of the original CDN pages. Per-screen font stacks live in index.css; the Dashboard has its own build.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '!./src/pages/dashboard/**'],
  theme: {
    extend: {
      fontFamily: {
        // Auth and app screens use different fallback stacks; see --font-sans in index.css
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
        display: 'var(--font-display)',
      },
      boxShadow: {
        window: '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
        dock: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [formsOutsideDashboard, containerQueries],
} satisfies Config
