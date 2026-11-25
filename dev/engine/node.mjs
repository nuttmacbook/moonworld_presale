/*
 * ENGINE (same in every project, do not edit).
 *
 * Generic local-chain helpers (same in every project): hardhat node, test keys, provider.
 * What gets deployed is dev/settings/deploy.config.mjs (local-chain.mjs locally, deploy-live.mjs on a real chain).
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ethers } from "ethers";
import { DEV_DIR } from "./compiler.mjs";

// Hardhat's well-known test mnemonic: these keys are public, never use them on a real network
const MNEMONIC = "test test test test test test test test test test test junk";
const CHAIN_ID = 31337;

// Hardhat's default hardfork caps one transaction at 2^24 gas
const TX_GAS = 15_000_000;

const devKey = (index) => ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`).privateKey;

/** Local blocks are instant, so ethers' short request cache would hand out stale nonces */
const localProvider = (url) => new ethers.JsonRpcProvider(url, CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });

/**
 * Starts `hardhat node` as a child process.
 *
 * @param {number} port
 * @param {string|null} logFile  path for the node's output, or null to discard it
 * @returns {{ child: object, url: string }}
 */
function startNode(port, logFile = null) {
    const out = logFile ? fs.openSync(logFile, "w") : "ignore";
    const child = spawn(path.join(DEV_DIR, "node_modules/.bin/hardhat"), [ "node", "--port", String(port) ], {
        cwd: DEV_DIR,
        stdio: [ "ignore", out, out ],
    });
    return { child, url: `http://127.0.0.1:${port}` };
}

/** Waits until a JSON-RPC node answers */
async function waitForNode(url, timeoutMs = 60_000) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
        try {
            const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
            if (res.ok) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`No node answered at ${url}`);
}

/** Puts compiled runtime code at any address, e.g. a mock token where the real one lives on mainnet */
const setCode = (provider, address, contract) => provider.send("hardhat_setCode", [ address, `0x${contract.deployedBytecode}` ]);

const setBalance = (provider, address, ether) => provider.send("hardhat_setBalance", [ address, ethers.toQuantity(ethers.parseEther(String(ether))) ]);

/** Deploys a compiled contract and waits for it */
async function deployContract(signer, contract, ...args) {
    const factory = new ethers.ContractFactory(contract.abi, contract.bytecode, signer);
    const instance = await factory.deploy(...args);
    await instance.waitForDeployment();
    return instance;
}

/**
 * Deploys a logic contract behind BaseProxyUsed, running the initializer in the proxy's constructor
 * (one transaction, nobody can initialize it first). The signer becomes the proxy admin.
 *
 * @returns {{ contract: object, proxy: object, implementation: string, address: string }}
 *          contract = the logic ABI at the proxy address (what the app talks to), proxy = admin functions
 */
async function deployProxied(signer, contracts, logicName, init = null, ...initArgs) {
    const logic = await deployContract(signer, contracts[logicName]);
    const implementation = await logic.getAddress();
    const data = init ? logic.interface.encodeFunctionData(init, initArgs) : "0x";
    const proxy = await deployContract(signer, contracts.BaseProxyUsed, implementation, data);
    const address = await proxy.getAddress();
    return { contract: new ethers.Contract(address, contracts[logicName].abi, signer), proxy, implementation, address };
}

export { MNEMONIC, CHAIN_ID, TX_GAS, devKey, localProvider, startNode, waitForNode, setCode, setBalance, deployContract, deployProxied };
