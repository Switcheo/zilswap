const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { callContract } = require('../../../scripts/call')
const { randomAddress, ONE_HUNY, initialEpochNumber } = require("./config");
const { getPrivateKey, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank, generateFee, generateErrorMsg } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

const newEpochNumber = initialEpochNumber + 1

beforeAll(async () => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase()
  
  hunyContract = await deployHuny()
  hunyAddress = hunyContract.address.toLowerCase()

  const zilswapContract = await deployZilswap();
  zilswapAddress = zilswapContract.address;

  const hiveContract = await deployHive({ hunyAddress, zilswapAddress });
  hiveAddress = hiveContract.address.toLowerCase();
})

test('deploy Authority contract', async () => {
  authorityContract = await deployBankAuthority({ initialEpochNumber, hiveAddress, hunyAddress });

  expect(authorityContract.address).toBeDefined()
  authorityAddress = authorityContract.address.toLowerCase()

  const state = await authorityContract.getState()

  expect(state.current_epoch).toEqual(initialEpochNumber.toString())
  expect(state.contract_owner.arguments[0]).toEqual(address)
  expect(state.hive).toEqual(hiveAddress)
  expect(state.huny).toEqual(hunyContract.address.toLowerCase())
})

test('set new epoch number (= intialEpoch + 1) in Authority contract', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: newEpochNumber.toString(),
  }], 0, false, false)

  const state = await authorityContract.getState()
  expect(state.current_epoch).toEqual(newEpochNumber.toString())
})

test('set new epoch number (= intialEpoch + 3) in Authority contract', async () => {
  const txSetEpochNumber = await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: (newEpochNumber + 2).toString(),
  }], 0, false, false)

  expect(txSetEpochNumber.status).toEqual(3)
  expect(txSetEpochNumber.receipt.exceptions[0].message).toEqual(generateErrorMsg(5)) // throws CodeWrongEpochNumber
  expect(txSetEpochNumber.receipt.success).toEqual(false)
  
  const state = await authorityContract.getState()
  expect(state.current_epoch).toEqual(newEpochNumber.toString())
})


test('deploy GuildBank contract', async () => {
  bankContract = await deployGuildBank({ initialMembers: [randomAddress], initialEpochNumber: newEpochNumber, authorityAddress })
  expect(bankContract.address).toBeDefined()

  bankAddress = bankContract.address.toLowerCase() 
  const state = await bankContract.getState()
  
  const expectedJoiningFee = generateFee(bankAddress, ONE_HUNY.toString(10), ONE_HUNY.toString(10), newEpochNumber.toString(), "50", "10")
  const expectedWeeklyTax = generateFee(bankAddress, ONE_HUNY.toString(10), ONE_HUNY.toString(10), newEpochNumber.toString(), "50", "10")

  expect(state.contract_owner.arguments[0]).toEqual(address)
  expect(state.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(state.current_joining_fee).toEqual(ONE_HUNY.toString(10))
  expect(state.joining_fee).toMatchObject(expectedJoiningFee) 
  expect(state.weekly_tax).toMatchObject(expectedWeeklyTax) 
  expect(Object.keys(state.tokens_held).length).toEqual(0)
  
  expect(Object.keys(state.members).length).toEqual(1)
  expect(state.members).toHaveProperty(randomAddress)
  
  expect(Object.keys(state.officers).length).toEqual(1)
  expect(state.officers).toHaveProperty(randomAddress)
})


