const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const {callContract} = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, getBalanceFromStates, generateErrorMsg } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  
  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  const zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  const hiveContract = await deployHive({ hunyAddress, zilswapAddress });
  hiveAddress = hiveContract.address.toLowerCase();
  
  authorityContract = await deployBankAuthority({ initialEpochNumber, hiveAddress, hunyAddress })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({ initialMembers: [address], initialEpochNumber, authorityAddress })
  bankAddress = bankContract.address.toLowerCase()

  const txAddMinter = await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false);

  const txMintCaptain = await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: address,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(1).shiftedBy(12 + 3),
  }], 0, false, false)

  // allow captain to transfer token to bank (spender)
  const txAllowanceCaptain = await callContract(privateKey, hunyContract, "IncreaseAllowance", [{
    vname: 'spender',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: new BigNumber(2).pow(64).minus(1).toString(),
  }], 0, false, false)

  const txMakeHunyDonation = await callContract(privateKey, bankContract, "MakeDonation", [{
    vname: "token",
    type: "ByStr20",
    value: hunyAddress,
  }, {
    vname: "amount",
    type: "Uint128",
    value: ONE_HUNY.toString(10),
  }], 0, false, false)
})

test('captain initiate withdrawal tx with sufficient huny in bank', async () => {
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const txInitiateWithdrawTx = await callContract(privateKey, bankContract, "InitiateTx", [{
    vname: "tx_params",
    type: `${bankAddress}.TxParams`,
    value: {
      constructor: `${bankAddress}.WithdrawTxParams`,
      argtypes: [],
      arguments: [address, hunyAddress, ONE_HUNY.dividedBy(2).toString(10)]
    },
  }, {
    vname: "message",
    type: "String",
    value: "New withdraw request",
  }], 0, false, false)

  const hunyContractStateAfterTx = await hunyContract.getState()
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)

  const bankWithdrawn = bankBalanceBeforeTx - bankBalanceAfterTx
  const captainReceived = captainBalanceAfterTx - captainBalanceBeforeTx

  expect(bankWithdrawn.toString()).toEqual(ONE_HUNY.dividedBy(2).toString(10))
  expect(captainReceived.toString()).toEqual(ONE_HUNY.dividedBy(2).toString(10))
})

test('captain initiate withdrawal tx with insufficient huny in bank', async () => {
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

  const hunyContractStateAfterTx = await hunyContract.getState()

  expect(txInitiateWithdrawTx.status).toEqual(3)
  expect(txInitiateWithdrawTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(7)) // throws CodeInvalidTxInsufficientBalance
  expect(txInitiateWithdrawTx.receipt.success).toEqual(false)

  // tx rollback; check NO huny deduction from bank; NO huny increment for captain
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [captainBalanceBeforeTx, captainBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  expect(bankBalanceBeforeTx).toEqual(bankBalanceAfterTx)
  expect(captainBalanceBeforeTx).toEqual(captainBalanceAfterTx)
})
