"""Find selectors present in the upstream file but absent in the new file.

Catches rules dropped by automated edits (e.g. nested rules lost when
`& when` guards were unwrapped). Guard-suffixed selectors that survived
under their bare name are expected noise — verify the bare rule exists.

Usage:
    python3 scripts/tour/vanished-selectors.py [site ...]  (default: all)
    deno task tour:selectors -- [site ...]
"""

import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
BASE = "aef780c2"

SKIP_OPEN = re.compile(
    r"^(@|#omarchy\(|#catppuccin\(|#lib\.|#initialLoad|#RGB|#WDS|#profileColor"
    r"|#hsl|#piece|#rgbify|#hsla|#replaceColor|#result|#lightenOrDarken|#darkenOrLighten)"
)


def show(rev, path):
    r = subprocess.run(["git", "show", f"{rev}:{path}"],
                       capture_output=True, text=True, cwd=REPO)
    return r.stdout if r.returncode == 0 else None


def selectors(text):
    sels = []
    for line in text.split("\n"):
        s = line.strip()
        if not s.endswith("{"):
            continue
        if SKIP_OPEN.match(s):
            continue
        if re.match(r"^&\s+when\b", s):
            continue
        sels.append(re.sub(r"\s+", " ", s))
    return sels


def main():
    args = [a for a in sys.argv[1:] if a != "--" and not a.startswith("-")]
    sites = args or sorted(
        p.parent.name for p in REPO.glob("styles/*/omarchy.user.less"))
    for site in sites:
        old = show(BASE, f"styles/{site}/catppuccin.user.less")
        new_p = REPO / f"styles/{site}/omarchy.user.less"
        if old is None or not new_p.exists():
            continue
        new_text = new_p.read_text()
        missing = [s for s in selectors(old)
                   if s not in new_text and s.rstrip(" {") not in new_text]
        if missing:
            print(f"== {site} ({len(missing)} vanished selectors)")
            for s in missing[:25]:
                print("   -", s[:100])


if __name__ == "__main__":
    main()
