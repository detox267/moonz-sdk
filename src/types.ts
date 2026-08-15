import type {
  Commitment,
  Connection,
  PublicKey
} from "@solana/web3.js";

export type MoonzAddress =
  | string
  | PublicKey;

export type MoonzPhase =
  | "PENDING_DEV_BUY"
  | "BONDING"
  | "AMM_LIVE"
  | "SWITCHING"
  | "CANCELLED"
  | "UNKNOWN";

export type MoonzQuoteAsset =
  | "SOL"
  | "USDC"
  | "UNKNOWN";

export interface MoonzSDKOptions {
  rpcUrl?: string;
  wsEndpoint?: string;
  connection?: Connection;
  commitment?: Commitment;
}

export interface MoonzAmount {
  raw: string;
  decimals: number;
  ui: string;
}

export interface MoonzLaunchState {
  address: string;

  bump: number;
  escrowSolBump: number;

  phase: MoonzPhase;
  phaseCode: number;

  devBuyDone: boolean;
  escrowSettled: boolean;
  metadataInitialized: boolean;
  mintFinalized: boolean;

  mint: string;
  creator: string;

  metadataCommitment: string;

  saleVault: string;
  lpVault: string;
  treasuryWsolVault: string;
  treasuryUsdcVault: string;
  escrowSolVault: string;

  saleSupplyRaw: string;
  tokensSoldRaw: string;
  solCollectedRaw: string;

  quoteAsset: MoonzQuoteAsset;
  quoteAssetCode: number;

  pendingQuoteAsset: MoonzQuoteAsset;
  pendingQuoteAssetCode: number;

  lastPoolSwitchTimestamp: number;
  switchStartedTimestamp: number;

  switchFeeEscrowedLamports: string;
  switchAmountInRaw: string;
  switchMinAmountOutRaw: string;
  switchSwapExecuted: boolean;

  lastTradeTimestamp: number;

  metadata: string;
}

export interface MoonzDerivedVaults {
  launchState: string;
  saleVault: string;
  lpVault: string;
  treasuryWsolVault: string;
  treasuryUsdcVault: string;
  escrowSolVault: string;
}

export interface MoonzVaults {
  stored: MoonzDerivedVaults;
  derived: MoonzDerivedVaults;
}

export interface MoonzTokenAccountInfo {
  address: string;
  runtimeOwner: string;
  mint: string;
  authority: string;
  amount: MoonzAmount;
}

export interface MoonzReserves {
  saleTokens: MoonzTokenAccountInfo | null;
  lpTokens: MoonzTokenAccountInfo | null;
  wsol: MoonzTokenAccountInfo | null;
  usdc: MoonzTokenAccountInfo | null;
  escrowSol: MoonzAmount;
}

export interface MoonzSupply {
  total: MoonzAmount;

  saleRaw: string;
  soldRaw: string;
  remainingRaw: string;

  bondingProgress: number;
}

export interface MoonzSwitchState {
  active: boolean;

  currentQuoteAsset: MoonzQuoteAsset;
  pendingQuoteAsset: MoonzQuoteAsset;

  startedAt: number;
  lastCompletedAt: number;

  feeEscrowedLamports: string;
  amountInRaw: string;
  minAmountOutRaw: string;

  swapExecuted: boolean;
}

export type MoonzMarketType =
  | "BONDING"
  | "AMM"
  | "UNAVAILABLE";

export type MoonzMarketPriceSource =
  | "VIRTUAL_CURVE"
  | "AMM_RESERVES"
  | "UNAVAILABLE";

export interface MoonzMarketData {
  mint: string;

  phase: MoonzPhase;
  phaseCode: number;

  market: MoonzMarketType;
  priceSource: MoonzMarketPriceSource;

  tradable: boolean;

  quoteAsset: MoonzQuoteAsset;
  quoteAssetCode: number;

  /*
   * Price per whole token in quoteAsset.
   */
  priceQuote: string | null;

  /*
   * Current total supply multiplied by priceQuote.
   * Denominated in quoteAsset.
   */
  marketCapQuote: string | null;

  totalSupply: MoonzAmount;
  bondingProgress: number;

  /*
   * BONDING only.
   */
  virtualQuoteReserve:
    MoonzAmount | null;

  virtualTokenReserve:
    MoonzAmount | null;

  /*
   * AMM_LIVE only.
   */
  tokenReserve:
    MoonzAmount | null;

  quoteReserve:
    MoonzAmount | null;

  integrityAll: boolean;
}

export interface MoonzIntegrity {
  programOwner: boolean;

  launchStatePda: boolean;

  saleVaultPda: boolean;
  lpVaultPda: boolean;

  treasuryWsolPda: boolean;
  treasuryUsdcPda: boolean;

  escrowSolPda: boolean;

  tokenProgramOwners: boolean;
  vaultAuthorities: boolean;
  vaultMints: boolean;

  all: boolean;
}

export interface MoonzTokenInfo {
  mint: string;
  creator: string;

  phase: MoonzPhase;
  phaseCode: number;

  quoteAsset: MoonzQuoteAsset;
  quoteAssetCode: number;

  launchState: MoonzLaunchState;

  metadata: MoonzMetadataInfo | null;

  vaults: MoonzVaults;
  reserves: MoonzReserves;

  supply: MoonzSupply;

  switching: MoonzSwitchState;

  timestamps: {
    lastTrade: number;
  };

  integrity: MoonzIntegrity;

  programId: string;
}

export interface MoonzMetadataInfo {
  address: string;
  runtimeOwner: string;

  updateAuthority: string;
  mint: string;

  name: string;
  symbol: string;
  uri: string;

  sellerFeeBasisPoints: number;

  primarySaleHappened:
    boolean | null;

  mutable:
    boolean | null;

  validOwner: boolean;
  validMint: boolean;

  matchesLaunchState: boolean;
  matchesDerivedPda: boolean;
}

export type MoonzEventType =
  | "TOKEN_CREATED"
  | "LAUNCH_ESCROW_FUNDED"
  | "LAUNCH_ESCROW_REFUNDED"
  | "BONDING_BUY"
  | "BONDING_SELL"
  | "AMM_BUY"
  | "AMM_SELL"
  | "FEES_CLAIMED"
  | "MIGRATED"
  | "POOL_SWITCH_STARTED"
  | "POOL_SWITCH_SWAP_EXECUTED"
  | "POOL_SWITCH_COMPLETED"
  | "POOL_SWITCH_CANCELLED";

export type MoonzEventCategory =
  | "CREATE"
  | "ESCROW"
  | "BUY"
  | "SELL"
  | "FEES"
  | "MIGRATION"
  | "POOL_SWITCH";

export type MoonzTradeMarket =
  | "BONDING"
  | "AMM";

export type MoonzTradeSide =
  | "BUY"
  | "SELL";

export interface MoonzEventContext {
  signature?: string;
  slot?: number;
  blockTime?: number | null;
}

export type MoonzEventDataValue =
  | string
  | number
  | boolean
  | null;

export interface MoonzDecodedEvent {
  type: MoonzEventType;

  category:
    MoonzEventCategory;

  /**
   * Exact Anchor event struct name.
   */
  rawName: string;

  /**
   * All event fields converted to
   * JSON safe scalar values.
   *
   * u64/u128/i64 values are represented
   * as strings when decoded by Anchor BN.
   */
  data: Record<
    string,
    MoonzEventDataValue
  >;

  mint?: string;
  creator?: string;
  user?: string;
  executor?: string;
  feeMint?: string;

  market?: MoonzTradeMarket;
  side?: MoonzTradeSide;

  quoteAsset?:
    MoonzQuoteAsset;

  quoteAssetCode?: number;

  timestamp?: number;

  signature?: string;
  slot?: number;
  blockTime?: number | null;

  /**
   * Zero based order of this Moonz event
   * inside the transaction logs.
   *
   * signature + eventIndex can be used
   * as a stable bot deduplication key.
   */
  eventIndex?: number;

  /**
   * Token being watched when this event
   * came from watchToken().
   *
   * This is useful for events such as
   * ClaimFeesEvent which do not carry the
   * launch mint directly in their payload.
   */
  watchedMint?: string;

}

export type MoonzWatchEventFilter =
  | MoonzEventType
  | MoonzEventCategory
  | "TRADE"
  | "ALL";

export interface MoonzWatchTokenOptions {
  /**
   * Event types/categories to receive.
   *
   * Examples:
   *
   * ["BUY", "SELL"]
   * ["TRADE"]
   * ["BONDING_BUY", "AMM_BUY"]
   * ["MIGRATED"]
   *
   * Omit to receive every Moonz event
   * associated with the watched token.
   */
  events?: MoonzWatchEventFilter[];

  /**
   * Failed transactions are ignored
   * by default.
   */
  includeFailedTransactions?: boolean;

  onEvent:
    (
      event: MoonzDecodedEvent
    ) => void | Promise<void>;

  onError?:
    (
      error: unknown
    ) => void;
}

export type MoonzUnsubscribe =
  () => Promise<void>;

export interface MoonzWatchOptions {
  /**
   * Event filters.
   *
   * Examples:
   *
   * ["BUY"]
   * ["BUY", "SELL"]
   * ["TRADE"]
   * ["TOKEN_CREATED"]
   * ["MIGRATED"]
   *
   * Omit to receive every decoded
   * Moonz program event.
   */
  events?: MoonzWatchEventFilter[];

  /**
   * Optional mint whitelist.
   *
   * When supplied, only events carrying
   * one of these Moonz mint addresses
   * are delivered.
   *
   * Events that do not contain a launch
   * mint, such as ClaimFeesEvent, cannot
   * match this filter.
   */
  mints?: MoonzAddress[];

  /**
   * Failed transactions are ignored
   * by default.
   */
  includeFailedTransactions?: boolean;

  onEvent:
    (
      event: MoonzDecodedEvent
    ) => void | Promise<void>;

  onError?:
    (
      error: unknown
    ) => void;
}

export type MoonzTokenSort =
  | "LAST_TRADE_DESC"
  | "LAST_TRADE_ASC"
  | "BONDING_DESC"
  | "BONDING_ASC"
  | "MINT_ASC"
  | "MINT_DESC";

export interface MoonzTokenQuery {
  /**
   * Filter by lifecycle phase.
   *
   * Examples:
   *
   * phase: "BONDING"
   *
   * phase: [
   *   "BONDING",
   *   "AMM_LIVE"
   * ]
   */
  phase?:
    MoonzPhase |
    MoonzPhase[];

  /**
   * Filter by current quote asset.
   */
  quoteAsset?:
    MoonzQuoteAsset |
    MoonzQuoteAsset[];

  /**
   * Only launches belonging to this
   * creator wallet.
   */
  creator?: MoonzAddress;

  /**
   * Optional mint whitelist.
   */
  mints?: MoonzAddress[];

  /**
   * Results to skip after filtering
   * and sorting.
   */
  offset?: number;

  /**
   * Maximum results returned.
   *
   * Omit for all matching LaunchState
   * accounts returned by the RPC.
   */
  limit?: number;

  /**
   * Default:
   *
   * LAST_TRADE_DESC
   */
  sort?: MoonzTokenSort;
}

export interface MoonzTokenSummary {
  mint: string;
  creator: string;

  phase: MoonzPhase;
  phaseCode: number;

  quoteAsset: MoonzQuoteAsset;
  quoteAssetCode: number;

  pendingQuoteAsset:
    MoonzQuoteAsset;

  pendingQuoteAssetCode: number;

  launchState: string;

  saleVault: string;
  lpVault: string;

  treasuryWsolVault: string;
  treasuryUsdcVault: string;

  escrowSolVault: string;

  metadata: string;

  saleSupplyRaw: string;
  tokensSoldRaw: string;
  tokensRemainingRaw: string;

  bondingProgress: number;

  lastTradeTimestamp: number;

  metadataInitialized: boolean;
  mintFinalized: boolean;

  switching: boolean;

  integrity: {
    launchStatePda: boolean;
    saleVaultPda: boolean;
    lpVaultPda: boolean;
    treasuryWsolPda: boolean;
    treasuryUsdcPda: boolean;
    escrowSolPda: boolean;
    allPdas: boolean;
  };
}
