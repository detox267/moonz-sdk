# Moonz SDK

Read only TypeScript and JavaScript SDK for reading Moonz protocol data directly from Solana.

## Install

```bash
npm install @moonz-fun/sdk
```

## Quick Start

```ts
import {
  MoonzSDK
} from "@moonz-fun/sdk";

const moonz =
  new MoonzSDK({
    rpcUrl: "YOUR_SOLANA_RPC"
  });

const token =
  await moonz.getToken(
    "TOKEN_MINT"
  );

console.log(token);
```

If your RPC provider uses a separate WebSocket endpoint:

```ts
const moonz =
  new MoonzSDK({
    rpcUrl: "YOUR_SOLANA_RPC",
    wsEndpoint: "YOUR_SOLANA_WSS"
  });
```

## Moonz Program

```text
DBc9SEQghiJUj52YPqTKk8R4CMRgagBxi2LU1yBbeMpk
```

https://moonz.fun

## Token Information

```ts
const token =
  await moonz.getToken(
    mint
  );
```

Returns Moonz token information including:

```text
Creator
Phase
Quote asset
Metadata
LaunchState
Bonding progress
Sale reserve
LP reserve
WSOL reserve
USDC reserve
Pool state
PDA verification
```

## Check a Moonz Token

```ts
const isMoonz =
  await moonz.isMoonzToken(
    mint
  );
```

## Launch State

```ts
const state =
  await moonz.getLaunchState(
    mint
  );
```

## Metadata

```ts
const metadata =
  await moonz.getMetadata(
    mint
  );
```

## Vaults

```ts
const vaults =
  await moonz.getVaults(
    mint
  );
```

## Reserves

```ts
const reserves =
  await moonz.getReserves(
    mint
  );
```

## Discover Tokens

```ts
const tokens =
  await moonz.getTokens();
```

Filter by phase:

```ts
const tokens =
  await moonz.getTokens({
    phase: "BONDING"
  });
```

Filter by quote asset:

```ts
const tokens =
  await moonz.getTokens({
    quoteAsset: "SOL"
  });
```

Filter by creator:

```ts
const tokens =
  await moonz.getTokensByCreator(
    "CREATOR_WALLET"
  );
```

## Events

Watch a token:

```ts
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
      }
    }
  );
```

Stop watching:

```ts
await stop();
```

Watch Moonz:

```ts
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
```

## Historical Events

```ts
const events =
  await moonz.getTransactionEvents(
    signature
  );
```

## Parse Logs

```ts
const events =
  moonz.parseLogs(
    logMessages,
    {
      signature,
      slot,
      blockTime
    }
  );
```

## Moonz Phases

```text
0 PENDING_DEV_BUY
1 BONDING
2 AMM_LIVE
3 SWITCHING
4 CANCELLED
```

## Quote Assets

```text
0 SOL
1 USDC
```

## Trading

For token creation, trade quotes, buys and sells use:

```bash
npm install @moonz-fun/trading-sdk
```

## License

MIT

## Market data

Moonz SDK 0.1.2 exposes canonical protocol market data for bots, analytics platforms and third party integrations.

Example:

    const market = await moonz.getMarketData(mint);

    if (market) {
      console.log(market.phase);
      console.log(market.quoteAsset);
      console.log(market.priceQuote);
      console.log(market.marketCapQuote);
      console.log(market.bondingProgress);
    }

priceQuote is the current spot price of one whole token denominated in the active quote asset.

marketCapQuote is the current spot price multiplied by the current total SPL token supply.

During BONDING the SDK reproduces the immutable Moonz bonding reserve model:

    virtual SOL reserve = 117 SOL + collected SOL

    virtual token reserve = 760,000,000 tokens + remaining bonding tokens

During AMM_LIVE the SDK calculates spot price from the protocol LP token reserve and the active WSOL or USDC reserve.

For SOL quoted markets:

    market cap USD = marketCapQuote multiplied by SOL/USD

For USDC quoted markets, marketCapQuote is denominated in USDC.

Moonz does not fetch an external fiat price feed.

Market calculations use BigInt arithmetic internally. Calculated prices and market caps are returned as decimal strings.

During non tradable lifecycle states such as SWITCHING, canonical market price and market cap are unavailable.
