const { createRandomAccount, getDefaultAccount } = require('../../scripts/account.js')
const { callContract } = require('../../scripts/call.js')
const { useBearV2 } = require('../../scripts/deploy.js')

let contract, key, owner, user1Key, user1
beforeAll(async () => {
  ;({ key, address: owner } = getDefaultAccount());
  [contract, _] = await useBearV2(key, { owner }, null)
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
