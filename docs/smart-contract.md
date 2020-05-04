# Smart Contract

## Events

Frontend dApps may listen to the following smart contract events to watch for changes in state due to user interaction.

### PoolCreated

This event is emitted when liquidity is first added for a ZRC-2 token.

Pools are indexed by the ZRC-2 token's smart contract address, emitted in the parameter, `pool`.

| Parameter | Type    | Description                                           |
|-----------|---------|-------------------------------------------------------|
| pool      | ByStr20 | The ZRC-2 token address for the pool that was created |

### Mint

The `mint` event is emitted when liquidity is added to a pool and "liquidity tokens" are "minted".

The amount of liquidity tokens minted is calculated by taking the ratio of pool tokens added as compared to that already residing in the pool.

The share of liquidity contribution for a pool can then be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                    |
|-----------|---------|----------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity added to  |
| address   | ByStr20 | The address that contributed liquidity                         |
| amount    | Uint128 | The amount of liquidity contributed                            |

### Burn

The `burn` event is emitted when liquidity is removed from a pool and "liquidity tokens" are "burnt".

The amount of liquidity tokens burnt is calculated by taking the ratio of pool tokens removed as compared to the total pool tokens residing in the pool.

The share of liquidity contribution removed for the address can be found by dividing `amount` with the smart contract variable `total_contributions[token_address]`.

| Parameter | Type    | Description                                                   |
|-----------|---------|---------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool that has had liquidity removed  |
| address   | ByStr20 | The address that removed liquidity                            |
| amount    | Uint128 | The amount of liquidity removed                               |

### Swap

The `swap` event is emitted when a swap is made in a pool.

Since pools are already balanced against `ZIL`, all events have a `zil_in` and `zil_out` amount
to signify the amount of `ZIL` sent to or received from the pool during the swap respectively.
All events also have the `token_in` and `token_out` to signify the corresponding token amounts
sent to or received from the pool.

The address of the token sent or received in `token_in` and `token_out` is given by `token_address`.

Note that if `zil_in` is non-zero, then `zil_out` will always be zero, and vice versa. The
same goes for `amount_in` and `amount_out`.

| Parameter | Type    | Description                                                       |
|-----------|---------|-------------------------------------------------------------------|
| pool      | ByStr20 | The token address of the pool where the swap took place           |
| address   | ByStr20 | The address that initiated the swap                               |
| zil_in    | Uint128 | The amount of zil transferred into the pool for the swap in `QA`  |
| zil_out   | Uint128 | The amount of zil removed from the pool for the swap in `QA`      |
| token_in  | Uint128 | The amount of tokens transferred into the pool for the swap       |
| token_out | Uint128 | The amount of tokens removed rrom the pool for the swap           |

## Transitions

### AddLiquidity



### RemoveLiquidity

### SwapExactZILForTokens

### SwapExactTokensForZIL

### SwapZILForExactTokens

### SwapTokensForExactZIL

### SwapExactTokensForTokens

### SwapTokensForExactTokens
