const { getDefaultAccount } = require('./account')
const { getContract, callContract, getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress = '0xa127c94853be4eeb19a4a78857015830f4b6ce4b'
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
  const tknDecimals = '00000'
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:             '300000000' + tknDecimals, // PLAY 300m
    targetZilAmount:          '21000000' + zilDecimals, // ZIL 21m (~$1.47m @ $0.07)
    targetZwapAmount:            '28545' + zilDecimals, // ZWAP 28.5k (~$630k @$22.07)
    minimumZilAmount:          '5250000' + zilDecimals, // ZIL 5.25m (25% of target)
    liquidityZilAmount:       '15000000' + zilDecimals, // ZIL 15m ($0.007*Liquidity/ZIL Price)
    liquidityTokenAmount:    '150000000' + tknDecimals, // PLAY 150m
    receiverAddress:                     owner.address,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                (bNum + 100).toString(), // 1 hrs, 100 blocks an hr
    endBlock:                 (bNum + 600).toString(),  // 6 hrs, hopefully
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

  // // send tkns to zilo
  // const tkn = getContract(tokenAddress)
  // const result2 = await callContract(
  //   owner.key, tkn,
  //   'Transfer',
  //   [
  //     {
  //       vname: 'to',
  //       type: 'ByStr20',
  //       value: zilo.address.toLowerCase(),
  //     },
  //     {
  //       vname: 'amount',
  //       type: 'Uint128',
  //       value: '450000000' + tknDecimals,
  //     },
  //   ],
  //   0, false, false
  // )

  // console.log('Sent tkns to zilo:')
  // console.log(JSON.stringify(result2, null, 2))

}

deploy().then(() => console.log('Done.'))
