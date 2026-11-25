/*
 * YOUR CODE (on-chain). The only door between the UI and the blockchain.
 * The UI (src/project/ui) imports from this file and nothing else on-chain.
 */

// Reads (one per page)
export { getClaimData } from "./reads";

// Transactions
export { claimTokens } from "./intereacts/claim";
