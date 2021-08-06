# Statistics API

We have provided an statistics API for querying on-chain usage statistics for Zilswap as well as emission information for the Zilswap governance token.

API Base URL:

- Mainnet: `https://stats.zilswap.org`
- Testnet: `https://test-stats.zilswap.org`

## Liquidity

### Get Liquidity

Get the liquidity for all pools at the given timestamp.

`/liquidity`

| Query Param | Type    | Description                                              |
|-------------|---------|----------------------------------------------------------|
| per_page    | int64   | The number of transactions per page (default 10, max 50) |
| page        | int64   | The page to retrieve                                     |
| address     | ByStr20 | The address of the initiator                             |
| pool        | ByStr20 | The ZRC-2 token address for the pool that was created    |

### Get Weighted Liquidity

Get the liquidity for all pools at the between the given timestamps weighted by duration.

`/weighted_liquidity`

| Query Param | Type    | Description                                             |
|-------------|---------|---------------------------------------------------------|
| from        | int64   | The start time for the transactions                     |
| until       | int64   | The end time for the transactions                       |
| address     | ByStr20 | The address of the initiator                            |
| pool        | ByStr20 | The ZRC-2 token address for the pool that was created   |

### Get Liquidity Changes

Get all liquidity additions (mints / burns) for all pools.

`/liquidity_changes`

| Query Param | Type    | Description                                              |
|-------------|---------|----------------------------------------------------------|
| per_page    | int64   | The number of transactions per page (default 10, max 50) |
| page        | int64   | The page to retrieve                                     |
| address     | ByStr20 | The address of the initiator                             |
| pool        | ByStr20 | The ZRC-2 token address for the pool that was created    |

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

## Reward Distribution

### Get Distribution Info

Get details about all active distributions.

`/distribution/info`

Example response:

```json
[{
  "name": "ZWAP Rewards", // Name of distribution
  "reward_token_symbol": "ZWAP", // Token symbol
  "reward_token_address_hex": "0x0d21c1901a06abee40d8177f95171c8c63abdc31", // Token contract
  "distributor_name": "Zilswap", // Rewards issuer
  "distributor_address_hex": "0xca6d3f56218aaa89cd20406cf22aee26ba8f6089", // Distributor contract
  "developer_address": "zil1ua2dhnlykmxtnuaudmqd3uju6altn6lq0lqvl9",
  "emission_info":
    {
      "epoch_period": 604800,
      "tokens_per_epoch": "6250_000_000_000_000", // BigInteger string that must be parsed
      "tokens_for_retroactive_distribution": "50000_000_000_000_000", // BigInteger string that must be parsed
      "retroactive_distribution_cutoff_time": 1610964000,
      "distribution_start_time": 1612339200,
      "total_number_of_epochs": 152,
      "initial_epoch_number": 2,
      "developer_token_ratio_bps": 1500,
      "trader_token_ratio_bps": 2000
    },
  "incentived_pools":
    {
      "zil1fytuayks6njpze00ukasq3m4y4s44k79hvz8q5": 3,
      "zil10a9z324aunx2qj64984vke93gjdnzlnl5exygv": 2,
      "zil1ktmx2udqc77eqq0mdjn8kqdvwjf9q5zvy6x7vu": 5
    }
}]
```

### Get Distribution Data for Epoch

Get distribution epoch information.

`/distribution/data/{distributor_address}/{epoch_number}`

| Route Parameter     | Type    | Description                                              |
|---------------------|---------|----------------------------------------------------------|
| distributor_address | ByStr20 | The distribution contract address in hex. (e.g. `0x...`) |
| epoch_number        | uint64  | the epoch number between 0 to `total_epoch`              |

`total_epoch` and `current_epoch` can be obtained via [Get Distribution Info](#distribution/info).

Example response:

```json
[{
  "id": "e1e8fa20-c358-4b71-8f09-9a08261abe70",
  "distributor_address": "0xca6d3f56218aaa89cd20406cf22aee26ba8f6089",
  "epoch_number": 18,
  "address_bech32":"zil1000jej4zap4thvj3sk0j6umsljqcpzcs73kp2r",
  "address_hex": "7bdf2ccaa2e86abbb251859f2d7370fc81808b10",
  "amount": "100116355651",
  "proof": "fb4fa9963d1bbf216e6bd6fc7361977f167b3657bef0f5c6a4ae146488e9c225 fb514e3364a5a1b1ea3d74e7b7165ab83e46b45031061eb02f49cec0bb8c411d 907a6fe321f774b85d59230a09a3d72cbefc96978c13425b2ecedd8e50ef71d2 253a901287388afd5c66263b9fa937c0433e7a71393b3e8bbd676325a67ed4c9 b01bff49c379cdb6ff9984f0e551e7455b431876cb273c254ac89a6c54a069a0 55048de07e53d1d0a66174d638df7366147f6fbb34d238612950aecf9e3f0257 47dc66c54ae9b14191f16ec0b584af1874e5b38cf250381093e7d9b75ce4ecbe 27763c52f556ab3ec1356950130b2235a4740f9ba70e429b914716978ee3aac8 1913cc128b50815c287268e6e89df6a9c98714e8ca88d73f7e8f1c2affbac0c2 e3ebd69b367b6e9ea9bcfbda134857603b176b4adf5958a52788651a77fd4a21 292c431825fc6951b18c3cacf0c7a6612bd226ffade3c85fe9cd13ab5eb2b419 ba39e66c307831ea417131fcd54390bdfc158deb8fc18de69c5eeaffaf9ecade d8196a05fb62663888fbeda637813fe5e747b8f9d15fa2759f1f36a6460096d2 e5aa184437333f54bd7dd7b803818b89a002fe59809e17dfdf77e1f77d37c9aa 555565c95f05246c8a82aa5f506d957e7e11ab0f00cc573051f0959430b32901"
}]
```

The token being rewarded and the distribution name can be obtained via [Get Distribution Info](#distribution/info).

### Get Distribution Data for Address

Get unclaimed distributions for the given address.

`/distribution/claimable_data/{address}`

| Route Parameter     | Type    | Description                              |
|---------------------|---------|------------------------------------------|
| address             | Bech32  | The user's bech32 address. (e.g. zil...) |

Example response:

```json
[{
  "id": "e1e8fa20-c358-4b71-8f09-9a08261abe70",
  "distributor_address": "0xca6d3f56218aaa89cd20406cf22aee26ba8f6089",
  "epoch_number": 18,
  "address_bech32":"zil1000jej4zap4thvj3sk0j6umsljqcpzcs73kp2r",
  "address_hex": "7bdf2ccaa2e86abbb251859f2d7370fc81808b10",
  "amount": "100116355651",
  "proof": "fb4fa9963d1bbf216e6bd6fc7361977f167b3657bef0f5c6a4ae146488e9c225 fb514e3364a5a1b1ea3d74e7b7165ab83e46b45031061eb02f49cec0bb8c411d 907a6fe321f774b85d59230a09a3d72cbefc96978c13425b2ecedd8e50ef71d2 253a901287388afd5c66263b9fa937c0433e7a71393b3e8bbd676325a67ed4c9 b01bff49c379cdb6ff9984f0e551e7455b431876cb273c254ac89a6c54a069a0 55048de07e53d1d0a66174d638df7366147f6fbb34d238612950aecf9e3f0257 47dc66c54ae9b14191f16ec0b584af1874e5b38cf250381093e7d9b75ce4ecbe 27763c52f556ab3ec1356950130b2235a4740f9ba70e429b914716978ee3aac8 1913cc128b50815c287268e6e89df6a9c98714e8ca88d73f7e8f1c2affbac0c2 e3ebd69b367b6e9ea9bcfbda134857603b176b4adf5958a52788651a77fd4a21 292c431825fc6951b18c3cacf0c7a6612bd226ffade3c85fe9cd13ab5eb2b419 ba39e66c307831ea417131fcd54390bdfc158deb8fc18de69c5eeaffaf9ecade d8196a05fb62663888fbeda637813fe5e747b8f9d15fa2759f1f36a6460096d2 e5aa184437333f54bd7dd7b803818b89a002fe59809e17dfdf77e1f77d37c9aa 555565c95f05246c8a82aa5f506d957e7e11ab0f00cc573051f0959430b32901"
}]
```

The token being rewarded and the distribution name can be obtained via [Get Distribution Info](#distribution/info).

### Get Estimated Distribution Amount

Get the estimated amount of rewards for the current epochs for all distribution
for the given address.

`/distribution/estimated_amounts/{address}`

| Route Parameter | Type   | Description                               |
|-----------------|--------|-------------------------------------------|
| address         | Bech32 | The user's bech32 address.  (e.g. zil...) |
Example response:

```json
{
    "0xca6d3f56218aaa89cd20406cf22aee26ba8f6089": // distributor_address
      {
        "zil18f5rlhqz9vndw4w8p60d0n7vg3n9sqvta7n6t2": "5419144905836", // pool_address: reward_amount
        "zil1p5suryq6q647usxczale29cu3336hhp376c627": "3284778"
      }
}
```

The token being rewarded and the distribution name can be obtained via [Get Distribution Info](#distribution/info).
