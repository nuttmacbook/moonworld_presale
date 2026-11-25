/*
 * YOUR CODE (on-chain, local only). Sample data for the local test chain: puts the claim and presale mocks
 * at their real addresses, then gives `count` sample wallets a purchase. Nothing here runs on a real chain
 * (deploy.config.mjs is empty: every contract this site uses already exists on BSC).
 */

import { ethers } from "ethers";
import { installMocks, givePerson } from "./localClaim.mjs";

// Sample buyers: 10 to 1,000 payment tokens each, 10% to 40% unlocked (sample data, not settings of the real contracts)
const PRICE = 63; // tokens per payment token in the samples
const sample = (i) => {
    const bought = 10 * (1 + (i % 100));
    return { bought, allocation: bought * PRICE, unlockedPct: 10 + (i % 7) * 5, claimedPct: (i % 3) * 5 };
};

/** Called by npm run dev */
async function seed({ provider, deployed, count, onProgress = () => {} }) {
    const mocks = await installMocks(provider, deployed);
    for (let i = 1; i <= count; i++) {
        await givePerson(mocks, ethers.Wallet.createRandom().address, sample(i));
        onProgress(i);
    }
}

/** Extra lines printed when npm run dev is ready */
async function summary() {
    return [ "  Claim + presale mocks are at their real addresses on the local chain. Test panel → \"Give me an allocation\", then Claim." ];
}

export { seed, summary, sample };
