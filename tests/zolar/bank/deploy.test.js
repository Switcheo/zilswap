const { ZERO_ADDRESS, ONE_HUNY, deployHuny, deployGuildBank } = require('../../../scripts/zolar/bank/deploy.js');

let hunyContract, bankContract

beforeAll(async () => {
  hunyContract = await deployHuny()
})

test('deploy GuildBank contract', async () => {
  bankContract = await deployGuildBank({ hiveAddress: ZERO_ADDRESS, hunyAddress: hunyContract.address })
  const bankAddress = bankContract.address.toLowerCase()
  expect(bankAddress).toBeDefined()
  
  const state = await bankContract.getState()
  expect(state.hive).toEqual(ZERO_ADDRESS)
  expect(state.joining_fee).toEqual(ONE_HUNY.toString(10))
  expect(state.weekly_tax).toEqual(ONE_HUNY.toString(10))
  expect(state.control_mode.constructor).toEqual(`${bankAddress}.CaptainOnly`)
  expect(state.officers.length).toEqual(0)
})


