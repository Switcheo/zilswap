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
})

const defaultParams = (bNum = 0) => ({
  zwapAddress: zwap.address,
  tokenAddress: tkn.address,
  tokenAmount:      '1000000000000000',
  targetZilAmount:  '1000000000000000',
  targetZwapAmount: '1000000000000000',
  minimumZilAmount:                '1',
  liquidityZilAmount:              '0',
  liquidityTokenAmount:            '0',
  receiverAddress: owner.address,
  liquidityAddress: lp.address,
  startBlock: (bNum + 100).toString(),
  endBlock: (bNum + 200).toString(),
})

// test contributing uninitialized
test('contribute to ZILO before initialized', async () => {
  const tx = await callContract(
    user.key, zilo,
    'Contribute',
    [],
    100, false, false
  )
  expect(tx.status).toEqual(3)
  expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5)") // CodeCannotContributeNow
})

describe('contribute to ZILO', () => {
  describe('after initialized', () => {
    beforeEach(async() => {
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
            value: '1000000000000000',
          },
        ],
        0, false, false
      )
      expect(initTx.status).toEqual(2)
      const state = await zilo.getState()
      expect(state.initialized.constructor).toEqual("True")
    })

    test('before start', async () => {
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        100, false, false
      )
      expect(tx.status).toEqual(3)
      expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5)") // CodeCannotContributeNow
    })

    describe('after started, before ending', () => {
      beforeEach(async() => {
        await nextBlock(101)
      })

      test('below cap', async () => {
        const tx = await callContract(
          user.key, zilo,
          'Contribute',
          [],
          1, false, false
        )
        expect(tx.status).toEqual(2)
      })


      test('above cap', async () => {
        const tx = await callContract(
          user.key, zilo,
          'Contribute',
          [],
          1001, false, false
        )
        expect(tx.status).toEqual(3)
        expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -2)") // CodeAmountTooLarge
      })
    })

    test('contribute to ZILO after end', async () => {
      await nextBlock(201)

      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        100, false, false
      )
      expect(tx.status).toEqual(3)
      expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5)") // CodeCannotContributeNow
    })
  })

})