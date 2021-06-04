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
    targetZilAmount:       '1880000000000000000', // ZIL 188k (~$24k @ $0.1282)
    targetZwapAmount:           '16000000000000', // ZWAP 16 (~$5040 @ $316.32)
    minimumZilAmount:       '188000000000000000', // ZIL 18.8k (~10%)
    liquidityZilAmount:     '470000000000000000', // ZIL 47k (~$6k)
    liquidityTokenAmount:        '6000000000000', // STREAM 60k (188k ZIL === 240k STREAM, so 47k ZIL === 60k STREAM)
    receiverAddress:               owner.address,
    liquidityAddress:   '0x22ed1259dfc29843a481f3801a95429761095366',
    startBlock:           (bNum + 15).toString(),
    endBlock:        (bNum + (24*60*5)).toString(),
  })

  console.log('Deployed contract:')
  console.log(JSON.stringify(contract, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
