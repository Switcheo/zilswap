const { deployZRC2Token, deployZilSwap, deployZilo, deployZiloSeedLP } = require("./deploy");
const { getDefaultAccount, nextBlock, ZERO_ADDRESS, callContract, param, getZilliqaInstance, getLatestBlockHeight, createRandomAccount } = require("../../../scripts/utils");

const tknDecimals = "0".repeat(12);
const zilDecimals = "0".repeat(12);

let key, owner, user1, user2;
let tknContract, tknAddress;
let zilswapContract, zilswapAddress;
let seedLPContract, seedLPAddress;
let ziloContract, ziloAddress;
beforeAll(async () => {
  const acc = getDefaultAccount();
  owner = acc.address.toLowerCase();
  key = acc.key;

  await nextBlock();

  user1 = await createRandomAccount(key, 700000);
  user2 = await createRandomAccount(key, 700000);

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
    endBlock: `${currentBlockHeight + 100}`,
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

test('zilo should allow contribute when initialized', async () => {
  await nextBlock(5);

  const tx = await callContract(user1.key, ziloContract, "Contribute", [], {
    amount: "10000" + zilDecimals,
  });

  expect(tx.status).toEqual(2);

  const balancesSubState = await ziloContract.getSubState("balances");
  expect(balancesSubState?.balances).toEqual({
    [user1.address]: "10000" + zilDecimals,
  });

  const totalBalanceSubState = await ziloContract.getSubState("total_balance");
  expect(totalBalanceSubState?.total_balance).toEqual("10000" + zilDecimals);

  const contributionsSubState = await ziloContract.getSubState("contributions");
  expect(contributionsSubState?.contributions).toEqual({
    [user1.address]: "10000" + zilDecimals,
  });

  const totalContributionsSubState = await ziloContract.getSubState("total_contributions");
  expect(totalContributionsSubState?.total_contributions).toEqual("10000" + zilDecimals);
});

test('zilo should compute balances and contributions accurately', async () => {
  await nextBlock(5);

  const tx = await callContract(user2.key, ziloContract, "Contribute", [], {
    amount: "10000" + zilDecimals,
  });

  expect(tx.status).toEqual(2);

  const balancesSubState = await ziloContract.getSubState("balances");
  expect(balancesSubState?.balances).toEqual({
    [user1.address]: "10000" + zilDecimals,
    [user2.address]: "10000" + zilDecimals,
  });

  const totalBalanceSubState = await ziloContract.getSubState("total_balance");
  expect(totalBalanceSubState?.total_balance).toEqual("20000" + zilDecimals);

  const contributionsSubState = await ziloContract.getSubState("contributions");
  expect(contributionsSubState?.contributions).toEqual({
    [user1.address]: "10000" + zilDecimals,
    [user2.address]: "10000" + zilDecimals,
  });

  const totalContributionsSubState = await ziloContract.getSubState("total_contributions");
  expect(totalContributionsSubState?.total_contributions).toEqual("20000" + zilDecimals);
});


test('zilo should add balances and contributions accurately when user contributes more than once', async () => {
  await nextBlock(5);

  const tx = await callContract(user1.key, ziloContract, "Contribute", [], {
    amount: "10000" + zilDecimals,
  });

  expect(tx.status).toEqual(2);

  const balancesSubState = await ziloContract.getSubState("balances");
  expect(balancesSubState?.balances).toEqual({
    [user1.address]: "20000" + zilDecimals,
    [user2.address]: "10000" + zilDecimals,
  });

  const totalBalanceSubState = await ziloContract.getSubState("total_balance");
  expect(totalBalanceSubState?.total_balance).toEqual("30000" + zilDecimals);

  const contributionsSubState = await ziloContract.getSubState("contributions");
  expect(contributionsSubState?.contributions).toEqual({
    [user1.address]: "20000" + zilDecimals,
    [user2.address]: "10000" + zilDecimals,
  });

  const totalContributionsSubState = await ziloContract.getSubState("total_contributions");
  expect(totalContributionsSubState?.total_contributions).toEqual("30000" + zilDecimals);
});
