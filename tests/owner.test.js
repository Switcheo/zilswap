
const { createRandomAccount, getDefaultAccount } = require('../scripts/account.js')
const { callContract } = require('../scripts/call.js')
const { useZilswap } = require('../scripts/deploy.js')

let contract, origKey, origOwner, newKey, newOwner
beforeEach(async () => {
  const defaultAccount = getDefaultAccount()
  newKey = defaultAccount.key
  newOwner = defaultAccount.address

  const account = await createRandomAccount(newKey)
  origKey = account.key
  origOwner = account.address

  const zilswap = await useZilswap(newKey, { owner: origOwner }, null)
  contract = zilswap[0]
})

test('zilswap transferrable owner', async () => {
  let state = await contract.getState()
  expect(state.owner).toEqual(origOwner)
  expect(state.pending_owner).toEqual('0x0000000000000000000000000000000000000000')

  const txn1 = await callContract(
    origKey, contract,
    'TransferOwnership',
    [
      {
        vname: 'new_owner',
        type: 'ByStr20',
        value: newOwner,
      },
    ],
    0, false, false
  )
  expect(txn1.status).toEqual(2)

  state = await contract.getState()
  expect(state.owner).toEqual(origOwner)
  expect(state.pending_owner).toEqual(newOwner)

  const txn2 = await callContract(
    newKey, contract,
    'AcceptPendingOwnership',
    [], 0, false, false
  )
  expect(txn2.status).toEqual(2)

  state = await contract.getState()
  expect(state.owner).toEqual(newOwner)
  expect(state.pending_owner).toEqual('0x0000000000000000000000000000000000000000')
})

test('zilswap non-owner cannot change owner', async () => {
  let state = await contract.getState()
  expect(state.owner).toEqual(origOwner)
  expect(state.pending_owner).toEqual('0x0000000000000000000000000000000000000000')

  const txn = await callContract(
    newKey, contract,
    'TransferOwnership',
    [
      {
        vname: 'new_owner',
        type: 'ByStr20',
        value: newOwner,
      },
    ],
    0, false, false
  )
  expect(txn.status).toEqual(3)

  state = await contract.getState()
  expect(state.owner).toEqual(origOwner)
  expect(state.pending_owner).toEqual('0x0000000000000000000000000000000000000000')
})
