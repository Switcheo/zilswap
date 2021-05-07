const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract, nextBlock } = require('../../scripts/call.js');
const { deployZILO, useFungibleToken } = require('../../scripts/deploy.js');

let owner, lp, user, zwap, tkn
beforeAll(async () => {
  owner = getDefaultAccount()
  lp = await createRandomAccount(owner.key)
  user = await createRandomAccount(owner.key)
  zwap = (await useFungibleToken(owner.key, { symbol: 'ZWAP' }))[0]
  tkn = (await useFungibleToken(owner.key, { symbol: 'TKN' }))[0]
  await nextBlock()
})

let zilo
beforeEach(async () => {
  zilo = (await deployZILO(owner.key, defaultParams()))[0]
  await nextBlock()
  // send tokens
  await callContract(
    owner.key, zwap,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: user.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000',
      },
    ],
    0, false, false
  )
  // approve zilo
  await callContract(
    user.key, zwap,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: zilo.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000',
      },
    ],
    0, false, false
  )
})

const defaultParams = () => ({
  zwapAddress: zwap.address,
  tokenAddress: tkn.address,
  tokenAmount: '10000',
  targetZilAmount: '10000',
  targetZwapAmount: '10000',
  minimumZilAmount: '1',
  liquidityZilAmount: '0',
  receiverAddress: owner.address,
  liquidityAddress: lp.address,
  startBlock: '1000',
  endBlock: '2000',
})

// test contributing uninitialized
test('contribute to ZILO before initialized', async () => {
  const tx = await callContract(
    user.key, zilo,
    'Contribute',
    [],
    100, false, false
  )
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5") // CodeCannotContributeNow
})

// test contributing before
test('contribute to ZILO before start', async () => {
  // initialize by sending tkns
  const initTx = await callContract(
    owner.key, tkn,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: zilo.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000',
      },
    ],
    0, false, false
  )
  expect(initTx.status).toEqual(2)
  const state = await zilo.getState()
  expect(state.initialized.constructor).toEqual("True")

  const tx = await callContract(
    user.key, zilo,
    'Contribute',
    [],
    100, false, false
  )
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5") // CodeCannotContributeNow
})

// test contributing during

// test contributing after