import { PublicKey } from "@solana/web3.js";

export const MOONZ_PROGRAM_ID = new PublicKey(
  "DBc9SEQghiJUj52YPqTKk8R4CMRgagBxi2LU1yBbeMpk"
);

export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const MOONZ_PHASE = {
  PENDING_DEV_BUY: 0,
  BONDING: 1,
  AMM_LIVE: 2,
  SWITCHING: 3,
  CANCELLED: 4
} as const;

export const MOONZ_QUOTE_ASSET = {
  SOL: 0,
  USDC: 1
} as const;
