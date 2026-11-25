/*
 * YOUR CODE (on-chain). Reading for the claim page, all sent together (1 round):
 *   claim.getPersonalData(account) · presale.getUserInfo(paymentToken, [account]) · paymentToken.balanceOf(account)
 * plus each token's name/symbol/decimals (cached for an hour, so only on the first visit).
 * All contracts already live on BNB Chain; their addresses come from settings/.env.
 * Local test chain (dev/ npm run dev): mocks sit at the same claim and presale addresses, and the test tokens
 * in dev/settings/test-tokens.json stand in for MWLD (first) and the payment token (second).
 */

import { box, readRpc, IS_LOCAL } from "../../engine/chain/connect";
import { cachedRead } from "../../engine/chain/cache";
import { metered } from "../../engine/chain/rpcMeter";
import { project } from "../settings";
import { CLAIM_ABI, PRESALE_ABI, TOKEN_READ_ABI } from "./claimAbi";
import { toPersonalView, toBuyerView, toTokenView } from "./viewParse";

const HOUR = 3_600_000;

/** Test token number `i` of the local chain (0 = MWLD, 1 = payment token) */
const localToken = (i) => {
    try {
        return Object.values(JSON.parse(import.meta.env.VITE_LOCAL_TEST_TOKENS ?? "{}"))?.[i]?.address ?? "";
    } catch {
        return "";
    }
};
const tokenAddress = () => (IS_LOCAL ? localToken(0) : project.tokenAddress);
const paymentAddress = () => (IS_LOCAL ? localToken(1) : project.paymentToken);

/** { address, abi } of the claim contract for kitbox */
const ClaimContract = () => ({ address: project.claimContract, abi: CLAIM_ABI });

const contract = (address, abi, label) => metered(box.createWeb3Contract({ address, abi }, readRpc()), label);

/** name/symbol/decimals of one token, cached for an hour */
const readTokenView = async (address, label) => {
    if (!address) throw new Error("No token address for this network.");
    const raw = await cachedRead(`token:${address.toLowerCase()}`, async () => {
        const m = contract(address, TOKEN_READ_ABI, label).methods;
        const [ name, symbol, decimals ] = await Promise.all([ m.name().call(), m.symbol().call(), m.decimals().call() ]);
        return { name, symbol, decimals };
    }, { ttl: HOUR });
    return { ...toTokenView(raw), address };
};

/** The wallet's claim numbers; `fresh: true` skips the cache (right before a claim) */
const readPersonalView = async (account, { fresh = false } = {}) => {
    const raw = await cachedRead(`personal:${account.toLowerCase()}`, () => contract(project.claimContract, CLAIM_ABI, "Claim").methods.getPersonalData(account).call(), { fresh });
    return toPersonalView(raw);
};

const readBuyer = async (account) => {
    const raw = await cachedRead(`buyer:${account.toLowerCase()}`, () => contract(project.presaleContract, PRESALE_ABI, "Presale").methods.getUserInfo(paymentAddress(), [ account ]).call(), { ttl: HOUR });
    return toBuyerView(raw);
};

const readPaymentBalance = async (account) => {
    const raw = await cachedRead(`balance:${account.toLowerCase()}`, () => contract(paymentAddress(), TOKEN_READ_ABI, "Payment").methods.balanceOf(account).call());
    try { return BigInt(raw ?? 0); } catch { return 0n; }
};

/**
 * Everything the claim page needs.
 *
 * @param {object} wallet  connected wallet ({ address, signer }) or null
 * @returns {Promise<object>}
 */
export async function getClaimData(wallet) {
    const account = wallet?.address;
    const [ token, payment, personal, buyer, paymentBalance ] = await Promise.all([
        readTokenView(tokenAddress(), "Token"),
        readTokenView(paymentAddress(), "Payment"),
        account ? readPersonalView(account) : null,
        account ? readBuyer(account) : null,
        account ? readPaymentBalance(account) : null,
    ]);
    return { wallet, isConnected: Boolean(account), token, payment, personal, buyer, paymentBalance };
}

export { readPersonalView, ClaimContract };
