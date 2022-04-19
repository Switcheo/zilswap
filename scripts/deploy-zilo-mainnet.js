const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO, deploySeedLP } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress =  '0xb8975762e4d13850f1367f9020ae123ee300897c' // https://devex.zilliqa.com/address/zil1hzt4wchy6yu9pufk07gzptsj8m3spztuqmeucs?network=https%3A%2F%2Fapi.zilliqa.com
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
  const tknDecimals = '00000000'
  const receiverAddress = '0xd716b3f19d787bc72f04106086ec32a6f8d5da24' // https://devex.zilliqa.com/address/zil16utt8uva0pauwtcyzpsgdmpj5mudtk3y4fz6h6?network=https%3A%2F%2Fapi.zilliqa.com
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:             '250000000' + tknDecimals, // TOKEN 250m
    targetZilAmount:           '2660000' + zilDecimals, // ZIL 2.66m (~$292.6K @ $0.11)
    targetZwapAmount:             '2180' + zilDecimals, // ZWAP 2.18k (~$32.4k @$14.9)
    minimumZilAmount:           '664000' + zilDecimals, // ZIL 664k (25% of target)
    liquidityZilAmount:        '2659999' + zilDecimals, // ZIL 2.66m (tknPrice*liquidity/zilPrice)
    liquidityTokenAmount:    '225076838' + tknDecimals, // TOKEN 225m
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
