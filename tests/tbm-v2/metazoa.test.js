const { getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2, deployContract } = require('../../scripts/deploy.js')
const fs = require("fs")

let contract, key, owner
beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  [contract, _] = await useBearV2(key, { owner }, null)
})

test('tbm-v2 mint, pause, unpause', async () => {
  const txn2 = await callContract(key, contract, 'Mint', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: '',
    },
  ], 0, false, false)
  expect(txn2.status).toEqual(2)

  const txn3 = await callContract(key, contract, 'Pause', [], 0, false, false)
  expect(txn3.status).toEqual(2)

  const txn4 = await callContract(key, contract, 'Mint', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: '',
    },
  ], 0, false, false)
  expect(txn4.status).toEqual(3)

  const txn5 = await callContract(key, contract, 'Unpause', [], 0, false, false)
  expect(txn5.status).toEqual(2)

  const txn6 = await callContract(key, contract, 'Mint', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: '',
    },
  ], 0, false, false)
  expect(txn6.status).toEqual(2)
})

test('tbm-v2 SetTokenTraits', async () => {
  const tx1 = await callContract(key, contract, 'Mint', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: '',
    },
  ], 0, false, false)
  expect(tx1.status).toEqual(2)

  const traits = [["isRevealed", "true"], ["isBull", "false"]]
  const tx2 = await callContract(key, contract, 'SetTokenTraits', [
    {
      vname: 'token_id',
      type: 'Uint256',
      value: '1',
    },
    {
      vname: 'proposed_traits',
      type: 'List (Pair String String)',
      value: traits.map((pair) => ({
        constructor: 'Pair',
        argtypes: ['String', 'String'],
        arguments: [pair[0], pair[1]],
      })),
    },
  ], 0, false, false)
  expect(tx2.status).toEqual(2)
})

test('tbm-v2 giveaway minter', async () => {
  const gmCode = await fs.readFileSync('./src/tbm-v2/GiveawayMinterV2.scilla')
  const [gmContract, gmState] = await deployContract(key, gmCode.toString("utf8"), [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'nft_address',
      type: 'ByStr20',
      value: contract.address,
    },
    {
      vname: 'max_supply',
      type: 'Uint128',
      value: "2",
    },
  ])

  const txn1 = await callContract(key, contract, 'AddMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: gmContract.address.toLowerCase(),
  }], 0, false, false)
  expect(txn1.status).toEqual(2)

  const txn3 = await callContract(key, gmContract, 'MintForCommunity', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'quantity',
      type: 'Uint32',
      value: '1',
    },
  ], 0, false, false)
  expect(txn3.status).toEqual(2)


  // should fail due to max supply
  const txn4 = await callContract(key, gmContract, 'MintForCommunity', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'quantity',
      type: 'Uint32',
      value: '2',
    },
  ], 0, false, false)
  expect(txn4.status).toEqual(3)
})
