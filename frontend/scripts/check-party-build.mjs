// Bundles the PartyKit entrypoint exactly as a deploy would, so a server-only
// break fails CI instead of surfacing when someone runs `partykit deploy`.
// There is no `partykit build` subcommand to lean on.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { main } = JSON.parse(readFileSync("partykit.json", "utf8"));

const result = await build({
  entryPoints: [main],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2022",
  metafile: true,
  logLevel: "warning",
});

const [output] = Object.values(result.metafile.outputs);
const modules = Object.keys(output.inputs);
const bytes = result.outputFiles[0].contents.length;

console.log(`PartyKit bundle OK: ${modules.length} modules, ${bytes} bytes`);

// Guard against the duplicate-wordlist regression: the server once imported
// both lib/wordlist.js and lib/wordlist.ts, shipping the same data twice and
// making up 80% of the bundle.
const duplicated = ["wordlist", "syllables"].filter(
  (name) => modules.filter((m) => m.includes(name)).length > 1
);
if (duplicated.length > 0) {
  console.error(`Duplicate modules bundled: ${duplicated.join(", ")}`);
  process.exit(1);
}
