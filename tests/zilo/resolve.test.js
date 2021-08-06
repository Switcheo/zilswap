const { BN, units } = require('@zilliqa-js/util')
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract, getBlockNum, nextBlock } = require('../../scripts/call.js');
const { deployZILO, deploySeedLP, useZilswap, useFungibleToken } = require('../../scripts/deploy.js');

let owner, lp, user, zwap, tkn, zilswap
beforeAll(async () => {
  owner = getDefaultAccount()
  lp = await createRandomAccount(owner.key)
  user = await createRandomAccount(owner.key)
  zwap = (await useFungibleToken(owner.key, { symbol: 'ZWAP' }))[0]
  tkn = (await useFungibleToken(owner.key, { symbol: 'TKN' }))[0]
  zilswap = (await useZilswap(owner.key))[0]

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
})

let zilo
beforeEach(async () => {
  zilo = await initZILO()
})

const defaultParams = (bNum = 0) => ({
  zwapAddress: zwap.address,
  tokenAddress: tkn.address,
  tokenAmount:          '10000000000000000', // 10000
  targetZilAmount:        '700000000000000', // 700
  targetZwapAmount:       '300000000000000', // 300
  minimumZilAmount:        '10000000000000', // 10
  liquidityZilAmount:     '150000000000000', // 150
  liquidityTokenAmount:  '1500000000000000', // 1500 // 10 tkn is worth 1 zil
  receiverAddress: owner.address,
  liquidityAddress: lp.address,
  startBlock: (bNum + 100).toString(),
  endBlock: (bNum + 200).toString(),
})

const initZILO = async (params = {}) => {
  const bNum = await getBlockNum()
  const p = { ...defaultParams(bNum), ...params }
  const z = (await deployZILO(owner.key, p))[0]
  // approve zilo
  await callContract(
    user.key, zwap,
    'IncreaseAllowance',
    [
      {
        vname: 'spender',
        type: 'ByStr20',
        value: z.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: p.tokenAmount,
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
        value: z.address,
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: new BN(p.tokenAmount).add(new BN(p.liquidityTokenAmount)).toString(10),
      },
    ],
    0, false, false
  )
  expect(initTx.status).toEqual(2)
  const state = await z.getState()
  expect(state.initialized.constructor).toEqual("True")
  // wait for start
  await nextBlock(101)

  return z
}

describe('ZILO resolution', () => {
  describe('single contributor', () => {
    test('below min', async () => {
      // contribute
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        1, false, false
      )
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
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      expect(finalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo failed event
        {
          "_eventname": "Failed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": "1000000000000", // 1 zil raised
              "vname": "raised_amount"
            }
          ]
        },
        // send owner back his tkns
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": owner.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": "11500000000000000", // 11.5k tkn returned to owner
              "vname": "amount"
            }
          ]
        }
      ]))

      // double finalize
      const doubleFinalizeTx = await callContract(
        owner.key, zilo,
        'Complete',
        [],
        0, false, false
      )
      expect(doubleFinalizeTx.status).toEqual(3)
      expect(JSON.stringify(doubleFinalizeTx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeCannotCompleteNow

      // claim
      const claimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      expect(claimTx.status).toEqual(2)

      // check outputs
      const zil_refund_amount = "1000000000000" // 1 zil
      const zwap_refund_amount = "428571428571" // 1zil * 3zwap/7zil = 0.428571428571 zwap
      expect(claimTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo refund event
        {
          "_eventname": "Refunded",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": zil_refund_amount,
              "vname": "zil_amount"
            },
            {
              "type": "Uint128",
              "value": zwap_refund_amount,
              "vname": "zwap_amount"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "to"
            }
          ]
        },
        // zwap xfer event
        {
          "_eventname": "TransferSuccess",
          "address": zwap.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": zwap_refund_amount,
              "vname": "amount"
            }
          ]
        }
      ]))
      expect(claimTx.receipt.transitions).toEqual(expect.arrayContaining([
        // zil xfer transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": zil_refund_amount,
            "_recipient": user.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        })
      ]))
    })

    test('below cap', async () => {
      // contribute
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        699, false, false
      )
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
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      const raised_amount = '699000000000000'
      // burn 699/700 * 300 = 299.571428571428 zwap
      const burnt_amount = '299571428571428'
      // refund 1/700 * 10k + 1/700 * 1500 = 14.285714285714 + 2.142857142858 = 16.428571428572 tkn
      const refund_amount = '16428571428572'
      // lp shld have 699/700 * 150 = 149.785714285714 zil
      const lp_amount = '149785714285714'
      // lp shld have 699/700 * 1500 = 1497.857142857142 tkn
      const lp_tkn_amount = '1497857142857142'
      // owner shld have 699 - 149.785714285714 = 549.214285714286 zil
      const owner_amount = '549214285714286'

      expect(finalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo completion event
        {
          "_eventname": "Completed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": raised_amount,
              "vname": "raised_amount"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "burnt_amount"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "refund_amount"
            }
          ]
        },
        // tkn send to lp event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": lp.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": lp_tkn_amount,
              "vname": "amount"
            }
          ]
        },
        // tkn refund event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": owner.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "amount"
            }
          ]
        },
        // zwap burn event
        {
          "_eventname": "Burnt",
          "address": zwap.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burner"
            },
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burn_account"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "amount"
            }
          ]
        },
      ]))
      expect(finalizeTx.receipt.transitions).toEqual(expect.arrayContaining([
        // zil xfer to lp transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": lp_amount,
            "_recipient": lp.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        }),
        // zil xfer to owner transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": owner_amount,
            "_recipient": owner.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        })
      ]))

      // double finalize
      const doubleFinalizeTx = await callContract(
        owner.key, zilo,
        'Complete',
        [],
        0, false, false
      )
      expect(doubleFinalizeTx.status).toEqual(3)
      expect(JSON.stringify(doubleFinalizeTx.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeCannotCompleteNow

      // claim
      const claimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      expect(claimTx.status).toEqual(2)

      // check outputs
      // user shld have 699/700 * 10k = 9985.714285714285 tkns
      const user_tkn_amount = '9985714285714285'

      expect(claimTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo distribution event
        {
          "_eventname": "Distributed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": user_tkn_amount,
              "vname": "amount"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "to"
            }
          ]
        },
        // tkn send event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": user_tkn_amount,
              "vname": "amount"
            }
          ]
        },
      ]))
    })

    test('exactly at cap', async () => {
      // contribute
      const tx = await callContract(
        user.key, zilo,
        'Contribute',
        [],
        700, false, false
      )
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
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      const raised_amount = '700000000000000' // 700 zil
      const burnt_amount =  '300000000000000' // 300 zwap
      const lp_amount =     '150000000000000' // 150 zil
      const owner_amount =  '550000000000000' // 550 zil
      const refund_amount = '0'

      expect(finalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo completion event
        {
          "_eventname": "Completed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": raised_amount,
              "vname": "raised_amount"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "burnt_amount"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "refund_amount"
            }
          ]
        },
        // tkn refund event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": owner.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "amount"
            }
          ]
        },
        // zwap burn event
        {
          "_eventname": "Burnt",
          "address": zwap.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burner"
            },
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burn_account"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "amount"
            }
          ]
        },
      ]))
      expect(finalizeTx.receipt.transitions).toEqual(expect.arrayContaining([
        // zil xfer to lp transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": lp_amount,
            "_recipient": lp.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        }),
        // zil xfer to owner transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": owner_amount,
            "_recipient": owner.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        })
      ]))

      // claim
      const claimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      expect(claimTx.status).toEqual(2)

      // check outputs
      // user shld have full 10,000 tkns
      const user_tkn_amount = '10000000000000000'

      expect(claimTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo distribution event
        {
          "_eventname": "Distributed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": user_tkn_amount,
              "vname": "amount"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "to"
            }
          ]
        },
        // tkn send event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": user.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": user_tkn_amount,
              "vname": "amount"
            }
          ]
        },
      ]))

      // double claim
      const doubleClaimTx = await callContract(
        user.key, zilo,
        'Claim',
        [],
        0, false, false
      )
      expect(doubleClaimTx.status).toEqual(3)
      expect(JSON.stringify(doubleClaimTx.receipt.exceptions)).toContain("code : (Int32 -4)") // CodeContributionNotFound
    })
  })

  describe('auto seed lp flow', () => {
    // swap to seed lp
    let lp
    beforeEach(async () => {
      lp = (await deploySeedLP(owner.key, { tokenAddress: tkn.address, zilswapAddress: zilswap.address }))[0]
      // raise the liquidity zil amt to > 1k zils
      zilo = await initZILO({
        tokenAmount:          '100000000000000000', // 10000
        targetZilAmount:        '7000000000000000', // 7000
        targetZwapAmount:       '3000000000000000', // 3000
        minimumZilAmount:        '100000000000000', // 100
        liquidityZilAmount:     '1500000000000000', // 1500
        liquidityTokenAmount:  '15000000000000000', // 15000 // 10 tkn is worth 1 zil
        liquidityAddress:               lp.address,
      })
    })
    describe('when seed lp is disabled', () => {
      test('first user will trigger completion and will send tokens to seed lp', async () => {
        // disable
        const disableTx = await callContract(
          owner.key, lp,
          'Disable',
          [],
          0, false, false
        )
        expect(disableTx.status).toEqual(2)

        // contribute
        const tx = await callContract(
          user.key, zilo,
          'Contribute',
          [],
          7000, false, false
        )
        expect(tx.status).toEqual(2)

        // wait for end
        await nextBlock(101)

        // finalize
        const claimAndFinalizeTx = await callContract(
          user.key, zilo,
          'Claim',
          [],
          0, false, false
        )
        expect(claimAndFinalizeTx.status).toEqual(2)

        // check outputs
        const raised_amount = '7000000000000000' // 7000 zil
        const burnt_amount =  '3000000000000000' // 3000 zwap
        const lp_amount =     '1500000000000000' // 1500 zil
        const owner_amount =  '5500000000000000' // 5500 zil
        const refund_amount = '0'
        // user shld have full 100,000 tkns
        const user_tkn_amount = '100000000000000000'
        const lp_tkn_amount =    '15000000000000000'

        expect(claimAndFinalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
          // zilo completion event
          {
            "_eventname": "Completed",
            "address": zilo.address.toLowerCase(),
            "params": [
              {
                "type": "Uint128",
                "value": raised_amount,
                "vname": "raised_amount"
              },
              {
                "type": "Uint128",
                "value": burnt_amount,
                "vname": "burnt_amount"
              },
              {
                "type": "Uint128",
                "value": refund_amount,
                "vname": "refund_amount"
              }
            ]
          },
          // tkn refund event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": owner.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": refund_amount,
                "vname": "amount"
              }
            ]
          },
          // zwap burn event
          {
            "_eventname": "Burnt",
            "address": zwap.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "burner"
              },
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "burn_account"
              },
              {
                "type": "Uint128",
                "value": burnt_amount,
                "vname": "amount"
              }
            ]
          },
          // claim event
          {
            "_eventname": "Distributed",
            "address": zilo.address.toLowerCase(),
            "params": [
              {
                "type": "Uint128",
                "value": user_tkn_amount,
                "vname": "amount"
              },
              {
                "type": "ByStr20",
                "value": user.address.toLowerCase(),
                "vname": "to"
              }
            ]
          },
          // tkn send to user event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": user.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": user_tkn_amount,
                "vname": "amount"
              }
            ]
          },
          // tkn send to lp event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": lp_tkn_amount,
                "vname": "amount"
              }
            ]
          },
        ]))

        expect(claimAndFinalizeTx.receipt.transitions).toEqual(expect.arrayContaining([
          // zil xfer to lp transition
          expect.objectContaining({
            "addr": zilo.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": lp_amount,
              "_recipient": lp.address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          }),
          // zil xfer to owner transition
          expect.objectContaining({
            "addr": zilo.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": owner_amount,
              "_recipient": owner.address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          }),
        ]))
      })
    })

    describe('when seed lp is enabled', () => {
      test('received tokens will be sent to zilswap', async () => {
        // contribute
        const tx = await callContract(
          user.key, zilo,
          'Contribute',
          [],
          7000, false, false
        )
        expect(tx.status).toEqual(2)

        // wait for end
        await nextBlock(101)

        // finalize
        const claimAndFinalizeTx = await callContract(
          user.key, zilo,
          'Claim',
          [],
          0, false, false
        )
        expect(claimAndFinalizeTx.status).toEqual(2)

        // check outputs
        const raised_amount = '7000000000000000' // 7000 zil
        const burnt_amount =  '3000000000000000' // 3000 zwap
        const lp_amount =     '1500000000000000' // 1500 zil
        const refund_amount = '0'
        // user shld have full 100,000 tkns
        const user_tkn_amount = '100000000000000000'
        const lp_tkn_amount =    '15000000000000000'

        // check zilswap add liq events
        expect(claimAndFinalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
          // zilo completion event
          {
            "_eventname": "Completed",
            "address": zilo.address.toLowerCase(),
            "params": [
              {
                "type": "Uint128",
                "value": raised_amount,
                "vname": "raised_amount"
              },
              {
                "type": "Uint128",
                "value": burnt_amount,
                "vname": "burnt_amount"
              },
              {
                "type": "Uint128",
                "value": refund_amount,
                "vname": "refund_amount"
              }
            ]
          },
          // tkn send to zilswap event
          {
            "_eventname": "TransferFromSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilswap.address.toLowerCase(),
                "vname": "initiator"
              },
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": zilswap.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": lp_tkn_amount,
                "vname": "amount"
              }
            ]
          },
          // pool created event
          {
            "_eventname": "PoolCreated",
            "address": zilswap.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": tkn.address.toLowerCase(),
                "vname": "pool"
              },
            ]
          },
          // lp-token mint event
          {
            "_eventname": "Mint",
            "address": zilswap.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": tkn.address.toLowerCase(),
                "vname": "pool"
              },
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "address"
              },
              {
                "type": "Uint128",
                "value": lp_amount,
                "vname": "amount"
              }
            ]
          },
        ]))

        expect(claimAndFinalizeTx.receipt.transitions).toEqual(expect.arrayContaining([
          // zil xfer to lp transition
          expect.objectContaining({
            "addr": zilo.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": lp_amount,
              "_recipient": lp.address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          }),
          // signal to lp to add liquidity
          expect.objectContaining({
            "addr": zilo.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": "0",
              "_recipient": lp.address.toLowerCase(),
              "_tag": "AddLiquidity",
              "params": expect.arrayContaining([
                {
                  "type": "Uint128",
                  "value": lp_amount,
                  "vname": "zil_amount"
                },
                {
                  "type": "Uint128",
                  "value": lp_tkn_amount,
                  "vname": "token_amount"
                }
              ]),
            })
          }),
          // lp add liquidity to zilswap
          expect.objectContaining({
            "addr": lp.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": lp_amount,
              "_recipient": zilswap.address.toLowerCase(),
              "_tag": "AddLiquidity",
              "params": expect.arrayContaining([
                {
                  "type": "ByStr20",
                  "value": tkn.address.toLowerCase(),
                  "vname": "token_address"
                },
                {
                  "type": "Uint128",
                  "value": "0",
                  "vname": "min_contribution_amount"
                },
                {
                  "type": "Uint128",
                  "value": lp_tkn_amount,
                  "vname": "max_token_amount"
                },
              ]),
            })
          }),
        ]))

        // check zilswap pool amounts through state
        const state = await zilswap.getState()
        expect(state).toEqual(expect.objectContaining({
          "_balance": lp_amount,
          "balances": {
            [tkn.address.toLowerCase()]: {
              [lp.address.toLowerCase()]: lp_amount
            }
          },
          "pools": {
            [tkn.address.toLowerCase()]: {
              "argtypes": [],
              "arguments": [
                lp_amount,
                lp_tkn_amount
              ],
              "constructor": `${zilswap.address.toLowerCase()}.Pool`
            }
          },
          "total_contributions": {
            [tkn.address.toLowerCase()]: lp_amount
          }
        }))

        // remove liquidity
        const removeTx = await callContract(
          owner.key, lp,
          'RemoveLiquidity',
          [
            {
              "type": "Uint128",
              "value": lp_amount,
              "vname": "contribution_amount"
            },
            {
              "type": "Uint128",
              "value": lp_amount,
              "vname": "min_zil_amount"
            },
            {
              "type": "Uint128",
              "value": lp_tkn_amount,
              "vname": "min_token_amount"
            },
          ],
          0, false, false
        )
        expect(removeTx.status).toEqual(2)
        expect(removeTx.receipt.event_logs).toEqual(expect.arrayContaining([
          // lp tkn burn event
          {
            "_eventname": "Burnt",
            "address": zilswap.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": tkn.address.toLowerCase(),
                "vname": "pool"
              },
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "address"
              },
              {
                "type": "Uint128",
                "value": lp_amount,
                "vname": "amount"
              }
            ]
          },
          // token transfer event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilswap.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": lp_tkn_amount,
                "vname": "amount"
              }
            ]
          },
        ]))
        expect(removeTx.receipt.transitions).toEqual(expect.arrayContaining([
          // zil xfer to lp transition
          expect.objectContaining({
            "addr": zilswap.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": lp_amount,
              "_recipient": lp.address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          })
        ]))

        // withdraw
        const withdrawZilTx = await callContract(
          owner.key, lp,
          'Withdraw',
          [
            {
              "type": `${lp.address.toLowerCase()}.Coin`,
              "value": {
                "argtypes": [],
                "arguments": [
                  {
                    "argtypes": [],
                    "arguments": [],
                    "constructor": `${lp.address.toLowerCase()}.Zil`
                  },
                  lp_amount
                ],
                "constructor": `${lp.address.toLowerCase()}.Coin`
              },
              "vname": "coin"
            },
          ],
          0, false, false
        )
        expect(withdrawZilTx.status).toEqual(2)
        expect(withdrawZilTx.receipt.transitions).toEqual(expect.arrayContaining([
          // zil xfer to owner transition
          expect.objectContaining({
            "addr": lp.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": lp_amount,
              "_recipient": owner.address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          })
        ]))

        const withdrawTknTx = await callContract(
          owner.key, lp,
          'Withdraw',
          [
            {
              "type": `${lp.address.toLowerCase()}.Coin`,
              "value": {
                "argtypes": [],
                "arguments": [
                  {
                    "argtypes": [],
                    "arguments": [tkn.address.toLowerCase()],
                    "constructor": `${lp.address.toLowerCase()}.Token`
                  },
                  lp_tkn_amount
                ],
                "constructor": `${lp.address.toLowerCase()}.Coin`
              },
              "vname": "coin"
            },
          ],
          0, false, false
        )
        expect(withdrawTknTx.status).toEqual(2)
        expect(withdrawTknTx.receipt.event_logs).toEqual(expect.arrayContaining([
          // token transfer event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": lp.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": owner.address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": lp_tkn_amount,
                "vname": "amount"
              }
            ]
          },
        ]))
      })
    })
  })

  describe('multiple contributors', () => {
    let users = []

    beforeEach(async () => {
      for (let i = 0; i < 3; ++i) {
        users[i] = await createRandomAccount(owner.key)
        await nextBlock()
        // send tokens
        await callContract(
          owner.key, zwap,
          'Transfer',
          [
            {
              vname: 'to',
              type: 'ByStr20',
              value: users[i].address,
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
          users[i].key, zwap,
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
      }
    })

    // test('2 users below cap', async () => {
      // TODO
    // })

    // test('2 users exactly at cap', async () => {
      // TODO
    // })

    test('3 users above cap', async () => {
      // contribute 200, 400, 600 (total 1200) zils
      for (let i = 0; i < 3; ++i) {
        const tx = await callContract(
          users[i].key, zilo,
          'Contribute',
          [],
          200*(i+1), false, false
        )
        expect(tx.status).toEqual(2)
      }

      // wait for end
      await nextBlock(101)

      // finalize
      const finalizeTx = await callContract(
        owner.key, zilo,
        'Complete',
        [],
        0, false, false
      )
      expect(finalizeTx.status).toEqual(2)

      // check outputs
      const raised_amount = '1200000000000000'
      // burn 300 zwap
      const burnt_amount = '300000000000000'
      // refund 0 tkn
      const refund_amount = '0'
      // lp shld have 150 zil
      const lp_amount = '150000000000000'
      // owner shld have 550 zil
      const owner_amount = '550000000000000'

      expect(finalizeTx.receipt.event_logs).toEqual(expect.arrayContaining([
        // zilo completion event
        {
          "_eventname": "Completed",
          "address": zilo.address.toLowerCase(),
          "params": [
            {
              "type": "Uint128",
              "value": raised_amount,
              "vname": "raised_amount"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "burnt_amount"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "refund_amount"
            }
          ]
        },
        // tkn refund event
        {
          "_eventname": "TransferSuccess",
          "address": tkn.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "sender"
            },
            {
              "type": "ByStr20",
              "value": owner.address.toLowerCase(),
              "vname": "recipient"
            },
            {
              "type": "Uint128",
              "value": refund_amount,
              "vname": "amount"
            }
          ]
        },
        // zwap burn event
        {
          "_eventname": "Burnt",
          "address": zwap.address.toLowerCase(),
          "params": [
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burner"
            },
            {
              "type": "ByStr20",
              "value": zilo.address.toLowerCase(),
              "vname": "burn_account"
            },
            {
              "type": "Uint128",
              "value": burnt_amount,
              "vname": "amount"
            }
          ]
        },
      ]))
      expect(finalizeTx.receipt.transitions).toEqual(expect.arrayContaining([
        // zil xfer to lp transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": lp_amount,
            "_recipient": lp.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        }),
        // zil xfer to owner transition
        expect.objectContaining({
          "addr": zilo.address.toLowerCase(),
          "msg": expect.objectContaining({
            "_amount": owner_amount,
            "_recipient": owner.address.toLowerCase(),
            "_tag": "AddFunds",
            "params": [],
          })
        })
      ]))

      // claim
      for (let i = 0; i < 3; ++i) {
        const claimTx = await callContract(
          users[i].key, zilo,
          'Claim',
          [],
          0, false, false
        )
        expect(claimTx.status).toEqual(2)

        // check outputs
        // overcommitment is 500
        // user shld be refunded (i+1)*200 - (i+1)*200*700/1200 - 1(qa) zil
        const toUnitless = (n) => units.toQa(new BN(n), units.Units.Zil)
        const user_refund_zil_amount = toUnitless((i+1)*200).sub(toUnitless((i+1)*200*700).divn(1200)).subn(1).toString(10)
        // user shld be refunded refund_zil_amount * 3/7 zwap
        const user_refund_zwap_amount = new BN(user_refund_zil_amount).muln(3).divn(7).toString(10)
        // user shld have ((i+1)*200 - refund + 1(qa)) / 700 * 10k tkns
        const user_tkn_amount = toUnitless((i+1)*200).sub(new BN(user_refund_zil_amount).addn(1)).muln(10000).divn(700).toString(10)

        expect(claimTx.receipt.event_logs).toEqual(expect.arrayContaining([
          // zilo distribution event
          {
            "_eventname": "Distributed",
            "address": zilo.address.toLowerCase(),
            "params": [
              {
                "type": "Uint128",
                "value": user_tkn_amount,
                "vname": "amount"
              },
              {
                "type": "ByStr20",
                "value": users[i].address.toLowerCase(),
                "vname": "to"
              }
            ]
          },
          // zilo refund event
          {
            "_eventname": "Refunded",
            "address": zilo.address.toLowerCase(),
            "params": [
              {
                "type": "Uint128",
                "value": user_refund_zil_amount,
                "vname": "zil_amount"
              },
              {
                "type": "Uint128",
                "value": user_refund_zwap_amount,
                "vname": "zwap_amount"
              },
              {
                "type": "ByStr20",
                "value": users[i].address.toLowerCase(),
                "vname": "to"
              }
            ]
          },
          // tkn xfer event
          {
            "_eventname": "TransferSuccess",
            "address": tkn.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": users[i].address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": user_tkn_amount,
                "vname": "amount"
              }
            ]
          },
          // zwap refund xfer event
          {
            "_eventname": "TransferSuccess",
            "address": zwap.address.toLowerCase(),
            "params": [
              {
                "type": "ByStr20",
                "value": zilo.address.toLowerCase(),
                "vname": "sender"
              },
              {
                "type": "ByStr20",
                "value": users[i].address.toLowerCase(),
                "vname": "recipient"
              },
              {
                "type": "Uint128",
                "value": user_refund_zwap_amount,
                "vname": "amount"
              }
            ]
          },
        ]))
        expect(claimTx.receipt.transitions).toEqual(expect.arrayContaining([
          // zil xfer to user transition
          expect.objectContaining({
            "addr": zilo.address.toLowerCase(),
            "msg": expect.objectContaining({
              "_amount": user_refund_zil_amount,
              "_recipient": users[i].address.toLowerCase(),
              "_tag": "AddFunds",
              "params": [],
            })
          }),
        ]))
      }
    })

    // test('very small amounts of zil contributed', async () => {
    // })
  })

  // test('small ZWAP ratio', async () => {
  // })

  // test('no contribution to LP', async () => {
  // })

  // TODO: randomized test
})
