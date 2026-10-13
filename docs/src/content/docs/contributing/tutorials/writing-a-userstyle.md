---
title: Writing a userstyle
description: Beginner-friendly walkthrough of creating a userstyle!
sidebar:
  order: 1
---

## Prerequisites

- [Stylus](https://github.com/openstyles/stylus) ([Firefox](https://addons.mozilla.org/en-GB/firefox/addon/styl-us/) / [Chrome](https://chrome.google.com/webstore/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne) extension).
- A website to theme!

Assuming you have completed steps 1-4 of [Creating Userstyles](/contributing/creating-userstyles/), you should have a new `omarchy.user.less` file under the `styles/<name-of-website>/` directory. Follow along in that `omarchy.user.less` file as we write an example userstyle for [example.org](http://example.org/).

## Usercss Metadata

Start by filling out the "metadata block" at the very top of the template. Replace `<port-name>` with the name of the website you are porting, and please ensure it is capitalized when needed. For `example.org`, it looks like this:

```less
/* ==UserStyle==
@name example.org Omarchy
@namespace github.com/berrimi/omarchyUserStyles/styles/example.org
@homepageURL https://github.com/berrimi/omarchyUserStyles/tree/main/styles/example.org
@version 2000.01.01
@updateURL https://github.com/berrimi/omarchyUserStyles/raw/main/styles/example.org/omarchy.user.less
@supportURL https://github.com/berrimi/omarchyUserStyles/issues?q=is%3Aopen+is%3Aissue+label%3Aexample.org
@description Omarchy theme for example.org
@author berrimi
@license MIT

@preprocessor less
@var select accentColor "Accent" ["red:Red", "orange:Orange", "yellow:Yellow", "green:Green", "cyan:Cyan", "blue:Blue", "purple:Purple*", "magenta:Magenta", "brown:Brown", "bright-red:Bright Red", "bright-yellow:Bright Yellow", "bright-green:Bright Green", "bright-cyan:Bright Cyan", "bright-blue:Bright Blue", "bright-magenta:Bright Magenta"]
==/UserStyle== */
```

The rest of the metadata block details the preprocessor and the accent option of the userstyle. This won't need to be changed. For more information, see ["Usercss Metadata" - Stylus Wiki](https://github.com/openstyles/stylus/wiki/Writing-UserCSS#usercss-metadata).

## `@-moz-document`

To tell Stylus which website(s) to apply this userstyle on, replace `<website-domain>` with the domain of your port. For `example.org`, it looks like this:

```less
@-moz-document domain("example.org") {
```

> [!NOTE]
> While `domain()` works for most cases, you may need to use [`regexp()`](https://github.com/openstyles/stylus/wiki/Writing-styles#regexp) for websites with more complex URLs. For example:
>
> ```less
> @-moz-document regexp("http://example.(com|net|org|edu)/") {
> ```

## Applying the theme

This section of the template applies the single Omarchy theme. Every color resolves to a `var(--omarchy-*)` at runtime and follows the user's Omarchy theme, so there is just one call:

```less
#omarchy("omarchy");
```

## The `#omarchy` mixin

> [!TIP]
> For more on how Less mixins work, see ["Mixins" - lesscss.org](https://lesscss.org/features/#mixins-feature) and ["A Comprehensive Introduction to Less: Mixins" - SitePoint](https://www.sitepoint.com/a-comprehensive-introduction-to-less-mixins/).

We'll refer to this next section of the template as the "`#omarchy` mixin". The first part contains a series of mixin calls to include the Omarchy palette and style defaults from the standard library:

```less
#lib.palette();
#lib.defaults();
```

Following that, you will write the CSS rules for your port. Here is what it looks like for our `example.org` port:

```less
#omarchy("omarchy") {
  #lib.palette();
  #lib.defaults();

  body {
    background-color: @base;

    & > div {
      color: @text;
      background-color: @surface0;
    }
  }

  a:link,
  a:visited {
    color: @accent;
  }

  /* ... */
}
```

## Putting it all together

Combining all of the previous steps, we have a working userstyle!

```less
/* ==UserStyle==
@name example.org Omarchy
@namespace github.com/berrimi/omarchyUserStyles/styles/example.org
@homepageURL https://github.com/berrimi/omarchyUserStyles/tree/main/styles/example.org
@version 2000.01.01
@updateURL https://github.com/berrimi/omarchyUserStyles/raw/main/styles/example.org/omarchy.user.less
@supportURL https://github.com/berrimi/omarchyUserStyles/issues?q=is%3Aopen+is%3Aissue+label%3Aexample.org
@description Omarchy theme for example.org
@author berrimi
@license MIT

@preprocessor less
@var select accentColor "Accent" ["red:Red", "orange:Orange", "yellow:Yellow", "green:Green", "cyan:Cyan", "blue:Blue", "purple:Purple*", "magenta:Magenta", "brown:Brown", "bright-red:Bright Red", "bright-yellow:Bright Yellow", "bright-green:Bright Green", "bright-cyan:Bright Cyan", "bright-blue:Bright Blue", "bright-magenta:Bright Magenta"]
==/UserStyle== */

@-moz-document domain("example.org") {
  #omarchy("omarchy");

  #omarchy("omarchy") {
    #lib.palette();
    #lib.defaults();

    body {
      background-color: @base;

      & > div {
        color: @text;
        background-color: @surface0;
      }
    }

    a:link,
    a:visited {
      color: @accent;
    }
  }
}
```

| Original                                                                                     | Themed                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Screenshot of the default example.com page.](../../../../assets/example.org-original.webp) | ![Combined screenshots of the example.com page, with the page seen using the Omarchy theme.](../../../../assets/example.org-themed.webp) |

Complete the rest of the steps in [Creating Userstyles](/contributing/creating-userstyles/), and then submit your PR!
