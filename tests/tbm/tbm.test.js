const { createRandomAccount, getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { deployNonFungibleToken, useNonFungibleToken } = require('../../scripts/deploy.js')

let contract, key, owner, newOwner, newOwnerKey
beforeAll(async () => {
    const defaultAccount = getDefaultAccount()
    key = defaultAccount.key
    owner = defaultAccount.address

    const newAccount = await createRandomAccount(key, '500')
    newOwner = newAccount.address
    newOwnerKey = newAccount.key

    const nonFungibleToken = await useNonFungibleToken(key, { owner: owner }, null)
    console.log('nonFungibleToken', nonFungibleToken)
    contract = nonFungibleToken[0]
})

test('deploy TBM', async () => {
  const [contract, state] = await deployNonFungibleToken(key, { symbol: 'BEAR' })
  expect(contract.address).toBeDefined()
  expect(state.is_token_locked.constructor).toEqual('True')
  expect(state.total_supply).toEqual('0')
})

test('toggle sale active', async () => {
    const txn = await callContract(key, contract, 'ConfigureMinter', [{
        vname: 'minter',
        type: 'ByStr20',
        value: owner,
    }], 0, false, false)
    expect(txn.status).toEqual(2)
})

test('mint token', async () => {
    const txn = await callContract(
        key, contract,
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
    expect(txn.status).toEqual(2)
})

test('transfer when locked', async () => {
    const txn = await callContract(
        key, contract,
        'Transfer',
        [
            {
                vname: 'to',
                type: 'ByStr20',
                value: newOwner,
            },
            {
                vname: 'token_id',
                type: 'Uint256',
                value: '1',
            }
        ],
        0, false, false
    )
    expect(txn.status).toEqual(2)
    const txn2 = await callContract(
        newOwnerKey, contract,
        'Transfer',
        [
            {
                vname: 'to',
                type: 'ByStr20',
                value: owner,
            },
            {
                vname: 'token_id',
                type: 'Uint256',
                value: '1',
            }
        ],
        0, false, false
    )
    expect(txn2.status).toEqual(3)
})

test('transfer when unlocked', async () => {
    const txn1 = await callContract(key, contract, 'UnlockTokens', [], 0, false, false)
    expect(txn1.status).toEqual(2)

    const txn2 = await callContract(
        newOwnerKey, contract,
        'Transfer',
        [
            {
                vname: 'to',
                type: 'ByStr20',
                value: owner,
            },
            {
                vname: 'token_id',
                type: 'Uint256',
                value: '1',
            }
        ],
        0, false, false
    )
    expect(txn2.status).toEqual(2)
})