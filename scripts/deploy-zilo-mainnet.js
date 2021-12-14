const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress =  '0xacd35e75e004f9d79a45dfa3a35ef9563c811671' // https://devex.zilliqa.com/address/zil14nf4ua0qqnua0xj9m736xhhe2c7gz9n3ayjtc7?network=https%3A%2F%2Fapi.zilliqa.com
  const zwapAddress =   '0x0d21c1901a06abee40d8177f95171c8c63abdc31' // https://devex.zilliqa.com/address/zil1p5suryq6q647usxczale29cu3336hhp376c627?network=https%3A%2F%2Fapi.zilliqa.com

  // deploy seed lp
  const [lp, stateLP] = await deploySeedLP(owner.key, {
    tokenAddress,
    zilswapAddress:     '0x459cb2d3baf7e61cfbd5fe362f289ae92b2babb0', // https://devex.zilliqa.com/address/zil1gkwt95a67lnpe774lcmz72y6ay4jh2asmmjw6u?network=https%3A%2F%2Fapi.zilliqa.com
  })

  console.log('Deployed seed lp contract:')
  console.log(JSON.stringify(lp, null, 2))
  console.log('State:')
  console.log(JSON.stringify(stateLP, null, 2))

  // deploy zilo
  const zilDecimals = '000000000000'
  const tknDecimals = '00000'
  const receiverAddress = '0x5a1ab69fec1d0c9e1c1e702ea398fd8a333a50b9' // https://devex.zilliqa.com/address/zil1tgdtd8lvr5xfu8q7wqh28x8a3gen559el8qtwp?network=https%3A%2F%2Fapi.zilliqa.com
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:             '300000000' + tknDecimals, // PLAY 300m
    targetZilAmount:          '25000000' + zilDecimals, // ZIL 25m (~$1.47m @ $0.0587)
    targetZwapAmount:            '32500' + zilDecimals, // ZWAP 32.5k (~$630k @$19.33)
    minimumZilAmount:          '6250000' + zilDecimals, // ZIL 6.25m (25% of target)
    liquidityZilAmount:       '17880000' + zilDecimals, // ZIL 17.88m ($0.007*Liquidity/ZIL Price)
    liquidityTokenAmount:    '150000000' + tknDecimals, // PLAY 150m
    receiverAddress:                   receiverAddress,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                (bNum + 200).toString(), // 2 hrs, 100 blocks an hr
    endBlock:                 (bNum + 2600).toString(), // 24 hrs, hopefully
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

  // project TODO: send tkns to zilo
}

deploy().then(() => console.log('Done.'))
