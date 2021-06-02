const { getDefaultAccount } = require('./account')
const { getBlockNum } = require('./call.js')
const { deployZILO } = require('./deploy')

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const [contract, state] = await deployZILO(owner.key, {
    zwapAddress:       '0xb2f66571a0c7bd9001fb6ca67b01ac749250504c',
    tokenAddress:      '0x7b8a86afbde45b4e081986217e02654b551407a7',
    tokenAmount:                 '1000000000000', // STREAM 10k (8 decimals)
    targetZilAmount:       '2080000000000000000', // ZIL 2m (~$240k)
    targetZwapAmount:          '428000000000000', // ZWAP 428 (~$128k)
    minimumZilAmount:       '100000000000000000', // ZIL 100k (~$11k)
    liquidityZilAmount:     '520000000000000000', // ZIL 520k (~$60k)
    liquidityTokenAmount:         '180000000000', // STREAM 1.8k (3m ZIL === 10k STREAM, so 520k ZIL ~= 1.7333 STREAM)
    receiverAddress:               owner.address,
    liquidityAddress:   '0x22ed1259dfc29843a481f3801a95429761095366',
    startBlock:           (bNum + 15).toString(),
    endBlock:        (bNum + (24*60)).toString(),
  })

  console.log('Deployed contract:')
  console.log(JSON.stringify(contract, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
