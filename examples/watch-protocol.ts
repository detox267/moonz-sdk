import {
  MoonzSDK
} from "../src";

const rpcUrl =
  process.env.SOLANA_RPC;

const wsEndpoint =
  process.env.SOLANA_WSS;

if (!rpcUrl) {
  throw new Error(
    "Set SOLANA_RPC"
  );
}

const moonz =
  new MoonzSDK({
    rpcUrl,
    wsEndpoint
  });

console.log(
  "Watching Moonz protocol"
);

const stop =
  await moonz.watch({
    events: [
      "TOKEN_CREATED",
      "BUY",
      "SELL",
      "MIGRATED"
    ],

    onEvent(event) {
      console.log({
        type:
          event.type,

        mint:
          event.mint,

        user:
          event.user,

        market:
          event.market,

        side:
          event.side,

        quoteAsset:
          event.quoteAsset,

        signature:
          event.signature,

        eventIndex:
          event.eventIndex
      });
    },

    onError(error) {
      console.error(
        "Watcher error:",
        error
      );
    }
  });

process.on(
  "SIGINT",
  async () => {
    await stop();
    process.exit(0);
  }
);
