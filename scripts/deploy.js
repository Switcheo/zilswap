const fs = require('fs')
const util = require('util')
const { TransactionError } = require('@zilliqa-js/core')
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { BN, Long, bytes, units } = require('@zilliqa-js/util')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')

const readFile = util.promisify(fs.readFile)
const TESTNET_VERSION = bytes.pack(333, 1)
const TESTNET_RPC = 'https://dev-api.zilliqa.com'

async function deployFungibleToken(
  privateKey, { name = 'ZS Test Token', symbol: _symbol = null, decimals = 12, supply = new BN('1000000000000000000000') }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `TEST-${randomHex(4).toUpperCase()}`

  // Load code and contract initialization variables
  const code = (await readFile('./src/FungibleToken.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'name',
      type: 'String',
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: decimals.toString(),
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: supply.toString(),
    }
  ];

  console.log(`Deploying fungible token ${symbol}...`)
  return deployContract(privateKey, code, init)
}

async function deployZilswap(privateKey) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Load code and contract initialization variables
  const code = (await readFile('./src/ZilSwap.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    }
  ];

  console.log(`Deploying zilswap...`)
  return deployContract(privateKey, code, init)
}

async function deployContract(privateKey, code, init) {
  // Init SDK
  const zilliqa = new Zilliqa(TESTNET_RPC)
  zilliqa.wallet.addByPrivateKey(privateKey)

  // Check for account
  const address = getAddressFromPrivateKey(privateKey)
  const balance = await zilliqa.blockchain.getBalance(address)
  if (balance.error) {
    throw new Error(balance.error.message)
  }

  // Deploy contract
  const compressedCode = code.replace(matchComments, '').replace(matchWhitespace, ' ')
  const contract = zilliqa.contracts.new(compressedCode, init)
  const [deployTx, token] = await contract.deploy(
    {
      version: TESTNET_VERSION,
      amount: new BN(0),
      gasPrice: units.toQa('1000', units.Units.Li),
      gasLimit: Long.fromNumber(80000),
    },
    33,
    1000,
    false,
  )

  // Check for txn acceptance
  if (!deployTx.id) {
    throw new Error(JSON.stringify(token.error || 'Failed to get tx id!', null, 2))
  }
  console.log(`Deployment transaction id: ${deployTx.id}`)

  // Check for txn execution success
  if (!deployTx.txParams.receipt.success) {
    const errors = deployTx.txParams.receipt.errors
    const errMsgs = errors
      ? Object.keys(errors).reduce((acc, depth) => {
          const errorMsgList = errors[depth].map(num => TransactionError[num])
          return { ...acc, [depth]: errorMsgList }
        }, {})
      : 'Failed to deploy contract!'
    throw new Error(JSON.stringify(errMsgs, null, 2))
  }

  // Print txn receipt
  console.log(`Deployment transaction receipt: ${deployTx.txParams.receipt}`)

  // Refetch contract
  console.log(`The contract address is: ${token.address}`)
  console.log('Refetching contract state...')
  const deployedContract = zilliqa.contracts.at(token.address)
  const state = await deployedContract.getState()

  // Print contract state
  console.log(`The state of the contract is: \n${JSON.stringify(state, null, 2)}`)

  // Return the contract and state
  return [deployedContract, state]
}

const randomHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
const matchComments = /[(][*].*?[*][)]/gs
const matchWhitespace = /\s+/g

exports.deployFungibleToken = deployFungibleToken
exports.deployZilswap = deployZilswap
