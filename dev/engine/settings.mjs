/*
 * ENGINE (same in every project, do not edit).
 *
 * Reads the settings files in dev/settings. Scripts have no fallback values of their own:
 * a missing value stops the script with a message naming the file and the line to add.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEV_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS_DIR = path.join(DEV_DIR, "settings");

/** Parses KEY=value lines; # comments and blank lines are skipped */
const parseEnv = (text) => Object.fromEntries(String(text ?? "").split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
        const at = line.indexOf("=");
        return [ line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "") ];
    }));

/**
 * Reads one settings file and checks that every key in `required` has a value.
 * Environment variables of the same name win over the file (handy in CI).
 *
 * @param {string} file       name inside dev/settings, e.g. "local.env" or "contracts/MyLogic.env"
 * @param {string[]} required keys that must not be empty
 * @param {object} options
 * @param {string} options.example  file to copy from when `file` is missing (secret files)
 * @returns {Record<string, string>}
 */
function readSettings(file, required = [], { example = null } = {}) {
    const full = path.join(SETTINGS_DIR, file);
    if (!fs.existsSync(full)) {
        const hint = example ? ` Copy dev/settings/${example} to dev/settings/${file} and fill it in.` : "";
        throw new SettingsError(`dev/settings/${file} is missing.${hint}`);
    }
    const values = parseEnv(fs.readFileSync(full, "utf8"));
    for (const key of Object.keys(values)) {
        if (process.env[key]) values[key] = process.env[key];
    }
    const missing = required.filter((key) => !values[key]);
    if (missing.length) {
        throw new SettingsError(`Set ${missing.join(", ")} in dev/settings/${file}.`);
    }
    return values;
}

/** Reads a JSON settings file (keys starting with "//" are comments) */
function readJsonSettings(file) {
    const full = path.join(SETTINGS_DIR, file);
    if (!fs.existsSync(full)) throw new SettingsError(`dev/settings/${file} is missing.`);
    return JSON.parse(fs.readFileSync(full, "utf8"));
}

class SettingsError extends Error {}

/* ------------------------------------ the settings files */

/**
 * Settings of every contract: dev/settings/contracts/<ContractName>.env → { ContractName: { KEY: value } }.
 * Every key listed in a file must have a value. A contract without settings simply has no file.
 */
function allContractSettings() {
    const dir = path.join(SETTINGS_DIR, "contracts");
    if (!fs.existsSync(dir)) return {};
    return Object.fromEntries(fs.readdirSync(dir)
        .filter((file) => file.endsWith(".env"))
        .map((file) => {
            const values = parseEnv(fs.readFileSync(path.join(dir, file), "utf8"));
            return [ file.replace(/\.env$/, ""), readSettings(`contracts/${file}`, Object.keys(values)) ];
        }));
}

const localSettings = () => readSettings("local.env", [ "LOCAL_PORT", "TEST_PORT", "LOCAL_SEED", "LOCAL_RPC_LATENCY", "LOCAL_FUND_GAS", "LOCAL_FUND_AMOUNT", "TEST_PEOPLE" ]);

/** Test tokens for the local chain: [ { symbol, name, decimals, replaces: [ "Contract.KEY" ] } ] (may be empty) */
function testTokens() {
    const list = readJsonSettings("test-tokens.json")?.tokens ?? [];
    for (const token of list) {
        if (!token?.symbol || !token?.name || !Number.isInteger(token?.decimals)) {
            throw new SettingsError("Every entry in dev/settings/test-tokens.json needs symbol, name and decimals.");
        }
    }
    return list;
}

const deploySettings = (required = [ "DEPLOYER_PRIVATE_KEY", "DEPLOY_RPC_URL" ]) => readSettings("deploy.env", required, { example: "deploy.env.example" });

/** Chain id → { name, explorer, verifyApi }; unknown ids stop the script */
const networkFor = (chainId) => {
    const network = readJsonSettings("networks.json")?.[String(chainId)];
    if (!network?.name) throw new SettingsError(`Chain id ${chainId} is not in dev/settings/networks.json. Add it there first.`);
    return network;
};

export { SETTINGS_DIR, SettingsError, readSettings, readJsonSettings, allContractSettings, localSettings, testTokens, deploySettings, networkFor };
