// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// YOUR CODE (on-chain, partner). The claim contract that already lives on BNB Chain
/// (VITE_CLAIM_CONTRACT in settings/.env), written as an interface: only what this website calls.
/// Taken from the ABI of the previous presale site. src/project/chain/claimAbi.js must match it
/// (dev/project/test/Claim.test.mjs checks that).
interface IMoonClaim {
    /// Numbers of one wallet. Token amounts in the token's units; refReward and kolReward in the presale's payment token.
    function getPersonalData(address account) external view returns (
        uint256 claimed,
        uint256 refReward,
        uint256 kolReward,
        uint256 supply,
        uint256 unlocked
    );

    /// Sends everything unlocked and not yet claimed to `account`
    function unlockToken(address account) external payable;
}
