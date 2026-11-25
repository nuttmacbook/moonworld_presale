/*
 * ENGINE (same in every project, do not edit).
 *
 * Source verification for BscScan (or any Etherscan-style explorer). Run from dev/ after a live deploy:
 *
 *   npm run verify                 checks every recorded contract and writes the files to upload by hand
 *   npm run verify -- --submit     also sends them through the Etherscan API (needs ETHERSCAN_API_KEY)
 *
 * For each contract in dev/generated/deployments/<network>.json it:
 *   1. compiles the contract again with the deploy settings, as "Standard JSON input"
 *   2. checks that the result is byte-for-byte the code on chain (so the upload will be accepted)
 *   3. reads the constructor arguments from the deploy transaction
 *   4. writes dev/generated/verify/<network>/<key>.json and prints what to enter on the explorer
 *
 * Settings (no defaults in this file):
 *   dev/settings/deploy.env     DEPLOY_RPC_URL (same chain as the deploy), ETHERSCAN_API_KEY (only for --submit)
 *   dev/settings/networks.json  explorer and verify API of each chain
 */

import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ethers } from "ethers";
import { sourcePath, listSources, SETTINGS, DEV_DIR, GENERATED_DIR } from "./compiler.mjs";
import { deploySettings, networkFor } from "./settings.mjs";
import { normalizeSteps } from "./deploy-steps.mjs";
import config from "../settings/deploy.config.mjs";

const SUBMIT = process.argv.includes("--submit");

const fail = (message) => {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
};

let deployEnv;
try {
    deployEnv = deploySettings(SUBMIT ? [ "DEPLOY_RPC_URL", "ETHERSCAN_API_KEY" ] : [ "DEPLOY_RPC_URL" ]);
} catch (error) {
    fail(error.message);
}

const RPC_URL = deployEnv.DEPLOY_RPC_URL;
const API_KEY = deployEnv.ETHERSCAN_API_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { cacheTimeout: -1 });
const chainId = Number((await provider.getNetwork().catch(() => fail(`Cannot reach ${RPC_URL}.`))).chainId);
let network;
try {
    network = networkFor(chainId);
} catch (error) {
    fail(error.message);
}
const networkName = network.name;
const explorer = network.explorer || "the block explorer";
const API = network.verifyApi;
if (SUBMIT && !API) fail(`No verifyApi for chain ${chainId} in dev/settings/networks.json.`);

const recordFile = path.join(GENERATED_DIR, "deployments", `${networkName}.json`);
if (!fs.existsSync(recordFile)) fail(`Nothing deployed on ${networkName} yet (${path.relative(DEV_DIR, recordFile)} is missing).`);
const record = JSON.parse(fs.readFileSync(recordFile, "utf8"));

const outDir = path.join(GENERATED_DIR, "verify", networkName);
fs.mkdirSync(outDir, { recursive: true });

// Full version string the explorer asks for, e.g. v0.8.37+commit.f401782d
const compilerVersion = `v${solc.version().replace(/\.Emscripten.*$/, "")}`;

/* ------------------------------------ build the Standard JSON input for one contract */

const sourceFile = (source) => fs.readFileSync(sourcePath(source), "utf8");

// Compiles every source once to learn which files each contract really uses (from its metadata)
const compile = (sources) => JSON.parse(solc.compile(JSON.stringify({
    language: "Solidity",
    sources,
    settings: { ...SETTINGS, outputSelection: { "*": { "*": [ "metadata", "evm.bytecode.object", "evm.deployedBytecode.object" ] } } },
})));

const full = compile(Object.fromEntries(listSources().map((file) => [ file, { content: sourceFile(file) } ])));
const errors = (full.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) fail(errors.map((e) => e.formattedMessage).join("\n"));

const findContract = (name) => {
    for (const [ source, byName ] of Object.entries(full.contracts ?? {})) {
        if (byName[name]) return { source, ...byName[name] };
    }
    return null;
};

/** The upload: only the files this contract is built from, with the exact settings of the deploy */
const standardJson = (found) => {
    const used = Object.keys(JSON.parse(found.metadata).sources);
    return {
        language: "Solidity",
        sources: Object.fromEntries(used.map((file) => [ file, { content: sourceFile(file) } ])),
        settings: { optimizer: SETTINGS.optimizer, evmVersion: SETTINGS.evmVersion, outputSelection: { "*": { "*": [ "abi", "evm.bytecode", "evm.deployedBytecode", "metadata" ] } } },
    };
};

/* ------------------------------------ explorer API (only with --submit) */

const api = async (params, method = "GET") => {
    const query = new URLSearchParams({ chainid: String(chainId), apikey: API_KEY, ...(method === "GET" ? params : {}) });
    const res = await fetch(`${API}?${query}`, method === "POST"
        ? { method, headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) }
        : {});
    return res.json();
};

const waitFor = async (action, guid) => {
    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const out = await api({ module: "contract", action, guid });
        if (!/pending|queue/i.test(String(out.result))) return out;
    }
    return { status: "0", result: "Still pending after 100 s; check the explorer." };
};

/* ------------------------------------ each recorded contract */

const steps = normalizeSteps(config);
let problems = 0;

for (const step of steps) {
    const entry = record.contracts?.[step.key];
    if (!entry?.address) continue;

    const found = findContract(step.contract);
    if (!found) fail(`No contract named ${step.contract} in dev/project/contracts.`);

    const onChain = (await provider.getCode(entry.address)).slice(2);
    const matches = onChain.toLowerCase() === found.evm.deployedBytecode.object.toLowerCase();

    // Constructor arguments = what the deploy transaction sent after the creation code
    const tx = await provider.getTransaction(entry.deployTx);
    const creation = found.evm.bytecode.object.toLowerCase();
    const input = (tx?.data ?? "0x").slice(2).toLowerCase();
    const args = input.startsWith(creation) ? input.slice(creation.length) : null;

    const input_ = standardJson(found);
    const file = path.join(outDir, `${step.key}.json`);
    fs.writeFileSync(file, JSON.stringify(input_, null, 4) + "\n");

    const name = `${found.source}:${step.contract}`;
    console.log([
        "",
        `${step.key}  ${entry.address}`,
        `  code on chain     ${matches ? "matches this source" : "DOES NOT MATCH this source (changed since the deploy?)"}`,
        `  upload            ${path.relative(DEV_DIR, file)}`,
        `  compiler type     Solidity (Standard-Json-Input)`,
        `  compiler version  ${compilerVersion}`,
        `  license           MIT`,
        `  contract name     ${name}`,
        `  constructor args  ${args === null ? "could not read from the deploy transaction" : args || "(none)"}`,
        ...(step.implementation ? [ `  proxy             after it verifies: More Options → "Is this a proxy?" → Verify` ] : []),
    ].join("\n"));

    if (!matches || args === null) {
        problems += 1;
        continue;
    }
    if (!SUBMIT) continue;

    const sent = await api({
        module: "contract",
        action: "verifysourcecode",
        codeformat: "solidity-standard-json-input",
        sourceCode: JSON.stringify(input_),
        contractaddress: entry.address,
        contractname: name,
        compilerversion: compilerVersion,
        constructorArguements: args,
        licenseType: "3",
    }, "POST");
    const done = sent.status === "1" ? await waitFor("checkverifystatus", sent.result) : sent;
    console.log(`  submitted         ${done.result}`);

    if (step.implementation) {
        const proxySent = await api({ module: "contract", action: "verifyproxycontract", address: entry.address }, "POST");
        const proxyDone = proxySent.status === "1" ? await waitFor("checkproxyverification", proxySent.result) : proxySent;
        console.log(`  proxy link        ${proxyDone.result}`);
    }
}

console.log([
    "",
    problems ? `${problems} contract(s) cannot be verified as they are; see above.` : `All recorded contracts match their source.`,
    SUBMIT ? "" : `By hand: ${explorer}/verifyContract → paste the address → the values above → upload the .json file.`,
    "Verify the Implementation first, then the proxy (its constructor args include the implementation address).",
    "",
].join("\n"));
process.exit(problems ? 1 : 0);
