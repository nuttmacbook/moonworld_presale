import { box } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { readPersonalView, ClaimContract } from "../reads";

/**
 * YOUR CODE (on-chain). Claims every MWLD that is unlocked and not claimed yet: unlockToken(account).
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {Function} options.onStep  called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function claimTokens(wallet, { onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Connect your wallet first.");

    onStep({ stage: "checking" });
    const view = await readPersonalView(wallet.address, { fresh: true });
    if (view.supply <= 0n) throw new Error("This wallet has no presale allocation. Connect the wallet you bought with.");
    if (view.claimable <= 0n) throw new Error("Nothing to claim right now. More unlocks every day.");

    onStep({ stage: "claim", index: 1, total: 1 });
    try {
        const tx = await box.createEtherContract(ClaimContract(), wallet.signer).unlockToken(wallet.address);
        onStep({ stage: "claiming", index: 1, total: 1 });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        throw normalize(error, box.handleTxError(ClaimContract(), error), "The claim did not go through.");
    }
}
