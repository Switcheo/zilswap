const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { callContract, getBlockNum } = require('../../scripts/call.js')
const { useBearV2, useNonFungibleToken, useTranscendenceMinter } = require('../../scripts/deploy.js')

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

  [contract, _] = await useTranscendenceMinter(key, { tbmv1, tbmv2 }, null)
  const minterTx2 = await callContract(key, tbmv2, 'AddMinter', [{
    vname: 'minter',
    type: 'ByStr20',
    value: contract.address.toLowerCase(),
  }], 0, false, false)
  expect(minterTx2.status).toEqual(2)

  await mintToUser(user1Key, user1, 5)
  await mintToUser(user2Key, user2, 2)
})

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

test('zolar TranscendenceMinter success', async () => {
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

  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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

test('zolar TranscendenceMinter mint not active transcend', async () => {
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
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeMintNotActive
})

test('zolar TranscendenceMinter mint disabled transcend', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

  const disableMintTx = await callContract(key, contract, 'DisableMint', [], 0, false, false)
  expect(disableMintTx.status).toEqual(2)

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
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeMintNotActive
})

test('zolar TranscendenceMinter mint transcend before start block', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: (blkNumber + 10e8).toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeMintNotActive
})

test('zolar TranscendenceMinter mint not inactive enable', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

  const newBlkNumber = await getBlockNum();
  const renableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: newBlkNumber.toString(),
    },
  ], 0, false, false)
  expect(renableMintTx.status).toEqual(3)
  expect(JSON.stringify(renableMintTx.receipt.exceptions)).toContain("code : (Int32 -8)") // CodeMintNotInactive
})

test('zolar TranscendenceMinter mint not active disable', async () => {
  const disableMintTx = await callContract(key, contract, 'DisableMint', [], 0, false, false)
  expect(disableMintTx.status).toEqual(3)
  expect(JSON.stringify(disableMintTx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeMintNotActive
})

test('zolar TranscendenceMinter no whitelist', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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

test('zolar TranscendenceMinter exceed whitelist', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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

test('zolar TranscendenceMinter minted full', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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

test('zolar TranscendenceMinter not token owner', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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

test('zolar TranscendenceMinter exceed supply', async () => {
  const blkNumber = await getBlockNum();
  const enableMintTx = await callContract(key, contract, 'EnableMint', [
    {
      vname: 'start_block',
      type: 'BNum',
      value: blkNumber.toString(),
    },
  ], 0, false, false)
  expect(enableMintTx.status).toEqual(2)

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
