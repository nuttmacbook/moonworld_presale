/*
 * ENGINE (same in every project, do not edit).
 *
 * Common test tools for the local chain, used by the test panel and handed to dev/project/devActions.js.
 * Every one sends real transactions / RPC calls to the hardhat node. Works with zero, one or many test tokens.
 */

import { etherjs } from "kitbox";
import { LOCAL_RPC, LOCAL_CHAIN_ID } from "../../../src/engine/chain/connect";

const TOKEN_ABI = [
    "function mint(address to, uint256 amount)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address) view returns (uint256)",
];
const DEMO_KEY = "dapp.local.demoKey";

// Local blocks are instant, so ethers' request cache would hand out stale nonces
const provider = new etherjs.JsonRpcProvider(LOCAL_RPC, LOCAL_CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });

// Public hardhat test key (account #1), passed by dev/engine/start.mjs; pays gas and test tokens
const funder = new etherjs.NonceManager(new etherjs.Wallet(import.meta.env.VITE_DEV_FUNDER_KEY, provider));

/** Test tokens from dev/settings/test-tokens.json: symbol → { address, decimals } (may be empty) */
const testTokens = (() => {
    try { return JSON.parse(import.meta.env.VITE_LOCAL_TEST_TOKENS ?? "{}"); } catch { return {}; }
})();

/* ------------------------------------ wallets */

/** A wallet whose key lives in this browser's localStorage; signs real transactions on the local chain */
function demoWallet() {
    let key = null;
    try { key = localStorage.getItem(DEMO_KEY); } catch {}
    if (!key) {
        key = etherjs.Wallet.createRandom().privateKey;
        try { localStorage.setItem(DEMO_KEY, key); } catch {}
    }
    const signer = new etherjs.Wallet(key, provider);
    return { address: signer.address, signer, isDemo: true };
}

/** Throws away the demo wallet's key, so the next demoWallet() is a brand new person */
function resetDemoWallet() {
    try { localStorage.removeItem(DEMO_KEY); } catch {}
}

/** A fresh random wallet connected to the local chain (fund it before use) */
const newWallet = () => etherjs.Wallet.createRandom().connect(provider);

/* ------------------------------------ money */

/** Sends `bnb` (whole BNB) for gas */
async function fundGas(address, bnb = import.meta.env.VITE_DEV_FUND_GAS) {
    if (!address) throw new Error("Connect a wallet or turn on the demo wallet first.");
    await (await funder.sendTransaction({ to: address, value: etherjs.parseEther(String(bnb)) })).wait();
}

/** The test token by symbol, bound to a signer or the provider */
const tokenAs = (symbol, signer = provider) => {
    const token = testTokens?.[symbol];
    if (!token) throw new Error(`No test token ${symbol}. Add it to dev/settings/test-tokens.json.`);
    return new etherjs.Contract(token.address, TOKEN_ABI, signer);
};

/** Mints test tokens; `amount` in whole tokens (string or number) or in the smallest unit (bigint) */
async function fundToken(address, symbol, amount = import.meta.env.VITE_DEV_FUND_AMOUNT) {
    if (!address) throw new Error("Connect a wallet or turn on the demo wallet first.");
    const token = testTokens?.[symbol];
    if (!token) throw new Error(`No test token ${symbol}. Add it to dev/settings/test-tokens.json.`);
    const units = typeof amount === "bigint" ? amount : etherjs.parseUnits(String(amount), token.decimals);
    await (await tokenAs(symbol, funder).mint(address, units)).wait();
}

/** BNB and every test token of an address: { bnb, tokens: { SYMBOL: bigint } } */
async function balances(address) {
    if (!address) return { bnb: 0n, tokens: {} };
    const symbols = Object.keys(testTokens);
    const [ bnb, ...amounts ] = await Promise.all([ provider.getBalance(address), ...symbols.map((s) => tokenAs(s).balanceOf(address)) ]);
    return { bnb, tokens: Object.fromEntries(symbols.map((s, i) => [ s, amounts[i] ])) };
}

/* ------------------------------------ time */

/** Moves the chain's clock forward and mines a block (for anything that unlocks with time) */
async function skipTime(seconds) {
    await provider.send("evm_increaseTime", [ Number(seconds) ]);
    await provider.send("evm_mine", []);
}

const mineBlock = () => provider.send("evm_mine", []);

/** Current chain time (seconds) */
const chainTime = async () => Number((await provider.getBlock("latest"))?.timestamp ?? 0);

/* ------------------------------------ misc */

/** Contract bound to a signer, for project actions ({ address, abi } from src/generated) */
const contractAs = (contract, signer) => new etherjs.Contract(contract.address, contract.abi, signer);

async function isChainUp() {
    try {
        await provider.getBlockNumber();
        return true;
    } catch {
        return false;
    }
}

export {
    provider, etherjs, testTokens,
    demoWallet, resetDemoWallet, newWallet,
    fundGas, fundToken, tokenAs, balances,
    skipTime, mineBlock, chainTime,
    contractAs, isChainUp,
};
