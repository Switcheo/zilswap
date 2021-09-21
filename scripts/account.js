
const { getAddressFromPrivateKey, getPubKeyFromPrivateKey, schnorr } = require('@zilliqa-js/crypto')
const { transfer } = require('./call.js')

function getDefaultAccount() {
  const key = process.env.PRIVATE_KEY
  const address = getAddressFromPrivateKey(key).toLowerCase()
  const pubKey = getPubKeyFromPrivateKey(key)

  return { key, pubKey, address }
}

async function createRandomAccount(privateKey) {
  const key = schnorr.generatePrivateKey()
  const address = getAddressFromPrivateKey(key)
  const pubKey = getPubKeyFromPrivateKey(key)

  await transfer(privateKey, address, '100000')

  return { key, pubKey, address: address.toLowerCase() }
}

exports.getDefaultAccount = getDefaultAccount
exports.createRandomAccount = createRandomAccount
