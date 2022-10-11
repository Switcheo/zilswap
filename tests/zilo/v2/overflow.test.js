const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight, createRandomAccount } = require("../../../scripts/utils");
const { default: BigNumber } = require("bignumber.js");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner;
let user1, user2;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
let seedLPContract, seedLPAddress;
let ziloContract, ziloAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();

  user1 = await createRandomAccount(key, "70001000");
  user2 = await createRandomAccount(key, "70001000");

  [tknContract] = await deployZRC2Token(key, { decimals: "12" });
  tknAddress = tknContract.address.toLowerCase();

  [zilswapContract] = await deployZilSwap(key);
  zilswapAddress = zilswapContract.address.toLowerCase();

  await callContract(key, zilswapContract, "Initialize");

  [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
  seedLPAddress = seedLPContract.address.toLowerCase();

  const currentBlockHeight = await getLatestBlockHeight();

  [ziloContract] = await deployZilo(key, {
    tokenAddress: tknAddress,
    tokenAmount: "138600000" + tknDecimals,
    targetZilAmount: "117810000" + zilDecimals,
    minZilAmount: "23562000" + zilDecimals,
    lpZilAmount: "58905000" + zilDecimals,
    lpTokenAmount: "58905000" + tknDecimals,
    treasuryZilAmount: "17671500" + zilDecimals,
    treasuryAddress: owner,
    receiverAddress: owner,
    liquidityAddress: seedLPAddress,
    startBlock: `${currentBlockHeight + 3}`,
    endBlock: `${currentBlockHeight + 10}`,
    discountBps: "500",
    discountWhitelist: [],
  });
  ziloAddress = ziloContract.address.toLowerCase();

  await callContract(key, tknContract, "Mint", [
    param("recipient", "ByStr20", owner),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  await callContract(key, tknContract, "Transfer", [
    param("to", "ByStr20", ziloAddress),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);
});

test('zilo should distribute with pro-rate when overflow', async () => {

  await nextBlock(5);

  const commitAmount = 70000000;

  await callContract(key, ziloContract, "Contribute", [], { amount: commitAmount + zilDecimals });
  await callContract(user1.key, ziloContract, "Contribute", [], { amount: commitAmount + zilDecimals });
  await callContract(user2.key, ziloContract, "Contribute", [], { amount: commitAmount + zilDecimals });

  await nextBlock(10);

  const tx = await callContract(key, ziloContract, "Claim");

  expect(tx.status).toEqual(2);

  const completedEvent = tx.receipt.event_logs.find(ev => ev._eventname === "Completed");
  expect(completedEvent?._eventname).toEqual("Completed");

  const distributedEvent = tx.receipt.event_logs.find(ev => ev._eventname === "Distributed");
  const distributedAmount = distributedEvent?.params?.find(p => p.vname === "amount")?.value;
  const totalCommitAmount = commitAmount * 3;
  const individualContributeRate = commitAmount / totalCommitAmount;
  const correctDistributedAmount = ~~(138600000 * individualContributeRate);
  expect(distributedAmount).toEqual(correctDistributedAmount.toString() + tknDecimals);

  const prorate = 117810000 / totalCommitAmount;
  const zilRefundAmount = commitAmount - ~~(prorate * commitAmount);
  const refundedEvent = tx.receipt.event_logs.find(ev => ev._eventname === "Refunded");
  const refundedAmount = refundedEvent?.params?.find(p => p.vname === "zil_amount")?.value;
  expect(refundedAmount).toEqual(new BigNumber(zilRefundAmount + zilDecimals).minus(1).toString(10));

  await callContract(user1.key, ziloContract, "Claim");
  await callContract(user2.key, ziloContract, "Claim");

  const finalizedSubState = await ziloContract.getSubState("finalized");
  expect(finalizedSubState).toEqual({
    "finalized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "True",
    },
  });

  const zilBalanceSubState = await ziloContract.getSubState("_balance");
  expect(zilBalanceSubState?._balance).toEqual("3");
});
