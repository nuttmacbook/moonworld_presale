/*
 * YOUR CODE (on-chain). ABIs of contracts that already live on BNB Chain (not deployed by this project),
 * only the functions this site uses. Mirror dev/project/contracts/partner/IMoonClaim.sol and IMoonPresale.sol;
 * dev/project/test/Claim.test.mjs checks that they have the same functions.
 */

const CLAIM_ABI = [
    {
        inputs: [ { internalType: "address", name: "account", type: "address" } ],
        name: "getPersonalData",
        outputs: [
            { internalType: "uint256", name: "claimed", type: "uint256" },
            { internalType: "uint256", name: "refReward", type: "uint256" },
            { internalType: "uint256", name: "kolReward", type: "uint256" },
            { internalType: "uint256", name: "supply", type: "uint256" },
            { internalType: "uint256", name: "unlocked", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [ { internalType: "address", name: "account", type: "address" } ],
        name: "unlockToken",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
];

/** The ended presale: how much each wallet bought, per payment token */
const PRESALE_ABI = [
    {
        inputs: [
            { internalType: "address", name: "tokenAddress", type: "address" },
            { internalType: "address[]", name: "users", type: "address[]" },
        ],
        name: "getUserInfo",
        outputs: [
            {
                components: [
                    { internalType: "uint256", name: "totalBuy", type: "uint256" },
                    { internalType: "uint256", name: "totalCall", type: "uint256" },
                    { internalType: "bool", name: "isContributed", type: "bool" },
                    { internalType: "bool", name: "isCalled", type: "bool" },
                ],
                internalType: "struct IMoonPresale.User[]",
                name: "",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];

// Standard ERC20 getters (system ABI, not a setting)
const TOKEN_READ_ABI = [
    { inputs: [ { internalType: "address", name: "account", type: "address" } ], name: "balanceOf", outputs: [ { internalType: "uint256", name: "", type: "uint256" } ], stateMutability: "view", type: "function" },
    { inputs: [], name: "name", outputs: [ { internalType: "string", name: "", type: "string" } ], stateMutability: "view", type: "function" },
    { inputs: [], name: "symbol", outputs: [ { internalType: "string", name: "", type: "string" } ], stateMutability: "view", type: "function" },
    { inputs: [], name: "decimals", outputs: [ { internalType: "uint8", name: "", type: "uint8" } ], stateMutability: "view", type: "function" },
];

export { CLAIM_ABI, PRESALE_ABI, TOKEN_READ_ABI };
