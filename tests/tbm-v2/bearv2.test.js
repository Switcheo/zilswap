const { getDefaultAccount, getUserAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2, useNonFungibleToken, deployContract } = require('../../scripts/deploy.js')
const fs = require("fs")
const { zilliqa } = require('../../scripts/zilliqa')

const ZIL_ZEROS = "000000000000"

let contract, key, owner, user1Key, user1
beforeAll(async () => {
  const defaultAccount = getDefaultAccount()
  key = defaultAccount.key
  owner = defaultAccount.address

  const user = getUserAccount()
  user1Key = user.key
  user1 = user.address

  const bearV2 = await useBearV2(key, { owner: owner }, null)
  contract = bearV2[0]

})

test('mint', async () => {
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

  const traits = [["isRevealed", "true"], ["isBull", "false"]]
  const txn6 = await callContract(key, contract, 'SetTokenTraits', [
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
  expect(txn6.status).toEqual(2)

})

test('add giveaway minter', async () => {
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

test('use TranscendenceMinter minter', async () => {
  const bearV1 = await useNonFungibleToken(key, { owner: owner }, null)
  v1Contract = bearV1[0]

  const configureMinterTx = await callContract(
    key, v1Contract,
    'ConfigureMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: owner,
      }
    ],
    0, false, false
  )
  expect(configureMinterTx.status).toEqual(2)

  // mint 10
  for (let i = 0; i < 10; i++) {
    const mintTx = await callContract(
      key, v1Contract,
      'Mint',
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: owner,
        },
        {
          vname: 'token_uri',
          type: 'String',
          value: "",
        },
      ],
      1, false, false
    )
    expect(mintTx.status).toEqual(2)
  }

  const burnCode = await fs.readFileSync('./src/tbm-v2/TranscendenceMinter.scilla')
  const [burnContract, burnState] = await deployContract(key, burnCode.toString("utf8"), [
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
      value: "12",
    },
    {
      vname: 'tbm_address',
      type: 'ByStr20',
      value: v1Contract.address,
    },
  ])

  const txn1 = await callContract(key, contract, 'AddMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: burnContract.address.toLowerCase(),
  }], 0, false, false)
  expect(txn1.status).toEqual(2)

  const txn2 = await callContract(key, v1Contract, 'SetApprovalForAll', [{
    vname: 'to',
    type: 'ByStr20',
    value: burnContract.address.toLowerCase(),
  }], 0, false, false)
  expect(txn2.status).toEqual(2)

  const txn3 = await callContract(key, burnContract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [owner.toLowerCase(), "10"]
      }
    ],
  }], 0, false, false)
  expect(txn3.status).toEqual(2)

  const txn4 = await callContract(key, burnContract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1", "2", "3", "4", "5"],
    },
  ], 0, false, false)
  expect(txn4.status).toEqual(2)
})

test('add sale minter', async () => {
  const smCode = await fs.readFileSync('./src/tbm-v2/V2Minter.scilla')
  const [smContract, smState] = await deployContract(key, smCode.toString("utf8"), [
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
      vname: 'nft_price',
      type: 'Uint128',
      value: ZIL_ZEROS,
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
    value: smContract.address.toLowerCase(),
  }], 0, false, false)
  expect(txn1.status).toEqual(2)

  const txn0 = await callContract(key, smContract, 'EnableSale', [], 0, false, false)
  expect(txn0.status).toEqual(2)

  const txn3 = await callContract(key, smContract, 'MintForCommunity', [
    {
      vname: 'quantity',
      type: 'Uint32',
      value: '1',
    },
  ], 0, false, false)
  expect(txn3.status).toEqual(2)


  // should fail due to max supply
  const txn4 = await callContract(key, smContract, 'MintForCommunity', [
    {
      vname: 'quantity',
      type: 'Uint32',
      value: '2',
    },
  ], 0, false, false)
  expect(txn4.status).toEqual(3)
})
