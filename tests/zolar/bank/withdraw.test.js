const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, deployHuny, deployGuildBank } = require('../../../scripts/zolar/bank/deploy.js');
const {callContract} = require('../../../scripts/call.js')

let privateKey, address, hunyContract, bankContract, hunyAddress, bankAddress

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()
  bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address })
  hunyAddress = hunyContract.address.toLowerCase()
  bankAddress = bankContract.address.toLowerCase()

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
    value: ONE_HUNY.toString(10),
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

  await callContract(privateKey, bankContract, "PayJoiningFee", [], 0, false, false)
})

test('initiate withdrawal tx after new member paid joining fee', async () => {
  const stateBeforeTx = await hunyContract.getState()

  const txInitiateWithdrawTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, ONE_HUNY.toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)

  expect(txInitiateWithdrawTx.status).toEqual(2)
  expect(txInitiateWithdrawTx.receipt.success).toEqual(true)

  const stateAfterTx = await hunyContract.getState()
  const bankBalanceBeforeTx = stateBeforeTx.balances[bankAddress]
  const bankBalanceAfterTx = parseInt(stateAfterTx.balances[bankAddress])
  const bankWithdraw = bankBalanceBeforeTx - bankBalanceAfterTx

  const memberBalanceBeforeTx = parseInt(stateBeforeTx.balances[address])
  const memberBalanceAfterTx = parseInt(stateAfterTx.balances[address])
  const memberReceive = memberBalanceAfterTx - memberBalanceBeforeTx

  expect(bankWithdraw.toString()).toEqual(ONE_HUNY.toString(10))
  expect(memberReceive.toString()).toEqual(ONE_HUNY.toString(10))
})

test('initiate withdrawal tx with insufficient huny in bank', async () => {
  const txInitiateWithdrawTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, ONE_HUNY.toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)

  expect(txInitiateWithdrawTx.status).toEqual(3)
  expect(txInitiateWithdrawTx.receipt.errors["0"]).toContain(7) // CodeInvalidTxInsufficientBalance
  expect(txInitiateWithdrawTx.receipt.success).toEqual(false)
})
