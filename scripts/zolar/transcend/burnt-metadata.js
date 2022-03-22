const fetch = require('node-fetch')

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

;
(async () => {
    const transcendData = require('./transcend-data.json')

    let data = []
    const transcendTxs = transcendData.filter((event) => JSON.parse(event.data)._tag === "Transcend")
    const transcendEvents = transcendTxs.map(tx => tx.events)

    for (const events of transcendEvents) {
        let index = 0
        while (index < events.length) {
            if (events[index].name !== 'Mint' || events[index + 1].name !== 'BurnSuccess')
            throw new Error('invalid transaction order')
            const mintZolarId = events[index].params.token_id
            const burntTBMId = events[index + 1].params.token
            const burntMetadata = await getMetadata('https://api.thebear.market/metadata/' + burntTBMId)
            const entry = {
                mintZolarId,
                burntTBMId,
                burntMetadata: burntMetadata.attributes[0]
            }
            data.push(entry)
            index+=2
        }
    }
    console.log(data)
})().catch(console.error).finally(() => process.exit(0))