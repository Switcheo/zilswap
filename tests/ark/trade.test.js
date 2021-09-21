// test success zrc-2
// success
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract } = require('../../scripts/call.js');
const { deployARK, useFungibleToken, useNonFungibleToken } = require('../../scripts/deploy.js');
const { randomBytes, sign } = require('@zilliqa-js/crypto')

let owner, contract, buyer, seller, price, token_id, fee_amount, expiry, nonce
beforeAll(async () => {
  owner = getDefaultAccount()
  const { key } = owner
  buyer = await createRandomAccount(key)
  seller = await createRandomAccount(key)
  ark = (await deployARK(key))[0]
  zrc1 = useNonFungibleToken(key)
  zrc2 = useFungibleToken(buyer.key, null, ark.address) // give buyer supply
  expiry = (await getBlockNum() + 100).toString()

  // defaults
  token_id = '201'
  nonce = '0'
  fee_amount = '8000000000000' // 8

  // default price = 42zrc2s
  price = {
    argtypes: [],
    arguments: [
      {
        argtypes: [],
        arguments: [zrc2.address],
        constructor: Token,
      },
      42000000000000, // 42
    ],
    constructor: Coins,
  }

  // give seller an nft token
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
  // approve ark for seller
  await callContract(
    owner.key, ark,
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

const signCheque = () => {
  // sha256(contract_hash + sha256(direction) sha256(token) + sha256(price) + sha256(fee) + sha256(expiry) + sha256(nonce))
  // sha256 of ADT? (direction, token, price)
  // assuming uint and bnum = sha256(big endian bytes)
  chequeHash = `0x${randomBytes(32)}`
  message = `Zilliqa Signed Message:\nExecute ARK Cheque ${chequeHash}`
  const buffer = Buffer.from(message, 'utf8')
  signedData = buffer.toString('hex')
  signature = sign(buffer, user.key, user.pubKey)
  // console.log({ message, chequeHash, pubKey, signedData, signature })
}

describe('ExecuteTrade', () => {
  beforeEach(() => {
    message = `Zilliqa Signed Message:\nExecute ARK Cheque ${chequeHash}`
    const buffer = Buffer.from(message, 'utf8')
    signedData = buffer.toString('hex')
    signature = sign(buffer, user.key, user.pubKey)

  })
  // test success zrc-2
  test('should trade a zrc-2 token with nft successfully', async () => {
    const tx = await callContract(
      user.key, contract,
      'ExecuteTrade',
      [
        {
          vname: 'token',
          type: 'NFT',
          value: {
            argtypes: [],
            arguments: [
              zrc1.address,
              token_id
            ],
            constructor: 'NFT',
          },
        },
        {
          vname: 'price',
          type: 'Coins',
          value: price,
        },
        {
          vname: 'sell_cheque',
          type: 'Cheque',
          value: {
            argtypes: [],
            arguments: [
              {
                argtypes: [],
                arguments: [],
                constructor: ['Sell']
              },
              expiry,
              '0', // nonce
              `0x${seller.pubKey}`,
              sellerSignedData,
              sellerSignature,
            ],
            constructor: 'Cheque',
          },
        },
        {
          vname: 'buy_cheque',
          type: 'Cheque',
          value: {
            argtypes: [],
            arguments: [
              {
                argtypes: [],
                arguments: [],
                constructor: ['Buy']
              },
              expiry,
              '0', // nonce
              `0x${buyer.pubKey}`,
              buyerSignedData,
              buyerSignature,
            ],
            constructor: 'Cheque',
          },
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)
    const state = await contract.getState()
    expect(state).toEqual(expect.objectContaining({
      voided_cheques: {
        [chequeHash]: {
          argtypes: [],
          arguments: [],
          constructor: True,
        }
      },
    }))
  })

  // test CodeDataInvalid
  test('wrong signed data results in error', async () => {
    const tx = await callContract(
      user.key, contract,
      'VoidCheque',
      [
        {
          vname: 'cheque_hash',
          type: 'ByStr32',
          value: chequeHash,
        },
        {
          vname: 'pubkey',
          type: 'ByStr33',
          value: `0x${pubKey}`,
        },
        {
          vname: 'signed_data',
          type: 'ByStr',
          value: `0x${signedData}61`, // append 'a'
        },
        {
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature}`,
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(3)
    expect(JSON.stringify(tx.receipt.exceptions)).toContain(code : (Int32 -4)) // CodeDataInvalid
  })

  // test success zil
  // test insufficient zrc-2
  // test insufficient zil
  // test token not available
  // test CodeSignatureInvalid seller
  // test CodeSignatureInvalid buyer
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
