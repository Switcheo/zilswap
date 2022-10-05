const { getDefaultAccount } = require('../../account')
const { getBlockNum } = require('../../call.js')
const { deployZILO, deploySeedLP } = require('../../deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const tokenAddress =  '0x0c66dfdb08dbffc686ab15400c09edef2d96412b' // https://devex.zilliqa.com/address/zil1p3ndlkcgm0ludp4tz4qqcz0daukevsftx46848?network=https%3A%2F%2Fapi.zilliqa.com

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
  const receiverAddress = '0x17a118d5fc29e8462a26f3eebbf2d703e6c332dc' // https://devex.zilliqa.com/address/zil1z7s3340u985yv23x70hthukhq0nvxvkur3nuyc?network=https%3A%2F%2Fapi.zilliqa.com
  const [zilo, state] = await deployZILO(owner.key, {
    zwapAddress,
    tokenAddress,
    tokenAmount:             '180000000' + tknDecimals, // TOKEN 180m
    targetZilAmount:           '2880000' + zilDecimals, // ZIL 2.88m (~$210.2K @ $0.073)
    targetZwapAmount:             '2400' + zilDecimals, // ZWAP 2.4k (~$23.4K @$9.78)
    minimumZilAmount:           '720000' + zilDecimals, // ZIL 720k (25% of target)
    liquidityZilAmount:        '1425000' + zilDecimals, // ZIL 1.42m (tknPrice*liquidity/zilPrice)
    liquidityTokenAmount:     '80000000' + tknDecimals, // TOKEN 80m
    receiverAddress:                   receiverAddress,
    liquidityAddress:         lp.address.toLowerCase(),
    startBlock:                (bNum + 315).toString(), // 3 hrs, 105 blocks an hr
    endBlock:                 (bNum + 5355).toString(), // +48 hrs, hopefully
  })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
