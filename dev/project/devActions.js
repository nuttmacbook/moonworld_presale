/*
 * YOUR CODE (on-chain, local only). Test panel buttons for THIS project only, shown under "This project".
 * They talk to the mocks that seed.mjs put at VITE_CLAIM_CONTRACT and VITE_PRESALE_CONTRACT on the local chain.
 * Test tokens: first = MWLD, second = payment token (dev/settings/test-tokens.json).
 */

import claimBuild from "../generated/build/MoonClaimMock.json";
import presaleBuild from "../generated/build/MoonPresaleMock.json";

const claimMock = () => ({ address: import.meta.env.VITE_CLAIM_CONTRACT, abi: claimBuild.abi });
const presaleMock = () => ({ address: import.meta.env.VITE_PRESALE_CONTRACT, abi: presaleBuild.abi });

/** The active wallet bought 200 payment tokens: 12,600 tokens, 25% unlocked, 10% claimed, small referrer rewards */
const giveAllocation = async ({ wallet, contractAs, tokenAs, testTokens, etherjs }, progress) => {
    if (!wallet?.signer) throw new Error("Turn on the demo wallet (and add BNB for gas) first.");
    const [ [ tokenSymbol, token ] = [], [ paySymbol, pay ] = [] ] = Object.entries(testTokens);
    if (!tokenSymbol || !paySymbol) throw new Error("dev/settings/test-tokens.json needs MWLD first and the payment token second.");
    const t = (n) => etherjs.parseUnits(String(n), token.decimals);
    const p = (n) => etherjs.parseUnits(String(n), pay.decimals);
    progress("Minting test tokens to the claim mock…");
    await (await tokenAs(tokenSymbol, wallet.signer).mint(claimMock().address, t(12600))).wait();
    progress("Setting your purchase and allocation…");
    await (await contractAs(claimMock(), wallet.signer).setPerson(wallet.address, t(12600), t(3150), t(1260), p("2.5"), p("1.2"))).wait();
    await (await contractAs(presaleMock(), wallet.signer).setBuyer(pay.address, wallet.address, p(200), p(25))).wait();
};

/** Unlocks one more month (2.5% of the allocation) for the active wallet */
const unlockMonth = async ({ wallet, contractAs }, progress) => {
    if (!wallet?.signer) throw new Error("Turn on the demo wallet first.");
    const claim = contractAs(claimMock(), wallet.signer);
    const [ , , , supply ] = await claim.getPersonalData(wallet.address);
    progress("Unlocking 2.5% more…");
    await (await claim.addUnlocked(wallet.address, (supply * 25n) / 1000n)).wait();
};

const devActions = [
    { label: "Give me an allocation", run: giveAllocation },
    { label: "Unlock one more month", run: unlockMonth },
];

export { devActions };
