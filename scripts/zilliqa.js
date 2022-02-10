
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const { bytes } = require('@zilliqa-js/util')

const useKey = (privateKey) => {
  const address = getAddressFromPrivateKey(privateKey)
  const accounts = Object.keys(zilliqa.wallet.accounts)
  if (accounts.findIndex(a => a.toLowerCase() === address.toLowerCase()) < 0) {
    zilliqa.wallet.addByPrivateKey(privateKey)
  }
  zilliqa.wallet.setDefault(address)
}

const getNetwork = () => {
  const network = (process.env.NETWORK || '').toLowerCase()
  switch (network) {
    case 'testnet':
    case 'mainnet':
      return network
    default:
      return 'localhost'
  }
}

const getRPC = (network) => {
  switch (network) {
    case 'mainnet':
      return 'https://api.zilliqa.com'
    case 'testnet':
      return 'https://dev-api.zilliqa.com'
    default:
      return 'http://localhost:5555'
  }
}

const getChainID = (network) => {
  const id = bytes.pack(network === 'testnet' ? 333 : 222, 1)
  switch (network) {
    case 'mainnet':
      return 1
    case 'testnet':
      return 333
    default:
      return 222
  }
}

const network = getNetwork()
const rpc = getRPC(network)
const VERSION = bytes.pack(getChainID(network), 1)
const zilliqa = new Zilliqa(rpc)

exports.chainId = getChainID(network)
exports.useKey = useKey
exports.network = network
exports.zilliqa = zilliqa
exports.VERSION = VERSION
