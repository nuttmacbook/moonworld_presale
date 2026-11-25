// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import "../partner/IMoonPresale.sol";

/// YOUR CODE (on-chain, local test only). Stand-in for the ended presale on the local chain, placed at
/// VITE_PRESALE_CONTRACT by dev/project/localClaim.mjs. Anyone can set numbers: never deploy this to a real chain.
contract MoonPresaleMock is IMoonPresale {
    mapping (address => mapping (address => User)) private _users;

    function setBuyer(address tokenAddress, address account, uint256 totalBuy, uint256 totalCall) external {
        _users[tokenAddress][account] = User(totalBuy, totalCall, totalBuy > 0, totalCall > 0);
    }

    function getUserInfo(address tokenAddress, address[] calldata users) external view returns (User[] memory list) {
        list = new User[](users.length);
        for (uint256 i = 0; i < users.length; i++) list[i] = _users[tokenAddress][users[i]];
    }
}
