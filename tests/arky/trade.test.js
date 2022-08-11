
const crypto = require('crypto')
const { sign } = require('@zilliqa-js/crypto')
const { BN } = require('@zilliqa-js/util')
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js')
const { callContract, getBlockNum } = require('../../scripts/call.js')
const { deployARK, useFungibleToken, useNonFungibleToken } = require('../../scripts/deploy.js')
const { chainId } = require('../../scripts/zilliqa.js')


let owner, buyer, seller, price, token, feeAmount, expiry, nonce, arkAddr
let ark, tokenProxy, zrc1, zrc2
beforeAll(async () => {
  owner = getDefaultAccount()
  buyer = await createRandomAccount(owner.key)
  seller = await createRandomAccount(owner.key, '1000')
  const a = await deployARK(owner.key)
  ark = a[0]
  tokenProxy = a[2]
  arkAddr = `${ark.address.toLowerCase()}`
  zrc1 = (await useNonFungibleToken(owner.key))[0]
  zrc2 = (await useFungibleToken(buyer.key, undefined, tokenProxy.address))[0]
  expiry = (await getBlockNum() + 100).toString()

  // defaults
  nonce = '1'
  feeAmount = '8000000000000' // 8

  // default token
  token = {
    argtypes: [],
    arguments: [
      zrc1.address,
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
        arguments: [zrc2.address],
        constructor: `${arkAddr}.Token`,
      },
      '42000000000000', // 42
    ],
    constructor: `${arkAddr}.Coins`,
  }

  // give seller an NFT token
  // add minter
  await callContract(
    owner.key, zrc1,
    'ConfigureMinter',
    [
      {
        vname: 'minter',
        type: 'ByStr20',
        value: owner.address,
      },
    ],
    0, false, false
  )
  // approve ark as operator for seller
  await callContract(
    seller.key, zrc1,
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
  // unlock nft (tbm specific)
  await callContract(
    owner.key, zrc1,
    'UnlockTokens',
    [],
    0, false, false
  )
})

let tokenID = 0
const mintNFT = async () => {
  // mint token to seller
  await callContract(
    owner.key, zrc1,
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

  // test buyer success with zrc-2
  test.only('buyer should be able to trade a zrc-2 with NFT successfully', async () => {
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
    // check nft transferred
    // check zrc-2 transferred
  })

  // test buyer success with zil
  // test seller success with zrc-2
  // test seller fail zil (not allowed, wZIL required)
  // test insufficient zrc-2
  // test insufficient zil
  // test token not available
  // test CodeSignatureInvalid seller
  // test CodeSignatureInvalid buyer
  test('wrong signature results in error', async () => {
    // const tx = await callContract(
    //   user.key, contract,
    //   'ExecuteTrade',
    //   [
    //   ],
    //   0, false, false
    // )
    // expect(tx.status).toEqual(3)
    // expect(JSON.stringify(tx.receipt.exceptions)).toContain('code : (Int32 -6)') // CodeSignatureInvalid
  })
  // test CodeChequeAlreadyVoided seller
  // test CodeChequeAlreadyVoided buyer
  // test CodeChequeExpired seller
  // test CodeChequeExpired buyer
  // test CodeInvalidPrice (zero)
  // test CodeInvalidFee
  // test CodeInvalidSide buyer
  // test CodeInvalidSide seller
  // test CodeInvalidOwner
})
