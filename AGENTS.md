# AGENTS.md

Fork of catppuccin/userstyles. Single `omarchy` flavor: 134 styles in
`styles/*/omarchy.user.less`, shared lib in `lib/`, template in
`template/omarchy.user.less`. All colors resolve to `var(--omarchy-*)`
at runtime (provided on pages by Omarchy Theme Sync + Stylus).

## Palette mapping (Catppuccin → Omarchy, keep consistent)

| Catppuccin | Omarchy var | Catppuccin | Omarchy var |
|---|---|---|---|
| rosewater | `bright-fg` | text | `foreground` (fb `fg`) |
| flamingo | `fg` | subtext1 | `light-fg` |
| pink | `magenta` | subtext0 | `muted` |
| mauve | `purple` | overlay2/1/0 | `muted` |
| red | `red` | surface2/1 | `lighter-bg` |
| maroon | `bright-red` | surface0 | `bg` (fb `background`) |
| peach | `orange` | yellow | `yellow` |
| green | `green` | base | `background` (fb `bg`) |
| teal | `cyan` | mantle | `dark-bg` |
| sky | `bright-cyan` | crust | `darker-bg` |
| sapphire | `bright-blue` | accent | `accent` (fixed) |
| blue | `blue` | fixed-white | `color7` |
| lavender | `bright-magenta` | selection | `selection-background`/`-foreground` |
| | | cursor | `cursor` |

(`fb` = `var()` fallback. Full names are `var(--omarchy-…)` below.)

Reverse reference (Omarchy key → closest Catppuccin name), authoritative
when the two tables disagree — realign the working table, don't fork it:

| Omarchy key | Catppuccin | Omarchy key | Catppuccin |
|---|---|---|---|
| accent | Blue/Lavender/Mauve | red/green/yellow/blue | Red/Green/Yellow/Blue |
| cursor | Rosewater | magenta/purple/cyan/orange | Pink/Mauve/Teal/Peach |
| foreground/bg/background | Text/Base | brown | Maroon |
| selection-fg/bg | Base/Rosewater | bright-red/green/yellow/blue/magenta/cyan | Red/Green/Yellow/Blue/Pink/Teal |
| bg/darker-bg/dark-bg/lighter-bg | Base/Crust/Mantle/Surface0 | color0/color8 | Surface1/Surface2 |
| selection | Surface1 | color1-6/color9-14 | Red/Green/Yellow/Blue/Pink/Teal |
| muted | Overlay0 | color7/color15 | Subtext1/Subtext0 |
| dark-fg/fg/light-fg/bright-fg | Subtext0/Text/Text/Rosewater | hyprland/inactive borders | Blue/Overlay0 |
| active-border/tab-bg | Blue/Surface0 | (mode/theme_type: metadata, not colors) |

## Commands

- `deno task lint [style]` — compiles every style against local `lib/` + stylelint. Gate for all style edits.
- `deno task lint --fix` — DANGEROUS, see gotchas. Never run blindly.
- `deno task test` — repo unit tests.
- `deno task ci:stylus-import` — rebuilds `dist/import.json` (committed; linked in README).
  The build INLINES `lib/std/v1.less` into every entry (replacing the
  `@import` line), so installs never depend on the Pages host at import
  time. Repo sources keep the `@import`.
- `deno check` / `deno lint` / `deno fmt` — for `scripts/` changes.
- CI deploys docs+lib to Pages on `docs/**` + `lib/**` changes; build workflow refreshes the release `import.json`.
- Pushes don't auto-trigger Actions on this repo (only dispatches run), so
  `dist/import.json` is refreshed by a local post-commit hook
  (`.git/hooks/post-commit`, unversioned): after any commit touching
  `styles/`/`lib/`/`template/`, it rebuilds the bundle and amends it in.
  Keep it working; re-dispatch `build.yml` manually if the release lags.

## Architecture

- `lib/std/v1.less` `#lib.palette()` maps each palette var to its closest
  omarchy var per the table above.
- Accent is fixed: `@accent: var(--omarchy-accent)`. No `@var select`
  remains anywhere (accent/contrast/move/check/highlight pickers all
  removed; their uses now point at fixed palette vars).
- `#omarchy("omarchy")` mixin def + calls (pattern-match literal; postcss-less
  chokes on argless `#m()` defs).
- Color derivation is pure CSS: `color-mix()` for fade/mix/lighten/darken/
  desaturate/saturate/average/shade/2-arg-mix; `from X r g b` / `from X h s l`
  channel fragments (consumed as `rgb(var(--x))`, slash for alpha — never commas);
  `hsl(from X …)` relative colors.
- `filter: @X-filter` recolors are STATIC mocha-derived strings (no var
  equivalent exists) — kept intentionally for icons.
- `#lib.defaults()` wires Core UI keys directly: `::selection` uses
  `selection-background`/`selection-foreground` (color-mix/inherit fallbacks),
  inputs use `caret-color: var(--omarchy-cursor, auto)`.
- Headers must satisfy `scripts/lint/metadata.ts` (name/namespace/URLs/author
  `berrimi`, description `Omarchy theme for …`; no `@var select` remains).
- Lib `@import` host is `https://berrimi.github.io/omarchyUserStyles/lib/`
  (intercepted to local `lib/` by lint; served via `docs/public/lib` symlink).

## Gotchas (learned the hard way)

- Less color fns (`fade`, `lighten`, `mix`, `red()`, `hue()`…) FAIL on `var()`.
  Never reintroduce them on palette vars.
- Detached-ruleset lookups `@t[k]`: keys MUST be `@var` refs — bare keywords
  fail (`property "x" not found`); `@@` double-deref strict-errors on missing
  vars. No lookup tables remain; keep it that way.
- Less EVALUATES `calc()` with `s`/`h` channels inside `@var:` assignments
  (fails); same code passes through untouched in custom props. Desaturate via
  `color-mix(in srgb, X, hsl(from X h 0% l) P%)` instead. `spin()` in gradients
  needs `~"hsl(from @{x} calc(h + N) s l)"`.
- `deno task lint --fix` DELETES nested rules inside `& {}` (its fixer only
  moves declarations). Unwrap `& {}` manually (dedent), never --fix them.
- Guard deletion orphans: deleting `X when (…)` from a multi-line selector
  list leaves dangling `…,`, and emptied rules leave stray `{`/`}`. Always
  re-check brace balance + run lint after structural deletes.
- Data-URI SVGs (`fill="@{…}"`) cannot resolve page CSS vars (isolated
  documents) — icons may render black. Prefer `filter: @X-filter` for
  monochrome icons; var-fills are accepted breakage.
- `escape('…')` results interpolate into `url()` ONLY if the source keeps an
  `@{…}` — a fully-static escape output fails with `Invalid % without number`.
- Single-color data-URI `background-image` icons: convert to mask instead —
  keep the original SVG untouched, set `background-image: none`,
  `background-color: @<color>`, `mask-image: url(…@{svg})` + explicit
  mask-size/position/repeat (mirrored from bg-* or auto/0 0/repeat),
  `!important` mirrored. Never set two paints on one box (bg-color + glyph
  combos like player knobs stay black-filled, they keep contrast).
- `content: url()` single-color icons with SVG width+height: `content: ""` +
  `display: inline-block`, explicit w/h, `background-color`, mask with
  contain/center/no-repeat. Without intrinsic dims, or multi-color sprites
  (stack-overflow toolbar, pypi logos) and `@{white}/@{black}` youtube knobs:
  leave, flag for eyeball check.
- Single-channel page-side vars (`-h/-s/-l`, `-rgb` with comma consumers)
  cannot derive from runtime vars — vikunja/regex101 breakdowns were deleted.
- Pushes don't auto-trigger Actions on this repo (only dispatches run);
  releases/Pages deploys were done manually. Empty probe commit in history.
- Local Deno (2.9.x) rewrites `deno.lock` into a format CI's pinned
  Deno 2.3.5 rejects as corrupt — never commit lockfile churn; revert it.
- Stylus-side staleness: after any rebrand/dispatch change, users must DELETE
  all Omarchy styles in the manager before reimporting — importing over old
  copies leaves cached empty/error compiles behind (alternating
  `variable undefined` / `Style is empty` across the list is the tell).
- Functional upstream deps intentionally kept: `@catppuccin/palette`,
  categories.yml, starlight docs theme, Teams `org:` strings, giscus URL.

## Tour state (site-by-site review)

Goal of the tour: the old Catppuccin styles were correct — for each site,
diff old (`aef780c2:styles/<site>/catppuccin.user.less`) vs new and confirm
every rule migrated faithfully to the closest omarchy var; restore/fix
anything missing or wrong. No screenshots, no browser harness — pure
diff-driven review, verified with `deno task lint`.

Second half of the goal: verify against the LIVE DOM, not just the diff.
Sites drift (chatgpt `.light`/`.dark` → `html[data-color-scheme]`, claude
`data-mode="dark|light"` → `data-mode="system"`, ...). For each site, fetch
the live homepage and confirm the dispatch selectors (and a sample of key
themed selectors/vars) still exist. If the dispatch is dead, update it to
the live hooks — a perfectly migrated file that never matches themes nothing.
External breakage beyond our control (JS-only DOM, auth walls) gets flagged,
not fixed.

Process: work the site list alphabetically in batches. Per site run
`python3 /tmp/opencode/omarchy-diff.py <site>` (shows substantive deletions
minus headers/guards/converted-fns, plus suspicious additions) and
`python3 /tmp/opencode/omarchy-selectors.py <site>` (selectors present in
old but absent in new). Rule-count drops alone mean nothing (latte+dark
pairs merged into one rule). Restore dark-branch rules/filters that were
dropped with the latte guards; latte-only rules stay deleted. Verify each
fix with `deno task lint <site>`.
- DONE: planet-minecraft (restored dark `#display_modes a`), namemc (restored
  dark `.mc-black/.mc-dark-gray/.mc-gray/.mc-reset/.mc-white`), google-drive
  (rebuilt 5 filter rules R1–R5, bstats discord, un-merged File-title rule),
  wiki.nixos math rule (`filter: @text-filter`), anilist dups, vikunja/regex101.
- DONE tour fixes: npm dark `&:hover` pair, modrinth `@shadow`→`@crust`,
  anilist footer dark pair, gdrive container closer, wiki.nixos img-rule
  boundary, bstats discord mocha filter.
- DONE icons: 127 single-color bg-image + ~50 single-color content blocks
  converted to mask+background (scripts `omarchy-mask.py`,
  `omarchy-mask-content.py`); multi-color sprites, dim-less content blocks,
  youtube knob conflicts left as-is (black keeps contrast on light chips).
- Structural tour: all 134 sites diffed (`omarchy-diff.py` + selectors scan);
  remaining deltas are flavor pruning, renames, or conversions above.
- Live-DOM tour: dispatch verified per site via homepage fetch
  (`omarchy-live.py`, cached in `/tmp/opencode/live/`). Real drift fixed:
  chatgpt `.light`/`.dark` → `html[data-color-scheme]`, claude
  `data-mode` → dropped (app uses `system`). `:not()` fallbacks and
  JS-set hooks (bsky colorMode, DDG dark-bg, anilist site-theme-*) kept.
  Bot-walled/DNS-dead fetches flagged, not fixed.
- Audit scripts live in `/tmp/opencode/` (`omarchy-audit.py`,
  `omarchy-selectors.py`, converters) — rerun after bulk edits.
- Known eyeball checks: light Omarchy themes (white-on-white icon edge cases),
  code-heavy sites (highlighter imports deleted → native fallback), any style
  still reporting empty in Stylus after clean reimport.
