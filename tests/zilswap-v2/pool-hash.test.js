const { getDefaultAccount } = require('../../scripts/account.js');
const { callContract } = require('../../scripts/call.js');
const { useFungibleToken, deployZilswapV2Router, deployZilswapV2Pool, deployContract } = require("../../scripts/deploy");
const { getContractCodeHash } = require("./helper");

// Test pool hash computation
test('code hash computes accurately', async () => {
  owner = getDefaultAccount();
  [token0] = await useFungibleToken(owner.key, { symbol: 'TKN0' });
  [token1] = await useFungibleToken(owner.key, { symbol: 'TKN1' });
  [router] = await deployZilswapV2Router(owner.key, { governor: null, codehash: "0x0000000000000000000000000000000000000000000000000000000000000000" });
  [pool] = await deployZilswapV2Pool(owner.key, { factory: router, token0, token1 });

  const file = `./src/zilswap-v2/ZilSwapPool.scilla`
  const poolContractCodeHash = getContractCodeHash(file);

  // Deploy CodeHash contract
  const [codeHashContract] = await deployContract(
    owner.key,
    './src/zilswap-v2/TestCodeHash.scilla',
    [{
      vname: '_scilla_version',
      type: 'Uint32',
      value: '0',
    }])

  // Call GetCodeHash transition
  tx = await callContract(
    owner.key, codeHashContract,
    'foo',
    [{
      vname: 'addr',
      type: 'ByStr20',
      value: `${pool.address.toLowerCase()}`,
    }],
    0, false, false
  )
  expect(tx.status).toEqual(2)
  const codehash = tx.receipt.event_logs.find(e => e._eventname === "Success")?.params?.[0]?.value;
  expect(codehash).toEqual(poolContractCodeHash);
});
