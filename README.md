<h3 align="center">
  Omarchy Userstyles
</h3>

<p align="center">
A curated collection of website themes that follow your Omarchy theme.
</p>

<p align="center">
<a href="https://github.com/berrimi/omarchyUserStyles/releases/download/all-userstyles-export/import.json"><strong>Download import.json</strong></a> — all userstyles in one Stylus backup file. Import it via the Stylus manage page (<strong>Import backup</strong>).
</p>

To rebuild it locally after changing styles:

```
deno task ci:stylus-import
```

This writes `dist/import.json`, which is committed to the repo.

## Dependencies

These userstyles resolve their colors from `var(--omarchy-*)` at runtime, so they need:

- [Stylus](https://github.com/openstyles/stylus) ([Firefox](https://addons.mozilla.org/en-US/firefox/addon/styl-us/) / [Chrome](https://chrome.google.com/webstore/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne)) — to install and apply the userstyles.
- [Omarchy Theme Sync](https://github.com/omacom/omarchy-theme-sync) — a Chromium extension that shares your Omarchy desktop theme with websites through CSS variables. Without it, the `--omarchy-*` variables are undefined and the themes have no colors to follow. (Chromium-only; Firefox is not supported yet.)

## Credits

Based on <a href="https://github.com/catppuccin/userstyles" target="_blank">Catppuccin Userstyles</a> by the <a href="https://github.com/catppuccin" target="_blank">Catppuccin Org</a> (MIT). All theme structure, per-site rules, and documentation in this collection derive from their work; only the palette wiring was changed to follow Omarchy.
