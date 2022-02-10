const crypto = require('crypto')
const { randomBytes, sign } = require('@zilliqa-js/crypto')
const { getDefaultAccount, createRandomAccount } = require('../../scripts/account.js');
const { callContract } = require('../../scripts/call.js');
const { deployARK } = require('../../scripts/deploy.js');
const { chainId } = require('../../scripts/zilliqa.js');

let owner, contract, user
beforeAll(async () => {
  owner = getDefaultAccount()
  console.log("address", owner.address)
  user = await createRandomAccount(owner.key, '500')
  contract = (await deployARK(owner.key))[0]
})

describe('ARK VoidCheque', () => {
  let chequeHash, signature
  beforeEach(() => {
    chequeHash = `0x${randomBytes(32)}`
    message = `Zilliqa Signed Message (${chainId}):\nVoid ARK Cheque ${chequeHash}`
    const messageHash = crypto.createHash('sha256').update(message, 'utf8').digest('hex')
    const buffer = Buffer.from(messageHash, 'hex')
    signature = sign(buffer, user.key, user.pubKey)
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
        [`0x${user.pubKey}`]: {
          [chequeHash]: {
            "argtypes": [],
            "arguments": [],
            "constructor": "True",
          },
        },
      },
    }))
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
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature.replace('1', '0')}`, // flip 1 to 0
        }
      ],
      0, false, false
    )
    expect(tx.status).toEqual(3)
    expect(JSON.stringify(tx.receipt.exceptions)).toContain("code : (Int32 -6)") // CodeSignatureInvalid
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
          vname: 'signature',
          type: 'ByStr64',
          value: `0x${signature}`,
        }
      ],
      0, false, false
    )
    expect(tx2.status).toEqual(3) // void twice fails
    expect(JSON.stringify(tx2.receipt.exceptions)).toContain("code : (Int32 -7)") // CodeChequeAlreadyVoided
  })
})
