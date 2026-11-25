/*
 * ENGINE (same in every project, do not edit).
 *
 * Solidity build: compiles every .sol in dev/project/contracts (yours) and dev/engine/contracts (BaseProxyUsed)
 * with the pinned solc, writes dev/generated/build/<Name>.json, and writes the frontend ABI files listed in
 * dev/settings/exports.json into src/generated/.
 * Used by `npm run compile`, the local chain, the live deploy and the tests, so they all run the same build.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEV_DIR = path.resolve(ENGINE_DIR, "..");
const ROOT = path.resolve(DEV_DIR, "..");
const SETTINGS_DIR = path.join(DEV_DIR, "settings");
const GENERATED_DIR = path.join(DEV_DIR, "generated");

// Your contracts; source keys are relative to this folder ("MyLogic.sol", "mocks/MockToken.sol")
const SRC_DIR = path.join(DEV_DIR, "project", "contracts");
// Engine contracts (BaseProxyUsed); source keys start with "engine/"
const ENGINE_SRC_DIR = path.join(ENGINE_DIR, "contracts");
const ENGINE_PREFIX = "engine/";

const BUILD_DIR = path.join(GENERATED_DIR, "build");
const EXPORTS_FILE = path.join(SETTINGS_DIR, "exports.json");
const ENGINE_ADDRESSES = path.join(ROOT, "src", "engine", "chain", "addresses.js");

// Same settings as the deploy; change here and every script follows
const SETTINGS = {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": [ "abi", "evm.bytecode.object", "evm.deployedBytecode.object" ] } },
};

const SIZE_LIMIT = 24_576;

/** Every .sol file under one folder, as source keys relative to it (with an optional prefix) */
const listDir = (base, prefix = "", dir = base) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listDir(base, prefix, full);
    return entry.name.endsWith(".sol") ? [ prefix + path.relative(base, full).split(path.sep).join("/") ] : [];
});

/** Every source key: your contracts, then the engine's */
const listSources = () => [ ...listDir(SRC_DIR), ...listDir(ENGINE_SRC_DIR, ENGINE_PREFIX) ];

/** File on disk for a source key */
const sourcePath = (key) => (key.startsWith(ENGINE_PREFIX)
    ? path.join(ENGINE_SRC_DIR, key.slice(ENGINE_PREFIX.length))
    : path.join(SRC_DIR, key));

/** Resolves imports from the contract folders first, then node_modules (e.g. a library installed in dev/) */
const findImports = (importPath) => {
    const candidates = [
        sourcePath(importPath),
        path.join(DEV_DIR, "node_modules", importPath),
        path.join(ROOT, "node_modules", importPath),
    ];
    const found = candidates.find((file) => fs.existsSync(file));
    return found ? { contents: fs.readFileSync(found, "utf8") } : { error: `File not found: ${importPath}` };
};

/**
 * Compiles every contract (yours and the engine's).
 *
 * @param {object} options
 * @param {boolean} options.write    write build/*.json and the frontend ABI files
 * @param {boolean} options.quiet    skip the summary table
 * @returns {{ solcVersion: string, contracts: Record<string, { abi: any[], bytecode: string, deployedBytecode: string, source: string }> }}
 */
function compileAll({ write = true, quiet = false } = {}) {
    const files = listSources();
    if (!files.length) throw new Error(`No .sol files in ${path.relative(ROOT, SRC_DIR)}`);

    const input = {
        language: "Solidity",
        sources: Object.fromEntries(files.map((file) => [ file, { content: fs.readFileSync(sourcePath(file), "utf8") } ])),
        settings: SETTINGS,
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    const messages = output.errors ?? [];
    const errors = messages.filter((m) => m.severity === "error");
    const warnings = messages.filter((m) => m.severity !== "error");
    if (errors.length) {
        const error = new Error(errors.map((e) => e.formattedMessage).join("\n"));
        error.isCompileError = true;
        throw error;
    }

    const contracts = {};
    for (const [ source, byName ] of Object.entries(output.contracts ?? {})) {
        for (const [ name, c ] of Object.entries(byName)) {
            if (contracts[name]) console.warn(`Two contracts are named ${name}; ${source} replaces ${contracts[name].source}.`);
            contracts[name] = {
                source,
                abi: c.abi,
                bytecode: c.evm.bytecode.object,
                deployedBytecode: c.evm.deployedBytecode.object,
            };
        }
    }

    const solcVersion = solc.version().split("+")[0];

    if (write) {
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
        fs.mkdirSync(BUILD_DIR, { recursive: true });
        for (const [ name, c ] of Object.entries(contracts)) {
            fs.writeFileSync(path.join(BUILD_DIR, `${name}.json`), JSON.stringify({ contractName: name, solc: solcVersion, ...c }, null, 4));
        }
        writeExports(contracts);
    }

    if (!quiet) {
        warnings.forEach((w) => console.warn(w.formattedMessage.trim()));
        console.log(`solc ${solcVersion}: ${files.length} files, ${Object.keys(contracts).length} contracts${warnings.length ? `, ${warnings.length} warnings` : ""}`);
        Object.entries(contracts)
            .filter(([ , c ]) => c.deployedBytecode)
            .forEach(([ name, c ]) => {
                const size = c.deployedBytecode.length / 2;
                const flag = size > SIZE_LIMIT ? "  OVER THE 24,576 BYTE LIMIT" : "";
                console.log(`  ${name.padEnd(24)} ${String(size).padStart(6)} bytes${flag}`);
            });
    }

    return { solcVersion, contracts };
}

/**
 * Writes src/generated/contracts/<name>.js for each entry in dev/settings/exports.json:
 *   { "<ContractName>": { "file": "...", "export": "PascalName", "only": [ "fn", ... ] } }
 * "only" keeps the ABI to what the app calls; leave it out to export the whole ABI.
 * The address comes from addressOf("<ContractName>") (src/engine/chain/addresses.js), so every contract is
 * found the same way on every network; "addressKey" overrides the name looked up if one ever has to differ.
 */
function writeExports(contracts) {
    if (!fs.existsSync(EXPORTS_FILE)) return;
    const exportsConfig = JSON.parse(fs.readFileSync(EXPORTS_FILE, "utf8"));

    for (const [ name, cfg ] of Object.entries(exportsConfig)) {
        if (name.startsWith("//")) continue;
        const contract = contracts[name];
        if (!contract) {
            console.warn(`exports.json lists ${name}, but no contract has that name.`);
            continue;
        }
        const only = Array.isArray(cfg.only) ? new Set(cfg.only) : null;
        const abi = only ? contract.abi.filter((item) => only.has(item.name)) : contract.abi;
        const missing = only ? [ ...only ].filter((fn) => !abi.some((item) => item.name === fn)) : [];
        if (missing.length) console.warn(`${name} has no ${missing.join(", ")} (listed in exports.json).`);

        const target = path.join(ROOT, cfg.file);
        const fromTarget = path.relative(path.dirname(target), ENGINE_ADDRESSES).split(path.sep).join("/").replace(/\.js$/, "");
        const body = [
            `/** GENERATED by dev/engine/compile.mjs from ${contract.source}. Do not edit: change the .sol, then run npm run compile in dev/ */`,
            `import { addressOf } from "${fromTarget.startsWith(".") ? fromTarget : `./${fromTarget}`}";`,
            ``,
            `export const ${cfg.export} = {`,
            `    address: addressOf(${JSON.stringify(cfg.addressKey ?? name)}),`,
            `    abi: ${JSON.stringify(abi, null, 4).replace(/\n/g, "\n    ")},`,
            `};`,
            ``,
        ].join("\n");
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, body);
    }
}

export { compileAll, sourcePath, listSources, SETTINGS, ROOT, DEV_DIR, ENGINE_DIR, SETTINGS_DIR, GENERATED_DIR, SRC_DIR, BUILD_DIR };
