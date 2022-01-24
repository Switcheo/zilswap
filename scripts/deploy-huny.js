const { getDefaultAccount } = require('./account')
const fs = require("fs");
const { deployHuny } = require('./deploy');


const deploy = async () => {

  const owner = getDefaultAccount()
  const [hunyContract, state] = await deployHuny(owner.key, {
    name: "Huny Token",
    symbol: "Huny",
    decimals: 12,
    initSupply: 0,
  })

  console.log(hunyContract.address, "HUNY");

}

deploy().then(() => console.log('Done.'))
