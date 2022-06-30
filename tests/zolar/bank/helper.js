const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, deployHuny } = require('../../../scripts/zolar/bank/deploy');
const { deployContract } = require('../../../scripts/deploy');
const { callContract } = require('../../../scripts/call')

async function init_control(controlModePower, initialOfficers) {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()

  // deploying GuildBank Contract
  const code = (await fs.promises.readFile('./src/tbm-v2/GuildBank.scilla')).toString()
  const args = [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'initial_hive',
      type: 'ByStr20',
      value: `${ZERO_ADDRESS}`,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: `${hunyContract.address}`,
    },
    {
      vname: 'initial_joining_fee',
      type: 'Uint128',
      value: ONE_HUNY.toString(10),
    },
    {
      vname: 'initial_weekly_tax',
      type: 'Uint128',
      value: ONE_HUNY.toString(10),
    },
    {
      vname: 'initial_control_mode_power',
      type: 'Uint32',
      value: controlModePower,
    },
    {
      vname: 'initial_officers',
      type: 'List ByStr20',
      value: initialOfficers,
    },
  ]

  const [bankContract] = await deployContract(privateKey, code, args)
  
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

  return { privateKey, address, hunyContract, bankContract }
}

function getBalanceFromStates(address, stateBeforeTx, stateAfterTx) {
  const balanceBeforeTx = parseInt(stateBeforeTx.balances[address] ?? "0" )
  const balanceAfterTx = parseInt(stateAfterTx.balances[address] ?? "0")

  return [balanceBeforeTx, balanceAfterTx]
}

function generateErrorMsg(errorCode) {
  return `Exception thrown: (Message [(_exception : (String "Error")) ; (code : (Int32 -${errorCode}))])`
}

exports.init_control = init_control
exports.getBalanceFromStates = getBalanceFromStates
exports.generateErrorMsg = generateErrorMsg