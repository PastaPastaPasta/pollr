// dashhq Tailwind preset (Tailwind 3.4). Maps theme colours, radii, heights, fonts and shadows onto the --dh-* tokens,
// so utilities and dashhq-components.css draw from one source. Load dashhq-tokens.css (and dashhq-components.css if you
// use its classes) in the page; this file only names the variables.
//
//   // tailwind.config.js
//   module.exports = { presets: [require('./public/dashhq/dashhq-tailwind-preset.cjs')], content: [...], ... }
//
// Colours are plain var() references, so opacity modifiers (bg-dh-brand/50) don't apply: use the soft tokens instead.
// Dark mode follows the shell's data-theme attribute; the tokens already switch, so most code needs no dark: variants.
const v = (name) => `var(--dh-${name})`;

module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        dh: {
          page: v('page'), surface: v('surface'), sunken: v('sunken'), hover: v('hover'),
          ink: v('ink'), 'ink-2': v('ink-2'), 'ink-3': v('ink-3'),
          line: v('line'), 'line-2': v('line-2'),
          brand: v('brand'), 'brand-ink': v('brand-ink'), 'brand-fill': v('brand-fill'), 'brand-soft': v('brand-soft'),
          accent: v('accent'), 'accent-ink': v('accent-ink'),
          good: v('good'), 'good-soft': v('good-soft'), warn: v('warn'), 'warn-soft': v('warn-soft'),
          bad: v('bad'), 'bad-soft': v('bad-soft'), info: v('info'), 'info-soft': v('info-soft'),
          focus: v('focus'), plate: v('plate'), 'plate-ink': v('plate-ink'),
        },
      },
      borderRadius: { 'dh-badge': v('r1'), dh: v('r2'), 'dh-card': v('r3') },
      height: { 'dh-sm': v('ctl-h-sm'), dh: v('ctl-h'), 'dh-lg': v('ctl-h-lg') },
      minHeight: { 'dh-sm': v('ctl-h-sm'), dh: v('ctl-h'), 'dh-lg': v('ctl-h-lg') },
      maxWidth: { dh: v('max'), 'dh-narrow': v('w-narrow') },
      padding: { 'dh-gutter': v('gutter') },
      fontFamily: { sans: [v('font')], mono: [v('mono')] },
      fontSize: {
        'dh-xs': v('fs-xs'), 'dh-sm': v('fs-sm'), 'dh-ui': v('fs-ui'), 'dh-body': v('fs-body'), 'dh-lead': v('fs-lead'),
        'dh-h3': v('fs-h3'), 'dh-h2': v('fs-h2'), 'dh-h1': v('fs-h1'),
      },
      boxShadow: { 'dh-pop': v('shadow-pop'), 'dh-ring': v('ring-shadow') },
      ringColor: { DEFAULT: v('focus') },
      outlineColor: { DEFAULT: v('focus') },
      transitionTimingFunction: { dh: v('ease') },
    },
  },
};
