<h3 align="center">
  Omarchy Userstyles
</h3>

<p align="center">
	<a href="https://github.com/berrimi/omarchyUserStyles/stargazers"><img src="https://img.shields.io/github/stars/berrimi/omarchyUserStyles?colorA=363a4f&colorB=b7bdf8&style=for-the-badge"></a>
  <a href="https://github.com/berrimi/omarchyUserStyles/blob/main/styles"><img src="https://img.shields.io/github/directory-file-count/berrimi/omarchyUserStyles/styles?label=Userstyles&colorA=363a4f&colorB=cba6f7&style=for-the-badge"></a>
</p>

<p align="center">
A curated collection of website themes that follow your Omarchy theme.
</p>

<p align="center">
<img src="docs/src/assets/preview.webp"/>
</p>

<p align="center">
Visit <a href="https://berrimi.github.io/omarchyUserStyles">berrimi.github.io/omarchyUserStyles</a> to get started.
</p>

## Dependencies

These userstyles resolve their colors from `var(--omarchy-*)` at runtime, so they need:

- [Stylus](https://github.com/openstyles/stylus) ([Firefox](https://addons.mozilla.org/en-US/firefox/addon/styl-us/) / [Chrome](https://chrome.google.com/webstore/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne)) — to install and apply the userstyles.
- [Omarchy Theme Sync](https://github.com/omacom/omarchy-theme-sync) — a Chromium extension that shares your Omarchy desktop theme with websites through CSS variables. Without it, the `--omarchy-*` variables are undefined and the themes have no colors to follow. (Chromium-only; Firefox is not supported yet.)

## Credits

Based on <a href="https://github.com/catppuccin/userstyles" target="_blank">Catppuccin Userstyles</a> by the <a href="https://github.com/catppuccin" target="_blank">Catppuccin Org</a> (MIT). All theme structure, per-site rules, and documentation in this collection derive from their work; only the palette wiring was changed to follow Omarchy.
