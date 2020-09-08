
const { TESTNET_VERSION, zilliqa, useKey } = require('./zilliqa')
const { BN, Long, units } = require('@zilliqa-js/util')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const BigNumber = require('bignumber.js')

async function transfer(privateKey, toAddr, amount) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }
  useKey(privateKey)

  return await zilliqa.blockchain.createTransaction(
    zilliqa.transactions.new(
      {
        version: TESTNET_VERSION,
        toAddr,
        amount: new BN(units.toQa(amount, units.Units.Zil)),
        gasPrice: units.toQa('1000', units.Units.Li),
        gasLimit: Long.fromNumber(1),
      },
      false,
    ),
  );
}

async function callContract(privateKey, contract, transition, args,
  zilsToSend = 0, insertRecipientAsSender = true, insertDeadlineBlock = true) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }
  useKey(privateKey)

  const address = getAddressFromPrivateKey(privateKey)

  const response = await zilliqa.blockchain.getNumTxBlocks()
  const bNum = parseInt(response.result, 10)
  const deadline = bNum + 10
  if (insertDeadlineBlock) {
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

  console.info(`Calling: ${transition}`)
  return await contract.call(transition, args,
    {
      version: TESTNET_VERSION,
      amount: units.toQa(zilsToSend, units.Units.Zil),
      gasPrice: units.toQa('1000', units.Units.Li),
      gasLimit: Long.fromNumber(80000),
    }, 33, 1000, true
  )
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

exports.transfer = transfer
exports.callContract = callContract
exports.getState = getState
