const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { callContract } = require("../../../scripts/call");
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, generateFee, generateUpdateBankSettingArgs, generateErrorMsg, } = require("./helper")

let privateKey, address, zilswapAddress, refineryAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, zilswapContract, refineryContract, hiveContract, hunyContract, authorityContract, bankContract

const FIRST_EPOCH = initialEpochNumber
const CONTROL_MODE = "CaptainOnly"

async function initiateUpdateFee(initiatorPrivateKey, joiningFee, weeklyTax) {
  const args = generateUpdateBankSettingArgs(bankAddress, joiningFee, weeklyTax, CONTROL_MODE)

  const txInitiateUpdateFeeTx = await callContract(initiatorPrivateKey, bankContract, "InitiateTx", args, 0, false, false)

  return txInitiateUpdateFeeTx
}

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();

  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  refineryContract = await deployRefinery({ hunyAddress });
  refineryAddress = refineryContract.address.toLowerCase();

  hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  hiveAddress = hiveContract.address.toLowerCase();

  authorityContract = await deployBankAuthority({
    initialEpochNumber: initialEpochNumber,
    hiveAddress,
    hunyAddress
  })
  authorityAddress = authorityContract.address.toLowerCase()

  bankContract = await deployGuildBank({
    initialMembers: [address],
    initialEpochNumber,
    authorityAddress
  })
  bankAddress = bankContract.address.toLowerCase()
  console.log('bank contract state', await bankContract.getState())
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
    ONE_HUNY.toString(10),
    (FIRST_EPOCH).toString(),
    ...invalidAlloc
  )

  const validAllocWeeklyTax = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    ONE_HUNY.toString(10),
    (FIRST_EPOCH).toString(),
    "50",
    "10"
  )

  const txInitiateUpdateFeeTx = await initiateUpdateFee(privateKey, invalidAllocJoiningFee, validAllocWeeklyTax)
  console.log('txInitiateUpdateFeeTx id ', txInitiateUpdateFeeTx.id)

  expect(txInitiateUpdateFeeTx.status).toEqual(3)
  expect(txInitiateUpdateFeeTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(31)) // throws CodeInvalidBankTx
  expect(txInitiateUpdateFeeTx.receipt.success).toEqual(false)
})

test('validate first epoch', async () => {
  const invalidFirstEpoch = FIRST_EPOCH + 1 // invalid because > last_updated_epoch (= initialEpoch = 1)
  const invalidEpochJoiningFee = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    ONE_HUNY.toString(10),
    invalidFirstEpoch.toString(),
    "50",
    "10"
  )

  const validEpochWeeklyTax = generateFee(
    bankAddress,
    ONE_HUNY.toString(10),
    ONE_HUNY.toString(10),
    (FIRST_EPOCH).toString(),
    "50",
    "10"
  )

  const txInitiateUpdateFeeTx = await initiateUpdateFee(privateKey, invalidEpochJoiningFee, validEpochWeeklyTax)
  console.log('txInitiateUpdateFeeTx id ', txInitiateUpdateFeeTx.id)

  expect(txInitiateUpdateFeeTx.status).toEqual(3)
  expect(txInitiateUpdateFeeTx.receipt.exceptions[0].message).toEqual(generateErrorMsg(31)) // throws CodeInvalidBankTx
  expect(txInitiateUpdateFeeTx.receipt.success).toEqual(false)
})




