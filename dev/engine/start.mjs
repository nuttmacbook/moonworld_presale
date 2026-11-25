/*
 * ENGINE (same in every project, do not edit).
 *
 * One command for local testing (run from dev/):  npm run dev
 *
 *   1. starts a hardhat node (in memory; port from dev/settings/local.env)
 *   2. compiles every contract (also refreshes src/generated)
 *   3. deploys test tokens + everything in dev/settings/deploy.config.mjs (dev/engine/local-chain.mjs)
 *   4. adds sample data with dev/project/seed.mjs
 *   5. starts the website pointed at that node, with the test panel switched on
 *
 * Stopping it resets the chain. Options: --seed <n>, --port <n> (override local.env)
 */

import path from "node:path";
import { spawn } from "node:child_process";
import { ethers } from "ethers";
import { compileAll, ROOT, DEV_DIR } from "./compiler.mjs";
import { CHAIN_ID, devKey, localProvider, startNode, waitForNode } from "./node.mjs";
import { localSettings } from "./settings.mjs";
import { deployLocal, websiteEnv } from "./local-chain.mjs";
import * as project from "../project/seed.mjs";

const stop = (message) => {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
};

let local;
try {
    local = localSettings();
} catch (error) {
    stop(error.message);
}

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? Number(args[i + 1]) : Number(fallback);
};

const PORT = option("port", local.LOCAL_PORT);
const SEED = option("seed", local.LOCAL_SEED);

const children = [];
const shutdown = (code = 0) => {
    children.forEach((child) => child.kill());
    process.exit(code);
};
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

/* ------------------------------------ 1. node */

const node = startNode(PORT, path.join(DEV_DIR, "generated", "node.log"));
children.push(node.child);
node.child.on("exit", (code) => {
    console.error(`hardhat node stopped (code ${code}). See dev/generated/node.log.`);
    shutdown(1);
});
await waitForNode(node.url);

/* ------------------------------------ 2-4. build, deploy, sample data */

let deployed;
try {
    const { contracts, solcVersion } = compileAll({ quiet: true });
    const provider = localProvider(node.url);
    const owner = new ethers.Wallet(devKey(0), provider);

    deployed = await deployLocal({ provider, owner, contracts });
    console.log(`Compiled with solc ${solcVersion} and deployed.`);

    if (project.seed && SEED > 0) {
        await project.seed({ provider, deployed, count: SEED, onProgress: (i) => {
            if (i % 10 === 0 || i === SEED) process.stdout.write(`\rSample data ${i}/${SEED}`);
        } });
        process.stdout.write("\n");
    }

    console.log([
        "",
        `Local chain ready at ${node.url} (chain id ${CHAIN_ID})`,
        ...Object.entries(deployed.addresses).map(([ key, address ]) => `  ${key.padEnd(26)} ${address}`),
        ...Object.entries(deployed.tokens).map(([ symbol, t ]) => `  ${`test ${symbol}`.padEnd(26)} ${t.address}`),
        ...(project.summary ? await project.summary(deployed) : []),
        `  ${"Owner".padEnd(26)} ${owner.address}`,
        "",
        `Your own wallet: add network ${node.url} with chain id ${CHAIN_ID}, then fund it from the test panel.`,
        "",
    ].join("\n"));
} catch (error) {
    console.error(error.isCompileError ? error.message : error);
    shutdown(1);
}

/* ------------------------------------ 5. website */

// Vite gives process env priority over settings/.env, so these only exist while testing
const app = spawn(path.join(ROOT, "node_modules/.bin/vite"), [], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
        ...process.env,
        ...websiteEnv(deployed),
        VITE_CHAIN: "local",
        VITE_RPC_URL: node.url,
        VITE_CHAIN_ID: String(CHAIN_ID),
        // Public hardhat test key; pays gas and test tokens for the test panel
        VITE_DEV_FUNDER_KEY: devKey(1),
        VITE_DEV_FUND_GAS: local.LOCAL_FUND_GAS,
        VITE_DEV_FUND_AMOUNT: local.LOCAL_FUND_AMOUNT,
        VITE_RPC_LATENCY: local.LOCAL_RPC_LATENCY,
    },
});
children.push(app);
app.on("exit", (code) => shutdown(code ?? 0));
