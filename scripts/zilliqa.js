
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const { bytes } = require('@zilliqa-js/util')

const TESTNET_VERSION = bytes.pack(333, 1)
const TESTNET_RPC = 'https://dev-api.zilliqa.com'

const zilliqa = new Zilliqa(TESTNET_RPC)

function useKey(privateKey) {
  const address = getAddressFromPrivateKey(privateKey)
  const accounts = Object.keys(zilliqa.wallet.accounts)
  if (accounts.findIndex(a => a.toLowerCase() === address.toLowerCase()) < 0) {
    zilliqa.wallet.addByPrivateKey(privateKey)
  }
  zilliqa.wallet.setDefault(address)
}

exports.TESTNET_VERSION = TESTNET_VERSION
exports.zilliqa = zilliqa
exports.useKey = useKey
