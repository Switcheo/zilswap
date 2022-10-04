const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight, createRandomAccount } = require("./utils");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner;
let user1;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
let seedLPContract, seedLPAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();
  user1 = await createRandomAccount(key, 100000);

  [tknContract] = await deployZRC2Token(key, { decimals: "12" });
  tknAddress = tknContract.address.toLowerCase();

  [zilswapContract] = await deployZilSwap(key);
  zilswapAddress = zilswapContract.address.toLowerCase();

  [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
  seedLPAddress = seedLPContract.address.toLowerCase();
});

test('whitelist initializes successfully from init params', async () => {
  const currentBlockHeight = await getLatestBlockHeight();

  const [ziloContract] = await deployZilo(key, {
    tokenAddress: tknAddress,
    tokenAmount:        "138600000" + tknDecimals,
    targetZilAmount:    "117810000" + zilDecimals,
    minZilAmount:       "23562000" + zilDecimals,
    lpZilAmount:        "58905000" + zilDecimals,
    lpTokenAmount:      "58905000" + tknDecimals,
    treasuryZilAmount:  "17671500" + zilDecimals,
    treasuryAddress: owner,
    receiverAddress: owner,
    liquidityAddress: seedLPAddress,
    startBlock: `${currentBlockHeight + 3}`,
    endBlock: `${currentBlockHeight + 100}`,
    discountBps: "500",
    discountWhitelist: [user1.address],
  });
  const state = await ziloContract.getState();
  expect(state).toEqual({
    "_balance": "0",
    "discount_whitelist": {
      [user1.address]: {
        "argtypes": [],
        "arguments": [],
        "constructor": "True",
      }
    },
    "finalized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "False",
    },
    "initialized": {
      "argtypes": [],
      "arguments": [],
      "constructor": "False",
    },
    "balances": {},
    "total_balance": "0",
    "contributions": {},
    "total_contributions": "0",
  });
});


test('contribute with whitelist get discount successfully', async () => {
  const currentBlockHeight = await getLatestBlockHeight();

  const [ziloContract] = await deployZilo(key, {
    tokenAddress: tknAddress,
    tokenAmount:        "138600000" + tknDecimals,
    targetZilAmount:    "117810000" + zilDecimals,
    minZilAmount:       "23562000" + zilDecimals,
    lpZilAmount:        "58905000" + zilDecimals,
    lpTokenAmount:      "58905000" + tknDecimals,
    treasuryZilAmount:  "17671500" + zilDecimals,
    treasuryAddress: owner,
    receiverAddress: owner,
    liquidityAddress: seedLPAddress,
    startBlock: `${currentBlockHeight + 3}`,
    endBlock: `${currentBlockHeight + 100}`,
    discountBps: "500",
    discountWhitelist: [user1.address],
  });
  const ziloAddress = ziloContract.address.toLowerCase();
  
  await callContract(key, tknContract, "Mint", [
    param("recipient", "ByStr20", owner),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  await callContract(key, tknContract, "Transfer", [
    param("to", "ByStr20", ziloAddress),
    param("amount", "Uint128", (138600000 + 58905000) + tknDecimals),
  ]);

  const zilAmount = 1000;
  const contribution = 1000 / 0.95;
  
  const tx = await callContract(key, ziloContract, "Contribute", [], {
    amount: zilAmount,
  });

  expect(tx.status).toEqual(2);
  
  const state = await ziloContract.getState();

  expect(state.balances?.[user1.address]).toEqual(zilAmount);
  expect(state.total_balance).toEqual(zilAmount);

  expect(state.contributions?.[user1.address]).toEqual(contribution);
  expect(state.total_contributions).toEqual(contribution);
});
