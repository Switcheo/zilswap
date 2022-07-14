require('dotenv').config()
const fs = require('fs')
const util = require('util')
const crypto = require('crypto')
const { BN } = require('@zilliqa-js/util')
const { sign } = require('@zilliqa-js/crypto')
const { getAddressFromPrivateKey, schnorr } = require('@zilliqa-js/crypto')
const { useFungibleToken, deployContract } = require('../../scripts/deploy.js');
const { callContract, getContract, getBlockNum } = require("../../scripts/call.js");
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { useKey, network, chainId, getChainID } = require('../../scripts/zilliqa.js')

let owner, buyer, seller, price, token, feeAmount, expiry, nonce, arkAddr
let ark, tokenProxy, nft, priceToken

const readFile = util.promisify(fs.readFile)
const randomHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

async function useNonFungibleToken(privateKey, params = {}, useExisting = process.env.CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployNonFungibleToken(privateKey, params)
}

// Deploy ZRC1 token contract
async function deployNonFungibleToken(
  privateKey, { name = 'NFT', symbol: _symbol = null }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `TEST-${randomHex(4).toUpperCase()}`

  // Load code and contract initialization variables
  const code = (await readFile('./src/ZRC1.scilla')).toString() // ZRC1 token contract
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
      value: 'ZRC1',
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `ZRC1`,
    }
  ]

  console.info(`Deploying ZRC1 token...`)
  return deployContract(privateKey, code, init)
}

// Deploy ARK contract
async function deployARK(privateKey, {
  owner = null,
  feeReceiver = null,
} = {}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!feeReceiver) feeReceiver = getAddressFromPrivateKey(privateKey).toLowerCase()

  // Load code and contract initialization variables
  const code = (await readFile('./src/nft/ARKv2.scilla')).toString()
  console.log("network", network, chainId)
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
      value: owner,
    },
    {
      vname: 'initial_fee_address',
      type: 'ByStr20',
      value: feeReceiver,
    },
    {
      vname: 'chain_id',
      type: 'Uint32',
      value: chainId.toString(),
    },
  ]

  console.info(`Deploying ARK...`)
  const ark = (await deployContract(privateKey, code, init))[0]

  // ARK requires a token proxy
  const code2 = (await readFile('./src/nft/TokenProxy.scilla')).toString()
  const init2 = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'ark_address',
      type: 'ByStr20',
      value: ark.address,
    },
  ];

  console.info(`Deploying and setting ARK ZRC-2 Token Proxy...`)
  const tokenProxy = (await deployContract(privateKey, code2, init2))[0]

  // Set ARK's token proxy
  await callContract(
    privateKey, ark,
    'SetTokenProxy',
    [
      {
        vname: 'address',
        type: 'ByStr20',
        value: tokenProxy.address,
      },
    ],
    0, false, false
  )
  return [ark, await ark.getState(), tokenProxy, await tokenProxy.getState()]
}

beforeAll(async () => {
  owner = getDefaultAccount()
  buyer = await createRandomAccount(owner.key)
  seller = await createRandomAccount(owner.key, '1000')
  const a = await deployARK(owner.key) // Deploy ark contract, tokenProxy contract and call setTokenProxy
  ark = a[0]
  tokenProxy = a[2]
  arkAddr = `${ark.address.toLowerCase()}`
  nft = (await useNonFungibleToken(owner.key))[0] // Deploy ZRC6 tokens
  priceToken = (await useFungibleToken(buyer.key, undefined, tokenProxy.address))[0] // Deploy fungibleToken contract and increase allowance
  expiry = (await getBlockNum() + 100).toString()

  // defaults
  nonce = '1'
  feeAmount = '8000000000000' // 8

  // default token
  token = {
    argtypes: [],
    arguments: [
      nft.address,
      '' // token_id
    ],
    constructor: `${arkAddr}.NFT`,
    _serialization: {
      numByteSize: { 1: 32 }
    },
  }

  // default price = 42zrc2s
  price = {
    argtypes: [],
    arguments: [
      {
        argtypes: [],
        arguments: [priceToken.address],
        constructor: `${arkAddr}.Token`,
      },
      '42000000000000', // 42
    ],
    constructor: `${arkAddr}.Coins`,
  }

  // add minter
  await callContract(
    owner.key, nft,
    'ConfigureMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: seller.address,
      },
    ],
    0, false, false
  )

  // approve ark as operator for seller
  await callContract(
    seller.key, nft,
    'SetApprovalForAll',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: ark.address,
      },
    ],
    0, false, false
  )
})

let tokenID = 0
const mintNFT = async () => {
  // mint nft to seller
  await callContract(
    seller.key, nft,
    'Mint',
    [
      {
        vname: 'to',
        type: 'ByStr20',
        value: seller.address,
      },
      {
        vname: 'token_uri',
        type: 'String',
        value: 'https://example.com',
      },
    ],
    0, false, false
  )
  token.arguments[1] = (++tokenID).toString()
}

const serializeValue = (val, numByteSize = 16) => {
  if (val.arguments) {
    return serializeADT(val)
  } else if (val.startsWith('0x')) {
    return val.replace('0x', '').toLowerCase()
  } else if (!isNaN(val)) {
    return new BN(val).toBuffer('be', numByteSize).toString('hex')
  } else {
    return strToHex(val)
  }
}

const serializeADT = (adt) => {
  let buffer = strToHex(adt.constructor)
  adt.arguments.forEach((arg, i) => {
    const numByteSize = adt._serialization?.numByteSize?.[i]
    buffer += serializeValue(arg, numByteSize)
  })
  return buffer
}

const strToHex = (str) => {
  return Array.from(
    new TextEncoder().encode(str),
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
}

const getChequeHash = (isBuyer) => {
  let buffer = serializeValue(ark.address)
  buffer += crypto.createHash('sha256').update(strToHex(`${arkAddr}.${isBuyer ? 'Buy' : 'Sell'}`), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializeValue(token), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializeValue(price), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializeValue(isBuyer ? '0' : feeAmount), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(strToHex(expiry), 'hex').digest('hex') // BNum is serialized as a String
  buffer += crypto.createHash('sha256').update(serializeValue(nonce), 'hex').digest('hex')
  return crypto.createHash('sha256').update(buffer, 'hex').digest('hex')
}

let sellerChequeHash, buyerChequeHash
const signCheque = (isBuyer) => {
  const user = isBuyer ? buyer : seller
  const chequeHash = `0x${getChequeHash(isBuyer)}`
  const message = `Zilliqa Signed Message (${chainId}):\nExecute ARK Cheque ${chequeHash}`
  const messageHash = crypto.createHash('sha256').update(message, 'utf8').digest('hex')
  const buffer = Buffer.from(messageHash, 'hex')
  const signature = `0x${sign(buffer, user.key, user.pubKey)}`
  if (isBuyer) buyerChequeHash = chequeHash
  else sellerChequeHash = chequeHash
  return signature
}

let sellerSignature, buyerSignature
const signCheques = () => {
  sellerSignature = signCheque(false)
  buyerSignature = signCheque(true)
}

describe('ARK ExecuteTrade', () => {
  beforeEach(async () => {
    await mintNFT()
    signCheques()
  })

  // test executeTrade using ZRC-1 nft
  test.only('Ark contract should be able to trade a zrc-1 NFT successfully ', async () => {
    const tx = await callContract(
      buyer.key, ark,
      'ExecuteTrade',
      [
        {
          vname: 'token',
          type: `${arkAddr}.NFT`,
          value: token,
        },
        {
          vname: 'price',
          type: `${arkAddr}.Coins`,
          value: price,
        },
        {
          vname: 'fee_amount',
          type: 'Uint128',
          value: feeAmount,
        },
        {
          vname: 'sell_cheque',
          type: `${arkAddr}.Cheque`,
          value: {
            argtypes: [],
            arguments: [
              {
                argtypes: [],
                arguments: [],
                constructor: `${arkAddr}.Sell`,
              },
              expiry,
              nonce,
              `0x${seller.pubKey}`,
              sellerSignature,
            ],
            constructor: `${arkAddr}.Cheque`,
          },
        },
        {
          vname: 'buy_cheque',
          type: `${arkAddr}.Cheque`,
          value: {
            argtypes: [],
            arguments: [
              {
                argtypes: [],
                arguments: [],
                constructor: `${arkAddr}.Buy`,
              },
              expiry,
              nonce,
              `0x${buyer.pubKey}`,
              buyerSignature,
            ],
            constructor: `${arkAddr}.Cheque`,
          },
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)
    const state = await ark.getState()
    expect(state).toEqual(expect.objectContaining({
      voided_cheques: {
        [`0x${seller.pubKey}`]: {
          [sellerChequeHash]: {
            argtypes: [],
            arguments: [],
            constructor: 'True',
          },
        },
        [`0x${buyer.pubKey}`]: {
          [buyerChequeHash]: {
            argtypes: [],
            arguments: [],
            constructor: 'True',
          },
        },
      },
    }))
  })
})