const fetch = require('node-fetch')
const fs = require("fs");
const path = require("path");

async function retrieveTxs(contract, network, page) {
    const response = await fetch(`https://api.viewblock.io/v1/zilliqa/addresses/${contract}/txs?page=${page}&network=${network}`, {
      headers: {
        "X-APIKEY": "",
      },
    });
    return await response.json();
  }

async function parseEvents() {
    let data = []
    let page = 1
    while (true) {
        const txs = await retrieveTxs('0x494170114b2ebede8d949c20e16bf568a1c8ee17', 'mainnet', page++)
        if (txs.length === 0) break

        for (const tx of txs) {
            data.push(tx)
        }
    }
    const FILE_OUTPUT = path.join(__dirname, "transcend-data.json");
    console.log("writing to transcend-data file", FILE_OUTPUT)
    fs.writeFileSync(FILE_OUTPUT, JSON.stringify(data));
}

parseEvents()
