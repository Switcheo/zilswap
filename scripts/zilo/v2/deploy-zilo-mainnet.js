const { getDefaultAccount } = require('../../account')
const { getBlockNum } = require('../../call.js')
const { deploySeedLP, deployZILOv2 } = require('../../deploy')
const rl = require("readline");
const fs = require("fs");
const { toBech32Address } = require('@zilliqa-js/zilliqa');
const { default: BigNumber } = require('bignumber.js');
const { getZilPrice } = require('../../utils');

const cli = rl.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const WHITELIST_FILE = process.env.WHITELIST_FILEPATH;

const deploy = async () => {
  const owner = getDefaultAccount()
  const bNum = await getBlockNum()
  const zilswapAddress =    '0x459cb2d3baf7e61cfbd5fe362f289ae92b2babb0' // https://devex.zilliqa.com/address/zil1gkwt95a67lnpe774lcmz72y6ay4jh2asmmjw6u?network=https%3A%2F%2Fapi.zilliqa.com
  const tokenAddress =      '0xfa4a17a53263d24e9ae9d0cec29b41520af9fee8' // https://devex.zilliqa.com/address/zil1684j7rzllprhzuwydgx9hfmxt6hexv2zh88dlm?network=https%3A%2F%2Fapi.zilliqa.com
  const treasuryAddress =   '0x1fa0276d7dab7f6b77c05abf96e3790d355f5519' // https://devex.zilliqa.com/address/zil1ytk3ykwlc2vy8fyp7wqp492zjassj5mxzgscv6?network=https%3A%2F%2Fapi.zilliqa.com
  const receiverAddress =   '0x1fa0276d7dab7f6b77c05abf96e3790d355f5519' // https://devex.zilliqa.com/address/zil1r3esdu5mvl5xhvn77kj9drntp7n0kdrha0f38k?network=https%3A%2F%2Fapi.zilliqa.com

  const zilDecimals = '000000000000'
  const tknDecimals = '000000'

  const discountWhitelist = fs.readFileSync(WHITELIST_FILE).toString("utf8").split("\n").map(row => row.trim().toLowerCase()).filter(row => row.match(/^0x[0-9a-z]{40}$/i));

  const ziloInitParams = {
    tokenAddress,
    tokenAmount:             '115500000' + tknDecimals, // TOKEN 115.5m
    targetZilAmount:          '32725000' + zilDecimals, // ZIL 32.725m (~$1m @ $0.031)
    minZilAmount:              '6545000' + zilDecimals, // ZIL 6.545m (20% of target)
    lpZilAmount:               '7700000' + zilDecimals, // ZIL 7.7m (token price = 0.01, zil price = 0.031)
    lpTokenAmount:            '23100000' + tknDecimals, // TOKEN 23.1m
    treasuryZilAmount:         '4908750' + zilDecimals, // ZIL ~4.9m (5% of target)
    receiverAddress,
    treasuryAddress,
    discountBps:                                 "500",
    discountWhitelist,
    startBlock:                (bNum + 510).toString(), // +6 hrs, 95 blocks an hr
    endBlock:           (bNum + 510 + 4600).toString(), // +48 hrs, 4560 rounded up, hopefully
  }

  console.log("Discount whitelist")
  console.log(discountWhitelist);
  console.log("Whitelist count", discountWhitelist?.length);

  console.log("Deploying from    ", owner.address, toBech32Address(owner.address));
  console.log("Token address     ", ziloInitParams.tokenAddress, toBech32Address(ziloInitParams.tokenAddress));
  console.log("Zilswap address   ", zilswapAddress, toBech32Address(zilswapAddress));
  console.log("Treasury address  ", treasuryAddress, toBech32Address(treasuryAddress));
  console.log("Receiver address  ", receiverAddress, toBech32Address(receiverAddress));
 
  console.log("Token decimals    ", tknDecimals, tknDecimals.length);
  console.log("ZIL decimals      ", zilDecimals, zilDecimals.length);
 
  console.log("Sale token amount ", new BigNumber(ziloInitParams.tokenAmount).shiftedBy(-tknDecimals.length).toFormat());
  console.log("Target ZIL amount ", new BigNumber(ziloInitParams.targetZilAmount).shiftedBy(-zilDecimals.length).toFormat());
  console.log("Minimum ZIL amount", new BigNumber(ziloInitParams.minZilAmount).shiftedBy(-zilDecimals.length).toFormat());
  console.log("Min % of target   ", new BigNumber(ziloInitParams.minZilAmount).div(new BigNumber(ziloInitParams.targetZilAmount)).shiftedBy(2).toFixed(3) + "%");


  const lpZilAmount = new BigNumber(ziloInitParams.lpZilAmount);
  const lpTokenAmount = new BigNumber(ziloInitParams.lpTokenAmount);
  const lpTokenPerZil = lpTokenAmount.div(lpZilAmount)
  console.log("ZIL to Seed LP    ", lpZilAmount.shiftedBy(-zilDecimals.length).toFormat());
  console.log("Token to Seed LP  ", lpTokenAmount.shiftedBy(-tknDecimals.length).toFormat());
  console.log("Ratio per ZIL     ", lpTokenPerZil.toFormat());

  const zilPrice = await getZilPrice();
  if (zilPrice > 0) {
    const bnZilPrice = new BigNumber(zilPrice);
    const expTokenPrice = bnZilPrice.div(lpTokenPerZil).shiftedBy(-tknDecimals.length);
    console.log("ZIL price         ", bnZilPrice.toFormat());
    console.log("Exp. token price  ", expTokenPrice.toFormat());
  }


  await new Promise((resolve) => cli.question("Is that correct? Enter to proceed", resolve));

  // deploy seed lp
  const [lp, stateLP] = await deploySeedLP(owner.key, {
    tokenAddress,
    zilswapAddress,
  })

  console.log('Deployed seed lp contract:')
  console.log(JSON.stringify(lp, null, 2))
  console.log('State:')
  console.log(JSON.stringify(stateLP, null, 2))


  // deploy zilo
  const [zilo, state] = await deployZILOv2(owner.key, { 
    ...ziloInitParams,
    liquidityAddress: lp.address.toLowerCase(),
   })

  console.log('Deployed zilo contract:')
  console.log(JSON.stringify(zilo, null, 2))
  console.log('State:')
  console.log(JSON.stringify(state, null, 2))
}

deploy().then(() => console.log('Done.'))
