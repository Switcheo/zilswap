
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const { bytes } = require('@zilliqa-js/util')

const USE_TESTNET = process.env.TEST_NETWORK === 'testnet'
const TEST_VERSION = bytes.pack(USE_TESTNET ? 333 : 222, 1)
const TEST_RPC = USE_TESTNET ? 'https://dev-api.zilliqa.com' : 'http://localhost:5555'

const zilliqa = new Zilliqa(TEST_RPC)

function useKey(privateKey) {
  const address = getAddressFromPrivateKey(privateKey)
  const accounts = Object.keys(zilliqa.wallet.accounts)
  if (accounts.findIndex(a => a.toLowerCase() === address.toLowerCase()) < 0) {
    zilliqa.wallet.addByPrivateKey(privateKey)
  }
  zilliqa.wallet.setDefault(address)
}

exports.USE_TESTNET = USE_TESTNET
exports.TEST_VERSION = TEST_VERSION
exports.zilliqa = zilliqa
exports.useKey = useKey
