// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// YOUR CODE (on-chain, partner). The ended presale contract on BNB Chain (VITE_PRESALE_CONTRACT in settings/.env),
/// written as an interface: only what this website reads. src/project/chain/claimAbi.js must match it.
interface IMoonPresale {
    struct User {
        uint256 totalBuy;
        uint256 totalCall;
        bool isContributed;
        bool isCalled;
    }

    /// What each wallet put in, per payment token (USDT on BSC)
    function getUserInfo(address tokenAddress, address[] calldata users) external view returns (User[] memory);
}
