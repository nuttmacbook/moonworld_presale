/*
 * YOUR CODE (on-chain, local only). Puts the claim and presale mocks at the real addresses on the local chain
 * (hardhat_setCode), so the website uses settings/.env unchanged. Used by seed.mjs and the tests.
 * Test tokens (dev/settings/test-tokens.json): first = MWLD, second = payment token.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { setCode } from "../engine/node.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const build = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, "dev", "generated", "build", `${name}.json`), "utf8"));

/** A value from settings/.env (an env var of the same name wins, like every setting) */
function webSetting(key) {
    if (process.env[key]) return process.env[key];
    const file = path.join(ROOT, "settings", ".env");
    if (!fs.existsSync(file)) throw new Error("settings/.env is missing: copy settings/.env.example to settings/.env first.");
    const line = fs.readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
    const value = line?.slice(key.length + 1).trim() ?? "";
    if (!ethers.isAddress(value)) throw new Error(`${key} in settings/.env is not an address.`);
    return value;
}

const testTokens = (deployed) => Object.values(deployed?.tokens ?? {});

/**
 * Installs both mocks and points the claim mock at the test MWLD.
 * @returns {Promise<object>} { claim, presale, token, payment } contracts bound to the node's first account
 */
async function installMocks(provider, deployed, contracts = null) {
    const [ token, payment ] = testTokens(deployed);
    if (!token || !payment) throw new Error("dev/settings/test-tokens.json needs two tokens: MWLD first, the payment token second.");
    const claimBuild = contracts?.MoonClaimMock ?? build("MoonClaimMock");
    const presaleBuild = contracts?.MoonPresaleMock ?? build("MoonPresaleMock");
    const claimAt = webSetting("VITE_CLAIM_CONTRACT");
    const presaleAt = webSetting("VITE_PRESALE_CONTRACT");
    await setCode(provider, claimAt, claimBuild);
    await setCode(provider, presaleAt, presaleBuild);
    const signer = await provider.getSigner(0);
    const claim = new ethers.Contract(claimAt, claimBuild.abi, signer);
    const presale = new ethers.Contract(presaleAt, presaleBuild.abi, signer);
    await (await claim.setup(token.address)).wait();
    return { claim, presale, token, payment, claimAt, presaleAt };
}

/**
 * Gives `account` a presale purchase: `bought` payment tokens → its allocation, part unlocked and claimed,
 * referrer rewards, and some payment tokens left in the wallet.
 */
async function givePerson(mocks, account, { bought, allocation, unlockedPct, claimedPct = 0, refReward = "0", kolReward = "0", balance = "0" }) {
    const { claim, presale, token, payment } = mocks;
    const t = (n) => ethers.parseUnits(String(n), token.decimals);
    const p = (n) => ethers.parseUnits(String(n), payment.decimals);
    const supply = t(allocation);
    const unlocked = (supply * BigInt(Math.round(unlockedPct * 100))) / 10000n;
    const claimed = (supply * BigInt(Math.round(claimedPct * 100))) / 10000n;
    await (await token.contract.mint(mocks.claimAt, supply)).wait();
    await (await claim.setPerson(account, supply, unlocked, claimed, p(refReward), p(kolReward))).wait();
    await (await presale.setBuyer(payment.address, account, p(bought), p(Number(refReward) * 10))).wait();
    if (Number(balance) > 0) await (await payment.contract.mint(account, p(balance))).wait();
}

export { webSetting, installMocks, givePerson };
