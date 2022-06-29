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

test('change ControlMode from CaptainOnly to CaptainAndTwoOfficers', async () => {
  const stateBeforeTx = await hunyContract.getState()
  expect(stateBeforeTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)

  const txInitiateUpdateGuildSettingsTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.UpdateConfigTxParams`,
      argtypes: [],
      arguments: [{
        constructor: `${bankAddress}.GuildBankSettings`,
        argtypes: [],
        arguments: [
          ONE_HUNY.toString(10),
          ONE_HUNY.toString(10), {
            constructor: `${bankAddress}.CaptainAndTwoOfficers`,
            argtypes: [],
            arguments: [],
          },
        ],
      }],
    },
  }, {
    vname: "message",
    type: "String",
    value: "Change control mode to Captain + two Officers",
  }], 0, false, false)

  expect(txInitiateUpdateGuildSettingsTx.status).toEqual(2)
  expect(txInitiateUpdateGuildSettingsTx.receipt.success).toEqual(true)
  
  const stateAfterTx = await bankContract.getState()
  expect(stateAfterTx.control_mode.constructor).toEqual(`${bankAddress}.CaptainAndTwoOfficers`)
})

test('initiate withdrawal tx with updated ControlMode', async () => {
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

  // Nothing withdrawn; pending sig from 2 officers
  const stateAfterTx = await hunyContract.getState()
  const bankBalanceBeforeTx = stateBeforeTx.balances[bankAddress]
  const bankBalanceAfterTx = stateAfterTx.balances[bankAddress]

  const memberBalanceBeforeTx = stateBeforeTx.balances[address]
  const memberBalanceAfterTx = stateAfterTx.balances[address]

  expect(bankBalanceBeforeTx).toEqual(bankBalanceAfterTx)
  expect(memberBalanceBeforeTx).toEqual(memberBalanceAfterTx)
})

test('cancel pending withdrawal tx', async () => {
  const txCancelTx = await callContract(privateKey, bankContract, "CancelTx", [], 0, false, false)

  expect(txCancelTx.status).toEqual(2)
  expect(txCancelTx.receipt.success).toEqual(true)
  // KIV more assertions
})