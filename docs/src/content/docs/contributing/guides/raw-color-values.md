---
title: Raw color values
description: Guide for obtaining raw color values of palette colors in RGB or HSL formats.
sidebar:
  order: 4
---

Palette variables resolve to `var(--omarchy-*)` at runtime, so Less cannot extract their channels at compile time. Use [relative colors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Using_relative_colors) instead — the browser evaluates them natively.

## Obtaining RGB values

Emit a channel fragment from the palette variable and consume it with `rgb()`:

```less
--my-variable-rgb: from @base r g b;
color: rgb(var(--my-variable-rgb));
```

With an alpha value, use the slash syntax (commas are not allowed in relative colors):

```less
color: rgb(var(--my-variable-rgb) / 0.5);
```

## Obtaining HSL values

```less
--my-variable-hsl: from @base h s l;
color: hsl(var(--my-variable-hsl));
```
