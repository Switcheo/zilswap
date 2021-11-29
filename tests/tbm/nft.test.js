const { createRandomAccount, getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useNonFungibleToken } = require('../../scripts/deploy.js')

let contract, key, owner, newOwner
beforeAll(async () => {
    const defaultAccount = getDefaultAccount()
    key = defaultAccount.key
    owner = defaultAccount.address

    const newAccount = await createRandomAccount(key, '1')
    newOwner = newAccount.address

    const nonFungibleToken = await useNonFungibleToken(key, { owner: owner }, null)
    contract = nonFungibleToken[0]
})

test('toggle sale active', async () => {
    const txn = await callContract(key, contract, 'ConfigureMinters', [owner.toLowerCase()], 0, false, false)
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
            }
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
    expect(txn.status).toEqual(3)
})

test('transfer when unlocked', async () => {
    const txn1 = await callContract(key, contract, 'UnlockTokens', [], 0, false, false)
    expect(txn1.status).toEqual(2)

    const txn2 = await callContract(
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
    expect(txn2.status).toEqual(2)
})