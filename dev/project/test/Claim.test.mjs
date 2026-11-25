/*
 * YOUR CODE (on-chain tests). The site reads claim.getPersonalData(account), presale.getUserInfo(paymentToken, [account]),
 * and sends claim.unlockToken(account). These tests check the website's ABIs match the partner interfaces,
 * then the claim flow on the local mocks: claimable = unlocked - claimed, claim pays exactly that, nothing left → revert.
 */

import { ethers } from "ethers";
import { CLAIM_ABI, PRESALE_ABI } from "../../../src/project/chain/claimAbi.js";
import { installMocks, givePerson } from "../localClaim.mjs";

export default async function (t) {
    const { provider, contracts, deployed, check, doesRevert } = t;

    /* ------------------------------------ 1. the website's ABIs = the partner interfaces */

    const sigs = (abi) => new ethers.Interface(abi).fragments.filter((f) => f.type === "function").map((f) => `${f.format("sighash")}:${f.stateMutability}`).sort().join(",");
    check("CLAIM_ABI matches IMoonClaim.sol", sigs(CLAIM_ABI) === sigs(contracts.IMoonClaim.abi), sigs(CLAIM_ABI));
    check("PRESALE_ABI matches IMoonPresale.sol", sigs(PRESALE_ABI) === sigs(contracts.IMoonPresale.abi), sigs(PRESALE_ABI));

    /* ------------------------------------ 2. claim flow on the mocks at the real addresses */

    const mocks = await installMocks(provider, deployed, contracts);
    const { claim, presale, token, payment } = mocks;
    check("mocks sit at the real addresses", (await provider.getCode(mocks.claimAt)) !== "0x" && (await provider.getCode(mocks.presaleAt)) !== "0x");

    const person = await t.newWallet();
    await givePerson(mocks, person.address, { bought: 200, allocation: 10000, unlockedPct: 25, claimedPct: 10, refReward: "3", kolReward: "1.5", balance: "42" });
    const asPerson = claim.connect(person);
    const units = (n) => ethers.parseUnits(String(n), token.decimals);

    const [ buyer ] = await presale.getUserInfo(payment.address, [ person.address ]);
    check("getUserInfo: bought", buyer.totalBuy === ethers.parseUnits("200", payment.decimals));
    const before = await asPerson.getPersonalData(person.address);
    check("getPersonalData: supply / unlocked / claimed", before.supply === units(10000) && before.unlocked === units(2500) && before.claimed === units(1000));
    check("getPersonalData: rewards", before.refReward === ethers.parseUnits("3", payment.decimals) && before.kolReward === ethers.parseUnits("1.5", payment.decimals));

    const receipt = await (await asPerson.unlockToken(person.address)).wait();
    t.gas("unlockToken", receipt);
    const balance = await token.contract.balanceOf(person.address);
    check("claim pays unlocked - claimed", balance === units(1500), ethers.formatUnits(balance, token.decimals));
    const after = await asPerson.getPersonalData(person.address);
    check("after claim: claimed = unlocked", after.claimed === after.unlocked);
    check("claim again with nothing unlocked fails", await doesRevert(() => asPerson.unlockToken.staticCall(person.address)));

    await (await claim.addUnlocked(person.address, units(250))).wait();
    await (await asPerson.unlockToken(person.address)).wait();
    check("one more month unlocks and pays 250", (await token.contract.balanceOf(person.address)) === units(1750));

    const stranger = await t.newWallet();
    check("wallet without allocation cannot claim", await doesRevert(() => claim.connect(stranger).unlockToken.staticCall(stranger.address)));
}
