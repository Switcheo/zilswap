# Statistics API

We have provided an statistics API for querying on-chain usage statistics for Zilswap as well as emission information for the Zilswap governance token.

API Base URL:

- Mainnet: `https://stats.zilswap.org`
- Testnet: `https://test-stats.zilswap.org`

## Liquidity

### Get Liquidity

Get the liquidity for all pools at the given timestamp.

`/liquidity`

| Parameter | Type    | Description                                              |
|-----------|---------|----------------------------------------------------------|
| per_page  | int64   | The number of transactions per page (default 10, max 50) |
| page      | int64   | The page to retrieve                                     |
| address   | ByStr20 | The address of the initiator                             |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created    |

### Get Weighted Liquidity

Get the liquidity for all pools at the between the given timestamps weighted by duration.

`/weighted_liquidity`

| Parameter | Type    | Description                                             |
|-----------|---------|---------------------------------------------------------|
| from      | int64   | The start time for the transactions                     |
| until     | int64   | The end time for the transactions                       |
| address   | ByStr20 | The address of the initiator                            |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created   |

### Get Liquidity Changes

Get all liquidity additions (mints / burns) for all pools.

`/liquidity_changes`

| Parameter | Type    | Description                                              |
|-----------|---------|----------------------------------------------------------|
| per_page  | int64   | The number of transactions per page (default 10, max 50) |
| page      | int64   | The page to retrieve                                     |
| address   | ByStr20 | The address of the initiator                             |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created    |

## Swaps

### Get Swaps

Get swaps for all pools.

`/swaps`

| Parameter | Type    | Description                                              |
|-----------|---------|----------------------------------------------------------|
| per_page  | int64   | The number of transactions per page (default 10, max 50) |
| page      | int64   | The page to retrieve                                     |
| address   | ByStr20 | The address of the initiator                             |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created    |

### Get Volume

Get the swap volume in zil / tokens for the given period for all pools.

`/volume`

| Parameter | Type    | Description                                             |
|-----------|---------|---------------------------------------------------------|
| from      | int64   | The start time for the transactions                     |
| until     | int64   | The end time for the transactions                       |
| address   | ByStr20 | The address of the initiator                            |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created   |

## Epoch

### Get Epoch

Get details about an emission epoch.

`/epoch/info`

### Get Epoch Distribution Data

Get distribution epoch information.

`/epoch/data/{epoch_number}`

| Route Parameter | Type    | Description                               |
|-----------------|---------|-------------------------------------------|
| epoch_number    | int64   | the epoch number between 0 to total_epoch |

`total_poch` and `current_poch` can be obtained via [Get Epoch](#get-epoch)

### Generate Epoch

Generate data for the ended epoch and save it to db.

`/epoch/generate`

steps:
get pools (filtered for the ones to award - epoch 0 all, epoch 1 only xsgd & gzil)
for each pool:
1. get total time weighted liquidity from start_time to end_time
2. get time weighted liquidity from start_time to end_time for each address that has liquidity at start_time
split reward by pool and time weighted liquidity
if epoch 0, get swap_volume and split additional reward by volume

## Distribution

### Get Distribution Data 

Get distributions for the given address

`/distribution/data/{address}`

| Route Parameter | Type    | Description                                             |
|-----------------|---------|---------------------------------------------------------|
| address         | ByStr20 | The pool address Bech32 address. (e.g. zil...)          |

### Get Distribution (Current Epoch)

Get current epoch distribution for given address

`/distribution/current/{address}`

| Route Parameter | Type    | Description                                             |
|-----------------|---------|---------------------------------------------------------|
| address         | ByStr20 | The receiving address Bech32 address. (e.g. zil...)     |

### Get Pool Weight

Gets distribution pool weights.

`/distribution/pool_weights`

## Transaction

### Get Transactions

Get pool transactions including both swaps and liquidity changes.

`/transactions`

| Parameter | Type    | Description                                              |
|-----------|---------|----------------------------------------------------------|
| from      | int64   | The start time of transaction in unix                    |
| until     | int64   | The end time for the transactions in unix                |
| per_page  | int64   | The number of transactions per page (default 10, max 50) |
| page      | int64   | The page to retrieve                                     |
| address   | ByStr20 | The address of the initiator                             |
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created    |

## Emission

### Get Emission Curve

Get details about how the Zilswap governance token is emitted.

NYI.
