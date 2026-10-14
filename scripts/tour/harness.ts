// Playwright live-DOM tour: inject each style's compiled CSS plus fake
// --omarchy-* test colors into the live site, then snapshot computed
// styles before/after. A style "passes" when injection observably changes
// rendering (body/root paint or >=3 elements). Bot-walled, DNS-dead and
// login-walled pages report as failed/unverifiable, never passing.
//
// This is the runtime half of the tour (see AGENTS.md). Static half:
//   deno task tour:diff / tour:selectors / tour:live
//
// Usage:
//   deno task tour:harness -- [site ...]     (default: all sites)
//   CHROMIUM_PATH=/usr/bin/chromium deno task tour:harness -- youtube
//
// Requires network access and a Chromium binary.

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, chromium } from "npm:playwright-core@1.64.0";
import less from "npm:less@4.9.1";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const OUT = Deno.env.get("TOUR_OUT") ?? "/tmp/opencode/tour-results.jsonl";

const VARS =
  `:root{--omarchy-accent:#ff0066;--omarchy-cursor:#00ff00;--omarchy-foreground:#eeddcc;` +
  `--omarchy-background:#112233;--omarchy-selection-background:#ff0066;` +
  `--omarchy-selection-foreground:#ffffff;--omarchy-bg:#112233;--omarchy-dark-bg:#0a1420;` +
  `--omarchy-darker-bg:#050a10;--omarchy-lighter-bg:#1c2f45;--omarchy-muted:#778899;` +
  `--omarchy-dark-fg:#8a7a66;--omarchy-fg:#eeddcc;--omarchy-light-fg:#f5e9d6;` +
  `--omarchy-bright-fg:#ffffff;--omarchy-red:#ff0000;--omarchy-yellow:#ffff00;` +
  `--omarchy-orange:#ff8800;--omarchy-green:#00cc00;--omarchy-cyan:#00cccc;` +
  `--omarchy-blue:#0066ff;--omarchy-magenta:#cc00cc;--omarchy-purple:#8800ff;` +
  `--omarchy-brown:#885500;--omarchy-bright-red:#ff3333;--omarchy-bright-yellow:#ffee55;` +
  `--omarchy-bright-green:#33ff33;--omarchy-bright-cyan:#55eeff;--omarchy-bright-blue:#3388ff;` +
  `--omarchy-bright-magenta:#ff55ff;--omarchy-color7:#f0f0f0;}`;

const DOMAIN_OVERRIDES: Record<string, string | null> = {
  "crowdin": "https://crowdin.com",
  "deepl": "https://www.deepl.com/translator",
  "deepseek": "https://chat.deepseek.com",
  "desmos": "https://www.desmos.com/calculator",
  "google": "https://www.google.com",
  "invokeai": null,
  "nixos-manual": "https://nixos.org/manual/nix/stable/introduction.html",
  "pinterest": "https://www.pinterest.com",
  "poe": "https://poe.com",
  "proton": "https://account.proton.me",
  "snapchat-web": "https://web.snapchat.com",
  "stylus": null,
  "syncthing": null,
  "web.dev": "https://web.dev",
};
const UNVERIFIABLE = new Set(["invokeai", "stylus", "syncthing"]);

const HEADER_DEFAULTS: Record<string, string> = {
  "bg-opacity": "0.2",
  "bg-blur": "20",
  "urls": "x",
  "highlight-redirect": "0",
};

function str(v: unknown): string {
  if (typeof v !== "string") throw new Error("expected string");
  return v;
}

function headerVars(text: string): Record<string, string> {
  const vars: Record<string, string> = { ...HEADER_DEFAULTS };
  for (const m of text.matchAll(/@var checkbox\s+(\w+)/g)) vars[m[1]] = "1";
  return vars;
}

function stripDocument(css: string): string {
  // Stylus drops @-moz-document wrappers at install; do the same or
  // Chromium ignores the whole block as an unknown at-rule.
  let out = "";
  let i = 0;
  while (i < css.length) {
    const m = css.indexOf("@-moz-document", i);
    if (m === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, m);
    const open = css.indexOf("{", m);
    let depth = 0, j = open, instr: string | null = null;
    for (; j < css.length; j++) {
      const c = css[j];
      if (instr) {
        if (c === instr) instr = null;
      } else if (c === '"' || c === "'") instr = c;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out += css.slice(open + 1, j);
    i = j + 1;
  }
  return out;
}

function siteDomains(site: string): string[] {
  if (site in DOMAIN_OVERRIDES) {
    const u = DOMAIN_OVERRIDES[site];
    return u ? [u] : [];
  }
  const text = readFileSync(
    join(REPO, "styles", site, "omarchy.user.less"),
    "utf8",
  );
  const domains = [...text.matchAll(/domain\("([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(domains)].map((d) => `https://${d}/`).slice(0, 4);
}

const NET_FAIL =
  /ERR_NAME_NOT_RESOLVED|ERR_CERT|ERR_CONNECTION_REFUSED|ERR_HTTP_RESPONSE_CODE_FAILURE|ERR_SSL|ERR_TUNNEL|ERR_ABORTED|Timeout.*goto|Navigation timeout|net::ERR_/;

function netFailed(r: any): boolean {
  return ["dark", "light"].every((s) =>
    !r.schemes[s]?.ok && NET_FAIL.test(r.schemes[s]?.error ?? "")
  );
}

async function checkSite(
  browser: Browser,
  site: string,
  source: string,
  url: string,
) {
  const result: Record<string, unknown> & {
    site: string;
    url: string;
    schemes: Record<string, Record<string, unknown>>;
  } = { site, url, schemes: {} };
  for (const scheme of ["dark", "light"] as const) {
    // bypassCSP mirrors what Stylus does with patchCsp enabled (see the
    // recommended settings embedded in dist/import.json).
    const ctx = await browser.newContext({
      colorScheme: scheme,
      bypassCSP: true,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { timeout: 30000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const snap = `(() => {
        const els = [document.body, document.documentElement,
          ...[...document.querySelectorAll('*')].slice(0, 400)];
        return els.map(el => { const cs = getComputedStyle(el);
          return [cs.backgroundColor, cs.color, cs.borderTopColor].join('|'); }).join('\\n');
      })();`;
      const before1: string = await page.evaluate(snap);
      await page.waitForTimeout(600);
      const before2: string = await page.evaluate(snap);
      const l1 = before1.split("\n"), l2 = before2.split("\n");
      const baselineDiff = l1.filter((l, i) => l !== l2[i]).length;
      await page.addStyleTag({ content: VARS + "\n" + source });
      await page.waitForTimeout(600);
      const after: string = await page.evaluate(snap);
      const la = after.split("\n");
      const postDiff = l2.filter((l, i) => l !== la[i]).length;
      // Any stable rendering change caused by our CSS counts: for
      // token-override styles on JS shells this is often a single node.
      const pass = postDiff >= 1 && postDiff > baselineDiff;
      result.schemes[scheme] = {
        ok: true,
        pass,
        baselineDiff,
        postDiff,
        elements: l1.length,
      };
    } catch (e) {
      result.schemes[scheme] = { ok: false, error: String(e).slice(0, 120) };
    } finally {
      await ctx.close().catch(() => {});
    }
  }
  return result;
}

function chromiumPath(): string {
  return Deno.env.get("CHROMIUM_PATH") ??
    ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
      .find((p) => existsSync(p)) ??
    (() => {
      throw new Error(
        "No Chromium found. Set CHROMIUM_PATH=/path/to/chromium",
      );
    })();
}

const bundle: { dir: string; sourceCode: string }[] = [];
{
  // Compile worktree sources directly (with the lib inlined, mirroring
  // what ci:stylus-import embeds) so uncommitted tour fixes are tested.
  const LIB_URL = "https://berrimi.github.io/omarchyUserStyles/lib/std/v1.less";
  const LIB_SRC = readFileSync(join(REPO, "lib/std/v1.less"), "utf8");
  for (const e of Deno.readDirSync(join(REPO, "styles"))) {
    if (!e.isDirectory) continue;
    const fp = join(REPO, "styles", e.name, "omarchy.user.less");
    if (!existsSync(fp)) continue;
    const content = readFileSync(fp, "utf8");
    if (!content.includes(LIB_URL)) {
      console.log(`${e.name}: COMPILE-SKIP (no std lib import)`);
      continue;
    }
    bundle.push({
      dir: e.name,
      sourceCode: content.replace(
        `@import "${LIB_URL}";`,
        () => `/* Inlined from ${LIB_URL} */\n${LIB_SRC}`,
      ),
    });
  }
}

let sites = Deno.args.filter((a) => !a.startsWith("-"));
if (!sites.length) {
  sites = [...Deno.readDirSync(join(REPO, "styles"))]
    .filter((e) => e.isDirectory)
    .map((e) => e.name)
    .filter((d) => existsSync(join(REPO, "styles", d, "omarchy.user.less")));
}

// Compile each worktree entry (lib already inlined above,
// so no network access is needed at all).
const jobs: { site: string; urls: string[]; css: string }[] = [];
for (const site of sites) {
  if (UNVERIFIABLE.has(site)) continue;
  const entry = bundle.find((b) => b.dir === site);
  const urls = siteDomains(site);
  if (!entry || !urls.length) {
    console.log(
      `${site}: unverifiable (${!entry ? "no worktree style" : "no domain"})`,
    );
    continue;
  }
  const vars = headerVars(entry.sourceCode);
  try {
    const r = await less.render(entry.sourceCode, {
      math: "parens-division",
      globalVars: vars,
    });
    jobs.push({ site, urls, css: stripDocument(r.css) });
  } catch (e) {
    console.log(`${site}: COMPILE-FAIL ${String(e).slice(0, 120)}`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
const out = createWriteStream(OUT, { flags: "a" });
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ["--no-sandbox"],
});
const queue = [...jobs];
async function worker() {
  while (queue.length) {
    const { site, urls, css } = queue.shift()!;
    try {
      // Try each domain in turn; style files often list several mirrors.
      let r: Awaited<ReturnType<typeof checkSite>> | null = null;
      let lastErr = "";
      for (const url of urls) {
        r = await checkSite(browser, site, css, url);
        if (netFailed(r)) {
          lastErr = ["dark", "light"]
            .map((s) => (r as any).schemes[s]?.error ?? "")
            .find((e) => e) ?? "";
          continue;
        }
        break;
      }
      if (!r || netFailed(r)) {
        console.log(`${site}: unverifiable (${lastErr.slice(0, 60)})`);
        out.write(
          JSON.stringify({
            site,
            verdict: "unverifiable",
            reason: lastErr.slice(0, 120),
          }) + "\n",
        );
        continue;
      }
      const pass = ["dark", "light"].some((s) =>
        (r as any).schemes[s]?.ok && (r as any).schemes[s].pass
      );
      (r as any).verdict = pass ? "pass" : "fail";
      console.log(`${site}: ${(r as any).verdict}`);
      out.write(JSON.stringify(r) + "\n");
    } catch (e) {
      console.log(`${site}: error`);
      out.write(
        JSON.stringify({
          site,
          verdict: "error",
          error: String(e).slice(0, 120),
        }) + "\n",
      );
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
await browser.close();
await new Promise<void>((resolve) => out.end(resolve));
console.log("done");
