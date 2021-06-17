const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const [contract, state] = await deployZILO(owner.key, {
    zwapAddress:       '0xb2f66571a0c7bd9001fb6ca67b01ac749250504c',
    tokenAddress:      '0x7b8a86afbde45b4e081986217e02654b551407a7',
    tokenAmount:                '24000000000000', // STREAM 240k (8 decimals)
    targetZilAmount:       '2260000000000000000', // ZIL 226k (~$24k @ $0.1062)
    targetZwapAmount:           '20000000000000', // ZWAP 20 (~$5040 @ $257.37)
    minimumZilAmount:       '565000000000000000', // ZIL 56.5k (~25%)
    liquidityZilAmount:     '802000000000000000', // ZIL 80.2k (~$8.52k)
    liquidityTokenAmount:        '6000000000000', // STREAM 60k
    receiverAddress:               owner.address,
    liquidityAddress:   '0x22ed1259dfc29843a481f3801a95429761095366',
    startBlock:           (bNum + 15).toString(),
    endBlock:        (bNum + (21*60)).toString(),
  })

  console.log('Deployed contract:')
  console.log(JSON.stringify(contract, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
