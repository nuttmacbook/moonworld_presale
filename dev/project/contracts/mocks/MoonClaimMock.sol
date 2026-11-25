// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import "../partner/IMoonClaim.sol";

interface IMockClaimToken {
    function transfer(address to, uint256 amount) external returns (bool);
}

/// YOUR CODE (on-chain, local test only). Stand-in for the real claim contract on the local chain.
/// dev/project/seed.mjs puts its code at the real claim address (VITE_CLAIM_CONTRACT), so the website
/// talks to the same address everywhere. Anyone can set numbers: never deploy this to a real chain.
contract MoonClaimMock is IMoonClaim {
    struct Person {
        uint256 claimed;
        uint256 refReward;
        uint256 kolReward;
        uint256 supply;
        uint256 unlocked;
    }

    address public token;
    mapping (address => Person) private _people;

    error NothingToClaim();
    error TokenNotSet();

    /// The test token paid out on claims (storage starts empty after hardhat_setCode)
    function setup(address token_) external {
        token = token_;
    }

    function setPerson(address account, uint256 supply, uint256 unlocked, uint256 claimed, uint256 refReward, uint256 kolReward) external {
        _people[account] = Person(claimed, refReward, kolReward, supply, unlocked);
    }

    /// Unlocks `amount` more for `account`, never above its allocation
    function addUnlocked(address account, uint256 amount) external {
        Person storage p = _people[account];
        p.unlocked = p.unlocked + amount > p.supply ? p.supply : p.unlocked + amount;
    }

    function getPersonalData(address account) external view returns (uint256 claimed, uint256 refReward, uint256 kolReward, uint256 supply, uint256 unlocked) {
        Person storage p = _people[account];
        return (p.claimed, p.refReward, p.kolReward, p.supply, p.unlocked);
    }

    function unlockToken(address account) external payable {
        if (token == address(0)) revert TokenNotSet();
        Person storage p = _people[account];
        uint256 amount = p.unlocked > p.claimed ? p.unlocked - p.claimed : 0;
        if (amount == 0) revert NothingToClaim();
        p.claimed += amount;
        IMockClaimToken(token).transfer(account, amount);
    }
}
