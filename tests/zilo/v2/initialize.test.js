const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight, createRandomAccount } = require("../../../scripts/utils");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
let seedLPContract, seedLPAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();

  [tknContract] = await deployZRC2Token(key, { decimals: "12" });
  tknAddress = tknContract.address.toLowerCase();

  [zilswapContract] = await deployZilSwap(key);
  zilswapAddress = zilswapContract.address.toLowerCase();

  [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
  seedLPAddress = seedLPContract.address.toLowerCase();
});

test('zilo should initialize with correct tokens', async () => {
  const currentBlockHeight = await getLatestBlockHeight();

  const [ziloContract] = await deployZilo(key, {
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
    endBlock: `${currentBlockHeight + 100}`,
    discountBps: "500",
    discountWhitelist: [],
  });
  const ziloAddress = ziloContract.address.toLowerCase();

  await callContract(key, tknContract, "Mint", [
    param("recipient", "ByStr20", owner),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  const tx = await callContract(key, tknContract, "Transfer", [
    param("to", "ByStr20", ziloAddress),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  expect(tx.status).toEqual(2);

  const initializedSubState = await ziloContract.getSubState("initialized");
  expect(initializedSubState).toEqual({
    "initialized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "True",
    },
  });
});

test('throw error when initailizing with incorrect tokens', async () => {
  const currentBlockHeight = await getLatestBlockHeight();

  const [ziloContract] = await deployZilo(key, {
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
    endBlock: `${currentBlockHeight + 100}`,
    discountBps: "500",
    discountWhitelist: [],
  });
  const ziloAddress = ziloContract.address.toLowerCase();

  await callContract(key, tknContract, "Mint", [
    param("recipient", "ByStr20", owner),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  const tx = await callContract(key, tknContract, "Transfer", [
    param("to", "ByStr20", ziloAddress),
    param("amount", "Uint128", (138600000 + 58905000 - 1) + tknDecimals),
  ]);

  expect(tx.status).toEqual(3);

  const initializedSubState = await ziloContract.getSubState("initialized");
  expect(initializedSubState).toEqual({
    "initialized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "False",
    },
  });
});
