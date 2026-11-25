/*
 * YOUR CODE (on-chain, local only). Test panel buttons for THIS project only, shown under "This project".
 * They talk to the mocks that seed.mjs put at VITE_CLAIM_CONTRACT and VITE_PRESALE_CONTRACT on the local chain.
 * Test tokens: first = MWLD, second = payment token (dev/settings/test-tokens.json).
 */

// ABIs of the mocks, compiled by `npm run dev` in dev/ (dev/generated/build). Loaded lazily through a glob:
// `npm run build` at the root also walks this file (the engine's dev-panel import), and the compiled JSON does not
// exist there, so a plain `import ... from "*.json"` would stop the production build. A glob that matches nothing is just {}.
const builds = import.meta.glob("../generated/build/Moon*Mock.json", { import: "abi" });

const abiOf = async (name) => {
    const load = Object.entries(builds).find(([ path ]) => path.endsWith(`/${name}.json`))?.[1];
    if (!load) throw new Error(`${name} is not compiled yet. Start the local chain with npm run dev in dev/.`);
    return load();
};

const claimMock = async () => ({ address: import.meta.env.VITE_CLAIM_CONTRACT, abi: await abiOf("MoonClaimMock") });
const presaleMock = async () => ({ address: import.meta.env.VITE_PRESALE_CONTRACT, abi: await abiOf("MoonPresaleMock") });

/** The active wallet bought 200 payment tokens: 12,600 tokens, 25% unlocked, 10% claimed, small referrer rewards */
const giveAllocation = async ({ wallet, contractAs, tokenAs, testTokens, etherjs }, progress) => {
    if (!wallet?.signer) throw new Error("Turn on the demo wallet (and add BNB for gas) first.");
    const [ [ tokenSymbol, token ] = [], [ paySymbol, pay ] = [] ] = Object.entries(testTokens);
    if (!tokenSymbol || !paySymbol) throw new Error("dev/settings/test-tokens.json needs MWLD first and the payment token second.");
    const t = (n) => etherjs.parseUnits(String(n), token.decimals);
    const p = (n) => etherjs.parseUnits(String(n), pay.decimals);
    const claim = await claimMock();
    const presale = await presaleMock();
    progress("Minting test tokens to the claim mock…");
    await (await tokenAs(tokenSymbol, wallet.signer).mint(claim.address, t(12600))).wait();
    progress("Setting your purchase and allocation…");
    await (await contractAs(claim, wallet.signer).setPerson(wallet.address, t(12600), t(3150), t(1260), p("2.5"), p("1.2"))).wait();
    await (await contractAs(presale, wallet.signer).setBuyer(pay.address, wallet.address, p(200), p(25))).wait();
};

/** Unlocks one more month (2.5% of the allocation) for the active wallet */
const unlockMonth = async ({ wallet, contractAs }, progress) => {
    if (!wallet?.signer) throw new Error("Turn on the demo wallet first.");
    const claim = contractAs(await claimMock(), wallet.signer);
    const [ , , , supply ] = await claim.getPersonalData(wallet.address);
    progress("Unlocking 2.5% more…");
    await (await claim.addUnlocked(wallet.address, (supply * 25n) / 1000n)).wait();
};

const devActions = [
    { label: "Give me an allocation", run: giveAllocation },
    { label: "Unlock one more month", run: unlockMonth },
];

export { devActions };
