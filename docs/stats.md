# Statistics API

We have provided an statistics API for querying on-chain usage statistics for Zilswap as well as emission information for the Zilswap governance token.

API Base URL:

- Mainnet: `https://stats.zilswap.org`
- Testnet: `https://tet-stats.zilswap.org`

Token addresses for common tokens are as follows:
* ZWAP: [`zil1p5suryq6q647usxczale29cu3336hhp376c627`](zil1p5suryq6q647usxczale29cu3336hhp376c627)
* gZIL: [`zil14pzuzq6v6pmmmrfjhczywguu0e97djepxt8g3e`](https://viewblock.io/zilliqa/address/zil14pzuzq6v6pmmmrfjhczywguu0e97djepxt8g3e)
* XSGD: [`zil1zu72vac254htqpg3mtywdcfm84l3dfd9qzww8t`](https://viewblock.io/zilliqa/address/zil1zu72vac254htqpg3mtywdcfm84l3dfd9qzww8t)

The full list of tokens on ZilSwap are found [here](https://github.com/Switcheo/zilswap-token-list/blob/master/tokens.json).

## Liquidity

### Get Liquidity

Get the liquidity for all pools at the given timestamp.

`/liquidity`

### Get Weighted Liquidity

Get the liquidity for all pools at the between the given timestamps weighted by duration.

`/weighted_liquidity`

### Get Liquidity Changes

Get all liquidity additions (mints / burns) for all pools.

`/liquidity_changes`

## Swaps

### Get Swaps

Get swaps for all pools.

`/swaps`

### Get Volume

Get the volume in zils / tokens for the given period for all pools

`/volume` 

**Parameters**

No Parameters required

**Returns**

An array of data objects representing the volume for each pool. Each entry consists of the following information:
* `pool` : address of the token
* `in_zil_amount` : Amount of zils added to the pool
* `out_zil_amount` : Amount of zils removed from the pool
* `in_token_amount` : Amount of tokens added to the pool
* `out_token_amount` : Amount of tokens removed from the pool

Example: 

```json
[
    {
        "pool": "zil1p5suryq6q647usxczale29cu3336hhp376c627",
        "in_zil_amount": "75944917679459703321",
        "out_token_amount": "47583762483998737",
        "out_zil_amount": "48658036826817923284",
        "in_token_amount": "33349283426524293"
    },
    {
        "pool": "zil1zu72vac254htqpg3mtywdcfm84l3dfd9qzww8t",
        "in_zil_amount": "62915761951613926844",
        "out_token_amount": "6027932084551",
        "out_zil_amount": "65986605662370805092",
        "in_token_amount": "6196599880995"
    }
]
```


## Emission

### Get Emission Curve

Get details about how the Zilswap governance token is emitted.

NYI.

### Get Epoch

Get details about an emission epoch.

NYI.

### Get Current Epoch

Get details about the current emission epoch. Updated every 5 minutes.

NYI.
