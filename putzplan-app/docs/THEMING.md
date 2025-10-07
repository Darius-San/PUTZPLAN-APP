# Theming & Palettes
## Current palettes
- indigo (base)
- amber-glow (warm amber / caramel gradient)
## Core semantic tokens
```
--color-bg
--color-surface
--color-surface-alt
--color-border
--color-border-strong
--color-text
--color-text-soft
--color-primary / --color-primary-hover / --color-primary-fg
--color-accent
--color-danger / --color-danger-hover / --color-danger-fg
--color-warning
--color-success / --color-success-hover
--color-focus-ring
```
Plus radius / shadow / transitions.

## UI Style vs Theme
## Adding a new palette (currently disabled/minimal)
Das System wurde abgespeckt: Nur Basis (indigo) + Amber Glow bleiben. Weitere Blöcke können jederzeit wieder ergänzt werden – siehe Kommentarstruktur in `index.css`. Füge dann den neuen Key zum `ThemeName` Union & ThemeSwitcher hinzu.
- `data-theme` changes the color palette.
- `data-ui-style` (`soft | outline | pill | glass`) changes component shape / treatment.
  They are independent and can be combined.
## Dark mode
Der frühere separate Dark-Block wurde entfernt. Falls wieder benötigt: einfach `[data-theme='dark']` Block reaktivieren und im Hook aufnehmen.

## Adding a new palette
1. Pick a name: e.g. `ocean`.
2. Add a block in `index.css`:
```css
[data-theme='ocean'] {
  --color-primary: #0369a1; /* primary */
  --color-primary-hover: #075985;
  --color-accent: #0ea5e9;
  --color-focus-ring: rgba(14,165,233,0.45);
  --color-bg: #f0f9ff;           /* optional tinted background */
  --color-surface: #ffffff;      /* usually white */
  --color-surface-alt: #e0f2fe;  /* subtle tint */
  --color-border: #bae6fd;
  --color-border-strong: #7dd3fc;
}
```
3. Extend the `ThemeName` union in `src/hooks/useTheme.ts` and add it to the `order` array in `cycle`.
4. Add a human-readable label in `ThemeSwitcher.tsx`.

## Tinted backgrounds
For less stark white you can also override:
```
--color-bg
--color-surface-alt
--color-border
--color-border-strong
```
Keep `--color-surface` white if you still want cards to feel elevated. Use the 50/100/200/300 shades of a Tailwind color family for a coherent tint.

## Dark mode
`[data-theme='dark']` overrides a larger set including background, text, and primary colors. The media query scaffold further ensures system-dark preference.

## Adding gradients or special effects
You can create component-specific variations using the existing semantic tokens (e.g., gradient buttons) without adding new tokens. If multiple palettes need a specialized accent gradient, introduce a new token like `--gradient-primary` with a sensible fallback.

## Performance note
All palettes share the same DOM structure; switching themes simply flips the `data-theme` attribute and a transition class adds smoothness. No React re-render is required beyond the triggering button.

## Testing
The test suite doesn’t snapshot colors, so adding palettes is safe. If you later add visual regression tests, ensure each palette is rendered at least once.

## Current palettes
- indigo (base)
- emerald
- slate-amber
- violet (tinted background)
- rose (tinted background)
- cyan (tinted background)
- dark
 - amber-glow (warm amber / caramel gradient)

Happy theming!

---

## Gradient & Accent Extensions (Color Enrichment Phase)

To make the UI feel warmer and more saturated we introduced a small set of additional semantic tokens and utility variants. They remain theme-aware and require only per-theme overrides for consistent feel.

### New Tokens
```
--gradient-primary            // main saturated gradient for primary emphasis
--gradient-primary-accent     // lighter / accent variant (cards, accent badges)
--color-primary-soft          // very light background tint (chips, subtle states)
--color-primary-subtle        // mid-level tint (hover, selected states)
--surface-overlay-noise       // subtle radial noise / texture for accent surfaces
```

Each palette defines its matching gradient + soft/subtle tints. If you add a new palette, include analogous definitions pulled from appropriate shade ramps (50/400/600/700 etc.).

### New Component Variants
- `.card-accented`  → Uses `--gradient-primary-accent` + noise overlay for a hero/summary card.
- `.badge-accent`   → Gradient accent pill badge.

Primary buttons in `pill` and `glass` UI styles are auto-upgraded to use `--gradient-primary` for stronger hierarchy. (Other styles stay flat for contrast variety.)

### Usage Examples
```jsx
<Card className="card-accented">Monatlicher Fortschritt</Card>
<Badge variant="accent">+42 Punkte</Badge>
```

### Design Guidance
- Limit accent cards to 1–2 per view to avoid washing out hierarchy.
- Prefer white/near-white text on gradients; if contrast is insufficient, supply `--color-primary-fg` override.
- Soft/subtle tokens are ideal for quiet states (selected filters, progress context hints) without resorting to gray.

### Extending a Theme
```css
[data-theme='your-theme'] {
  --color-primary: #...;
  --color-primary-hover: #...;
  --color-accent: #...;
  --color-primary-soft: rgba(r,g,b,0.14);
  --color-primary-subtle: rgba(r,g,b,0.28);
  --gradient-primary: linear-gradient(...);
  --gradient-primary-accent: linear-gradient(...);
}
```

Keep changes minimal and semantic—avoid hard-coding specific palette hexes outside the theme blocks.

Enjoy the extra color warmth!
