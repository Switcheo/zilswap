const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { callContract } = require('./call.js')
const { zilliqa } = require('./zilliqa')
const { fromBech32Address } = require("@zilliqa-js/crypto")

// const CONTRACT_HASH = '0x535416E04080219018717DF62bBE7f6a25e4080E' // giveaway
const CONTRACT_HASH = '0x79D05Fcc4f97EEdd905AFE6C59f0bCd0D4C4BA09' // nft

// const userAddress = fromBech32Address("zil1r7szwmta4dlkka7qt2ledcmep56474gej3psj6") // steven
// const userAddress = fromBech32Address("zil1nq8c5zp78lgtf6axvun6pd36ggjx48vzprpy4r") // andrew
const userAddress = fromBech32Address("zil1gtk045960q0p5akectarewvt4eec3ws73mkn26") // jereld
// const userAddress = fromBech32Address("zil1r7szwmta4dlkka7qt2ledcmep56474gej3psj6")

const run = async () => {
    const contract = zilliqa.contracts.at(CONTRACT_HASH)
    zilliqa.toBech32Address
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
                value: userAddress,
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
