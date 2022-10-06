const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight, createRandomAccount } = require("../../../scripts/utils");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
let seedLPContract, seedLPAddress;
let ziloContract, ziloAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();

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

test('zilo should complete when zil is pass minimum', async () => {

  await nextBlock(5);

  const contributeAmount = (23562000 - 1) + zilDecimals;

  await callContract(key, ziloContract, "Contribute", [], {
    amount: contributeAmount,
  });

  await nextBlock(10);

  const tx = await callContract(key, ziloContract, "Claim");

  expect(tx.status).toEqual(2);

  const completedEvent = tx.receipt.event_logs.find(ev => ev._eventname === "Failed");
  expect(completedEvent?._eventname).toEqual("Failed");

  const refundedEvent = tx.receipt.event_logs.find(ev => ev._eventname === "Refunded");
  const refundedAmount = refundedEvent?.params?.find(p => p.vname === "zil_amount")?.value;
  expect(refundedAmount).toEqual(contributeAmount);

  const returnTokenEvent = tx.receipt.event_logs.find(ev => ev._eventname === "TransferSuccess");
  const returnTokenAmount = returnTokenEvent?.params?.find(p => p.vname === "amount")?.value;
  expect(returnTokenAmount).toEqual((138600000 + 58905000) + tknDecimals);

  const finalizedSubState = await ziloContract.getSubState("finalized");
  expect(finalizedSubState).toEqual({
    "finalized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "True",
    },
  });

  const zilBalanceSubState = await ziloContract.getSubState("_balance");
  expect(zilBalanceSubState?._balance).toEqual("0");
});
