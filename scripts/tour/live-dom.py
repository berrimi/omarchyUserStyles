"""Live-DOM verification per site: fetch homepage, check dispatch + key hooks.

For each style: domains from @-moz-document, dispatch selectors (first-level
selectors before the #omarchy def), and a sample of themed hooks. Curls the
homepage (cached in /tmp/opencode/live/) and reports token presence.

NOTE: `:not()` dispatches match by construction when the hook is absent;
JS-set hooks (classes/attrs added post-hydration) read as misses on static
HTML. Interpret misses accordingly — this scan finds candidates, the
Playwright harness (tour:harness) gives verdicts.

Usage:
    python3 scripts/tour/live-dom.py [site ...]  (default: all)
    deno task tour:live -- [site ...]
"""

import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
CACHE = Path("/tmp/opencode/live")
CACHE.mkdir(parents=True, exist_ok=True)


def parse_style(path):
    text = path.read_text()
    domains = re.findall(r'domain\("([^"]+)"', text)
    m = re.search(r"@-moz-document[^{]*\{(.*?)#omarchy\(", text, re.S)
    dispatch = []
    if m:
        for line in m.group(1).split("\n"):
            s = line.strip()
            if not s or s.startswith(("@media", "//", "/*", "@import")):
                continue
            if re.match(r"^[.#\[:a-zA-Z][^{]*\{\s*$", s):
                dispatch.append(s[:-1].strip())
            elif re.match(r"^[.#\[:a-zA-Z]", s) and len(s) < 120:
                dispatch.append(s.rstrip(",").strip())
    post = text.split("#omarchy(", 1)
    hooks = []
    if len(post) > 1:
        for cm in re.finditer(r"^([ \t]*)([.#][\w-]+|\[[^\]]+\])", post[1],
                              re.M):
            if cm.group(2) not in hooks:
                hooks.append(cm.group(2))
            if len(hooks) >= 40:
                break
    return domains, dispatch[:10], hooks[:10]


def fetch(domain):
    cp = CACHE / (re.sub(r"[^\w.-]", "_", domain) + ".html")
    if cp.exists() and cp.stat().st_size > 0:
        return cp.read_text(errors="replace")
    req = urllib.request.Request(
        f"https://{domain}/",
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", errors="replace")
        cp.write_text(html)
        return html
    except Exception as e:  # noqa: BLE001
        return f"__FETCH_FAIL__ {e}"


def tokens(selector):
    out = re.findall(r"\.([\w-]+)", selector)
    out += re.findall(r"#([\w-]+)", selector)
    out += re.findall(r"\[([\w-]+)", selector)
    return out


def check_site(site):
    path = REPO / f"styles/{site}/omarchy.user.less"
    domains, dispatch, hooks = parse_style(path)
    if not domains:
        return site, "NO-DOMAINS", [], []
    html = fetch(domains[0])
    if html.startswith("__FETCH_FAIL__"):
        return site, f"FETCH-FAIL {html[:80]}", domains, dispatch
    disp_hits = [d for d in dispatch
                 if (toks := tokens(d)) and any(t in html for t in toks)]
    disp_miss = [d for d in dispatch
                 if (toks := tokens(d)) and not any(t in html for t in toks)]
    hook_hit = sum(1 for h in hooks
                   if any(t in html for t in tokens(h)))
    status = (f"dispatch {len(disp_hits)}/{len(disp_hits) + len(disp_miss)} "
              f"hooks {hook_hit}/{len(hooks)}")
    if disp_miss and not disp_hits and dispatch:
        status = "DISPATCH-DEAD? " + status
    return site, status, disp_miss, hooks


def main():
    args = [a for a in sys.argv[1:] if a != "--" and not a.startswith("-")]
    sites = args or sorted(
        p.parent.name for p in REPO.glob("styles/*/omarchy.user.less"))
    for site in sites:
        try:
            site, status, miss, _ = check_site(site)
        except Exception as e:  # noqa: BLE001
            print(f"{site:28} ERROR {e}")
            continue
        print(f"{site:28} {status}")
        for m in miss[:4]:
            print(f"    miss: {m[:90]}")


if __name__ == "__main__":
    main()
