
const { getAddressFromPrivateKey, schnorr } = require('@zilliqa-js/crypto')
const { transfer } = require('./call.js')

function getDefaultAccount() {
  const key = process.env.PRIVATE_KEY
  const address = getAddressFromPrivateKey(key).toLowerCase()

  return { key, address }
}

async function createRandomAccount(privateKey) {
  const key = schnorr.generatePrivateKey()
  const address = getAddressFromPrivateKey(key)

  await transfer(privateKey, address, '100000')

  return { key, address: address.toLowerCase() }
}

exports.getDefaultAccount = getDefaultAccount
exports.createRandomAccount = createRandomAccount
