const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, getPrivateKey, deployHuny, deployGuildBank } = require('../../../scripts/zolar/bank/deploy.js');
const {callContract} = require('../../../scripts/call.js')

let privateKey, address, hunyContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()
  bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address })
})

test('add minter', async () => {
  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);
  
  const state = await hunyContract.getState()

  expect(txAddMinter.status).toEqual(2)
  expect(txAddMinter.receipt.success).toEqual(true)
  expect(state.minters).toHaveProperty(address)
})

test('mint huny', async () => {
  const txMint = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)
  

  expect(txMint.status).toEqual(2)
  expect(txMint.receipt.success).toEqual(true)
  // KIV assertion to check balance before and after tx
})

test('increase allowance', async () => {
  const txAllowance = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankContract.address.toLowerCase(),
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
  
  expect(txAllowance.status).toEqual(2)
  expect(txAllowance.receipt.success).toEqual(true)
})

test('pay joining fee', async () => {
  const txPayJoiningFee = await callContract(privateKey, bankContract, "PayJoiningFee", [], 0, false, false)
  
  const state = await hunyContract.getState()

  expect(txPayJoiningFee.status).toEqual(2)
  expect(txPayJoiningFee.receipt.success).toEqual(true)
  expect(state.balances[bankContract.address.toLowerCase()]).toEqual('1000000000000')
})


