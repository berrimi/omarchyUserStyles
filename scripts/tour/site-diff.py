"""Compact substantive diff per site: old catppuccin vs new omarchy.

Shows deleted lines minus expected boilerplate (headers, guards, converted
fns, dispatch calls), plus suspicious added lines.

Usage:
    python3 scripts/tour/site-diff.py <site> [<site> ...]
    deno task tour:diff -- <site> [...]
"""

import difflib
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
BASE = "aef780c2"

DEL_SKIP = re.compile(
    r"@var |@name |@namespace |@homepageURL|@version|@updateURL|@supportURL"
    r"|@description |@author |@license|@preprocessor|@import |lightFlavor|darkFlavor"
    r"|rosewater:|flamingo:|mauve:|catppuccin\.user\.less|#catppuccin\(@flavor\)"
    r"|when \(@flavor|when not\(@flavor|fade\(|fadeout\(|lighten\(|darken\("
    r"|desaturate\(|saturate\(|spin\(|average\(|multiply\(|shade\(|tint\("
    r"|rgbify|hslify|#hsla|hue\(|saturation\(|lightness\(|[^a-zA-Z]red\(|green\(|blue\("
    r"|mix\(|rgba\(|@catppuccin\[|@@\w+Color|^\s*$|^\s*//|^\s*/\*| accompanied"
)

ADD_FLAG = re.compile(
    r"& \{\s*$|when \(@flavor|if\(@flavor|-static[}:]|from from|srgb, from "
    r"|fade\(|lighten\(|darken\(|(?<![\w-])mix\(|desaturate\(|saturate\("
)


def show(rev, path):
    r = subprocess.run(["git", "show", f"{rev}:{path}"],
                       capture_output=True, text=True, cwd=REPO)
    return r.stdout if r.returncode == 0 else None


def site_diff(site):
    old = show(BASE, f"styles/{site}/catppuccin.user.less")
    new_p = REPO / f"styles/{site}/omarchy.user.less"
    if old is None or not new_p.exists():
        print(f"== {site}: MISSING (old={old is not None}, new={new_p.exists()})")
        return
    new = new_p.read_text()
    old_lines = old.split("\n")
    new_lines = new.split("\n")
    sm = difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False)
    dels, adds = [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "delete":
            for l in old_lines[i1:i2]:
                if not DEL_SKIP.search(l):
                    dels.append((i1 + 1, l))
        elif tag == "replace":
            for k, l in enumerate(old_lines[i1:i2]):
                if not DEL_SKIP.search(l):
                    dels.append((i1 + 1 + k, l))
            for k, l in enumerate(new_lines[j1:j2]):
                if ADD_FLAG.search(l):
                    adds.append((j1 + 1 + k, l))
        elif tag == "insert":
            for k, l in enumerate(new_lines[j1:j2]):
                if ADD_FLAG.search(l):
                    adds.append((j1 + 1 + k, l))
    print(f"== {site}: {len(dels)} substantive deletions, "
          f"{len(adds)} flagged additions")
    for ln, l in dels[:40]:
        print(f"  -L{ln}: {l.strip()[:110]}")
    for ln, l in adds[:15]:
        print(f"  +L{ln}: {l.strip()[:110]}")


if __name__ == "__main__":
    for site in [a for a in sys.argv[1:] if a != "--"]:
        site_diff(site)
