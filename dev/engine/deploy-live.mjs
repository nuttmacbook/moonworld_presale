/*
 * ENGINE (same in every project, do not edit).
 *
 * Deploy everything in dev/settings/deploy.config.mjs to the chain in dev/settings/deploy.env. Run from dev/:
 *
 *   npm run deploy:live                              check everything and estimate cost; sends nothing
 *   npm run deploy:live -- --send                    deploy what is not on this network yet (asks for the chain id)
 *   npm run deploy:live -- --upgrade <key>           plan an upgrade of the proxy <key>: new logic + upgradeTo
 *   npm run deploy:live -- --upgrade <key> --send    do it
 *   npm run deploy:live -- --send --redeploy <key>   deploy <key> again even though it is recorded (not for proxies in use)
 *
 * Entries already recorded for this network are skipped, so a run that stopped half way can simply be run again.
 *
 * Settings (no defaults in this file):
 *   dev/settings/deploy.env     DEPLOYER_PRIVATE_KEY, DEPLOY_RPC_URL, DEPLOY_OWNER (empty = the deployer); secret, git-ignored
 *   dev/settings/contracts/*.env  values each contract is set up with (ctx.settings.<Contract> in deploy.config.mjs)
 *   dev/settings/networks.json  chain id → network name used in the records
 *
 * Writes, after every step:
 *   dev/generated/deployments/<network>.json    full record (transactions, compiler settings, read-back state, upgrades)
 *   src/generated/addresses.json                network → key → address, read by the app with addressOf(key)
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { ethers } from "ethers";
import { compileAll, sourcePath, SETTINGS, DEV_DIR, ROOT, GENERATED_DIR } from "./compiler.mjs";
import { deploySettings, allContractSettings, networkFor } from "./settings.mjs";
import { normalizeSteps, requiredCodeOf } from "./deploy-steps.mjs";
import config from "../settings/deploy.config.mjs";

const ADDRESS_BOOK = path.join(ROOT, "src", "generated", "addresses.json");
const RECORD_DIR = path.join(GENERATED_DIR, "deployments");
const SETUP_GAS = 400_000n;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valuesOf = (flag) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [ args[i + 1] ] : []));
const SEND = has("--send");
const REDEPLOY = new Set(valuesOf("--redeploy"));
const UPGRADE = valuesOf("--upgrade")[0] ?? null;

const fail = (message) => {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
};
const readJson = (file, fallback) => {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};
const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 4) + "\n");
};
const same = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

let deployEnv;
let contractEnv;
try {
    deployEnv = deploySettings();
    contractEnv = allContractSettings();
} catch (error) {
    fail(error.message);
}

const RPC_URL = deployEnv.DEPLOY_RPC_URL;
const KEY = deployEnv.DEPLOYER_PRIVATE_KEY;
if (!/^0x[0-9a-fA-F]{64}$/.test(KEY ?? "")) fail("Set DEPLOYER_PRIVATE_KEY in dev/settings/deploy.env to a 0x-prefixed private key.");

/* ------------------------------------ 1. build and placeholder check */

const { contracts, solcVersion } = compileAll({ quiet: true });
const steps = normalizeSteps(config);

for (const step of steps) {
    if (!contracts[step.contract]?.bytecode) fail(`No deployable contract named ${step.contract} (entry ${step.key}).`);
    if (!contracts[step.abi]) fail(`No contract named ${step.abi} for the ABI of ${step.key}.`);
    if (step.implementation && !steps.some((s) => s.key === step.implementation)) fail(`${step.key} points at ${step.implementation}, which is not in the config.`);
}

// Constants written as address(uint160(0x...)) are placeholders by convention and must be replaced first
const sources = [ ...new Set(steps.flatMap((step) => [ contracts[step.contract].source, contracts[step.abi].source ])) ];
const placeholders = sources.flatMap((source) => fs.readFileSync(sourcePath(source), "utf8").split("\n")
    .map((line, i) => ({ source, line: i + 1, text: line.trim() }))
    .filter(({ text }) => /address\(uint160\(0x[0-9a-fA-F]+\)\)/.test(text) && !text.startsWith("//")));

if (placeholders.length && !has("--allow-placeholders")) {
    fail([
        "Placeholder addresses are still in the source. Replace them with real ones, then run again:",
        ...placeholders.map(({ source, line, text }) => `    ${source}:${line}  ${text}`),
    ].join("\n"));
}

/* ------------------------------------ 2. chain state */

// No request cache: each transaction must see the previous one's nonce straight away
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { cacheTimeout: -1 });
const network = await provider.getNetwork().catch(() => fail(`Cannot reach ${RPC_URL}.`));
const chainId = Number(network.chainId);
let networkName;
try {
    networkName = networkFor(chainId).name;
} catch (error) {
    fail(error.message);
}

const wallet = new ethers.Wallet(KEY, provider);
const deployer = new ethers.NonceManager(wallet);
deployer.address = wallet.address;
const owner = deployEnv.DEPLOY_OWNER ? ethers.getAddress(deployEnv.DEPLOY_OWNER) : deployer.address;

const requiredCode = requiredCodeOf(config, contractEnv);
for (const [ name, address ] of Object.entries(requiredCode ?? {})) {
    if ((await provider.getCode(address)) === "0x") fail(`${name} has no contract at ${address} on chain ${chainId}.`);
}

const recordFile = path.join(RECORD_DIR, `${networkName}.json`);
const record = readJson(recordFile, { network: networkName, chainId, contracts: {} });

// A recorded address only counts if code is still there (a reset test chain forgets everything)
const addresses = {};
for (const [ key, entry ] of Object.entries(record.contracts)) {
    if (entry?.address && (await provider.getCode(entry.address)) !== "0x") addresses[key] = entry.address;
}

const ctx = {
    owner,
    deployer: deployer.address,
    addresses,
    settings: contractEnv,
    encode: (name, fn, values) => new ethers.Interface(contracts[name].abi).encodeFunctionData(fn, values),
    at: (name, address) => new ethers.Contract(address, contracts[name].abi, deployer),
};

// The chain is the truth for what a proxy runs: pick up upgrades sent from another wallet since the last run
let synced = false;
for (const step of steps.filter((s) => s.implementation && addresses[s.key])) {
    const current = await ctx.at("BaseProxyUsed", addresses[step.key]).implementation();
    if (!same(current, addresses[step.implementation])) {
        console.log(`Note         ${step.key} now runs ${current} (was ${addresses[step.implementation] ?? "unknown"}); record updated`);
        addresses[step.implementation] = current;
        const { pending: _, ...entry } = record.contracts[step.implementation] ?? {};
        record.contracts[step.implementation] = { ...entry, address: current };
        synced = true;
    }
}

const saveAll = () => {
    record.compiler = { solc: solcVersion, settings: SETTINGS };
    writeJson(recordFile, record);
    const book = readJson(ADDRESS_BOOK, {});
    book[networkName] = { chainId, contracts: { ...(book[networkName]?.contracts ?? {}), ...addresses } };
    writeJson(ADDRESS_BOOK, book);
};

const header = (lines, cost) => {
    console.log([
        "",
        `Network      ${networkName} (chain id ${chainId}) via ${RPC_URL}`,
        `Compiler     solc ${solcVersion}, optimizer ${SETTINGS.optimizer.runs} runs, ${SETTINGS.evmVersion}`,
        `Deployer     ${deployer.address}  balance ${ethers.formatEther(balance)}`,
        `Owner        ${owner} (also proxy admin)`,
        ...lines,
        `Cost         ~${ethers.formatEther(cost)} (native coin) at ${ethers.formatUnits(gasPrice, "gwei")} gwei (steps marked "after earlier steps" are not included)`,
        placeholders.length ? `Placeholders ${placeholders.length} still in the source (--allow-placeholders)` : "Placeholders none",
        "",
    ].join("\n"));
};

const confirm = async () => {
    if (has("--yes")) return;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Type the chain id (${chainId}) to send for real: `);
    rl.close();
    if (answer.trim() !== String(chainId)) fail("Not confirmed. Nothing was sent.");
};

const estimateDeploy = async (step) => {
    try {
        const factory = new ethers.ContractFactory(contracts[step.contract].abi, contracts[step.contract].bytecode, deployer);
        const tx = await factory.getDeployTransaction(...((await step.args?.(ctx)) ?? []));
        return await provider.estimateGas({ ...tx, from: deployer.address });
    } catch {
        return null;
    }
};

/** Deploys one entry, runs setup, reads it back and verifies it, then saves */
async function deployStep(step) {
    const factory = new ethers.ContractFactory(contracts[step.contract].abi, contracts[step.contract].bytecode, deployer);
    const deployed = await factory.deploy(...((await step.args?.(ctx)) ?? []));
    console.log(`\n${step.key}: deploying ${step.contract}… tx ${deployed.deploymentTransaction().hash}`);
    await deployed.waitForDeployment();
    const address = await deployed.getAddress();
    console.log(`${step.key}: deployed at ${address}`);
    addresses[step.key] = address;

    const contract = new ethers.Contract(address, contracts[step.abi].abi, deployer);
    let block = (await deployed.deploymentTransaction().wait()).blockNumber;
    let setupTx = null;
    const tx = step.setup ? await step.setup(contract, ctx) : null;
    if (tx) {
        console.log(`${step.key}: setup… tx ${tx.hash}`);
        block = (await tx.wait()).blockNumber;
        setupTx = tx.hash;
    }

    const state = step.readBack ? await step.readBack(contract, ctx) : {};
    const verdict = step.verify ? step.verify(state, ctx) : true;

    record.contracts[step.key] = {
        address,
        contract: step.contract,
        source: contracts[step.contract].source,
        deployer: deployer.address,
        deployTx: deployed.deploymentTransaction().hash,
        setupTx,
        block,
        deployedAt: new Date().toISOString(),
        state,
    };
    // Saved after each step, so a later failure never loses what is already on chain
    saveAll();
    if (verdict !== true) fail(`${step.key} at ${address}: ${verdict}`);
}

const fee = await provider.getFeeData();
const gasPrice = fee.gasPrice ?? 0n;
const balance = await provider.getBalance(deployer.address);

/* ------------------------------------ 3a. upgrade a proxy */

if (UPGRADE) {
    const proxyStep = steps.find((s) => s.key === UPGRADE);
    if (!proxyStep?.implementation) fail(`${UPGRADE} is not a proxy in dev/settings/deploy.config.mjs (it needs an "implementation").`);
    if (!addresses[UPGRADE]) fail(`${UPGRADE} is not deployed on ${networkName} yet. Deploy it first with --send.`);
    const logicStep = steps.find((s) => s.key === proxyStep.implementation);
    const proxy = ctx.at("BaseProxyUsed", addresses[UPGRADE]);
    const admin = await proxy.admin();
    const isAdmin = same(admin, deployer.address);

    const gas = await estimateDeploy(logicStep);
    header([
        `Upgrade      ${UPGRADE} at ${addresses[UPGRADE]}`,
        `  current    ${addresses[logicStep.key]}`,
        `  new logic  ${logicStep.contract}, ${contracts[logicStep.contract].deployedBytecode.length / 2} bytes, deploy ~${gas?.toLocaleString() ?? "?"}`,
        `  upgradeTo  ${isAdmin ? "sent by the deployer (it is the admin)" : `must be sent by the admin ${admin}; the call is printed after the deploy`}`,
    ], ((gas ?? 0n) + (isAdmin ? 100_000n : 0n)) * gasPrice);

    if (!SEND) {
        console.log("Checks passed. Nothing was sent. Run again with --send to upgrade.\n");
        process.exit(0);
    }
    await confirm();

    const previous = addresses[logicStep.key];
    const history = record.contracts[logicStep.key]?.history ?? [];
    await deployStep(logicStep);
    const next = addresses[logicStep.key];
    record.contracts[logicStep.key].history = [ ...history, ...(previous ? [ { address: previous, replacedAt: new Date().toISOString() } ] : []) ];

    if (!isAdmin) {
        // Keep the app's book on what the proxy really runs until the admin sends the upgrade
        addresses[logicStep.key] = previous;
        record.contracts[logicStep.key] = { ...record.contracts[logicStep.key], address: previous, pending: next };
        saveAll();
        console.log([
            "",
            `New logic is at ${next}, but the proxy still runs ${previous}.`,
            `Send this from the admin wallet ${admin} (wallet app, hardware wallet or BscScan → Write Contract on the proxy):`,
            `  to    ${addresses[UPGRADE]}`,
            `  call  upgradeTo(${next})`,
            `  data  ${proxy.interface.encodeFunctionData("upgradeTo", [ next ])}`,
            "Then run npm run deploy:live once more; it picks up the upgrade and updates the record.",
            "",
        ].join("\n"));
        process.exit(0);
    }

    const tx = await proxy.upgradeTo(next);
    console.log(`${UPGRADE}: upgradeTo… tx ${tx.hash}`);
    await tx.wait();
    const contract = new ethers.Contract(addresses[UPGRADE], contracts[proxyStep.abi].abi, deployer);
    const state = proxyStep.readBack ? await proxyStep.readBack(contract, ctx) : {};
    const verdict = proxyStep.verify ? proxyStep.verify(state, ctx) : true;
    record.contracts[UPGRADE].state = state;
    record.contracts[UPGRADE].upgrades = [ ...(record.contracts[UPGRADE].upgrades ?? []), { implementation: next, tx: tx.hash, at: new Date().toISOString() } ];
    saveAll();
    if (verdict !== true) fail(`${UPGRADE} after upgrade: ${verdict}`);
    console.log(`\n${UPGRADE} now runs ${next}. Saved ${path.relative(DEV_DIR, recordFile)} and addresses.json.\n`);
    process.exit(0);
}

/* ------------------------------------ 3b. deploy what is missing */

const pending = steps.filter((step) => REDEPLOY.has(step.key) || !addresses[step.key]);
let estimate = 0n;
const plan = [];
for (const step of pending) {
    const gas = await estimateDeploy(step);
    if (gas) estimate += gas + (step.setup ? SETUP_GAS : 0n);
    plan.push(`  ${step.key.padEnd(26)} ${step.contract}, ${contracts[step.contract].deployedBytecode.length / 2} bytes, deploy ~${gas ? gas.toLocaleString() : "after earlier steps"}${step.setup ? ", + setup" : ""}`);
}

header([
    ...Object.entries(addresses).filter(([ key ]) => !REDEPLOY.has(key)).map(([ key, address ]) => `Already      ${key.padEnd(26)} ${address} (skipped)`),
    pending.length ? "To deploy" : "To deploy    nothing, everything is already on this network",
    ...plan,
], estimate * gasPrice);

if (synced) saveAll();
if (!pending.length) process.exit(0);
if (balance < estimate * gasPrice) fail("The deployer cannot pay for this deployment.");
if (!SEND) {
    console.log("Checks passed. Nothing was sent. Run again with --send to deploy.\n");
    process.exit(0);
}
await confirm();

for (const step of pending) await deployStep(step);

console.log([
    "",
    `Saved ${path.relative(DEV_DIR, recordFile)} and src/generated/addresses.json (${networkName}):`,
    ...Object.entries(addresses).map(([ key, address ]) => `  ${key.padEnd(26)} ${address}`),
    "",
    `Set VITE_CHAIN=${networkName} in settings/.env and build the website; it reads these addresses itself.`,
    "",
].join("\n"));
