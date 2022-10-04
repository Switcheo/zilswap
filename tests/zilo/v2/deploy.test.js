const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight } = require("./utils");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();

  [tknContract] = await deployZRC2Token(key, { decimals: "12" });
  tknAddress = tknContract.address.toLowerCase();

  [zilswapContract] = await deployZilSwap(key);
  zilswapAddress = zilswapContract.address.toLowerCase();
});

test('deploy seedLP successfully', async () => {
  const [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
});

// test success
test('deploy ZILO successfully', async () => {
  const [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
  const seedLPAddress = seedLPContract.address.toLowerCase();
  const currentBlockHeight = await getLatestBlockHeight();

  const [contract] = await deployZilo(key, {
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
    startBlock: `${10 + currentBlockHeight}`,
    endBlock: `${110 + currentBlockHeight}`,
    discountBps: "500",
  });
  expect(contract.address).toBeDefined();

  const state = await contract.getState();
  expect(state).toEqual({
    "_balance": "0",
    "discount_whitelist": {},
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

test('deploy ZILO with whitelist successfully', async () => {
  const [seedLPContract] = await deployZiloSeedLP(key, {
    tokenAddress: tknAddress, zilswapAddress,
  });
  const seedLPAddress = seedLPContract.address.toLowerCase();
  const currentBlockHeight = await getLatestBlockHeight();

  const [contract] = await deployZilo(key, {
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
    startBlock: `${10 + currentBlockHeight}`,
    endBlock: `${110 + currentBlockHeight}`,
    discountBps: "500",
    discountWhitelist: [owner],
  });
  expect(contract.address).toBeDefined();

  const state = await contract.getState();
  expect(state).toEqual({
    "_balance": "0",
    "discount_whitelist": {
      [owner]: {
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
