const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, deployHuny, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require('../../../scripts/call')
const { getBalanceFromStates, generateErrorMsg } = require("./helper")

let privateKey, address, hunyContract, authorityContract, bankContract, hunyAddress, bankAddress

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()
  authorityContract = await deployBankAuthority({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address });
  bankContract = await deployGuildBank({ authorityAddress: authorityContract.address })
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

  await callContract(privateKey, bankContract, "JoinAndPayJoiningFee", [], 0, false, false)
})

test('captain initiate withdrawal tx with sufficient huny in bank', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()

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

  const hunyContractStateAfterTx = await hunyContract.getState()
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const bankWithdrawn = bankBalanceBeforeTx - bankBalanceAfterTx
  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx

  expect(bankWithdrawn.toString()).toEqual(ONE_HUNY.toString(10))
  expect(captainReceived.toString()).toEqual(ONE_HUNY.toString(10))
})

test('captain initiate withdrawal tx with insufficient huny in bank', async () => {
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
  expect(txInitiateWithdrawTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(7)) // CodeInvalidTxInsufficientBalance
  expect(txInitiateWithdrawTx.receipt.success).toEqual(false)
})
