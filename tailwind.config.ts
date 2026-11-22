import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chassis: 'var(--bg-chassis)',
        panel: 'var(--bg-panel)',
        elevated: 'var(--bg-elevated)',
        canvas: 'var(--bg-canvas)',
        hairline: 'var(--border-hairline)',
        focus: 'var(--border-focus)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-telemetry': 'var(--text-telemetry)',
        'field-orange': 'var(--accent-field-orange)',
        'laser-cyan': 'var(--accent-laser-cyan)',
        'amber-warn': 'var(--accent-amber-warn)',
        'hazard-red': 'var(--accent-hazard-red)',
        'signal-green': 'var(--accent-signal-green)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        space: ['var(--font-space)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
