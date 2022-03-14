const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2, useNonFungibleToken, deployContract } = require('../../scripts/deploy.js')
const fs = require("fs")

let contract, key, owner, tbmv1, tbmv2, user1Key, user1, user2Key, user2

beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  ({ key: user1Key, address: user1 } = await createRandomAccount(key));
  ({ key: user2Key, address: user2 } = await createRandomAccount(key));
  [tbmv2, _] = await useBearV2(key, { owner }, null);
})

beforeEach(async() => {
  [tbmv1, _] = await useNonFungibleToken(key, { owner }, null)
  const minterTx1 = await callContract(key, tbmv1, 'ConfigureMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: owner,
  }], 0, false, false)
  expect(minterTx1.status).toEqual(2);

  [contract, _] = await deployTranscendenceMinter()
  const minterTx2 = await callContract(key, tbmv2, 'AddMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: contract.address.toLowerCase(),
  }], 0, false, false)
  expect(minterTx2.status).toEqual(2)

  await mintToUser(user1Key, user1, 5)
  await mintToUser(user2Key, user2, 2)
})

const deployTranscendenceMinter = async () => {
  const code = await fs.readFileSync('./src/tbm-v2/TranscendenceMinter.scilla')
  return deployContract(key, code.toString("utf8"), [
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
      value: tbmv2.address,
    },
    {
      vname: 'max_supply',
      type: 'Uint128',
      value: "3",
    },
    {
      vname: 'tbm_address',
      type: 'ByStr20',
      value: tbmv1.address,
    },
  ])
}

const mintToUser = async (userKey, userAddress, count) => {
  for (let i = 0; i < count; ++i) {
    const mintTx = await callContract(
      key, tbmv1,
      'Mint',
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: userAddress,
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
  const approveTx = await callContract(userKey, tbmv1, 'SetApprovalForAll', [{
    vname: 'to',
    type: 'ByStr20',
    value: contract.address.toLowerCase(),
  }], 0, false, false)
  expect(approveTx.status).toEqual(2)
}

test('tbm-v2 TranscendenceMinter success', async () => {
  const whitelistTx = await callContract(key, contract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [user1, "3"]
      }
    ],
  }], 0, false, false)
  expect(whitelistTx.status).toEqual(2)

  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1", "2", "3"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(2)
})

test('tbm-v2 TranscendenceMinter no whitelist', async () => {
  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -6)") // CodeExceededWhitelistedQuantity
})

test('tbm-v2 TranscendenceMinter exceed whitelist', async () => {
  const whitelistTx = await callContract(key, contract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [user1, "1"]
      }
    ],
  }], 0, false, false)
  expect(whitelistTx.status).toEqual(2)

  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1", "2"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -6)") // CodeExceededWhitelistedQuantity
})

test('tbm-v2 TranscendenceMinter minted full', async () => {
  const whitelistTx = await callContract(key, contract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [user1, "2"]
      }
    ],
  }], 0, false, false)
  expect(whitelistTx.status).toEqual(2)

  const fullTx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1", "2"],
    },
  ], 0, false, false)
  expect(fullTx.status).toEqual(2)


  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["3"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -6)") // CodeExceededWhitelistedQuantity
})

test('tbm-v2 TranscendenceMinter not token owner', async () => {
  const whitelistTx = await callContract(key, contract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [user1, "10"]
      }
    ],
  }], 0, false, false)
  expect(whitelistTx.status).toEqual(2)

  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["6"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -3)") // CodeNotTokenOwner
})

test('tbm-v2 TranscendenceMinter exceed supply', async () => {
  const whitelistTx = await callContract(key, contract, 'SetWhitelist', [{
    vname: 'list',
    type: 'List (Pair ByStr20 Uint32)',
    value: [
      {
        "constructor": "Pair",
        "argtypes": ["ByStr20","Uint32"],
        "arguments": [user1, "10"]
      }
    ],
  }], 0, false, false)
  expect(whitelistTx.status).toEqual(2)

  const tx = await callContract(user1Key, contract, 'Transcend', [
    {
      vname: 'to',
      type: 'ByStr20',
      value: user1,
    },
    {
      vname: 'token_ids',
      type: 'List Uint256',
      value: ["1", "2", "3", "4", "5"],
    },
  ], 0, false, false)
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5)") // CodeExceededMaximumSupply
})
