const fs = require('fs')
const util = require('util')
const BigNumber = require('bignumber.js')
const { TransactionError } = require('@zilliqa-js/core')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const { BN, Long } = require('@zilliqa-js/util')
const { callContract, nextBlock } = require('./call.js')
const { compress } = require('./compile')
const { TEST_VERSION, zilliqa, useKey } = require('./zilliqa')

const readFile = util.promisify(fs.readFile)

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

  console.info(`Deploying fungible token ${symbol}...`)
  return deployContract(privateKey, code, init)
}

async function useFungibleToken(privateKey, params, approveContractAddress, useExisting = process.env.TOKEN_HASH) {
  const [contract, state] = await (useExisting ?
    getContract(privateKey, useExisting) : deployFungibleToken(privateKey, params))

  if (!!approveContractAddress) {
    const address = getAddressFromPrivateKey(privateKey).toLowerCase()
    const allowance = new BigNumber(state.allowances[address] ? state.allowances[address][approveContractAddress.toLowerCase()] : 0)
    if (allowance.isNaN() || allowance.eq(0)) {
      await callContract(
        privateKey, contract,
        'IncreaseAllowance',
        [
          {
            vname: 'spender',
            type: 'ByStr20',
            value: approveContractAddress,
          },
          {
            vname: 'amount',
            type: 'Uint128',
            value: state.total_supply.toString(),
          },
        ],
        0, false, false
      )
      return [contract, await contract.getState()]
    }
  }

  return [contract, state]
}

async function deployZilswap(privateKey, { fee = null, owner = null }) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!fee) fee = '30'

  // Load code and contract initialization variables
  const code = (await readFile('./src/ZilSwap.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'initial_fee',
      type: 'Uint256',
      value: fee,
    },
  ];

  console.info(`Deploying zilswap...`)
  return deployContract(privateKey, code, init)
}

async function useZilswap(privateKey, params, useExisting = process.env.CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployZilswap(privateKey, params)
}

async function deployZILO(privateKey, {
  zwapAddress,
  tokenAddress,
  tokenAmount,
  targetZilAmount,
  targetZwapAmount,
  minimumZilAmount,
  liquidityZilAmount,
  liquidityTokenAmount,
  receiverAddress,
  liquidityAddress,
  startBlock,
  endBlock,
 }) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Load code and contract initialization variables
  const code = (await readFile('./src/ZILO.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'zwap_address',
      type: 'ByStr20',
      value: zwapAddress,
    },
    {
      vname: 'token_address',
      type: 'ByStr20',
      value: tokenAddress,
    },
    {
      vname: 'token_amount',
      type: 'Uint128',
      value: tokenAmount,
    },
    {
      vname: 'target_zil_amount',
      type: 'Uint128',
      value: targetZilAmount,
    },
    {
      vname: 'target_zwap_amount',
      type: 'Uint128',
      value: targetZwapAmount,
    },
    {
      vname: 'minimum_zil_amount',
      type: 'Uint128',
      value: minimumZilAmount,
    },
    {
      vname: 'liquidity_zil_amount',
      type: 'Uint128',
      value: liquidityZilAmount,
    },
    {
      vname: 'liquidity_token_amount',
      type: 'Uint128',
      value: liquidityTokenAmount,
    },
    {
      vname: 'receiver_address',
      type: 'ByStr20',
      value: receiverAddress,
    },
    {
      vname: 'liquidity_address',
      type: 'ByStr20',
      value: liquidityAddress,
    },
    {
      vname: 'start_block',
      type: 'BNum',
      value: startBlock,
    },
    {
      vname: 'end_block',
      type: 'BNum',
      value: endBlock,
    },
  ];

  console.info(`Deploying ZILO...`)
  return deployContract(privateKey, code, init)
}

async function deployContract(privateKey, code, init) {
  useKey(privateKey)

  // Check for account
  const address = getAddressFromPrivateKey(privateKey)
  const balance = await zilliqa.blockchain.getBalance(address)
  if (balance.error) {
    throw new Error(balance.error.message)
  }

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  // Deploy contract
  const compressedCode = compress(code)
  const contract = zilliqa.contracts.new(compressedCode, init)
  const [deployTx, token] = await contract.deploy(
    {
      version: TEST_VERSION,
      amount: new BN(0),
      gasPrice: new BN(minGasPrice.result),
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
  console.info(`Deployment transaction id: ${deployTx.id}`)

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
  console.log(`Deployment transaction receipt:\n${JSON.stringify(deployTx.txParams.receipt)}`)
  await nextBlock()

  // Refetch contract
  console.info(`The contract address is: ${token.address}`)
  console.log('Refetching contract state...')
  const deployedContract = zilliqa.contracts.at(token.address)
  const state = await deployedContract.getState()

  // Print contract state
  console.log(`The state of the contract is:\n${JSON.stringify(state, null, 2)}`)

  // Return the contract and state
  return [deployedContract, state]
}

async function getContract(privateKey, contractHash) {
  useKey(privateKey)
  const contract = zilliqa.contracts.at(contractHash)
  const state = await contract.getState()
  return [contract, state]
}

const randomHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

exports.deployFungibleToken = deployFungibleToken
exports.useFungibleToken = useFungibleToken
exports.deployZilswap = deployZilswap
exports.useZilswap = useZilswap
exports.deployZILO = deployZILO
