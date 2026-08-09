import {
  MoonzSDK
} from "../src";

const rpcUrl =
  process.env.SOLANA_RPC;

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
    rpcUrl
  });

const token =
  await moonz.getToken(
    mint
  );

if (!token) {
  console.log(
    "Not a Moonz token"
  );

  process.exit(0);
}

console.log({
  mint:
    token.mint,

  name:
    token.metadata?.name,

  symbol:
    token.metadata?.symbol,

  creator:
    token.creator,

  phase:
    token.phase,

  quoteAsset:
    token.quoteAsset,

  bondingProgress:
    token.supply
      .bondingProgress,

  verified:
    token.integrity.all
});
