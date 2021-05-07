
const { TEST_VERSION, MUST_ADVANCE_BLOCKNUM, zilliqa, useKey } = require('./zilliqa')
const { BN, Long, units } = require('@zilliqa-js/util')
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
        version: TEST_VERSION,
        toAddr,
        amount: new BN(units.toQa(amount, units.Units.Zil)),
        gasPrice: new BN(minGasPrice.result),
        gasLimit: Long.fromNumber(1),
      },
      false,
    ),
  );

  await nextBlock()

  return tx
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
    console.log({response, deadline})
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
      version: TEST_VERSION,
      amount: units.toQa(zilsToSend, units.Units.Zil),
      gasPrice: new BN(minGasPrice.result),
      gasLimit: Long.fromNumber(80000),
    }, 33, 1000, true
  )

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
  const response = await zilliqa.provider.send('GetBlocknum', "")
  if (!response.result) {
    throw new Error(`Failed to get block! Error: ${JSON.stringify(response.error)}`)
  }
  return parseInt(response.result, 10)
}

async function nextBlock(n = 1) {
  if (MUST_ADVANCE_BLOCKNUM) {
    console.log('Advancing block...')
    const response = await zilliqa.provider.send('IncreaseBlocknum', n)
    if (!response.result) {
      throw new Error(`Failed to advanced block! Error: ${JSON.stringify(response.error)}`)
    }
  }
}

exports.transfer = transfer
exports.callContract = callContract
exports.getState = getState
exports.getBlockNum = getBlockNum
exports.nextBlock = nextBlock