/*
 * ENGINE (same in every project, do not edit).
 *
 * Sets up the local test chain exactly like the real deploy:
 *   1. deploys a MockToken for every entry in dev/settings/test-tokens.json (none, one or many)
 *   2. reads dev/settings/contracts/*.env and swaps the addresses listed under "replaces" for those test tokens
 *   3. runs dev/settings/deploy.config.mjs step by step (deploy, setup, readBack, verify), as deploy:live does
 * Used by npm run dev (start.mjs) and npm test (test-runner.mjs).
 */

import { ethers } from "ethers";
import { deployContract } from "./node.mjs";
import { allContractSettings, testTokens } from "./settings.mjs";
import { normalizeSteps, requiredCodeOf } from "./deploy-steps.mjs";
import config from "../settings/deploy.config.mjs";

/**
 * @param {object} options
 * @param {object} options.provider
 * @param {object} options.owner      wallet that deploys and owns everything
 * @param {object} options.contracts  compiled contracts (compileAll)
 * @returns {Promise<object>} deployed:
 *   addresses   key → address (every step in deploy.config.mjs)
 *   at(key)     contract at that key with its ABI (the logic ABI for a proxy), signed by the owner
 *   proxy(key)  BaseProxyUsed admin functions at that key
 *   tokens      symbol → { contract, address, decimals } for every test token
 *   settings    contract settings after the swap
 */
async function deployLocal({ provider, owner, contracts }) {
    /* ------------------------------------ 1. test tokens */

    const tokens = {};
    for (const t of testTokens()) {
        const contract = await deployContract(owner, contracts.MockToken, t.name, t.symbol, t.decimals);
        tokens[t.symbol] = { contract, address: await contract.getAddress(), decimals: t.decimals, name: t.name, replaces: t.replaces ?? [] };
    }

    /* ------------------------------------ 2. settings, with test tokens in place of real ones */

    const settings = allContractSettings();
    for (const [ symbol, token ] of Object.entries(tokens)) {
        for (const target of token.replaces) {
            const [ contractName, key ] = String(target).split(".");
            if (!settings[contractName] || !(key in settings[contractName])) {
                throw new Error(`test-tokens.json: ${symbol} replaces ${target}, but dev/settings/contracts/${contractName}.env has no ${key}.`);
            }
            settings[contractName][key] = token.address;
        }
    }

    /* ------------------------------------ 3. the same steps as the real deploy */

    const addresses = {};
    const ctx = {
        owner: owner.address,
        deployer: owner.address,
        addresses,
        settings,
        encode: (name, fn, values) => new ethers.Interface(contracts[name].abi).encodeFunctionData(fn, values),
        at: (name, address) => new ethers.Contract(address, contracts[name].abi, owner),
    };

    for (const [ label, address ] of Object.entries(requiredCodeOf(config, settings))) {
        if ((await provider.getCode(address)) === "0x") throw new Error(`${label}: no contract at ${address} on the local chain. Add it to dev/settings/test-tokens.json "replaces".`);
    }

    const steps = normalizeSteps(config);
    for (const step of steps) {
        if (!contracts[step.contract]?.bytecode) throw new Error(`deploy.config.mjs: no compiled contract named ${step.contract} (${step.key}).`);
        const deployed = await deployContract(owner, contracts[step.contract], ...((await step.args?.(ctx)) ?? []));
        addresses[step.key] = await deployed.getAddress();
        const contract = new ethers.Contract(addresses[step.key], contracts[step.abi].abi, owner);

        const tx = step.setup ? await step.setup(contract, ctx) : null;
        if (tx) await tx.wait();

        const state = step.readBack ? await step.readBack(contract, ctx) : {};
        const verdict = step.verify ? step.verify(state, ctx) : true;
        if (verdict !== true) throw new Error(`Local deploy of ${step.key}: ${verdict}`);
    }

    const abiOf = Object.fromEntries(steps.map((s) => [ s.key, contracts[s.abi].abi ]));
    return {
        addresses,
        tokens,
        settings,
        at: (key, signer = owner) => new ethers.Contract(addresses[key], abiOf[key], signer),
        proxy: (key, signer = owner) => new ethers.Contract(addresses[key], contracts.BaseProxyUsed.abi, signer),
    };
}

/** What the website gets on the local chain: contract addresses, and the test tokens for the test panel */
const websiteEnv = (deployed) => ({
    VITE_LOCAL_ADDRESSES: JSON.stringify(deployed.addresses),
    VITE_LOCAL_TEST_TOKENS: JSON.stringify(Object.fromEntries(Object.entries(deployed.tokens)
        .map(([ symbol, t ]) => [ symbol, { address: t.address, decimals: t.decimals } ]))),
});

export { deployLocal, websiteEnv };
