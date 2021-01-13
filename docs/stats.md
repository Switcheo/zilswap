# Statistics API

We have provided an statistics API for querying on-chain usage statistics for Zilswap as well as emission information for the Zilswap governance token.

API Base URL:

- Mainnet: `https://stats.zilswap.org`
- Testnet: `https://tet-stats.zilswap.org`

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

NYI.

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
