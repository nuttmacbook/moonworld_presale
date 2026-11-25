/*
 * YOUR CODE (off-chain check). Finds English UI texts that have no Thai translation, Thai keys nobody uses,
 * and {placeholders} that differ between English and Thai. Run: node project/scripts/check-lang.mjs (in dev/)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TH } from "../../../src/project/lang/th.js";

const UI = new URL("../../../src/project/ui/", import.meta.url).pathname;
const files = (dir) => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".js") ? [ path ] : [];
});

// t("...") calls, plus text lists written as [ "id", "Text" ] / [ "Title", "Text", {...} ]
const texts = new Set();
for (const file of files(UI)) {
    const code = readFileSync(file, "utf8");
    for (const m of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) texts.add(m[1]);
    for (const m of code.matchAll(/\[\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g)) { texts.add(m[1]); texts.add(m[2]); }
}
const words = (s) => [ ...s.matchAll(/\{(\w+)\}/g) ].map((m) => m[1]).sort().join(",");
const isText = (s) => /[A-Za-z]/.test(s) && /\s|[A-Z]/.test(s);

const missing = [ ...texts ].filter((s) => isText(s) && !(s in TH));
const unused = Object.keys(TH).filter((k) => !texts.has(k));
const badVars = Object.entries(TH).filter(([ en, th ]) => words(en) !== words(th)).map(([ en ]) => en);

console.log(`Texts found: ${texts.size} · Thai keys: ${Object.keys(TH).length}`);
console.log(`Missing Thai (${missing.length}):`, missing);
console.log(`Thai keys not used (${unused.length}):`, unused);
console.log(`Placeholder mismatch (${badVars.length}):`, badVars);
process.exitCode = badVars.length ? 1 : 0;
