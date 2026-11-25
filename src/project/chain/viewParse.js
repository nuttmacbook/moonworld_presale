/*
 * YOUR CODE (on-chain). Turns what the contracts return into plain objects for the page.
 * Every field has a safe empty value, so a missing answer never breaks the page. Amounts stay BigInt.
 */

const big = (value) => {
    try { return BigInt(value ?? 0); } catch { return 0n; }
};

/** getPersonalData(account) → claim numbers (MWLD units; refReward/kolReward in payment-token units) */
const toPersonalView = (v) => {
    const supply = big(v?.supply);
    const unlocked = big(v?.unlocked);
    const claimed = big(v?.claimed);
    return {
        supply, unlocked, claimed,
        claimable: unlocked > claimed ? unlocked - claimed : 0n,
        locked: supply > unlocked ? supply - unlocked : 0n,
        refReward: big(v?.refReward),
        kolReward: big(v?.kolReward),
    };
};

/** getUserInfo(paymentToken, [account])[0] → what the wallet bought in the presale (payment-token units) */
const toBuyerView = (list) => {
    const u = Array.isArray(list) ? list[0] : null;
    return { bought: big(u?.totalBuy ?? u?.[0]), called: big(u?.totalCall ?? u?.[1]) };
};

/** name(), symbol(), decimals() of a token */
const toTokenView = (v) => ({
    name: String(v?.name ?? ""),
    symbol: String(v?.symbol ?? ""),
    decimals: Number(v?.decimals ?? 0),
});

export { toPersonalView, toBuyerView, toTokenView };
