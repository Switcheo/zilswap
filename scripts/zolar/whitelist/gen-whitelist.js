const fs = require("fs");
const path = require("path");

// input files
const FILE_SNAPSHOT = path.join(__dirname, "bear-snapshot.txt");

// output files
const FILE_OUTPUT = path.join(__dirname, "mint-whitelist.json");
const FILE_OWNERSHIP_CHECK = path.join(__dirname, "bear-ownership.json");

;
(async () => {

  const bearSnapshot = fs.readFileSync(FILE_SNAPSHOT);

  const bearSnapshotEntries = bearSnapshot.toString("utf8").split("\n").slice(1).filter(line => line.trim().length > 0);
  const bearOwnership = bearSnapshotEntries.map(line => line.split(/\s+/).filter(line => line.trim().length > 0));

  const addressBearCount = bearOwnership.reduce((accum, next) => {
    const [tokenId, address] = next;
    accum[address] = [tokenId].concat(accum[address] ?? []);
    return accum;
  }, {});

  console.log("writing to ownership check file", FILE_OWNERSHIP_CHECK)
  fs.writeFileSync(FILE_OWNERSHIP_CHECK, JSON.stringify(addressBearCount));

  const whitelist = {};

  let total = 0;
  let max = -1;
  for (const address in addressBearCount) {
    const count = Math.floor(Math.sqrt(addressBearCount[address].length));
    whitelist[address] = count;

    total += count;
    if (max < count) max = count;
  }

  console.log("round type: ", "floor")
  console.log("address   : ", Object.keys(whitelist).length)
  console.log("total     : ", total);
  console.log("max       : ", max);

  console.log("writing to whitelist", FILE_OUTPUT)
  fs.writeFileSync(FILE_OUTPUT, JSON.stringify(whitelist));

})().catch(console.error).finally(() => process.exit(0))
