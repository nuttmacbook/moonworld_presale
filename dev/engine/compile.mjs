/*
 * ENGINE (same in every project, do not edit).
 *
 * Write contracts in dev/project/contracts instead of Remix:
 *
 *   npm run compile          compile dev/project/contracts → dev/generated/build/*.json + src/generated/contract_*.js
 *   npm run compile:watch    same, again on every save
 */

import fs from "node:fs";
import path from "node:path";
import { compileAll, SRC_DIR, ROOT } from "./compiler.mjs";

const run = () => {
    try {
        compileAll();
        return true;
    } catch (error) {
        console.error(error.isCompileError ? error.message : error);
        return false;
    }
};

if (!process.argv.includes("--watch")) {
    process.exit(run() ? 0 : 1);
}

run();
console.log(`\nWatching ${path.relative(ROOT, SRC_DIR)} for changes. Ctrl+C to stop.`);

// Editors save in bursts, so wait for the folder to settle before compiling again
let timer;
fs.watch(SRC_DIR, { recursive: true }, (_, file) => {
    if (!String(file ?? "").endsWith(".sol")) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
        console.log(`\n${new Date().toLocaleTimeString()}  ${file} changed`);
        run();
    }, 150);
});
