# Moonz SDK

Read only TypeScript and JavaScript SDK for the Moonz Solana launchpad protocol.

Moonz SDK connects directly to Solana RPC.

You supply your own RPC endpoint.

No Moonz API key is required.

No wallet or private key is required for the information and monitoring functions.

## Moonz Program

Mainnet Program ID:

~~text
DBc9SEQghiJUj52YPqTKk8R4CMRgagBxi2LU1yBbeMpk
~~

Website:

~~text
https://moonz.fun
~~

## Installation

Once published:

~~bash
npm install @moonz-fun/sdk
~~

or:

~~bash
yarn add @moonz-fun/sdk
~~

## Create a client

~~ts
import { MoonzSDK } from "@moonz-fun/sdk";

const moonz = new MoonzSDK({
  rpcUrl: process.env.SOLANA_RPC!
});
~~

If your RPC provider gives you a separate WebSocket endpoint:

~~ts
const moonz = new MoonzSDK({
  rpcUrl: process.env.SOLANA_RPC!,
  wsEndpoint: process.env.SOLANA_WSS
});
~~

## Look up a specific token

~~ts
const token = await moonz.getToken(
  "TOKEN_MINT"
);

if (!token) {
  console.log("Not a Moonz token");
} else {
  console.log(token);
}
~~

A full token lookup includes:

~~text
mint
creator
phase
quote asset
LaunchState
metadata
sale vault
LP vault
WSOL treasury
USDC treasury
SOL escrow
sale supply
tokens sold
bonding progress
reserves
pool switching state
timestamps
PDA integrity
program ID
~~

Example:

~~ts
const token = await moonz.getToken(mint);

console.log({
  name: token?.metadata?.name,
  symbol: token?.metadata?.symbol,
  phase: token?.phase,
  quoteAsset: token?.quoteAsset,
  bondingProgress:
    token?.supply.bondingProgress,
  verified:
    token?.integrity.all
});
~~

## Check whether a mint belongs to Moonz

~~ts
const isMoonz =
  await moonz.isMoonzToken(mint);

console.log(isMoonz);
~~

The SDK does not identify a token as Moonz merely because the mint exists.

It derives the deterministic LaunchState PDA, verifies the account is owned by the Moonz program, checks the Anchor discriminator and confirms the embedded mint matches the requested mint.

## Metadata

~~ts
const metadata =
  await moonz.getMetadata(mint);

console.log(metadata?.name);
console.log(metadata?.symbol);
console.log(metadata?.uri);
~~

Metadata is decoded from the Metaplex metadata account through Solana RPC.

The SDK returns the off chain URI but does not automatically fetch arbitrary external URLs.

## Vaults

~~ts
const vaults =
  await moonz.getVaults(mint);

console.log(vaults);
~~

Current launch specific PDA seeds include:

~~text
launch_state
sale_vault
lp_vault
treasury_wsol
treasury_usdc
escrow_sol
~~

The SDK returns both the vault addresses recorded in LaunchState and the addresses independently derived from the Moonz program.

## Reserves

~~ts
const reserves =
  await moonz.getReserves(mint);

console.log(reserves);
~~

Reserve information can include:

~~text
sale token reserve
LP token reserve
WSOL reserve
USDC reserve
SOL escrow balance
~~

## Discover Moonz tokens

~~ts
const tokens =
  await moonz.getTokens();

console.log(tokens);
~~

getTokens performs a Solana getProgramAccounts scan for Moonz LaunchState accounts.

Discovery returns lightweight summaries so it does not perform a deep RPC lookup for every token.

For full information about one result:

~~ts
const summary = tokens[0];

const full =
  await moonz.getToken(
    summary.mint
  );
~~

## Discovery filters

Bonding tokens:

~~ts
const tokens =
  await moonz.getTokens({
    phase: "BONDING"
  });
~~

AMM tokens:

~~ts
const tokens =
  await moonz.getTokens({
    phase: "AMM_LIVE"
  });
~~

Multiple phases:

~~ts
const tokens =
  await moonz.getTokens({
    phase: [
      "BONDING",
      "AMM_LIVE"
    ]
  });
~~

SOL quote:

~~ts
const tokens =
  await moonz.getTokens({
    quoteAsset: "SOL"
  });
~~

USDC quote:

~~ts
const tokens =
  await moonz.getTokens({
    quoteAsset: "USDC"
  });
~~

Creator:

~~ts
const tokens =
  await moonz.getTokensByCreator(
    "CREATOR_WALLET"
  );
~~

Specific mints:

~~ts
const tokens =
  await moonz.getTokens({
    mints: [
      "MINT_1",
      "MINT_2"
    ]
  });
~~

Pagination:

~~ts
const tokens =
  await moonz.getTokens({
    offset: 0,
    limit: 50
  });
~~

## Watch one token

~~ts
const stop =
  await moonz.watchToken(
    mint,
    {
      events: [
        "BUY",
        "SELL",
        "MIGRATED"
      ],

      onEvent(event) {
        console.log(event);
      },

      onError(error) {
        console.error(error);
      }
    }
  );
~~

Stop watching:

~~ts
await stop();
~~

Calling the returned stop function more than once is safe.

## Watch the whole Moonz protocol

~~ts
const stop =
  await moonz.watch({
    events: [
      "TOKEN_CREATED",
      "BUY",
      "SELL",
      "MIGRATED"
    ],

    onEvent(event) {
      console.log(event);
    }
  });
~~

## Watch selected tokens

~~ts
const stop =
  await moonz.watch({
    mints: [
      "MINT_1",
      "MINT_2"
    ],

    events: [
      "TRADE"
    ],

    onEvent(event) {
      console.log(event);
    }
  });
~~

## Friendly event filters

~~text
ALL
TRADE
BUY
SELL
CREATE
ESCROW
FEES
MIGRATION
POOL_SWITCH
~~

## Exact Moonz SDK event types

~~text
TOKEN_CREATED
LAUNCH_ESCROW_FUNDED
LAUNCH_ESCROW_REFUNDED
BONDING_BUY
BONDING_SELL
AMM_BUY
AMM_SELL
FEES_CLAIMED
MIGRATED
POOL_SWITCH_STARTED
POOL_SWITCH_SWAP_EXECUTED
POOL_SWITCH_COMPLETED
POOL_SWITCH_CANCELLED
~~

## Current on chain events

The SDK maps all 13 events in the current Moonz IDL:

~~text
PoolSwitchSwapExecutedEvent
LaunchEscrowFundedEvent
LaunchEscrowRefundedEvent
CreatedTxn
BuyEvent
SellEvent
ClaimFeesEvent
AmmBuyEvent
AmmSellEvent
MigratedEvent
PoolSwitchStartedEvent
PoolSwitchCancelledEvent
PoolSwitchCompletedEvent
~~

Every decoded event keeps both the friendly SDK type:

~~ts
event.type
~~

and the exact Anchor event name:

~~ts
event.rawName
~~

## Trade event information

Current trade events provide:

~~text
mint
user
quote asset
input amount
input mint
output amount
output mint
quote amount
token amount
trade fee
creator fee
platform fee
LP fee
tokens sold total
quote collected total
timestamp
~~

Large integer values are preserved as strings where appropriate so JavaScript number precision is not lost.

## Decode a historical transaction

~~ts
const events =
  await moonz.getTransactionEvents(
    signature
  );

console.log(events);
~~

## Parse logs directly

If your application already receives Solana logs:

~~ts
const events =
  moonz.parseLogs(
    logMessages,
    {
      signature,
      slot,
      blockTime
    }
  );
~~

The standalone parser is also exported:

~~ts
import {
  parseMoonzLogs
} from "@moonz-fun/sdk";
~~

## Event deduplication

Decoded events include:

~~ts
event.signature
event.eventIndex
~~

A useful deduplication key is:

~~ts
const key =
  `${event.signature}:${event.eventIndex}`;
~~

A Solana transaction can emit more than one Moonz event.

## Lifecycle phases

~~text
0 PENDING_DEV_BUY
1 BONDING
2 AMM_LIVE
3 SWITCHING
4 CANCELLED
~~

## Quote assets

~~text
0 SOL / WSOL
1 USDC
~~

The Moonz program uses WSOL on chain while the SDK exposes the friendly quote asset as SOL.

## PDA integrity verification

~~ts
const token =
  await moonz.getToken(mint);

console.log(
  token?.integrity
);
~~

Current integrity checks include:

~~text
Moonz program ownership
LaunchState PDA
sale vault PDA
LP vault PDA
WSOL treasury PDA
USDC treasury PDA
SOL escrow PDA
SPL Token Program ownership
vault authorities
vault token mints
~~

This allows independent applications to distinguish Moonz program controlled reserves from ordinary user token accounts.

## RPC considerations

getToken performs direct account lookups for one token.

getTokens uses getProgramAccounts to discover Moonz LaunchState accounts.

Realtime monitoring uses Solana WebSocket log subscriptions.

Different RPC providers have different rate limits, getProgramAccounts policies and WebSocket limits.

Production applications should use an RPC provider suitable for their expected traffic.

## Read only SDK

This package is intended for information, analytics and monitoring.

It does not expose Moonz transaction execution methods such as:

~~text
buy
sell
launch
claim
pool switch
~~

Trading and wallet signing should be handled separately.

## Security

Never place a wallet private key, seed phrase or signing credential into the Moonz information SDK configuration.

Only RPC access is required.

## License

MIT
