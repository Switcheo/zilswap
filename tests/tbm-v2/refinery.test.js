const { default: BigNumber } = require('bignumber.js');
const BN = require('bn.js');
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { callContract, nextBlock, getBlockNum } = require('../../scripts/call.js')
const { useHuny, useRefinery } = require('../../scripts/deploy.js')

let owner, key, user1Key, user1, user2Key, user2,
    magicHive, refinery, huny;

beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  ;({ key: user1Key, address: user1 } = await createRandomAccount(key, '100000'));
  ({ key: user2Key, address: user2 } = await createRandomAccount(key, '100000'));
  magicHive = user1; // cheat code!
  [huny, _] = await useHuny(key, { owner, initSupply: new BN("10000000000000000000") }); // 100k
  [refinery, _] = await useRefinery(key, { owner, huny });
  await allowRefineryToMint()
  await allowMagicHiveToRefine()
  await setMagicHiveKickbackOnRefinery()
})

beforeEach(async () => {
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
      value: magicHive,
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

const setMagicHiveKickbackOnRefinery = async () => {
  const setMagicHiveKickbackOnRefineryTx = await callContract(key, refinery, 'SetMagicHiveKickback', [
    {
      vname: 'kickback',
      type: 'Pair ByStr20 Uint128',
      value: {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint128"],
        "arguments": [magicHive, '80']
      },
    }
  ], 0, false, false)
  expect(setMagicHiveKickbackOnRefineryTx.status).toEqual(2)
}

test('refinery refine and claim success', async () => {
  const block = await getBlockNum()
  const refineTxn = await callContract(
    user1Key, refinery,
    "Refine",
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: user2,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000000000000000', // 10k
      },
    ],
    0, false, false)
  expect(refineTxn.status).toEqual(2)

  await nextBlock()

  const claimTxn = await callContract(
    user2Key, refinery,
    "Claim",
    [
      {
        vname: 'claim_block',
        type: 'BNum',
        value: block.toString(),
      },
    ],
    0, false, false)
  expect(claimTxn.status).toEqual(2)
})

test('refinery claim success', async () => {

})
