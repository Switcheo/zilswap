const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { callContract } = require('./call.js')
const { zilliqa } = require('./zilliqa')

// const CONTRACT_HASH = '0x535416E04080219018717DF62bBE7f6a25e4080E' // giveaway
const CONTRACT_HASH = '0x7b6d4978dE2269AEbBaEBFf388190Fb24d5F414d' // nft

const run = async () => {
    const contract = zilliqa.contracts.at(CONTRACT_HASH)
    const owner = getDefaultAccount()
    console.log(owner)

    // add minter
    await callContract(
        owner.key, contract,
        'Mint',
        [
            {
                vname: 'to',
                type: 'ByStr20',
                value: owner.address,
            },
            {
                vname: 'token_uri',
                type: 'String',
                value: '',
            },
        ],
        0, false, false
      )
}

run().then(() => console.log('Done.'))
