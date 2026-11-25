/*
 * ENGINE (same in every project, do not edit).
 *
 * npm test: runs every dev/project/test/*.test.mjs against real contracts on a fresh local chain.
 *   - the chain is set up once, exactly like npm run dev (dev/engine/local-chain.mjs)
 *   - every test file starts from that same clean state (the chain is rewound between files)
 *   - one file per contract or feature keeps 3-4 contracts easy to follow
 *
 *   npm test                        all files
 *   npm test -- --only MyLogic      files whose name contains "MyLogic"
 *   npm test -- --count 300         passed to the files as t.args.count
 *
 * A test file:
 *   export default async function (t) {
 *       const logic = t.deployed.at("MyLogic");
 *       t.check("what it proves", condition, "optional detail");
 *       t.gas("deposit", receipt);
 *   }
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ethers } from "ethers";
import { compileAll, DEV_DIR } from "./compiler.mjs";
import { devKey, localProvider, startNode, waitForNode, setBalance } from "./node.mjs";
import { localSettings } from "./settings.mjs";
import { deployLocal } from "./local-chain.mjs";

const TEST_DIR = path.join(DEV_DIR, "project", "test");

const argv = process.argv.slice(2);
const argOf = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
};

const local = localSettings();
const node = startNode(Number(local.TEST_PORT));
const finish = (code) => {
    node.child.kill();
    process.exit(code);
};

const results = [];
const gasUsed = {};

try {
    await waitForNode(node.url);
    const provider = localProvider(node.url);
    const owner = new ethers.Wallet(devKey(0), provider);
    const stranger = new ethers.Wallet(devKey(2), provider);
    const { contracts, solcVersion } = compileAll({ write: false, quiet: true });
    const deployed = await deployLocal({ provider, owner, contracts });

    const files = (fs.existsSync(TEST_DIR) ? fs.readdirSync(TEST_DIR) : [])
        .filter((f) => f.endsWith(".test.mjs") && (!argOf("only") || f.includes(argOf("only"))))
        .sort();
    console.log(`solc ${solcVersion}, ${Object.keys(deployed.addresses).length} contracts, ${Object.keys(deployed.tokens).length} test tokens, ${files.length} test files\n`);

    let snapshot = await provider.send("evm_snapshot", []);

    for (const file of files) {
        // Every file starts from the freshly deployed state
        await provider.send("evm_revert", [ snapshot ]);
        snapshot = await provider.send("evm_snapshot", []);

        const label = file.replace(/\.test\.mjs$/, "");
        console.log(`── ${label}`);

        const t = {
            provider,
            owner,
            stranger,
            contracts,
            deployed,
            settings: deployed.settings,
            local,
            args: { count: argOf("count") ? Number(argOf("count")) : Number(local.TEST_PEOPLE) },

            /** Records one check; prints PASS or FAIL */
            check: (name, pass, detail = "") => {
                results.push({ file: label, name, pass: Boolean(pass) });
                console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
            },

            /** True when the call fails, and (if given) with this message */
            doesRevert: async (call, message = null) => {
                try {
                    await call();
                    return false;
                } catch (error) {
                    const text = `${error?.reason ?? ""} ${error?.shortMessage ?? ""} ${error?.message ?? ""}`;
                    return message ? text.includes(message) : true;
                }
            },

            /** Adds a receipt's gas to the report under `name` */
            gas: (name, receipt) => {
                (gasUsed[name] ??= []).push(Number(receipt?.gasUsed ?? 0));
            },

            /** A new random wallet with BNB for gas */
            newWallet: async (bnb = 1) => {
                const wallet = ethers.Wallet.createRandom().connect(provider);
                await setBalance(provider, wallet.address, bnb);
                return wallet;
            },
        };

        try {
            const mod = await import(pathToFileURL(path.join(TEST_DIR, file)).href);
            await mod.default(t);
        } catch (error) {
            t.check(`${label} ran to the end`, false, error?.shortMessage ?? error?.message ?? String(error));
        }
        console.log("");
    }

    const names = Object.keys(gasUsed);
    if (names.length) {
        console.log("Gas");
        for (const name of names) {
            const list = [ ...gasUsed[name] ].sort((a, b) => a - b);
            console.log(`  ${name.padEnd(24)} median ${list[Math.floor(list.length / 2)].toLocaleString().padStart(9)}  max ${list.at(-1).toLocaleString().padStart(9)}  (${list.length} tx)`);
        }
        console.log("");
    }

    const failed = results.filter((r) => !r.pass);
    failed.forEach((r) => console.log(`FAILED  ${r.file}: ${r.name}`));
    console.log(`${results.length - failed.length}/${results.length} checks passed`);
    finish(failed.length ? 1 : 0);
} catch (error) {
    console.error(error);
    finish(1);
}
