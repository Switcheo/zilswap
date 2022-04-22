
const { callContract }  = require('../../call')
const { zilliqa } = require('../../zilliqa')
const list = require('../whitelist/mint-whitelist.json')

const BATCH_SIZE = 500

async function setWhitelist() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')

  const contract = zilliqa.contracts.at(process.env.MOON_BATTLE_CONTRACT_HASH);
  const value = Object.keys(list).map((addr) => {
    return {
      constructor: 'Pair',
      argtypes: ['ByStr20', 'Uint32'],
      arguments: [addr, list[addr].toString()],
    }
  })

  let i = 0
  while (value.length > 0){
    const v = value.splice(0, Math.min(value.length, BATCH_SIZE))
    const tx = await callContract(
      key, contract,
      'SetWhitelist',
      [
        {
          vname: 'list',
          type: 'List (Pair ByStr20 Uint32)',
          value: v,
        }
      ],
      0, false, false
    )

    console.log(`Entries ${i} to ${i+=v.length} - Result: ${tx.status===2}\n`)
  }

  const state = await contract.getState()
  console.log(`Whitelist target: ${Object.keys(list).length} | Whitelist state: ${Object.keys(state.whitelist).length}`)
}

setWhitelist().then(() => console.log('done.'))
