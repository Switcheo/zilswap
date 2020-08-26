
const { TransactionError } = require('@zilliqa-js/core')
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { BN, Long, bytes, units } = require('@zilliqa-js/util')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')

const TESTNET_VERSION = bytes.pack(333, 1)
const TESTNET_RPC = 'https://dev-api.zilliqa.com'

async function callContract(privateKey, contract, transition, args,
  zilsToSend = 0, insertRecipientAsSender = true, insertDeadlineBlock = true) {

  const zilliqa = new Zilliqa(TESTNET_RPC)
  zilliqa.wallet.addByPrivateKey(privateKey)
  const address = getAddressFromPrivateKey(privateKey)

  const response = await zilliqa.blockchain.getNumTxBlocks()
  const bNum = parseInt(response.result, 10)
  const deadline = bNum + 10
  if (insertDeadlineBlock) {
    args.push(
      {
        vname: 'deadline_block',
        type: 'BNum',
        value: deadline.toString(),
      }
    )
  }

  if (insertRecipientAsSender) {
    args.push(
      {
        vname: 'recipient_address',
        type: 'ByStr20',
        value: address,
      }
    )
  }

  return await contract.call(transition, args,
    {
      version: TESTNET_VERSION,
      amount: units.toQa(zilsToSend, units.Units.Zil),
      gasPrice: units.toQa('1000', units.Units.Li),
      gasLimit: Long.fromNumber(80000),
    }, 33, 1000, true
  )
}

exports.callContract = callContract
