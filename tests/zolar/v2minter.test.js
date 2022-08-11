const { getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2, deployContract } = require('../../scripts/deploy.js')
const fs = require("fs")

const ZIL_ZEROS = "000000000000"

let contract, key, owner
beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  [contract, _] = await useBearV2(key, { owner }, null)
})

test('zolar sale minter', async () => {
  const smCode = await fs.readFileSync('./src/zolar/V2Minter.scilla')
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
