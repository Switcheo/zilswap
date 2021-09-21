// success
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract } = require('../../scripts/call.js');
const { deployARK } = require('../../scripts/deploy.js');
const { randomBytes, sign } = require('@zilliqa-js/crypto')

let owner, contract, user
beforeAll(async () => {
  owner = getDefaultAccount()
  user = await createRandomAccount(owner.key)
  contract = (await deployARK(owner.key))[0]
})

describe('VoidCheque', () => {
  let chequeHash, signedData, signature
  beforeEach(() => {
    chequeHash = `0x${randomBytes(32)}`
    message = `Zilliqa Signed Message:\nVoid ARK Cheque ${chequeHash}`
    const buffer = Buffer.from(message, 'utf8')
    signedData = buffer.toString('hex')
    signature = sign(buffer, user.key, user.pubKey)
    // console.log({ message, chequeHash, pubKey, signedData, signature })
  })

  // test success
  test('void a cheque hash successfully', async () => {
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
          value: `0x${user.pubKey}`,
        },
        {
          vname: 'signed_data',
          type: 'ByStr',
          value: `0x${signedData}`,
        },
        {
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature}`,
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(2)
    const state = await contract.getState()
    expect(state).toEqual(expect.objectContaining({
      "voided_cheques": {
        [chequeHash]: {
          "argtypes": [],
          "arguments": [],
          "constructor": "True",
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
    expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -4)") // CodeDataInvalid
  })

  // test CodeSignatureInvalid
  test('wrong signature results in error', async () => {
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
          value: `0x${user.pubKey}`,
        },
        {
          vname: 'signed_data',
          type: 'ByStr',
          value: `0x${signedData}`,
        },
        {
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature.replace('1', '0')}`, // flip 1 to 0
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(3)
    expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -5)") // CodeSignatureInvalid
  })

  // test CodeChequeAlreadyVoided
  test('voiding twice results in error', async () => {
    const tx1 = await callContract(
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
          value: `0x${user.pubKey}`,
        },
        {
          vname: 'signed_data',
          type: 'ByStr',
          value: `0x${signedData}`,
        },
        {
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature}`,
        }
      ],
      0, false, false
    )
    expect(tx1.status).toEqual(2) // void once
    const tx2 = await callContract(
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
          value: `0x${user.pubKey}`,
        },
        {
          vname: 'signed_data',
          type: 'ByStr',
          value: `0x${signedData}`,
        },
        {
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature}`,
        }
      ],
      0, false, false
    )
    expect(tx2.status).toEqual(3) // void twice fails
    expect(JSON.stringify(tx2.receipt.exceptions)).toContain("code : (Int32 -6)") // CodeChequeAlreadyVoided
  })
})
