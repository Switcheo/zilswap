const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, deployHuny, deployGuildBank } = require('../../../scripts/zolar/bank/deploy.js');
const {callContract} = require('../../../scripts/call.js')

let privateKey, address, hunyContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()
  bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address })

  await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankContract.address.toLowerCase(),
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)
})

test('pay joining fee', async () => {
  const stateBeforeTx = await hunyContract.getState()
  const txPayJoiningFee = await callContract(privateKey, bankContract, "PayJoiningFee", [], 0, false, false)
  const stateAfterTx = await hunyContract.getState()
   
  expect(txPayJoiningFee.status).toEqual(2)
  expect(txPayJoiningFee.receipt.success).toEqual(true)
  
  const bankAddress = bankContract.address.toLowerCase()
  const bankBalanceBeforeTx = parseInt(stateBeforeTx.balances[bankAddress] ?? "0" )
  const bankBalanceAfterTx = parseInt(stateAfterTx.balances[bankAddress])
  const bankReceive = bankBalanceAfterTx - bankBalanceBeforeTx

  const memberBalanceBeforeTx = parseInt(stateBeforeTx.balances[address])
  const memberBalanceAfterTx = parseInt(stateAfterTx.balances[address])
  const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
  
  expect(bankReceive.toString()).toEqual(ONE_HUNY.toString(10))
  expect(memberPaid.toString()).toEqual(ONE_HUNY.toString(10))
})


