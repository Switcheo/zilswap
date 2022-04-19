const BN = require('bn.js');
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { getBlockNum, callContract } = require('../../scripts/call.js')
const { useZilswap, useHuny, useRefinery, useMagicHive } = require('../../scripts/deploy.js')

let owner, key, user1Key, user1, user2Key, user2,
    zilswap, magicHive, refinery, huny;

beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  ({ key: user1Key, address: user1 } = await createRandomAccount(key, '100000'));
  ({ key: user2Key, address: user2 } = await createRandomAccount(key, '100000'));
  [zilswap, state] = await useZilswap(key);
  [huny, _] = await useHuny(key, { owner, initSupply: new BN("10000000000000000000") }); // 100k
  [refinery, _] = await useRefinery(key, { owner, huny });
  [magicHive, _] = await useMagicHive(key, { owner, huny, refinery, zilswap, rewardStartBlock: (await getBlockNum()) });
  await allowRefineryToMint()
  await allowMagicHiveToRefine()
  await mintToUser(user1Key, user1)
  await mintToUser(user2Key, user2)
})

const allowRefineryToMint = async () => {
  const allowRefineryToMintTx = await callContract(key, huny, 'AddMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: refinery.address.toLowerCase(),
  }], 0, false, false)
  expect(allowRefineryToMintTx.status).toEqual(2)
}

const allowMagicHiveToRefine = async () => {
  const allowMagicHiveToRefineTx = await callContract(key, refinery, 'AddHarvester', [
    {
      vname: 'address',
      type: 'ByStr20',
      value: magicHive.address.toLowerCase(),
    },
    {
      vname: 'required_refinement_percentage',
      type: 'Uint128',
      value: '75',
    },
    {
      vname: 'blocks_to_reduce_required_refinement',
      type: 'Uint128',
      value: '2520',
    },
  ], 0, false, false)
  expect(allowMagicHiveToRefineTx.status).toEqual(2)
}

const mintToUser = async (userKey, userAddress, amount = '10000000000000000') => { // 10000
  const txn = await callContract(
    key, huny,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: userAddress,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: amount,
      },
    ],
    0, false, false
  )
  expect(txn.status).toEqual(2)

  const approve = await callContract(
    userKey, huny,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: magicHive.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000000000000000000',
      },
    ],
    0, false, false
  )
  expect(approve.status).toEqual(2)
}

test('magichive AddLiquidity success', async () => {
  // test amts
  const zilAmount = '1880000000000000' // 1880
  const tokenAmount = '1500000000000000' // 1500

  const addTxn = await callContract(
    user1Key, magicHive,
    "AddLiquidity",
    [
      {
        vname: 'min_contribution_amount',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'max_token_amount',
        type: 'Uint128',
        value: tokenAmount,
      },
    ],
    1880, false)
  expect(addTxn.status).toEqual(2)

  const state = await zilswap.getState()
  expect(state.pools[huny.address.toLowerCase()]).toEqual({
    "argtypes": [],
    "arguments": [
      zilAmount,
      tokenAmount
    ],
    "constructor": `${zilswap.address.toLowerCase()}.Pool`
  })
})

// test('magichive RemoveLiquidity success', async () => {
// })

// test('magichive EmergencyRemoveLiquidity success', async () => {
// })

// test('magichive Claim success', async () => {
// })

// test('magichive early unlock success', async () => {
// })
