require('dotenv').config()
const fs = require("fs");
const { Zilliqa } = require("@zilliqa-js/zilliqa")
const { getAddressFromPrivateKey, getPubKeyFromPrivateKey, toBech32Address, fromBech32Address, schnorr } = require('@zilliqa-js/crypto')
const { deployContract } = require("./deploy");
const { default: BigNumber } = require("bignumber.js");
const { callContract } = require("./call");
const { useKey, zilliqa, chainId } = require("./zilliqa");
const util = require('util');
const crypto = require('crypto');
const { BN } = require('@zilliqa-js/util')
const CryptoJS = require('crypto-js');
const fetch = require('node-fetch')

const ZIL_ADDRESS = "0x0000000000000000000000000000000000000000";

const readFile = util.promisify(fs.readFile)

const getPrivateKey = (key = "PRIVATE_KEY") => {
  const privateKey = process.env[key];
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided - ' + key)
  }
  return privateKey;
}

const deployARK = async () => {
  const privateKey = getPrivateKey("PRIVATE_KEY_BUY");
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/nft/ARK.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'initial_fee_address',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'chain_id',
      type: 'Uint32',
      value: chainId.toString(),
    },
  ]

  console.info(`Deploying ARK contract...`)
  const ark = (await deployContract(privateKey, code, init))[0]

  // ARK requires a token proxy
  const code2 = (await readFile('./src/nft/TokenProxy.scilla')).toString()
  const init2 = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'ark_address',
      type: 'ByStr20',
      value: ark.address,
    },
  ];

  console.info(`Deploying and setting ARK ZRC-2 Token Proxy...`)
  const tokenProxy = (await deployContract(privateKey, code2, init2))[0]

  // Set ARK's token proxy
  await callContract(
    privateKey, ark,
    'SetTokenProxy',
    [
      {
        vname: 'address',
        type: 'ByStr20',
        value: tokenProxy.address,
      },
    ],
    0, false, false
  )

  return [ark, await ark.getState(), tokenProxy, await tokenProxy.getState()]
}

const deployHuny = async () => {
  const privateKey = getPrivateKey("PRIVATE_KEY_BUY");
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/nft/Huny.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'name',
      type: 'String',
      value: `Huny Token`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: "HUNY",
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: "12",
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: "0",
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
  ]

  console.info(`Deploying Huny...`)
  const [contract] = await deployContract(privateKey, code, init)

  const txAddMinter = await callContract(privateKey, contract, "AddMinter", [{
    vname: 'minter',
    type: 'ByStr20',
    value: `${address}`,
  }], 0, false, false);
  console.log("add minter", txAddMinter.id)

  const txMint = await callContract(privateKey, contract, "Mint",
    [{
      vname: 'recipient',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'amount',
      type: 'Uint128',
      value: '1000000000000000000000',
    }], 0, false, false);
  console.log("mint", txMint.id)

  return contract
}

const deployMetazoa = async () => {
  const privateKey = getPrivateKey("PRIVATE_KEY_SELL");
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/nft/Metazoa.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'initial_base_uri',
      type: 'String',
      value: "https://creatures-api.zilliqa.com/api/creature/",
    },
    {
      vname: 'name',
      type: 'String',
      value: "Metazoa",
    },
    {
      vname: 'symbol',
      type: 'String',
      value: "Metazoa",
    },
  ]

  console.info(`Deploying Metazoa...`)
  const [contract] = await deployContract(privateKey, code, init)

  const txMint = await callContract(privateKey, contract, "Mint",
    [{
      vname: 'to',
      type: 'ByStr20',
      value: address,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: 'https://creatures-api.zilliqa.com/api/creature/',
    }], 0, false, false);
  console.log("mint", txMint.id)

  return contract
}

const deployTBM = async () => {
  const privateKey = getPrivateKey("PRIVATE_KEY_SELL");
  const address = getAddressFromPrivateKey(privateKey)
  const code = (await fs.promises.readFile('./src/tbm/TheBearMarket.scilla')).toString()
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
    {
      vname: 'name',
      type: 'String',
      value: "TheBearMarket",
    },
    {
      vname: 'symbol',
      type: 'String',
      value: "TheBearMarket",
    },
    {
      vname: 'max_supply',
      type: 'Uint256',
      value: "1000",
    },
    {
      vname: 'reserved_supply',
      type: 'Uint256',
      value: "200",
    },
    {
      vname: 'provenance_hash',
      type: 'ByStr32',
      value: "0x663a71ad604ebddb736d870b758326cfe910bc0fc989d5166ebc07d794973017",
    },
  ]

  console.info(`Deploying TBM...`)
  const [contract] = await deployContract(privateKey, code, init)

  const txUnlockTokens = await callContract(privateKey, contract, "UnlockTokens",
    [], 0, false, false);
  console.log("add mint", txUnlockTokens.id)

  const txAddMinter = await callContract(privateKey, contract, "ConfigureMinter",
    [{
      vname: 'minter',
      type: 'ByStr20',
      value: address,
    }], 0, false, false);
  console.log("add mint", txAddMinter.id)

  const txMint = await callContract(privateKey, contract, "Mint",
    [{
      vname: 'to',
      type: 'ByStr20',
      value: address,
    },
    {
      vname: 'token_uri',
      type: 'String',
      value: 'https://creatures-api.zilliqa.com/api/creature/',
    }], 0, false, false);
  console.log("mint", txMint.id)

  return contract
}

const chequeHash = ({ brokerAddress, side, token, price, feeAmount, expiry, nonce }) => {
  const isBuyer = side === 'buy'
  let buffer = brokerAddress.replace('0x', '')
  buffer += crypto.createHash('sha256').update(strToHex(`${brokerAddress}.${isBuyer ? 'Buy' : 'Sell'}`), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializeNFT(brokerAddress, token), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializePrice(brokerAddress, price), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(serializeUint128(feeAmount), 'hex').digest('hex')
  buffer += crypto.createHash('sha256').update(strToHex(expiry.toString()), 'hex').digest('hex') // BNum is serialized as a String
  buffer += crypto.createHash('sha256').update(serializeUint128(nonce), 'hex').digest('hex') // Just a random number

  const chequeHash = crypto.createHash('sha256').update(buffer, 'hex').digest('hex') // Creates the chequeHash
  // console.log("chequeHash", side, chequeHash)
  return chequeHash
}

const serializeNFT = (brokerAddress, token) => {
  let buffer = strToHex(`${brokerAddress}.NFT`)
  buffer += token.address.replace('0x', '')
  buffer += serializeUint256(token.id)
  return buffer
}

const serializePrice = (brokerAddress, price) => {
  let buffer = strToHex(`${brokerAddress}.Coins`)
  if (price.address === ZIL_ADDRESS) {
    buffer += strToHex(`${brokerAddress}.Zil`)
  } else {
    buffer += strToHex(`${brokerAddress}.Token`)
    buffer += price.address.replace('0x', '')
  }
  buffer += serializeUint128(price.amount)
  return buffer
}

const serializeUint128 = (val) => {
  return serializeUint(val, 16)
}

const serializeUint256 = (val) => {
  return serializeUint(val, 32)
}

const serializeUint = (val, byteSize) => {
  return new BN(val.toString()).toBuffer('be', byteSize).toString('hex')
}

const strToHex = (str) => {
  return Array.from(
    new TextEncoder().encode(str),
    byte => byte.toString(16).padStart(2, '0')
  ).join('')
}

const getSignature = (trade, privateKey) => {
  const address = zilliqa.wallet.addByPrivateKey(privateKey)
  zilliqa.wallet.setDefault(address);

  const signHeader = `Zilliqa Signed Message: (${chainId})\n`
  const message = `${signHeader}Execute ARK Cheque 0x${chequeHash(trade)}`
  console.log("message", trade.side, message)

  const digest = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
  const digest_buffer = Buffer.from(digest, "hex");
  // console.log("pk", zilliqa.wallet.defaultAccount?.privateKey)
  // console.log("digest", digest_buffer.toString("base64"))
  const signature = zilliqa.wallet.defaultAccount.signTransaction(digest_buffer)
  console.log("signature", trade.side, signature)

  const publicKey = zilliqa.wallet.defaultAccount.publicKey;

  const t = crypto.createHash('sha256').update(Buffer.from(message, 'utf8')).digest()
  const ok = schnorr.verify(t, schnorr.toSignature(signature), Buffer.from(publicKey, 'hex'))
  if (!ok)
    throw new BadRequestError(`invalid signature: ${signature}`)
  console.log("signature", ok)

  return signature
}

const parseChequeSide = (side) => {
  switch (side.trim().toLowerCase()) {
    case "sell": return "Sell";
    case "buy": return "Buy";
    default: throw new Error(`unknown cheque side ${side}`);
  }
}

class InitParams {
  toAdtNft(brokerAddress, nftAddress, tokenId) {
    if (nftAddress.startsWith("zil"))
      nftAddress = fromBech32Address(nftAddress).toLowerCase();
    return {
      argtypes: [],
      arguments: [nftAddress, tokenId],
      constructor: `${brokerAddress}.NFT`,
    }
  }

  toAdtToken(brokerAddress, tokenAddress) {
    if (tokenAddress.startsWith("zil"))
      tokenAddress = fromBech32Address(tokenAddress).toLowerCase();
    if (tokenAddress === ZIL_ADDRESS)
      return {
        argtypes: [],
        arguments: [],
        constructor: `${brokerAddress}.Zil`,
      };
    return {
      argtypes: [],
      arguments: [tokenAddress],
      constructor: `${brokerAddress}.Token`,
    };
  }

  /**
   *
   * @param tokenAddress hex address of zrc2 contract starting with 0x
   * @param amountUnitless amount in unitless form
   */
  toAdtPrice(brokerAddress, tokenAddress, amountUnitless) {
    return {
      argtypes: [],
      arguments: [
        this.toAdtToken(brokerAddress, tokenAddress),
        amountUnitless.toString(),
      ],
      constructor: `${brokerAddress}.Coins`,
    }
  }

  toAdtChequeSide(brokerAddress, side) {
    const _side = parseChequeSide(side);
    return {
      argtypes: [],
      arguments: [],
      constructor: `${brokerAddress}.${_side}`,
    };
  }

  toAdtCheque(brokerAddress, cheque) {
    return {
      argtypes: [],
      arguments: [
        this.toAdtChequeSide(brokerAddress, cheque.side),
        cheque.expiry.toString(10),
        cheque.nonce.toString(),
        cheque.publicKey,
        cheque.signature,
      ],
      constructor: `${brokerAddress}.Cheque`,
    }
  }
}

const tradeToCheque = (trade, privateKey) => {
  const publicKey = getPubKeyFromPrivateKey(privateKey)
  const signature = getSignature(trade, privateKey)
  const hash = chequeHash(trade)

  return {
    brokerAddress: trade.brokerAddress,
    side: trade.side,
    initiatorAddress: trade.initiatorAddress,
    token: trade.token,
    price: { amount: trade.price.amount.toString(), address: trade.price.address },
    feeAmount: trade.feeAmount.toString(),
    expiry: trade.expiry,
    nonce: trade.nonce.toString(),
    publicKey: `0x${publicKey}`,
    signature: `0x${signature}`,
    chequeHash: `0x${hash}`,
  }

}
const executeTrade = async (buyTrade, sellTrade, privateKeyBuy, privateKeySell) => {
  const brokerContract = zilliqa.contracts.at(buyTrade.brokerAddress)
  const brokerAddress = brokerContract.address.toLowerCase()
  const tokenAddress = buyTrade.token.address
  const { address: priceTokenAddress, amount: priceAmountBN } = buyTrade.price
  const priceAmount = priceAmountBN.toString()
  const feeAmount = sellTrade.feeAmount.toString()

  const token_owner = await zilliqa.blockchain.getSmartContractSubState(tokenAddress, "token_owners")
  console.log(token_owner)

  const buyCheque = tradeToCheque(buyTrade, privateKeyBuy)
  const sellCheque = tradeToCheque(sellTrade, privateKeySell)

  const initParams = new InitParams
  const args = [{
    vname: "token",
    type: `${brokerAddress}.NFT`,
    value: initParams.toAdtNft(brokerAddress, toBech32Address(tokenAddress), buyTrade.token.id),
  }, {
    vname: "price",
    type: `${brokerAddress}.Coins`,
    value: initParams.toAdtPrice(brokerAddress, priceTokenAddress, priceAmount),
  }, {
    vname: "fee_amount",
    type: "Uint128",
    value: feeAmount,
  }, {
    vname: "sell_cheque",
    type: `${brokerAddress}.Cheque`,
    value: initParams.toAdtCheque(brokerAddress, sellCheque),
  }, {
    vname: "buy_cheque",
    type: `${brokerAddress}.Cheque`,
    value: initParams.toAdtCheque(brokerAddress, buyCheque),
  }]

  const txExecuteTrade = await callContract(privateKeySell, brokerContract, "ExecuteTrade", args, 0, false, false);
  console.log("ExecuteTrade", txExecuteTrade)
  console.log("ExecuteTrade transaction id:", txExecuteTrade.id)


  const requestBodyBuy = {
    "side": buyCheque.side,
    "price": {
      "amount": buyCheque.price.amount,
      "address": buyCheque.price.address
    },
    "expiry": buyCheque.expiry,
    "nonce": parseInt(buyCheque.nonce),
    "address": buyCheque.initiatorAddress,
    "publicKey": buyCheque.publicKey.substring(2),
    "signature": buyCheque.signature.substring(2)
  }

  // const requestBodySell = {
  //   "side": sellCheque.side,
  //   "price": {
  //     "amount": sellCheque.price.amount,
  //     "address": sellCheque.price.address
  //   },
  //   "expiry": sellCheque.expiry,
  //   "nonce": parseInt(sellCheque.nonce),
  //   "address": sellCheque.initiatorAddress,
  //   "publicKey": sellCheque.publicKey.substring(2),
  //   "signature": sellCheque.signature.substring(2)
  // }

  const bodyBuy = JSON.stringify(requestBodyBuy);
  // const bodySell = JSON.stringify(requestBodySell);

  // example api key request flow
  console.log("request payload", bodyBuy);
  const responseBuy = await fetch(`http://localhost:8181/nft/trade/${buyCheque.token.address}/${buyCheque.token.id}`, {
    method: "post",
    headers: {
      "content-type": "application/json",
    },
    body: bodyBuy,
  });
  const resultBuy = await responseBuy.json();
  console.log("resultBuy", resultBuy)

  // console.log("request payload", bodySell);
  // const responseSell = await fetch(`http://localhost:8181/nft/trade/${sellCheque.token.address}/${sellCheque.token.id}`, {
  //   method: "post",
  //   headers: {
  //     "content-type": "application/json",
  //   },
  //   body: bodySell,
  // });
  // const resultSell = await responseSell.json();
  // console.log(resultSell)
}

(async () => {
  const privateKeyBuy = getPrivateKey("PRIVATE_KEY_BUY");
  const buyAddress = getAddressFromPrivateKey(privateKeyBuy).toLowerCase();
  console.log("privateKeyBuy", getAddressFromPrivateKey(privateKeyBuy))
  const privateKeySell = getPrivateKey("PRIVATE_KEY_SELL");
  const sellAddress = getAddressFromPrivateKey(privateKeySell).toLowerCase();
  console.log("privateKeySell", getAddressFromPrivateKey(privateKeySell))

  // const [arkContract, arkState, tokenProxyContract, tokenProxyState] = await deployARK();
  // const metazoaContract = await deployMetazoa();
  // const hunyContract = await deployHuny();
  // const tbmContract = await deployTBM();

  // const arkAddress = arkContract.address.toLowerCase();
  // const tokenProxyAddress = tokenProxyContract.address.toLowerCase();
  // const metazoaAddress = metazoaContract.address.toLowerCase();
  // const hunyAddress = hunyContract.address.toLowerCase();
  // const tbmAddress = tbmContract.address.toLowerCase();

  // console.log("arkAddress", arkAddress)
  // console.log("tokenProxyAddress", tokenProxyAddress)
  // console.log("metazoaAddress", metazoaAddress)
  // console.log("hunyAddress", hunyAddress)
  // console.log("tbmAddress", tbmAddress)


  const arkAddress = "0x64abead9a1234a1479a32f2cfa0433c557cb4cb1";
  const tokenProxyAddress = "0x4efd1b37bf7bf9bf2c56173328623eddec5e725c";
  const hunyAddress = "0x3bf400d1fbac4dbff1ad292097fe11c67d8291de";
  const metazoaAddress = "0x996aabb16b46d5c44fddb0bc951ac723574fbf64";

  const hunyContract = zilliqa.contracts.at(hunyAddress)
  const metazoaContract = zilliqa.contracts.at(metazoaAddress)


  const txIncreaseAllowance = await callContract(privateKeyBuy, hunyContract, "IncreaseAllowance",
    [{
      vname: 'spender',
      type: 'ByStr20',
      value: tokenProxyAddress,
    },
    {
      vname: 'amount',
      type: 'Uint128',
      value: '1000000000000000000000',
    }], 0, false, false);
  console.log("increase allowance", txIncreaseAllowance.id)

  const txSetSpender = await callContract(privateKeySell, metazoaContract, "SetSpender",
    [{
      vname: 'spender',
      type: 'ByStr20',
      value: arkAddress,
    },
    {
      vname: 'token_id',
      type: 'Uint256',
      value: '1',
    }], 0, false, false);
  console.log("set spender", txSetSpender.id)

  // const txSetApprovalForAll = await callContract(privateKeySell, tbmContract, "SetApprovalForAll",
  //   [{
  //     vname: 'to',
  //     type: 'ByStr20',
  //     value: arkAddress,
  //   }], 0, false, false);
  // console.log("set approval for all", txSetApprovalForAll.id)

  // Trade metazoa
  const tradeMetazoa = await executeTrade({
    brokerAddress: arkAddress,
    side: 'buy',
    initiatorAddress: buyAddress,
    token: { id: "1", address: metazoaAddress },
    price: { amount: new BigNumber(1000000000000), address: hunyAddress },
    feeAmount: new BigNumber(0),
    expiry: 4508285,
    nonce: 0,
  }, {
    brokerAddress: arkAddress,
    side: 'sell',
    initiatorAddress: sellAddress,
    token: { id: "1", address: metazoaAddress },
    price: { amount: new BigNumber(1000000000000), address: hunyAddress },
    feeAmount: new BigNumber(120000000001),
    expiry: 4508285,
    nonce: 0,
  }, privateKeyBuy, privateKeySell)
  console.log("Traded Metazoa")

  // const tradeTBM = await executeTrade({
  //   brokerAddress: arkAddress,
  //   side: 'buy',
  //   initiatorAddress: sellAddress,
  //   token: { id: "201", address: tbmAddress },
  //   price: { amount: new BigNumber(1000000000000), address: hunyAddress },
  //   feeAmount: new BigNumber(0),
  //   expiry: 4508285,
  //   nonce: 0,
  // }, {
  //   brokerAddress: arkAddress,
  //   side: 'sell',
  //   initiatorAddress: sellAddress,
  //   token: { id: "201", address: tbmAddress },
  //   price: { amount: new BigNumber(1000000000000), address: hunyAddress },
  //   feeAmount: new BigNumber(50000000001),
  //   expiry: 4508285,
  //   nonce: 0,
  // }, privateKeyBuy, privateKeySell)
  // console.log("Traded TBM")

  // const txFailedUpdate = await callContract(privateKeyBuy, arkContract, "UpdatePlatformFee",
  //   [{
  //     vname: 'new_platform_fee',
  //     type: 'Uint128',
  //     value: "200",
  //   }], 0, false, false);
  // console.log("failed update", txFailedUpdate.id)

  // const txSuccessfulUpdate = await callContract(privateKeyBuy, arkContract, "UpdatePlatformFee",
  //   [{
  //     vname: 'new_platform_fee',
  //     type: 'Uint128',
  //     value: "300",
  //   }], 0, false, false);
  // console.log("successful update", txSuccessfulUpdate.id)
})().catch(console.error).finally(() => process.exit(0));