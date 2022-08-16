const { getDefaultAccount, createRandomAccount } = require('../../../scripts/account');
const { callContract } = require('../../../scripts/call')
const { ONE_HUNY, initialEpochNumber } = require("./config");
const { deployHuny, deployZilswap, deployRefinery, deployHive, deployBankAuthority, deployGuildBank, generateFee, generateErrorMsg } = require("./helper")

let privateKey, address, memberAddress, officerOneAddress, officerTwoAddress, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

const epoch_one = initialEpochNumber
const epoch_two = epoch_one + 1
const epoch_three = epoch_two + 1
const epoch_four = epoch_three + 1

beforeAll(async () => {
  ; ({ key: privateKey, address } = getDefaultAccount())
    ; ({ address: memberAddress } = await createRandomAccount(privateKey, '1000'))
    ; ({ address: officerOneAddress } = await createRandomAccount(privateKey, '1000'))
    ; ({ address: officerTwoAddress } = await createRandomAccount(privateKey, '1000'))

  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  const zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  const refineryContract = await deployRefinery({ hunyAddress });
  refineryAddress = refineryContract.address.toLowerCase();

  const hiveContract = await deployHive({ hunyAddress, zilswapAddress, refineryAddress });
  hiveAddress = hiveContract.address.toLowerCase();
})

test('deploy Authority contract', async () => {
  authorityContract = await deployBankAuthority({
    initialEpochNumber: epoch_one,
    hiveAddress, hunyAddress
  });

  expect(authorityContract.address).toBeDefined()
  authorityAddress = authorityContract.address.toLowerCase()

  const state = await authorityContract.getState()

  expect(state.current_epoch).toEqual(epoch_one.toString())
  expect(state.contract_owner.arguments[0]).toEqual(address)
  expect(state.hive).toEqual(hiveAddress)
  expect(state.huny).toEqual(hunyContract.address.toLowerCase())
})

test('advance epoch (+1) in Authority contract', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_two.toString(),
  }], 0, false, false)

  const state = await authorityContract.getState()
  expect(state.current_epoch).toEqual(epoch_two.toString())
})

test('advance epoch (+2) in Authority contract', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: epoch_four.toString(),
  }], 0, false, false)

  expect(txSetEpochNumber.status).toEqual(3)
  expect(txSetEpochNumber.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeWrongEpochNumber
  expect(txSetEpochNumber.receipt.success).toEqual(false)

  const state = await authorityContract.getState()
  expect(state.current_epoch).toEqual(epoch_two.toString())
})

test('deploy GuildBank contract', async () => {
  bankContract = await deployGuildBank({
    initialMembers: [address, officerOneAddress, officerTwoAddress, memberAddress],
    initialOfficers: [officerOneAddress, officerTwoAddress],
    initialEpochNumber: epoch_two,
    authorityAddress
  })

  expect(bankContract.address).toBeDefined()

  bankAddress = bankContract.address.toLowerCase()
  const state = await bankContract.getState()

  const expectedJoiningFee = generateFee(bankAddress, ONE_HUNY.toString(10), "50", "10")
  const expectedWeeklyTax = generateFee(bankAddress, ONE_HUNY.toString(10), "50", "10")

  expect(state.contract_owner.arguments[0]).toEqual(address)
  expect(state.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(state.joining_fee).toMatchObject(expectedJoiningFee)
  expect(state.weekly_tax).toMatchObject(expectedWeeklyTax)
  expect(Object.keys(state.tokens_held).length).toEqual(0)

  expect(Object.keys(state.members).sort()).toEqual([address, memberAddress, officerOneAddress, officerTwoAddress].sort())
  expect(Object.keys(state.officers).sort()).toEqual([officerOneAddress, officerTwoAddress].sort())
})
