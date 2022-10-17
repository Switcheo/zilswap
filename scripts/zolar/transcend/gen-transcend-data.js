const fetch = require('node-fetch')
const fs = require("fs");
const path = require("path");

async function retrieveTxs(contract, network, page) {
    const response = await fetch(`https://api.viewblock.io/v1/zilliqa/addresses/${contract}/txs?page=${page}&network=${network}`, {
      headers: {
        "X-APIKEY": "56968b1f75bafc18b83cad87ccba7426e4d7c1003498ffbc7b56afb22fd017f6",
      },
    });
    return await response.json();
  }

// v1 broker 0x94fBA0834984a066d996129c45e9683bC3ED2a79
// v2 broker 0x5B90fcC2dCA4081ABCEd87C41dc0949F3A0A9a03

async function parseEvents() {
    let data = []
    let page = 1
    while (true) {
        const txs = await retrieveTxs('0x94fBA0834984a066d996129c45e9683bC3ED2a79', 'mainnet', page++)
        if (txs.length === 0) break

        for (const tx of txs) {
            data.push(tx)
        }
    }
    const FILE_OUTPUT = path.join(__dirname, "ark-v1-data.json");
    console.log("writing to transcend-data file", FILE_OUTPUT)
    fs.writeFileSync(FILE_OUTPUT, JSON.stringify(data));
}

parseEvents()