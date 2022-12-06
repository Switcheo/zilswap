const { getDefaultAccount } = require('../../../scripts/account');
const { callContract } = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, generateFee, generateUpdateBankSettingArgs, generateErrorMsg, } = require("./helper")

let privateKey, address, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, zilswapContract, refineryContract, hiveContract, hunyContract, authorityContract, bankContract

const CONTROL_MODE = "CaptainOnly"

async function initiateUpdateFee(initiatorPrivateKey, joiningFee, weeklyTax) {
  const args = generateUpdateBankSettingArgs(bankAddress, joiningFee, weeklyTax, CONTROL_MODE)

  const txInitiateUpdateFeeTx = await callContract(initiatorPrivateKey, bankContract, "InitiateTx", args, 0, false, false)

  return txInitiateUpdateFeeTx
}

beforeAll(async () => {
  ; ({ key: privateKey, address } = getDefaultAccount())

  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  refineryContract = await deployRefinery({ hunyAddress });
  refineryAddress = refineryContract.address.toLowerCase();

  hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  hiveAddress = hiveContract.address.toLowerCase();

  authorityContract = await deployBankAuthority({
    initialEpochNumber,
    hiveAddress,
    hunyAddress
  })
  authorityAddress = authorityContract.address.toLowerCase()
  await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: authorityAddress,
  }], 0, false, false)

  bankContract = await deployGuildBank({
    initialMembers: [address],
    initialEpochNumber,
    authorityAddress
  })
  bankAddress = bankContract.address.toLowerCase()
  console.log('bank contract state', await bankContract.getState())

  await callContract(privateKey, hunyContract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: address,
  }], 0, false, false)

  await callContract(privateKey, hunyContract, "Mint", [{
    vname: 'recipient',
    type: 'ByStr20',
    value: bankAddress,
  }, {
    vname: 'amount',
    type: 'Uint128',
    value: ONE_HUNY.shiftedBy(2).toString(10),
  }], 0, false, false)
})

afterEach(async () => {
  // cancel pending tx
  const txCancelPendingTx = await callContract(privateKey, bankContract, "CancelTx", [], 0, false, false)
})

test('validate invalid allocation', async () => {
  const invalidAlloc = ["9999", "1"]  // invalid because sum = 10001bps (> 10000bps)
  const invalidAllocJoiningFee = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    ...invalidAlloc
  )

  const validAllocWeeklyTax = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    "50",
    "10"
  )

  const txInitiateUpdateFeeTx = await initiateUpdateFee(privateKey, invalidAllocJoiningFee, validAllocWeeklyTax)
  console.log('txInitiateUpdateFeeTx id ', bankContract.address, txInitiateUpdateFeeTx.id)

  expect(txInitiateUpdateFeeTx.status).toEqual(3)
  expect(txInitiateUpdateFeeTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(31)) // throws CodeInvalidBankTx
  expect(txInitiateUpdateFeeTx.receipt.success).toEqual(false)
})

test('validate first epoch', async () => {
  const validEpochJoiningFee = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    "50",
    "10"
  )

  const validEpochWeeklyTax = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    "50",
    "10"
  )

  const txInitiateUpdateFeeTx = await initiateUpdateFee(privateKey, validEpochJoiningFee, validEpochWeeklyTax)
  console.log('txInitiateUpdateFeeTx id ', bankContract.address, txInitiateUpdateFeeTx.id)

  expect(txInitiateUpdateFeeTx.status).toEqual(2)
  // TODO: update expectations
  // expect(txInitiateUpdateFeeTx.receipt.success).toEqual(false)
})




