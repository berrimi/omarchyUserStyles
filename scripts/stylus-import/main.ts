import usercssMeta from "usercss-meta";
import { ensureDir } from "@std/fs";
import * as path from "@std/path";
import { calcStyleDigest } from "https://github.com/openstyles/stylus/raw/8fe35a4b90d85fb911bd7aa1deab4e4733c31150/src/js/sections-util.js";
import { getUserstylesFiles } from "@/utils.ts";
import { REPO_ROOT } from "@/constants.ts";

// Recommended settings.
const settings = {
  settings: {
    updateInterval: 24,
    updateOnlyEnabled: true,
    patchCsp: true,
    "editor.linter": "",
  },
};

// Inline the shared library into each bundled style so installs never
// depend on the Pages host at import time. Repo sources keep the @import.
const LIB_URL = "https://berrimi.github.io/omarchyUserStyles/lib/std/v1.less";
const LIB_SRC = await Deno.readTextFile(
  path.join(REPO_ROOT, "lib/std/v1.less"),
);

const data: Record<string, unknown>[] = [settings];

for (const file of getUserstylesFiles()) {
  const content = await Deno.readTextFile(file);
  const { metadata } = usercssMeta.parse(content);

  if (!content.includes(LIB_URL)) {
    throw new Error(`${file}: expected std lib @import not found`);
  }
  const bundled =
    content.replace(`@import "${LIB_URL}";`, () => `/* Inlined from ${LIB_URL} */\n${LIB_SRC}`);

  const userstyle = {
    enabled: true,
    name: metadata.name,
    description: metadata.description,
    author: metadata.author,
    url: metadata.url,
    updateUrl: metadata.updateURL,
    usercssData: metadata,
    sourceCode: bundled,
  } as Record<string, unknown>;

  userstyle.originalDigest = await calcStyleDigest(userstyle);

  data.push(userstyle);
}

await ensureDir("dist");
await Deno.writeTextFile("dist/import.json", JSON.stringify(data));
