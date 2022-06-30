const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { randomAddress, ONE_HUNY, getPrivateKey, initialEpochNumber, newEpochNumber, deployHuny, deployZilswap, deployHive, deployBankAuthority, deployGuildBank } = require("../../../scripts/zolar/bank/deploy");
const { callContract } = require('../../../scripts/call')
const { generateFee } = require("./helper")

let privateKey, address, zilswapAddress, hiveAddress, hunyAddress, authorityAddress, bankAddress, hunyContract, authorityContract, bankContract

const initialMembers = [randomAddress]

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

test('set new epoch number in Authority contract', async () => {
  await callContract(privateKey, authorityContract, "SetEpoch", [{
    vname: "epoch_number",
    type: "Uint32",
    value: newEpochNumber.toString(),
  }], 0, false, false)

  const state = await authorityContract.getState()
  expect(state.current_epoch).toEqual(newEpochNumber.toString())
})

test('deploy GuildBank contract', async () => {
  
  bankContract = await deployGuildBank({ initialMembers, initialEpochNumber: newEpochNumber, authorityAddress })
  expect(bankContract.address).toBeDefined()

  bankAddress = bankContract.address.toLowerCase() 
  const state = await bankContract.getState()
  
  const expectedJoiningFee = generateFee(bankAddress, ONE_HUNY.toString(10), ONE_HUNY.toString(10), newEpochNumber.toString(), "50", "10")
  const expectedWeeklyTax = generateFee(bankAddress, ONE_HUNY.toString(10), ONE_HUNY.toString(10), newEpochNumber.toString(), "50", "10")

  expect(state.contract_owner.arguments[0]).toEqual(address)
  expect(state.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(state.current_joining_fee).toEqual(ONE_HUNY.toString(10))
  expect(state.joining_fee).toMatchObject(expectedJoiningFee) // KIV test
  expect(state.weekly_tax).toMatchObject(expectedWeeklyTax) // KIV test
  expect(Object.keys(state.tokens_held).length).toEqual(0)
  
  expect(Object.keys(state.members).length).toEqual(1)
  expect(state.members).toHaveProperty(randomAddress)
  
  expect(Object.keys(state.officers).length).toEqual(1)
  expect(state.officers).toHaveProperty(randomAddress)

})


