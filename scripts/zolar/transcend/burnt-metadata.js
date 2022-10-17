const fetch = require('node-fetch')
const BigNumber = require('bignumber.js')

async function getMetadata(tokenUri) {
    const response = await fetch(tokenUri)
    if (response.status !== 200) {
        throw new Error(`Fetching failed, status code: ${response.status}`)
    }
    try {
        return await response.json()
    } catch (e) {
        logger.warn('syncMetadataProcessor: unable to parse response into json')
        throw e
    }
}

// 1705000 block height at start of 2022
// tbm 0xd793f378a925b9f0d3c4b6ee544d31c707899386 zil167flx79fykulp57ykmh9gnf3curcnyux6dcj5e
// metazoa 0xf79a456a5afd412d3890e2232f6205f664be8957 zil177dy26j6l4qj6wysug3j7cs97ejtaz2h06vfwa

;
(async () => {
    const transcendData = require('./ark-v2-data.json')

    const feesMap = {
        '2021': {},
        '2022': {},
    }
    const proceedsMap = {
        '2021': {},
        '2022': {},
    }
    const zeroAddress = 'zil000000000000000000000000000000000000000'
    
    let count1 = 0
    let count2 = 0
    for (const data of transcendData) {
        const height = data.blockHeight
        const events = data.events
        const tradeEvent = events.find(event => event.name === 'ExecuteTradeSuccess')
        if (tradeEvent) {
            const { token, proceeds, fees } = tradeEvent.params
            const tokenAddress = token[0].params[0]
            if (tokenAddress === 'zil177dy26j6l4qj6wysug3j7cs97ejtaz2h06vfwa') {
                const year = parseInt(height) < 1705000 ? '2021' : '2022'
                parseInt(height) < 1705000 ? count1++ : count2++
                const proceedAmt = proceeds[0].params[0]
                const feeAmt = fees[0].params[0]
                const tokenType = proceeds[1].name.split('.')[1]
                if (tokenType === "Zil") {
                    if (!feesMap[year][zeroAddress]) feesMap[year][zeroAddress] = new BigNumber(0)
                    if (!proceedsMap[year][zeroAddress]) proceedsMap[year][zeroAddress] = new BigNumber(0)

                    feesMap[year][zeroAddress] = feesMap[year][zeroAddress].plus(new BigNumber(feeAmt))
                    proceedsMap[year][zeroAddress] = proceedsMap[year][zeroAddress].plus(new BigNumber(proceedAmt))
                } else {
                    const paymentToken = proceeds[1].params[0]
                    if (!feesMap[year][paymentToken]) feesMap[year][paymentToken] = new BigNumber(0)
                    if (!proceedsMap[year][paymentToken]) proceedsMap[year][paymentToken] = new BigNumber(0)

                    feesMap[year][paymentToken] = feesMap[year][paymentToken].plus(new BigNumber(feeAmt))
                    proceedsMap[year][paymentToken] = proceedsMap[year][paymentToken].plus(new BigNumber(proceedAmt))
                }
            }
        }
    }
    console.log("Proceeds:", proceedsMap[2021])
    console.log("Fees: ", feesMap[2021])
    console.log(count1)
    console.log(count2)
})().catch(console.error).finally(() => process.exit(0))