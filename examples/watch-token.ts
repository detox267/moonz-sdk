import {
  MoonzSDK
} from "../src";

const rpcUrl =
  process.env.SOLANA_RPC;

const wsEndpoint =
  process.env.SOLANA_WSS;

const mint =
  process.argv[2];

if (!rpcUrl) {
  throw new Error(
    "Set SOLANA_RPC"
  );
}

if (!mint) {
  throw new Error(
    "Pass a token mint"
  );
}

const moonz =
  new MoonzSDK({
    rpcUrl,
    wsEndpoint
  });

console.log(
  `Watching ${mint}`
);

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
        console.log({
          type:
            event.type,

          mint:
            event.watchedMint,

          user:
            event.user,

          quoteAsset:
            event.quoteAsset,

          tokenAmount:
            event.data
              .token_amount,

          quoteAmount:
            event.data
              .quote_amount,

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
    }
  );

process.on(
  "SIGINT",
  async () => {
    await stop();
    process.exit(0);
  }
);
