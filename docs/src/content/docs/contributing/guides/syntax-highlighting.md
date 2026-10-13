---
title: Syntax Highlighting
description: Guide for theming syntax highlighting in userstyles.
sidebar:
  order: 3
---

If a website uses [highlight.js](https://highlightjs.org/), [Pygments](https://pygments.org/), [Prism.js](https://prismjs.com/), or [Chroma](https://github.com/alecthomas/chroma) for syntax highlighting, theme its token classes directly with the palette variables. First, add the following line near the top of the `#omarchy` mixin, under `#lib.palette();`/`#lib.defaults();`, to include the necessary CSS variables:

```css
#lib.css-variables();
```

Then target the highlighter's token selectors with palette colors, for example:

```less
.hljs-keyword,
.token.keyword {
  color: @mauve;
}

.hljs-string,
.token.string {
  color: @green;
}

.hljs-comment,
.token.comment {
  color: @subtext0;
}
```

> [!NOTE]
> Do not import external highlighter stylesheets: there are no Omarchy-hosted equivalents, and third-party stylesheets would not follow the user's Omarchy theme. Style the tokens with `@base`/`@text`/`@accent`/… variables (or the `--omarchy-*` custom properties from `#lib.css-variables()`) instead.
