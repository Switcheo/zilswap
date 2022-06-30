const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { default: BigNumber } = require("bignumber.js");
const { ZERO_ADDRESS, ONE_HUNY, getPrivateKey, deployHuny, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const {callContract} = require("../../../scripts/call")
const { getBalanceFromStates } = require("./helper")

let privateKey, address, hunyContract, authorityContract, bankContract

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
  hunyContract = await deployHuny()
  authorityContract = await deployBankAuthority({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address });
  bankContract = await deployGuildBank({ authorityAddress: authorityContract.address })

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

test('join and pay joining fee with sufficient balance', async () => {
  const bankContractStateBeforeTx = await bankContract.getState()
  const hunyContractStateBeforeTx = await hunyContract.getState()

  const txJoinAndPayJoiningFee = await callContract(privateKey, bankContract, "JoinAndPayJoiningFee", [], 0, false, false)

  expect(txJoinAndPayJoiningFee.status).toEqual(2)
  expect(txJoinAndPayJoiningFee.receipt.success).toEqual(true)

  const bankContractStateAfterTx = await bankContract.getState()
  const hunyContractStateAfterTx = await hunyContract.getState()
  
  // check change in membership in bank
  expect(bankContractStateBeforeTx.members).not.toHaveProperty(address)
  expect(bankContractStateAfterTx.members).toHaveProperty(address)
  expect(bankContractStateAfterTx.joining_fee_paid).toMatchObject({[address]: ONE_HUNY.toString(10)})

  // check change in huny balance of member and bank
  const bankAddress = bankContract.address.toLowerCase()
  const [bankBalanceBeforeTx, bankBalanceAfterTx] = getBalanceFromStates(bankAddress, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const [memberBalanceBeforeTx, memberBalanceAfterTx] = getBalanceFromStates(address, hunyContractStateBeforeTx, hunyContractStateAfterTx)
  const bankReceived = bankBalanceAfterTx - bankBalanceBeforeTx
  const memberPaid = memberBalanceBeforeTx - memberBalanceAfterTx
  
  expect(bankReceived.toString()).toEqual(ONE_HUNY.toString(10))
  expect(memberPaid.toString()).toEqual(ONE_HUNY.toString(10))
})