const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const [contract, state] = await deployZILO(owner.key, {
    zwapAddress:          '0x0d21c1901a06abee40d8177f95171c8c63abdc31', // ZWAP Contract (https://devex.zilliqa.com/address/zil1p5suryq6q647usxczale29cu3336hhp376c627?network=https%3A%2F%2Fapi.zilliqa.com)
    tokenAddress:         '0xa3eafd5021f6b9c36fd02ed58aa1d015f2238791', // STREAM Contract (https://devex.zilliqa.com/address/zil1504065pp76uuxm7s9m2c4gwszhez8pu3mp6r8c?network=https%3A%2F%2Fapi.zilliqa.com)
    tokenAmount:                '24000000000000', //   240,000 STREAM (8 decimals)
    targetZilAmount:       '2285710000000000000', // 2,285,700 ZIL    (~$240,000 @ $0.105)
    targetZwapAmount:          '411430000000000', //   411.430 ZWAP   (~$102,857 @ $250)
    minimumZilAmount:       '571430000000000000', //   571,430 ZIL    (~25% of target)
    liquidityZilAmount:     '811430000000000000', //   811,430 ZIL    (~$85,200 @ $0.105)
    liquidityTokenAmount:        '6000000000000', //    60,000 STREAM (8 decimals)
    receiverAddress:      '0x341283d3fb53cf2e03e694be7534895c7bd6bc8f', // Project Address (https://devex.zilliqa.com/address/zil1xsfg85lm208juqlxjjl82dyft3aad0y0w4sytn?network=https%3A%2F%2Fapi.zilliqa.com)
    liquidityAddress:     '0x1499856ca9a32e717e9e872923fd3f4740af99e7', // ZilSwap Treasury (https://devex.zilliqa.com/address/zil1zjvc2m9f5vh8zl57su5j8lflgaq2lx08kcwdvy?network=https%3A%2F%2Fapi.zilliqa.com)
    startBlock:          (bNum + 1800).toString(), // 24hrs = 1800 blocks
    endBlock:     (bNum + 1800 + 1800).toString(), // 24hrs = 1800 blocks
  })

  console.log('Deployed contract:')
  console.log(JSON.stringify(contract, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
