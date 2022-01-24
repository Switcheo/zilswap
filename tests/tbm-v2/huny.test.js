const { createRandomAccount, getDefaultAccount, getUserAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2 } = require('../../scripts/deploy.js')

let contract, key, owner, user1Key, user1
beforeAll(async () => {
    const defaultAccount = getDefaultAccount()
    key = defaultAccount.key
    owner = defaultAccount.address

    const user = getUserAccount()
    user1Key = user.key
    user1 = user.address

    const nonFungibleToken = await useBearV2(key, { owner: owner }, null)
    contract = nonFungibleToken[0]
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