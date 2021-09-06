const { getDefaultAccount } = require('./account')
const { getContract, callContract, getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress = '0x2fc7167c3baff89e2805aef72636ccd98ee6bbb2'
  const zwapAddress = '0xb2b119e2496f24590eff419f15aa1b6e82aa7074'

  // deploy seed lp
  const [lp, stateLP] = await deploySeedLP(owner.key, {
    tokenAddress,
    zilswapAddress: '0x1a62dd9c84b0c8948cb51fc664ba143e7a34985c',
  })

  console.log('Deployed seed lp contract:')
  console.log(JSON.stringify(lp, null, 2))
  console.log('State:')
  console.log(JSON.stringify(stateLP, null, 2))

  // deploy zilo
  const zilDecimals = '0000000000' // shifted -2 for easier completion **NOTE**
  const tknDecimals = '000000000000000000'
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:               '1666666' + tknDecimals, // DMZ 1,666,666
    targetZilAmount:           '7095790' + zilDecimals, // ZIL 7.095m (~$840k @ $0.11834)
    targetZwapAmount:             '3777' + zilDecimals, // ZWAP 3.77k (~$360k @$95.3)
    minimumZilAmount:          '1773947' + zilDecimals, // ZIL 1.773m (25% of target)
    liquidityZilAmount:       '6082106' + zilDecimals,  // ZIL 6.082m ($0.72*Liquidity/ZIL Price)
    liquidityTokenAmount:       '999999' + tknDecimals, // DMZ 999,999
    receiverAddress:                     owner.address,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                (bNum + 30).toString(), // .5 hrs, 100 blocks an hr
    endBlock:                 (bNum + 600).toString(), // 6 hrs, hopefully
  })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))

  // approve burn of zwap on zilo
  const zwap = getContract(zwapAddress)
  const result = await callContract(
    owner.key, zwap,
    'AddMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: zilo.address.toLowerCase(),
      },
    ],
    0, false, false
  )

  console.log('Approved burn of zwap:')
  console.log(JSON.stringify(result, null, 2))

  // send tkns to zilo
  const tkn = getContract(tokenAddress)
  const result2 = await callContract(
    owner.key, tkn,
    'Transfer',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: zilo.address.toLowerCase(),
      },
      {
        vname: 'amount',
        type: 'Uint128',
        value: '2666665' + tknDecimals, // 300k (1,666,666 + 999,999)
      },
    ],
    0, false, false
  )

  console.log('Sent tkns to zilo:')
  console.log(JSON.stringify(result2, null, 2))

}

deploy().then(() => console.log('Done.'))
