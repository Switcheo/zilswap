
const { createRandomAccount, getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { deployWrappedZIL, deployZilswapV2Router } = require('../../scripts/deploy.js')
const { getContractCodeHash } = require('./helper.js')
const { param } = require("../../scripts/zilliqa");

let router, wZil, ownerKey, feeAddress, randomKey, randomAddress
const feeBps = 1000 // 10%
beforeAll(async () => {
  const codehash = getContractCodeHash("./src/zilswap-v2/ZilSwapPool.scilla");

  const ownerAccount = getDefaultAccount()
  ownerKey = ownerAccount.key

  const feeAccount = await createRandomAccount(ownerKey)
  feeAddress = feeAccount.address

  const randomAccount = await createRandomAccount(ownerKey)
  randomKey = randomAccount.key
  randomAddress = randomAccount.address

  wZil = (await deployWrappedZIL(ownerKey, { name: 'WrappedZIL', symbol: 'WZIL', decimals: 12, initSupply: '100000000000000000000000000000000000000' }))[0]
  router = (await deployZilswapV2Router(ownerKey, { governor: null, codehash, wZil: wZil.address.toLowerCase() }))[0]
})

test('zilswapV2 configurable protocol fees by owner', async () => {
  const tx = await callContract(
    ownerKey, router,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${feeAddress}`, `${feeBps}`]
      })
    ],
    0, false, false
  )
  expect(tx.status).toEqual(2)

  let state = await router.getState()
  console.log(state)
  expect(state.fee_configuration).toEqual(
    {
      argtypes: ['ByStr20', 'Uint128'],
      arguments: [`${feeAddress}`, `${feeBps}`],
      constructor: 'Pair'
    }
  )
})

test('zilswapV2 non-owner cannot configure fees', async () => {
  const tx = await callContract(
    randomKey, router,
    'SetFeeConfiguration',
    [
      param('config', 'Pair ByStr20 Uint128', {
        "constructor": "Pair",
        "argtypes": ["ByStr20", "Uint128"],
        "arguments": [`${randomAddress}`, `${feeBps}`]
      })
    ],
    0, false, false
  )
  expect(tx.status).toEqual(3)

  let state = await router.getState()
  expect(state.fee_configuration).toEqual(
    {
      argtypes: ['ByStr20', 'Uint128'],
      arguments: [`${feeAddress}`, `${feeBps}`],
      constructor: 'Pair'
    }
  )
})
