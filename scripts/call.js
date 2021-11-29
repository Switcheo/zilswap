
const { VERSION, network, zilliqa, useKey } = require('./zilliqa')
const { BN, Long, units } = require('@zilliqa-js/util')
const { TransactionError } = require('@zilliqa-js/core')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const BigNumber = require('bignumber.js')

async function transfer(privateKey, toAddr, amount) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }
  useKey(privateKey)

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  const tx = await zilliqa.blockchain.createTransaction(
    zilliqa.transactions.new(
      {
        version: VERSION,
        toAddr,
        amount: new BN(units.toQa(amount, units.Units.Zil)),
        gasPrice: new BN(minGasPrice.result),
        gasLimit: Long.fromNumber(80000),
      },
      false,
    ),
  );

  await nextBlock()

  return tx
}

async function getBalance(address) {
  return new BigNumber((await zilliqa.blockchain.getBalance(address)).result.balance)
}

function getContract(contractAddress) {
  return zilliqa.contracts.at(contractAddress)
}

async function callContract(privateKey, contract, transition, args,
  zilsToSend = 0, insertRecipientAsSender = true, insertDeadlineBlock = true) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }
  useKey(privateKey)

  const address = getAddressFromPrivateKey(privateKey)

  if (insertDeadlineBlock) {
    const deadline = (await getBlockNum()) + 10
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

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  console.info(`Calling: ${transition}`)
  const tx = await contract.call(transition, args,
    {
      version: VERSION,
      amount: units.toQa(zilsToSend, units.Units.Zil),
      gasPrice: new BN(minGasPrice.result),
      gasLimit: Long.fromNumber(80000),
    }, 33, 1000, true
  )

  if (tx.receipt && !tx.receipt.success) {
    const errors = tx.receipt.errors
    if (errors) {
      const errMsgs = Object.keys(errors).reduce((acc, depth) => {
        const errorMsgList = errors[depth].map(num => TransactionError[num])
        return { ...acc, [depth]: errorMsgList }
      }, {})
      console.info(`Contract call failed:\n${JSON.stringify(errMsgs, null, 2)} + ${tx.receipt.exceptions ? `\nExceptions:\n${JSON.stringify(tx.receipt.exceptions, null, 2)}` : ''}`)
    }
  }

  await nextBlock()

  return tx
}

async function getState(privateKey, contract, token) {
  const userAddress = getAddressFromPrivateKey(privateKey)
  const cState = await contract.getState()
  const tState = await token.getState()
  const pool = cState.pools[token.address.toLowerCase()]
  const [x, y] = pool ? pool.arguments : [0, 0]

  const state = {
    product: new BigNumber(x).times(y),
    userZils: new BigNumber((await zilliqa.blockchain.getBalance(userAddress)).result.balance),
    userTokens: new BigNumber(await tState.balances[userAddress.toLowerCase()]),
    poolZils: new BigNumber((await zilliqa.blockchain.getBalance(contract.address)).result.balance),
    poolTokens: new BigNumber(await tState.balances[contract.address.toLowerCase()]),
  }

  console.log('state: ', JSON.stringify(state, null, 2))
  return state
}

async function getBlockNum() {
  const response = network === 'localhost' ? await zilliqa.provider.send('GetBlocknum', "") : await zilliqa.blockchain.getNumTxBlocks()
  if (!response.result) {
    throw new Error(`Failed to get block! Error: ${JSON.stringify(response.error)}`)
  }
  return parseInt(response.result, 10)
}

async function nextBlock(n = 1) {
  if (network === 'localhost') {
    // console.log('Advancing block...')
    const response = await zilliqa.provider.send('IncreaseBlocknum', n)
    if (!response.result) {
      throw new Error(`Failed to advanced block! Error: ${JSON.stringify(response.error)}`)
    }
  }
}

exports.transfer = transfer
exports.getBalance = getBalance
exports.getContract = getContract
exports.callContract = callContract
exports.getState = getState
exports.getBlockNum = getBlockNum
exports.nextBlock = nextBlock