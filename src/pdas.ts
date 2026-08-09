import { PublicKey } from "@solana/web3.js";
import { MOONZ_PROGRAM_ID } from "./constants";

function key(value: PublicKey | string): PublicKey {
  return value instanceof PublicKey
    ? value
    : new PublicKey(value);
}

export function deriveLaunchStatePda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("launch_state"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveSaleVaultPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("sale_vault"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveLpVaultPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("lp_vault"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveTreasuryWsolPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("treasury_wsol"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveTreasuryUsdcPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("treasury_usdc"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveEscrowSolPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow_sol"),
      mintKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveMintAuthorityPda() {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("mint_authority")
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveCreatorFeesPda(
  creator: PublicKey | string
) {
  const creatorKey = key(creator);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("creator_fees"),
      creatorKey.toBuffer()
    ],
    MOONZ_PROGRAM_ID
  );
}

export function deriveMoonzAddresses(
  mint: PublicKey | string
) {
  return {
    launchState: deriveLaunchStatePda(mint)[0],
    saleVault: deriveSaleVaultPda(mint)[0],
    lpVault: deriveLpVaultPda(mint)[0],
    treasuryWsolVault: deriveTreasuryWsolPda(mint)[0],
    treasuryUsdcVault: deriveTreasuryUsdcPda(mint)[0],
    escrowSolVault: deriveEscrowSolPda(mint)[0]
  };
}

import {
  TOKEN_METADATA_PROGRAM_ID
} from "./constants";

export function deriveMetadataPda(
  mint: PublicKey | string
) {
  const mintKey = key(mint);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKey.toBuffer()
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}
