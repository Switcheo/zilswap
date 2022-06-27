const { getAddressFromPrivateKey } = require("@zilliqa-js/zilliqa")
const { ZERO_ADDRESS, getPrivateKey, deployHuny, deployGuildBank } = require('../../../scripts/zolar/bank/deploy.js');

let privateKey, address, hunyContract, bankContract

beforeAll(() => {
  privateKey = getPrivateKey();
  address = getAddressFromPrivateKey(privateKey).toLowerCase();
})

test('deploy Huny contract', async () => {
  hunyContract = await deployHuny()
  const state = await hunyContract.getState()
  
  expect(hunyContract.address).toBeDefined()
  expect(state.minters).toEqual({})
  expect(state.total_supply).toEqual('0')
})

test('deploy GuildBank contract', async () => {
  bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address })
  const state = await bankContract.getState()

  expect(bankContract.address).toBeDefined()
  expect(state.joining_fee).toEqual('1000000000000')
  expect(state.weekly_tax).toEqual('1000000000000')
})


