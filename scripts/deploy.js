const fs = require('fs')
const util = require('util')
const BigNumber = require('bignumber.js')
const { TransactionError } = require('@zilliqa-js/core')
const { getAddressFromPrivateKey } = require('@zilliqa-js/crypto')
const { BN, Long } = require('@zilliqa-js/util')
const { callContract, nextBlock } = require('./call.js')
const { compile } = require('./compile')
const { VERSION, zilliqa, useKey, chainId } = require('./zilliqa')
const { param, getDeployTx, getZilliqaInstance, sendTxs, verifyDeployment } = require('./utils.js')

const readFile = util.promisify(fs.readFile)

async function deployFungibleToken(
  privateKey, { name = 'ZS Test Token', symbol: _symbol = null, decimals = 12, supply = new BN('100000000000000000000000000000000000000') } = {}
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `TEST-${randomHex(4).toUpperCase()}`

  // Load file and contract initialization variables
  const file = './src/FungibleToken.scilla'
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
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: decimals.toString(),
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: supply.toString(),
    }
  ];

  console.info(`Deploying fungible token ${symbol}...`)
  return deployContract(privateKey, file, init)
}

async function useFungibleToken(privateKey, params = undefined, approveContractAddress = null, useExisting = process.env.TOKEN_HASH) {
  const [contract, state] = await (useExisting ?
    getContract(privateKey, useExisting) : deployFungibleToken(privateKey, params))

  if (!!approveContractAddress) {
    const address = getAddressFromPrivateKey(privateKey).toLowerCase()
    const allowance = new BigNumber(state.allowances[address] ? state.allowances[address][approveContractAddress.toLowerCase()] : 0)
    if (allowance.isNaN() || allowance.eq(0)) {
      await callContract(
        privateKey, contract,
        'IncreaseAllowance',
        [
          {
            vname: 'spender',
            type: 'ByStr20',
            value: approveContractAddress,
          },
          {
            vname: 'amount',
            type: 'Uint128',
            value: state.total_supply.toString(),
          },
        ],
        0, false, false
      )
      return [contract, await contract.getState()]
    }
  }

  return [contract, state]
}

async function deployNonFungibleToken(
  privateKey, { name = 'NFT', symbol: _symbol = null, maxNftSupply = 100, reservedNftSupply = 0, provHash = `0x${String(0).padStart(64, '0')}` }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `TEST-${randomHex(4).toUpperCase()}`

  // Load file and contract initialization variables
  const file = './src/tbm/TheBearMarket.scilla'
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
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
    {
      vname: 'max_supply',
      type: 'Uint256',
      value: `${maxNftSupply}`,
    },
    {
      vname: 'reserved_supply',
      type: 'Uint256',
      value: `${reservedNftSupply}`,
    },
    {
      vname: 'provenance_hash',
      type: 'ByStr32',
      value: `${provHash}`,
    }
  ]

  console.info(`Deploying non-fungible token...`)
  return deployContract(privateKey, file, init)
}

async function useNonFungibleToken(privateKey, params = {}, useExisting = process.env.NFT_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployNonFungibleToken(privateKey, params)
}

async function deployBearV2(
  privateKey, { name = 'NFT', symbol: _symbol = null, initialBaseUri = `` }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `TEST-${randomHex(4).toUpperCase()}`

  // Load file and contract initialization variables
  const file = './src/zolar/Metazoa.scilla'
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
      value: `${initialBaseUri}`,
    },
    {
      vname: 'name',
      type: 'String',
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
  ]

  console.info(`Deploying Bear V2 NFT...`)
  return deployContract(privateKey, file, init)
}

async function useBearV2(privateKey, params = {}, useExisting = process.env.METAZOA_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployBearV2(privateKey, params)
}

async function deployWrappedZIL(privateKey, { name = 'WZIL Token', symbol = 'WZIL', decimals = 12, initSupply = '1000000000000000000000' }) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)

  // Load file and contract initialization variables
  const file = './src/zilswap-v2/WrappedZil.scilla'
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
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: `${decimals}`,
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: `${initSupply}`,
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
  ]

  console.info(`Deploying Wrapped Zil Token...`)
  return deployContract(privateKey, file, init)
}

async function useWrappedZIL(privateKey, params = undefined, approveContractAddress = null, useExisting = process.env.TOKEN_HASH) {
  const [contract, state] = await (useExisting ?
    getContract(privateKey, useExisting) : deployWrappedZIL(privateKey, params))

  if (!!approveContractAddress) {
    const address = getAddressFromPrivateKey(privateKey).toLowerCase()
    const allowance = new BigNumber(state.allowances[address] ? state.allowances[address][approveContractAddress.toLowerCase()] : 0)
    if (allowance.isNaN() || allowance.eq(0)) {
      await callContract(
        privateKey, contract,
        'IncreaseAllowance',
        [
          {
            vname: 'spender',
            type: 'ByStr20',
            value: approveContractAddress,
          },
          {
            vname: 'amount',
            type: 'Uint128',
            value: state.total_supply.toString(),
          },
        ],
        0, false, false
      )
      return [contract, await contract.getState()]
    }
  }

  return [contract, state]
}

async function deployHuny(
  privateKey, { name = 'Huny Token', symbol: _symbol = null, decimals = 12, initSupply = 0 }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Generate default vars
  const address = getAddressFromPrivateKey(privateKey)
  const symbol = _symbol || `HUNY-${randomHex(4).toUpperCase()}`

  // Load file and contract initialization variables
  const file = './src/zolar/Huny.scilla'
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
      value: `${name}`,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: `${symbol}`,
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: `${decimals}`,
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: `${initSupply}`,
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: `${address}`,
    },
  ]

  console.info(`Deploying Huny Token...`)
  return deployContract(privateKey, file, init)
}

async function useHuny(privateKey, params = {}, useExisting = process.env.HUNY_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployHuny(privateKey, params)
}

async function deployTranscendenceMinter(
  privateKey, { owner = null, tbmv1 = null, tbmv2 = null }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Check for dependent contracts
  if (!tbmv1 || !tbmv2) {
    throw new Error('tbmv1 and tbmv2 must be provided to TranscendenceMinter')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()

  // Load file and contract initialization variables
  const file = './src/zolar/TranscendenceMinter.scilla'
  const init = [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'tbm_address',
      type: 'ByStr20',
      value: tbmv1.address,
    },
    {
      vname: 'nft_address',
      type: 'ByStr20',
      value: tbmv2.address,
    },
    {
      vname: 'max_supply',
      type: 'Uint128',
      value: "3",
    },
  ]

  console.info(`Deploying TranscendenceMinter...`)
  return deployContract(privateKey, file, init)
}

async function useTranscendenceMinter(privateKey, params = {}, useExisting = process.env.TRANSCENDENCE_MINTER_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployTranscendenceMinter(privateKey, params)
}

async function deployRefinery(
  privateKey, { owner = null, huny = null }
) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!huny) huny = (await useHuny(privateKey))[0]

  // Load file and contract initialization variables
  const file = './src/zolar/Refinery.scilla'
  const init = [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: huny.address,
    },
  ]

  console.info(`Deploying Refinery...`)
  return deployContract(privateKey, file, init)
}

async function useRefinery(privateKey, params = {}, useExisting = process.env.REFINERY_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployRefinery(privateKey, params)
}

async function deployMagicHive(
  privateKey, { owner = null, refinery = null, huny = null, zilswap = null, rewardStartBlock = '0' }
) {

  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!huny) huny = (await useHuny(privateKey))[0]
  if (!refinery) refinery = (await useRefinery(privateKey, { huny }))
  if (!zilswap) zilswap = (await useZilswap(privateKey))[0]

  // Load file and contract initialization variables
  const file = './src/zolar/MagicHive.scilla'
  const init = [
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'initial_refinery',
      type: 'ByStr20',
      value: refinery.address,
    },
    {
      vname: 'huny_token',
      type: 'ByStr20',
      value: huny.address,
    },
    {
      vname: 'zilswap_contract',
      type: 'ByStr20',
      value: zilswap.address,
    },
    {
      vname: 'reward_start_block',
      type: 'BNum',
      value: rewardStartBlock.toString(),
    },
  ]

  console.info(`Deploying MagicHive...`)
  return deployContract(privateKey, file, init)
}

async function useMagicHive(privateKey, params = {}, useExisting = process.env.MAGIC_HIVE_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployMagicHive(privateKey, params)
}

async function deployZilswap(privateKey, { fee = null, owner = null }, version = 'V1.1') {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!fee) fee = '30'

  // Load file and contract initialization variables
  const file = `./src/zilswap-v1/ZilSwap${version}.scilla`
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'initial_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'initial_fee',
      type: 'Uint256',
      value: fee,
    },
  ];

  console.info(`Deploying zilswap...`)
  const result = await deployContract(privateKey, file, init)
  let [contract, state] = result

  if (version === 'V1.1') {
    await callContract(privateKey, contract, 'Initialize', [], 0, false, false)
    state = await contract.getState()
  }

  return [contract, state]
}

async function useZilswap(privateKey, params = {}, useExisting = process.env.CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployZilswap(privateKey, params)
}


async function deployZilswapV2Router(privateKey, { governor = null, codehash, wZil = null } = {}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  if (!codehash || codehash === '') {
    throw new Error('No codehash was provided!')
  }

  if (!wZil || wZil === '') {
    throw new Error('No wZil address was provided!')
  }

  // Default vars
  if (!governor) governor = getAddressFromPrivateKey(privateKey).toLowerCase()

  // Load file and contract initialization variables
  const file = `./src/zilswap-v2/ZilSwapRouter.scilla`
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'init_governor',
      type: 'ByStr20',
      value: governor,
    },
    {
      vname: 'init_codehash',
      type: 'ByStr32',
      value: codehash,
    },
    {
      vname: 'init_wZIL_address',
      type: 'ByStr20',
      value: wZil,
    }
  ];
  console.log(init)

  console.info(`Deploying zilswap-v2 router...`)
  return deployContract(privateKey, file, init)
}

async function useZilswapV2Router(privateKey, params = {}, useExisting = process.env.ZILSWAP_V2_ROUTER_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployZilswapV2Router(privateKey, params)
}

async function deployZilswapV2Pool(privateKey, { owner = null, factory = null, token0 = null, token1 = null, init_amp_bps = '10000', name, symbol } = {}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!factory) factory = useZilSwapV2Router(privateKey)
  if (!token0) token0 = useFungibleToken(privateKey)
  if (!token1) token1 = useFungibleToken(privateKey)
  if (parseInt(token0.address, 16) > parseInt(token1.address, 16)) [token0, token1] = [token1, token0];

  if (!name || !symbol) {
    const t0State = await token0.getInit()
    const t1State = await token1.getInit()
    const pair = `${t0State.find(i => i.vname == 'symbol').value}-${t1State.find(i => i.vname == 'symbol').value}`
    if (!name) name = `ZilSwap V2 ${pair} LP Token`
    if (!symbol) symbol = `ZWAPv2LP.${pair}`
  }

  // Load file and contract initialization variables
  const file = `./src/zilswap-v2/ZilSwapPool.scilla`
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'init_token0',
      type: 'ByStr20',
      value: token0.address.toLowerCase(),
    },
    {
      vname: 'init_token1',
      type: 'ByStr20',
      value: token1.address.toLowerCase(),
    },
    {
      vname: 'init_factory',
      type: 'ByStr20',
      value: factory.address.toLowerCase(),
    },
    {
      vname: 'init_amp_bps',
      type: 'Uint128',
      value: init_amp_bps,
    },
    {
      vname: 'contract_owner',
      type: 'ByStr20',
      value: factory.address.toLowerCase(),
    },
    {
      vname: 'name',
      type: 'String',
      value: name,
    },
    {
      vname: 'symbol',
      type: 'String',
      value: symbol,
    },
    {
      vname: 'decimals',
      type: 'Uint32',
      value: '12',
    },
    {
      vname: 'init_supply',
      type: 'Uint128',
      value: '0',
    },
  ];
  console.log(init)

  console.info(`Deploying zilswap-v2 pool...`)
  return deployContract(privateKey, file, init)
}

async function useZilswapV2Pool(privateKey, params = {}, useExisting = process.env.ZILSWAP_V2_POOL_CONTRACT_HASH) {
  if (useExisting) {
    return getContract(privateKey, useExisting)
  }
  return deployZilswapV2Pool(privateKey, params)
}

async function deploySeedLP(privateKey, {
  owner = null,
  tokenAddress,
  zilswapAddress,
}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()

  // Load file and contract initialization variables
  const file = './src/zilo/ZILOSeedLP.scilla'
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'init_owner',
      type: 'ByStr20',
      value: owner,
    },
    {
      vname: 'token_address',
      type: 'ByStr20',
      value: tokenAddress,
    },
    {
      vname: 'zilswap_address',
      type: 'ByStr20',
      value: zilswapAddress,
    },
  ];

  console.info(`Deploying ZILO Seed LP...`)
  return deployContract(privateKey, file, init)
}

async function deployZILO(privateKey, {
  zwapAddress,
  tokenAddress,
  tokenAmount,
  targetZilAmount,
  targetZwapAmount,
  minimumZilAmount,
  liquidityZilAmount,
  liquidityTokenAmount,
  receiverAddress,
  liquidityAddress,
  startBlock,
  endBlock,
}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Load file and contract initialization variables
  const file = './src/zilo/ZILO.scilla'
  const init = [
    // this parameter is mandatory for all init arrays
    {
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    },
    {
      vname: 'zwap_address',
      type: 'ByStr20',
      value: zwapAddress,
    },
    {
      vname: 'token_address',
      type: 'ByStr20',
      value: tokenAddress,
    },
    {
      vname: 'token_amount',
      type: 'Uint128',
      value: tokenAmount,
    },
    {
      vname: 'target_zil_amount',
      type: 'Uint128',
      value: targetZilAmount,
    },
    {
      vname: 'target_zwap_amount',
      type: 'Uint128',
      value: targetZwapAmount,
    },
    {
      vname: 'minimum_zil_amount',
      type: 'Uint128',
      value: minimumZilAmount,
    },
    {
      vname: 'liquidity_zil_amount',
      type: 'Uint128',
      value: liquidityZilAmount,
    },
    {
      vname: 'liquidity_token_amount',
      type: 'Uint128',
      value: liquidityTokenAmount,
    },
    {
      vname: 'receiver_address',
      type: 'ByStr20',
      value: receiverAddress,
    },
    {
      vname: 'liquidity_address',
      type: 'ByStr20',
      value: liquidityAddress,
    },
    {
      vname: 'start_block',
      type: 'BNum',
      value: startBlock,
    },
    {
      vname: 'end_block',
      type: 'BNum',
      value: endBlock,
    },
  ];

  console.info(`Deploying ZILO...`)
  return deployContract(privateKey, file, init)
}

async function deployARK(privateKey, {
  owner = null,
  feeReceiver = null,
} = {}) {
  // Check for key
  if (!privateKey || privateKey === '') {
    throw new Error('No private key was provided!')
  }

  // Default vars
  if (!owner) owner = getAddressFromPrivateKey(privateKey).toLowerCase()
  if (!feeReceiver) feeReceiver = getAddressFromPrivateKey(privateKey).toLowerCase()

  // Load file and contract initialization variables
  const file = './src/arky/ARKv2.scilla'
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
      value: owner,
    },
    {
      vname: 'initial_fee_address',
      type: 'ByStr20',
      value: feeReceiver,
    },
    {
      vname: 'chain_id',
      type: 'Uint32',
      value: chainId.toString(),
    },
  ];

  console.info(`Deploying ARKY...`)
  const ark = (await deployContract(privateKey, file, init))[0]

  // ARK requires a token proxy
  const file2 = './src/arky/TokenProxy.scilla'
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

  console.info(`Deploying and setting ARKY ZRC-2 Token Proxy...`)
  const tokenProxy = (await deployContract(privateKey, file2, init2))[0]

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

async function deployContract(privateKey, file, init) {
  useKey(privateKey)

  // Check for account
  const address = getAddressFromPrivateKey(privateKey)
  const balance = await zilliqa.blockchain.getBalance(address)
  if (balance.error) {
    throw new Error(balance.error.message)
  }

  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice()

  // Deploy contract
  const compressedCode = await compile(file)
  const contract = zilliqa.contracts.new(compressedCode, init)
  const [deployTx, s] = await contract.deployWithoutConfirm(
    {
      version: VERSION,
      amount: new BN(0),
      gasPrice: new BN(minGasPrice.result),
      gasLimit: Long.fromNumber(80000),
    },
    false,
  )

  // Check for txn acceptance
  if (!deployTx.id) {
    throw new Error(JSON.stringify(s.error || 'Failed to get tx id!', null, 2))
  }
  console.info(`Deployment transaction id: ${deployTx.id}`)

  const confirmedTx = await deployTx.confirm(deployTx.id, 33, 1000);

  // Check for txn execution success
  if (!confirmedTx.txParams.receipt.success) {
    const errors = confirmedTx.txParams.receipt.errors || {}
    const errMsgs = JSON.stringify(
        Object.keys(errors).reduce((acc, depth) => {
        const errorMsgList = errors[depth].map(num => TransactionError[num])
        return { ...acc, [depth]: errorMsgList }
      }, {}))
    const error = `Failed to deploy contract at ${file}!\n${errMsgs}`
    throw new Error(error)
  }

  // Print txn receipt
  console.log(`Deployment transaction receipt:\n${JSON.stringify(confirmedTx.txParams.receipt)}`)
  await nextBlock()

  // Refetch contract
  console.info(`The contract address is: ${s.address}`)
  // console.log('Refetching contract state...')
  const deployedContract = zilliqa.contracts.at(s.address)
  const state = await deployedContract.getState()

  // Print contract state
  console.log(`The state of the contract is:\n${JSON.stringify(state, null, 2)}`)

  // Return the contract and state
  return [deployedContract, state]
}

const deployZILOv2 = async (privateKey, {
  tokenAddress, tokenAmount,
  targetZilAmount, minZilAmount,
  lpZilAmount, lpTokenAmount,
  treasuryZilAmount, treasuryAddress,
  receiverAddress, liquidityAddress,
  startBlock, endBlock,
  discountBps, discountWhitelist = [],
}) => {
  const zilliqa = getZilliqaInstance(privateKey);

  console.log([
    param("_scilla_version", "Uint32", "0"),
    param("token_address", "ByStr20", tokenAddress),
    param("token_amount", "Uint128", tokenAmount),
    param("target_zil_amount", "Uint128", targetZilAmount),
    param("minimum_zil_amount", "Uint128", minZilAmount),
    param("liquidity_zil_amount", "Uint128", lpZilAmount),
    param("liquidity_token_amount", "Uint128", lpTokenAmount),
    param("treasury_zil_amount", "Uint128", treasuryZilAmount),
    param("receiver_address", "ByStr20", receiverAddress),
    param("liquidity_address", "ByStr20", liquidityAddress),
    param("treasury_address", "ByStr20", treasuryAddress),
    param("start_block", "BNum", startBlock),
    param("end_block", "BNum", endBlock),
    param("discount_bps", "Uint128", discountBps),
    param("disc_whitelist", "List ByStr20", discountWhitelist),
  ])

  const deployTx = await deployContract(privateKey, fs.readFileSync("src/zilo/ZILOv2.scilla").toString("utf8"), [
    param("_scilla_version", "Uint32", "0"),
    param("token_address", "ByStr20", tokenAddress),
    param("token_amount", "Uint128", tokenAmount),
    param("target_zil_amount", "Uint128", targetZilAmount),
    param("minimum_zil_amount", "Uint128", minZilAmount),
    param("liquidity_zil_amount", "Uint128", lpZilAmount),
    param("liquidity_token_amount", "Uint128", lpTokenAmount),
    param("treasury_zil_amount", "Uint128", treasuryZilAmount),
    param("receiver_address", "ByStr20", receiverAddress),
    param("liquidity_address", "ByStr20", liquidityAddress),
    param("treasury_address", "ByStr20", treasuryAddress),
    param("start_block", "BNum", startBlock),
    param("end_block", "BNum", endBlock),
    param("discount_bps", "Uint128", discountBps),
    param("disc_whitelist", "List ByStr20", discountWhitelist),
  ]);

  console.log("deploy tx", deployTx.hash)
  const [confirmedDeployTx] = await sendTxs(privateKey, [deployTx]);
  verifyDeployment(confirmedDeployTx);

  const { result: contractAddress } = await zilliqa.blockchain.getContractAddressFromTransactionID(confirmedDeployTx.id);
  return [zilliqa.contracts.at(contractAddress), confirmedDeployTx]
};

async function getContract(privateKey, contractHash) {
  useKey(privateKey)
  const contract = zilliqa.contracts.at(contractHash)
  const state = await contract.getState()
  return [contract, state]
}

const randomHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

exports.deployContract = deployContract
exports.deployFungibleToken = deployFungibleToken
exports.deployNonFungibleToken = deployNonFungibleToken
exports.useFungibleToken = useFungibleToken
exports.useNonFungibleToken = useNonFungibleToken

exports.deployZilswap = deployZilswap
exports.deployZilswapV2Router = deployZilswapV2Router
exports.deployZilswapV2Pool = deployZilswapV2Pool
exports.useZilswap = useZilswap
exports.useZilswapV2Router = useZilswapV2Router
exports.useZilswapV2Pool = useZilswapV2Pool
exports.deployWrappedZIL = deployWrappedZIL
exports.useWrappedZIL = useWrappedZIL

exports.deployZILO = deployZILO
exports.deployZILOv2 = deployZILOv2;
exports.deploySeedLP = deploySeedLP
exports.deployARK = deployARK

exports.deployBearV2 = deployBearV2
exports.deployHuny = deployHuny
exports.deployTranscendenceMinter = deployTranscendenceMinter
exports.deployMagicHive = deployMagicHive
exports.deployRefinery = deployRefinery
exports.useBearV2 = useBearV2
exports.useHuny = useHuny
exports.useTranscendenceMinter = useTranscendenceMinter
exports.useRefinery = useRefinery
exports.useMagicHive = useMagicHive
