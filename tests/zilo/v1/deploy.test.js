const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { getBlockNum, nextBlock } = require('../../scripts/call.js');
const { deployZILO, useFungibleToken } = require('../../scripts/deploy.js');

let key, receiver, lp, zwap, tkn
beforeAll(async () => {
  const defaultAcc = getDefaultAccount()
  receiver = defaultAcc.address
  key = defaultAcc.key
  lp = (await createRandomAccount(key)).address
  zwap = (await useFungibleToken(key, { symbol: 'ZWAP' }))[0]
  tkn = (await useFungibleToken(key, { symbol: 'TKN' }))[0]
})

const CONTRACT_INVARIANT_ERR = /.+CREATE_CONTRACT_FAILED.+RUNNER_FAILED/s

const defaultParams = (bNum = 0) => ({
  zwapAddress: zwap.address,
  tokenAddress: tkn.address,
  tokenAmount: '10000',
  targetZilAmount: '10000',
  targetZwapAmount: '10000',
  minimumZilAmount: '1',
  liquidityZilAmount: '0',
  liquidityTokenAmount: '0',
  receiverAddress: receiver,
  liquidityAddress: lp,
  startBlock: (bNum + 1000).toString(),
  endBlock: (bNum + 2000).toString(),
})

// test success
test('deploy ZILO successfully', async () => {
  const bNum = await getBlockNum()
  const [contract, _] = await deployZILO(key, defaultParams(bNum))

  await nextBlock()
  expect(contract.address).toBeDefined()

  const state = await contract.getState()
  expect(state).toEqual({
    "_balance": "0",
    "contributions": {},
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
    "total_contributions": "0",
  })
})

// test invalid amount
test('deploy ZILO invalid amount', async () => {
  expect.assertions(1);
  try {
    await deployZILO(key, {
      ...defaultParams(),
      targetZwapAmount: '0',
    })
  } catch (e) {
    expect(e.message).toMatch(CONTRACT_INVARIANT_ERR);
  }
})

// test bnum in past
test('deploy ZILO invalid start block', async () => {
  expect.assertions(1);
  try {
    await deployZILO(key, {
      ...defaultParams(),
      startBlock: '1',
    })
  } catch (e) {
    expect(e.message).toMatch(CONTRACT_INVARIANT_ERR);
  }
})

// test invalid duration
test('deploy ZILO invalid end block', async () => {
  expect.assertions(1);
  try {
    await deployZILO(key, {
      ...defaultParams(),
      startBlock: '1000',
      endBlock: '999',
    })
  } catch (e) {
    expect(e.message).toMatch(CONTRACT_INVARIANT_ERR);
  }
})
