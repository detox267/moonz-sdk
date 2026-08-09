import {
  MoonzSDK
} from "../src";

const rpcUrl =
  process.env.SOLANA_RPC;

if (!rpcUrl) {
  throw new Error(
    "Set SOLANA_RPC"
  );
}

const moonz =
  new MoonzSDK({
    rpcUrl
  });

const tokens =
  await moonz.getTokens({
    phase: [
      "BONDING",
      "AMM_LIVE"
    ],

    limit: 50
  });

for (const token of tokens) {
  console.log({
    mint:
      token.mint,

    creator:
      token.creator,

    phase:
      token.phase,

    quoteAsset:
      token.quoteAsset,

    bondingProgress:
      token.bondingProgress,

    pdaIntegrity:
      token.integrity
        .allPdas
  });
}
