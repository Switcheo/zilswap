
const { getAddressFromPrivateKey, getPubKeyFromPrivateKey, schnorr } = require('@zilliqa-js/crypto')
const { transfer } = require('./call.js')

require('dotenv').config()

function getDefaultAccount() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY env var missing!')
  const address = getAddressFromPrivateKey(key).toLowerCase()
  const pubKey = getPubKeyFromPrivateKey(key)

  return { key, pubKey, address }
}

function getUserAccount() {
  const key = process.env.USER_1_KEY
  if (!key) throw new Error('USER_1_KEY env var missing!')
  const address = getAddressFromPrivateKey(key).toLowerCase()
  const pubKey = getPubKeyFromPrivateKey(key)

  return { key, pubKey, address }
}

async function createRandomAccount(privateKey, initAmount = '10000') {
  const key = schnorr.generatePrivateKey()
  const address = getAddressFromPrivateKey(key)
  const pubKey = getPubKeyFromPrivateKey(key)

  if (initAmount != '0') await transfer(privateKey, address, initAmount)

  return { key, pubKey, address: address.toLowerCase() }
}

exports.getDefaultAccount = getDefaultAccount
exports.createRandomAccount = createRandomAccount
exports.getUserAccount = getUserAccount
