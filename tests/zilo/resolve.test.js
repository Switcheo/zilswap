const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract, getBlockNum, nextBlock } = require('../../scripts/call.js');
const { deployZILO, useFungibleToken } = require('../../scripts/deploy.js');

let owner, lp, user, zwap, tkn
beforeAll(async () => {
  owner = getDefaultAccount()
  lp = await createRandomAccount(owner.key)
  user = await createRandomAccount(owner.key)
  zwap = (await useFungibleToken(owner.key, { symbol: 'ZWAP' }))[0]
  tkn = (await useFungibleToken(owner.key, { symbol: 'TKN' }))[0]
  await nextBlock()
})

let zilo
beforeEach(async () => {
  const bNum = await getBlockNum()
  zilo = (await deployZILO(owner.key, defaultParams(bNum)))[0]
  await nextBlock()
  // send tokens
  await callContract(
    owner.key, zwap,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: user.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000000000000000',
      },
    ],
    0, false, false
  )
  // approve zilo
  await callContract(
    user.key, zwap,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: zilo.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000000000000000',
      },
    ],
    0, false, false
  )
  // initialize by sending tkns
  const initTx = await callContract(
    owner.key, tkn,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: zilo.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '10000000000000000',
      },
    ],
    0, false, false
  )
  expect(initTx.status).toEqual(2)
  const state = await zilo.getState()
  expect(state.initialized.constructor).toEqual("True")
  // wait for start
  await nextBlock(101)
})

const defaultParams = (bNum = 0) => ({
  zwapAddress: zwap.address,
  tokenAddress: tkn.address,
  tokenAmount:      '10000000000000000', // 10000
  targetZilAmount:    '700000000000000', // 700
  targetZwapAmount:   '300000000000000', // 300
  minimumZilAmount:    '10000000000000', // 10
  liquidityZilAmount: '150000000000000', // 150
  receiverAddress: owner.address,
  liquidityAddress: lp.address,
  startBlock: (bNum + 100).toString(),
  endBlock: (bNum + 200).toString(),
})

describe('ZILO resolution', () => {
  describe('single contributor', () => {
    test('below cap', async () => {
      // contribute
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        699, false, false
      )
      console.log(JSON.stringify(tx, null, 2))
      expect(tx.status).toEqual(2)

      // wait for end
      await nextBlock(101)

      // finalize
      const finalizeTx = await callContract(
        owner.key, zilo,
        'Complete',
        [],
        0, false, false
      )
      console.log({ finalizeTx: JSON.stringify(finalizeTx, null, 2)})
      console.log(JSON.stringify(finalizeTx, null, 2))
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      // lp shld have 150 zil
      // owner shld have 550 zil

      // claim
      const claimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      console.log({ claimTx: JSON.stringify(claimTx, null, 2)})
      console.log(JSON.stringify(claimTx, null, 2))
      expect(claimTx.status).toEqual(2)

      // check outputs
      // user shld be fully refunded tkn
    })
    test('exactly at cap', async () => {
      // contribute
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        700, false, false
      )
      console.log(JSON.stringify(tx, null, 2))
      expect(tx.status).toEqual(2)

      // wait for end
      await nextBlock(101)

      // finalize
      const finalizeTx = await callContract(
        owner.key, zilo,
        'Complete',
        [],
        0, false, false
      )
      console.log({ finalizeTx: JSON.stringify(finalizeTx, null, 2)})
      console.log(JSON.stringify(finalizeTx, null, 2))
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      // lp shld have 150 zil
      // owner shld have 550 zil

      // claim
      const claimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      console.log({ claimTx: JSON.stringify(claimTx, null, 2)})
      console.log(JSON.stringify(claimTx, null, 2))
      expect(claimTx.status).toEqual(2)

      // check outputs
      // user shld have 10,000 tkn
    })
  })

  // describe('multiple contributors', () => {
  //   test('below cap', async () => {
  //   })
  //   test('above cap', async () => {
  //   })
  //   test('exactly at cap', async () => {
  //   })
  //   test('very small amount of zil contributed', async () => {
  //   })
  // })

  // test('small ZWAP ratio', async () => {
  // })

  // test('no contribution to LP', async () => {
  // })

  // randomized test
})
