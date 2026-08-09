import {
  BorshAccountsCoder,
  type Idl
} from "@coral-xyz/anchor";

import bs58 from "bs58";

import {
  Connection,
  PublicKey
} from "@solana/web3.js";

import idlJson from "../idl/moonz_launchpad.json";

import {
  MOONZ_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  USDC_MINT,
  WSOL_MINT
} from "./constants";

import {
  deriveMetadataPda,
  deriveMoonzAddresses
} from "./pdas";

import {
  decodeMetaplexMetadata
} from "./metadata";

import {
  parseMoonzLogs
} from "./events";

import {
  matchesMoonzEventFilter,
  matchesMoonzMintFilter
} from "./subscriptions";

import type {
  MoonzAddress,
  MoonzAmount,
  MoonzDecodedEvent,
  MoonzDerivedVaults,
  MoonzEventContext,
  MoonzIntegrity,
  MoonzLaunchState,
  MoonzMetadataInfo,
  MoonzPhase,
  MoonzQuoteAsset,
  MoonzReserves,
  MoonzSDKOptions,
  MoonzSupply,
  MoonzTokenAccountInfo,
  MoonzTokenInfo,
  MoonzTokenQuery,
  MoonzTokenSummary,
  MoonzUnsubscribe,
  MoonzWatchOptions,
  MoonzWatchTokenOptions,
  MoonzVaults
} from "./types";

const MOONZ_IDL =
  idlJson as unknown as Idl;

const IDL_ANY =
  idlJson as any;

function asPublicKey(
  value: MoonzAddress
): PublicKey {
  return value instanceof PublicKey
    ? value
    : new PublicKey(value);
}

function readField(
  object: any,
  ...names: string[]
): any {
  for (const name of names) {
    if (
      object &&
      object[name] !== undefined
    ) {
      return object[name];
    }
  }

  return undefined;
}

function asBigInt(
  value: any
): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(value);
  }

  if (typeof value === "string") {
    return BigInt(value);
  }

  if (
    value &&
    typeof value.toString === "function"
  ) {
    return BigInt(value.toString());
  }

  return 0n;
}

function asNumber(
  value: any
): number {
  if (typeof value === "number") {
    return value;
  }

  return Number(asBigInt(value));
}

function asBoolean(
  value: any
): boolean {
  return value === true;
}

function asPubkeyString(
  value: any
): string {
  if (value instanceof PublicKey) {
    return value.toBase58();
  }

  if (
    value &&
    typeof value.toBase58 === "function"
  ) {
    return value.toBase58();
  }

  return new PublicKey(value).toBase58();
}

function bytesToHex(
  value: any
): string {
  if (!value) {
    return "";
  }

  return Array.from(
    value as ArrayLike<number>
  )
    .map((byte) =>
      Number(byte)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function phaseFromCode(
  code: number
): MoonzPhase {
  switch (code) {
    case 0:
      return "PENDING_DEV_BUY";

    case 1:
      return "BONDING";

    case 2:
      return "AMM_LIVE";

    case 3:
      return "SWITCHING";

    case 4:
      return "CANCELLED";

    default:
      return "UNKNOWN";
  }
}

function quoteAssetFromCode(
  code: number
): MoonzQuoteAsset {
  switch (code) {
    case 0:
      return "SOL";

    case 1:
      return "USDC";

    default:
      return "UNKNOWN";
  }
}

function formatRawAmount(
  rawValue: string,
  decimals: number
): string {
  const raw = BigInt(rawValue);

  if (decimals === 0) {
    return raw.toString();
  }

  const negative = raw < 0n;

  const value =
    negative
      ? -raw
      : raw;

  const base =
    10n ** BigInt(decimals);

  const whole =
    value / base;

  const fraction =
    (value % base)
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");

  const result =
    fraction.length > 0
      ? `${whole}.${fraction}`
      : whole.toString();

  return negative
    ? `-${result}`
    : result;
}

function amount(
  raw: string,
  decimals: number
): MoonzAmount {
  return {
    raw,
    decimals,
    ui: formatRawAmount(
      raw,
      decimals
    )
  };
}

function sameAddress(
  a: string,
  b: string
): boolean {
  return a === b;
}

function percentage(
  numerator: string,
  denominator: string
): number {
  const num = BigInt(numerator);
  const den = BigInt(denominator);

  if (den <= 0n) {
    return 0;
  }

  const scaled =
    (num * 1_000_000n) / den;

  return Number(scaled) / 10_000;
}

function launchStateDiscriminator():
  number[] {
  const account =
    (IDL_ANY.accounts || []).find(
      (candidate: any) =>
        candidate?.name ===
          "LaunchState" ||
        candidate?.name ===
          "launchState"
    );

  if (
    !account ||
    !Array.isArray(
      account.discriminator
    )
  ) {
    throw new Error(
      "Moonz IDL does not contain the LaunchState discriminator"
    );
  }

  return account.discriminator;
}

const LAUNCH_STATE_DISCRIMINATOR =
  launchStateDiscriminator();

function matchesDiscriminator(
  data: Uint8Array
): boolean {
  if (
    data.length <
    LAUNCH_STATE_DISCRIMINATOR.length
  ) {
    return false;
  }

  for (
    let i = 0;
    i <
    LAUNCH_STATE_DISCRIMINATOR.length;
    i += 1
  ) {
    if (
      data[i] !==
      LAUNCH_STATE_DISCRIMINATOR[i]
    ) {
      return false;
    }
  }

  return true;
}

export class MoonzSDK {
  public readonly connection:
    Connection;

  public readonly programId =
    MOONZ_PROGRAM_ID;

  private readonly commitment;

  private readonly coder:
    BorshAccountsCoder;

  public constructor(
    options: MoonzSDKOptions
  ) {
    this.commitment =
      options.commitment ??
      "confirmed";

    if (options.connection) {
      this.connection =
        options.connection;
    } else {
      if (!options.rpcUrl) {
        throw new Error(
          "MoonzSDK requires rpcUrl or connection"
        );
      }

      this.connection =
        new Connection(
          options.rpcUrl,
          {
            commitment:
              this.commitment,

            wsEndpoint:
              options.wsEndpoint
          }
        );
    }

    this.coder =
      new BorshAccountsCoder(
        MOONZ_IDL
      );
  }

  public parseLogs(
    logs: string[],
    context: MoonzEventContext = {}
  ): MoonzDecodedEvent[] {
    return parseMoonzLogs(
      logs,
      context
    );
  }

  public async getTransactionEvents(
    signature: string
  ): Promise<MoonzDecodedEvent[]> {
    const finality =
      this.commitment ===
        "finalized"
        ? "finalized"
        : "confirmed";

    const transaction =
      await this.connection
        .getTransaction(
          signature,
          {
            commitment:
              finality,

            maxSupportedTransactionVersion:
              0
          }
        );

    if (
      !transaction ||
      !transaction.meta ||
      !transaction.meta.logMessages
    ) {
      return [];
    }

    return parseMoonzLogs(
      transaction.meta.logMessages,
      {
        signature,
        slot:
          transaction.slot,
        blockTime:
          transaction.blockTime
      }
    );
  }

  public async getTokens(
    options: MoonzTokenQuery = {}
  ): Promise<MoonzTokenSummary[]> {
    const discriminatorBytes =
      bs58.encode(
        Buffer.from(
          LAUNCH_STATE_DISCRIMINATOR
        )
      );

    let creatorFilter:
      string | undefined;

    if (
      options.creator !== undefined
    ) {
      try {
        creatorFilter =
          asPublicKey(
            options.creator
          ).toBase58();
      } catch {
        throw new Error(
          "getTokens contains an invalid creator address"
        );
      }
    }

    let mintFilter:
      Set<string> | undefined;

    if (
      options.mints &&
      options.mints.length > 0
    ) {
      mintFilter =
        new Set<string>();

      for (
        const mint
        of options.mints
      ) {
        try {
          mintFilter.add(
            asPublicKey(
              mint
            ).toBase58()
          );
        } catch {
          throw new Error(
            "getTokens contains an invalid mint address"
          );
        }
      }
    }

    const phaseFilter =
      options.phase === undefined
        ? undefined
        : new Set(
            Array.isArray(
              options.phase
            )
              ? options.phase
              : [options.phase]
          );

    const quoteFilter =
      options.quoteAsset === undefined
        ? undefined
        : new Set(
            Array.isArray(
              options.quoteAsset
            )
              ? options.quoteAsset
              : [options.quoteAsset]
          );

    const accounts =
      await this.connection
        .getProgramAccounts(
          MOONZ_PROGRAM_ID,
          {
            commitment:
              this.commitment,

            filters: [
              {
                memcmp: {
                  offset: 0,
                  bytes:
                    discriminatorBytes
                }
              }
            ]
          }
        );

    const output:
      MoonzTokenSummary[] = [];

    for (
      const entry
      of accounts
    ) {
      if (
        !entry.account.owner.equals(
          MOONZ_PROGRAM_ID
        )
      ) {
        continue;
      }

      if (
        !matchesDiscriminator(
          entry.account.data
        )
      ) {
        continue;
      }

      let decoded: any;

      try {
        decoded =
          this.coder.decode(
            "LaunchState",
            entry.account.data
          );
      } catch {
        continue;
      }

      let mint: string;
      let mintKey: PublicKey;

      try {
        mint =
          asPubkeyString(
            readField(
              decoded,
              "mint"
            )
          );

        mintKey =
          new PublicKey(
            mint
          );
      } catch {
        continue;
      }

      const derived =
        deriveMoonzAddresses(
          mintKey
        );

      /*
       * Only accept deterministic Moonz
       * LaunchState accounts.
       */
      if (
        !derived.launchState.equals(
          entry.pubkey
        )
      ) {
        continue;
      }

      if (
        mintFilter &&
        !mintFilter.has(
          mint
        )
      ) {
        continue;
      }

      const creator =
        asPubkeyString(
          readField(
            decoded,
            "creator"
          )
        );

      if (
        creatorFilter &&
        creator !==
          creatorFilter
      ) {
        continue;
      }

      const phaseCode =
        asNumber(
          readField(
            decoded,
            "state"
          )
        );

      const phase =
        phaseFromCode(
          phaseCode
        );

      if (
        phaseFilter &&
        !phaseFilter.has(
          phase
        )
      ) {
        continue;
      }

      const quoteAssetCode =
        asNumber(
          readField(
            decoded,
            "quote_asset",
            "quoteAsset"
          )
        );

      const quoteAsset =
        quoteAssetFromCode(
          quoteAssetCode
        );

      if (
        quoteFilter &&
        !quoteFilter.has(
          quoteAsset
        )
      ) {
        continue;
      }

      const pendingQuoteAssetCode =
        asNumber(
          readField(
            decoded,
            "pending_quote_asset",
            "pendingQuoteAsset"
          )
        );

      const pendingQuoteAsset =
        quoteAssetFromCode(
          pendingQuoteAssetCode
        );

      const saleSupplyRaw =
        asBigInt(
          readField(
            decoded,
            "sale_supply",
            "saleSupply"
          )
        ).toString();

      const tokensSoldRaw =
        asBigInt(
          readField(
            decoded,
            "tokens_sold",
            "tokensSold"
          )
        ).toString();

      const remaining =
        BigInt(
          saleSupplyRaw
        ) >
        BigInt(
          tokensSoldRaw
        )
          ? BigInt(
              saleSupplyRaw
            ) -
            BigInt(
              tokensSoldRaw
            )
          : 0n;

      const saleVault =
        asPubkeyString(
          readField(
            decoded,
            "sale_vault",
            "saleVault"
          )
        );

      const lpVault =
        asPubkeyString(
          readField(
            decoded,
            "lp_vault",
            "lpVault"
          )
        );

      const treasuryWsolVault =
        asPubkeyString(
          readField(
            decoded,
            "treasury_wsol_vault",
            "treasuryWsolVault"
          )
        );

      const treasuryUsdcVault =
        asPubkeyString(
          readField(
            decoded,
            "treasury_usdc_vault",
            "treasuryUsdcVault"
          )
        );

      const escrowSolVault =
        asPubkeyString(
          readField(
            decoded,
            "escrow_sol_vault",
            "escrowSolVault"
          )
        );

      const metadata =
        asPubkeyString(
          readField(
            decoded,
            "metadata"
          )
        );

      const pdaIntegrity = {
        launchStatePda:
          entry.pubkey.equals(
            derived.launchState
          ),

        saleVaultPda:
          saleVault ===
          derived.saleVault
            .toBase58(),

        lpVaultPda:
          lpVault ===
          derived.lpVault
            .toBase58(),

        treasuryWsolPda:
          treasuryWsolVault ===
          derived.treasuryWsolVault
            .toBase58(),

        treasuryUsdcPda:
          treasuryUsdcVault ===
          derived.treasuryUsdcVault
            .toBase58(),

        escrowSolPda:
          escrowSolVault ===
          derived.escrowSolVault
            .toBase58()
      };

      const allPdas =
        Object.values(
          pdaIntegrity
        ).every(Boolean);

      output.push({
        mint,
        creator,

        phase,
        phaseCode,

        quoteAsset,
        quoteAssetCode,

        pendingQuoteAsset,
        pendingQuoteAssetCode,

        launchState:
          entry.pubkey
            .toBase58(),

        saleVault,
        lpVault,

        treasuryWsolVault,
        treasuryUsdcVault,

        escrowSolVault,

        metadata,

        saleSupplyRaw,
        tokensSoldRaw,

        tokensRemainingRaw:
          remaining.toString(),

        bondingProgress:
          percentage(
            tokensSoldRaw,
            saleSupplyRaw
          ),

        lastTradeTimestamp:
          asNumber(
            readField(
              decoded,
              "last_trade_ts",
              "lastTradeTs"
            )
          ),

        metadataInitialized:
          asBoolean(
            readField(
              decoded,
              "metadata_initialized",
              "metadataInitialized"
            )
          ),

        mintFinalized:
          asBoolean(
            readField(
              decoded,
              "mint_finalized",
              "mintFinalized"
            )
          ),

        switching:
          phase ===
          "SWITCHING",

        integrity: {
          ...pdaIntegrity,
          allPdas
        }
      });
    }

    const sort =
      options.sort ??
      "LAST_TRADE_DESC";

    output.sort(
      (a, b) => {
        switch (sort) {
          case "LAST_TRADE_ASC":
            return (
              a.lastTradeTimestamp -
              b.lastTradeTimestamp
            );

          case "LAST_TRADE_DESC":
            return (
              b.lastTradeTimestamp -
              a.lastTradeTimestamp
            );

          case "BONDING_ASC":
            return (
              a.bondingProgress -
              b.bondingProgress
            );

          case "BONDING_DESC":
            return (
              b.bondingProgress -
              a.bondingProgress
            );

          case "MINT_DESC":
            return b.mint.localeCompare(
              a.mint
            );

          case "MINT_ASC":
          default:
            return a.mint.localeCompare(
              b.mint
            );
        }
      }
    );

    const offset =
      options.offset === undefined
        ? 0
        : Math.max(
            0,
            Math.floor(
              options.offset
            )
          );

    if (
      options.limit === undefined
    ) {
      return output.slice(
        offset
      );
    }

    const limit =
      Math.max(
        0,
        Math.floor(
          options.limit
        )
      );

    return output.slice(
      offset,
      offset + limit
    );
  }

  public async getTokensByCreator(
    creator: MoonzAddress,
    options:
      Omit<
        MoonzTokenQuery,
        "creator"
      > = {}
  ): Promise<MoonzTokenSummary[]> {
    return this.getTokens({
      ...options,
      creator
    });
  }

  public async watch(
    options: MoonzWatchOptions
  ): Promise<MoonzUnsubscribe> {
    if (
      !options ||
      typeof options.onEvent !==
        "function"
    ) {
      throw new Error(
        "watch requires an onEvent callback"
      );
    }

    let mintFilter:
      Set<string> | undefined;

    if (
      options.mints &&
      options.mints.length > 0
    ) {
      mintFilter =
        new Set<string>();

      for (
        const mint
        of options.mints
      ) {
        try {
          mintFilter.add(
            asPublicKey(
              mint
            ).toBase58()
          );
        } catch {
          throw new Error(
            "watch contains an invalid mint address"
          );
        }
      }
    }

    const reportError =
      (error: unknown) => {
        if (!options.onError) {
          return;
        }

        try {
          options.onError(
            error
          );
        } catch {
          // Consumer error handlers
          // must never terminate
          // the subscription.
        }
      };

    const subscriptionId =
      this.connection.onLogs(
        MOONZ_PROGRAM_ID,
        (
          logInfo,
          context
        ) => {
          if (
            logInfo.err &&
            !options
              .includeFailedTransactions
          ) {
            return;
          }

          let events:
            MoonzDecodedEvent[];

          try {
            events =
              parseMoonzLogs(
                logInfo.logs,
                {
                  signature:
                    logInfo.signature,

                  slot:
                    context.slot
                }
              );
          } catch (error) {
            reportError(
              error
            );

            return;
          }

          for (
            const event
            of events
          ) {
            if (
              !matchesMoonzEventFilter(
                event,
                options.events
              )
            ) {
              continue;
            }

            if (
              !matchesMoonzMintFilter(
                event,
                mintFilter
              )
            ) {
              continue;
            }

            try {
              const result =
                options.onEvent(
                  event
                );

              Promise.resolve(
                result
              ).catch(
                reportError
              );
            } catch (error) {
              reportError(
                error
              );
            }
          }
        },
        this.commitment
      );

    let active = true;

    return async () => {
      if (!active) {
        return;
      }

      active = false;

      await this.connection
        .removeOnLogsListener(
          subscriptionId
        );
    };
  }

  public async watchToken(
    mint: MoonzAddress,
    options: MoonzWatchTokenOptions
  ): Promise<MoonzUnsubscribe> {
    let mintKey: PublicKey;

    try {
      mintKey =
        asPublicKey(mint);
    } catch {
      throw new Error(
        "Invalid Solana mint address"
      );
    }

    if (
      !options ||
      typeof options.onEvent !==
        "function"
    ) {
      throw new Error(
        "watchToken requires an onEvent callback"
      );
    }

    const state =
      await this.getLaunchState(
        mintKey
      );

    if (!state) {
      throw new Error(
        `${mintKey.toBase58()} is not a Moonz token`
      );
    }

    const targetMint =
      mintKey.toBase58();

    const launchState =
      deriveMoonzAddresses(
        mintKey
      ).launchState;

    const reportError =
      (error: unknown) => {
        if (!options.onError) {
          return;
        }

        try {
          options.onError(
            error
          );
        } catch {
          // Consumer error handlers must
          // never break the subscription.
        }
      };

    const subscriptionId =
      this.connection.onLogs(
        launchState,
        (
          logInfo,
          context
        ) => {
          if (
            logInfo.err &&
            !options
              .includeFailedTransactions
          ) {
            return;
          }

          let events:
            MoonzDecodedEvent[];

          try {
            events =
              parseMoonzLogs(
                logInfo.logs,
                {
                  signature:
                    logInfo.signature,

                  slot:
                    context.slot
                }
              );
          } catch (error) {
            reportError(
              error
            );

            return;
          }

          for (
            const event
            of events
          ) {
            /*
             * Most Moonz events carry
             * their launch mint.
             *
             * ClaimFeesEvent currently
             * carries creator + fee mint
             * instead. Because this logs
             * subscription is scoped to
             * the deterministic LaunchState
             * PDA, watchedMint preserves
             * that context without altering
             * the raw event payload.
             */
            if (
              event.mint &&
              event.mint !==
                targetMint
            ) {
              continue;
            }

            if (
              !matchesMoonzEventFilter(
                event,
                options.events
              )
            ) {
              continue;
            }

            const watchedEvent:
              MoonzDecodedEvent = {
                ...event,
                watchedMint:
                  targetMint
              };

            try {
              const result =
                options.onEvent(
                  watchedEvent
                );

              Promise.resolve(
                result
              ).catch(
                reportError
              );
            } catch (error) {
              reportError(
                error
              );
            }
          }
        },
        this.commitment
      );

    let active = true;

    return async () => {
      if (!active) {
        return;
      }

      active = false;

      await this.connection
        .removeOnLogsListener(
          subscriptionId
        );
    };
  }

  public async isMoonzToken(
    mint: MoonzAddress
  ): Promise<boolean> {
    try {
      return (
        await this.getLaunchState(
          mint
        )
      ) !== null;
    } catch {
      return false;
    }
  }

  public async getLaunchState(
    mint: MoonzAddress
  ): Promise<MoonzLaunchState | null> {
    const mintKey =
      asPublicKey(mint);

    const addresses =
      deriveMoonzAddresses(
        mintKey
      );

    const info =
      await this.connection
        .getAccountInfo(
          addresses.launchState,
          this.commitment
        );

    if (!info) {
      return null;
    }

    if (
      !info.owner.equals(
        MOONZ_PROGRAM_ID
      )
    ) {
      return null;
    }

    if (
      !matchesDiscriminator(
        info.data
      )
    ) {
      return null;
    }

    let decoded: any;

    try {
      decoded =
        this.coder.decode(
          "LaunchState",
          info.data
        );
    } catch {
      return null;
    }

    const decodedMint =
      asPubkeyString(
        readField(
          decoded,
          "mint"
        )
      );

    if (
      decodedMint !==
      mintKey.toBase58()
    ) {
      return null;
    }

    const phaseCode =
      asNumber(
        readField(
          decoded,
          "state"
        )
      );

    const quoteAssetCode =
      asNumber(
        readField(
          decoded,
          "quote_asset",
          "quoteAsset"
        )
      );

    const pendingQuoteAssetCode =
      asNumber(
        readField(
          decoded,
          "pending_quote_asset",
          "pendingQuoteAsset"
        )
      );

    return {
      address:
        addresses.launchState
          .toBase58(),

      bump:
        asNumber(
          readField(
            decoded,
            "bump"
          )
        ),

      escrowSolBump:
        asNumber(
          readField(
            decoded,
            "escrow_sol_bump",
            "escrowSolBump"
          )
        ),

      phase:
        phaseFromCode(
          phaseCode
        ),

      phaseCode,

      devBuyDone:
        asBoolean(
          readField(
            decoded,
            "dev_buy_done",
            "devBuyDone"
          )
        ),

      escrowSettled:
        asBoolean(
          readField(
            decoded,
            "escrow_settled",
            "escrowSettled"
          )
        ),

      metadataInitialized:
        asBoolean(
          readField(
            decoded,
            "metadata_initialized",
            "metadataInitialized"
          )
        ),

      mintFinalized:
        asBoolean(
          readField(
            decoded,
            "mint_finalized",
            "mintFinalized"
          )
        ),

      mint:
        decodedMint,

      creator:
        asPubkeyString(
          readField(
            decoded,
            "creator"
          )
        ),

      metadataCommitment:
        bytesToHex(
          readField(
            decoded,
            "metadata_commitment",
            "metadataCommitment"
          )
        ),

      saleVault:
        asPubkeyString(
          readField(
            decoded,
            "sale_vault",
            "saleVault"
          )
        ),

      lpVault:
        asPubkeyString(
          readField(
            decoded,
            "lp_vault",
            "lpVault"
          )
        ),

      treasuryWsolVault:
        asPubkeyString(
          readField(
            decoded,
            "treasury_wsol_vault",
            "treasuryWsolVault"
          )
        ),

      treasuryUsdcVault:
        asPubkeyString(
          readField(
            decoded,
            "treasury_usdc_vault",
            "treasuryUsdcVault"
          )
        ),

      escrowSolVault:
        asPubkeyString(
          readField(
            decoded,
            "escrow_sol_vault",
            "escrowSolVault"
          )
        ),

      saleSupplyRaw:
        asBigInt(
          readField(
            decoded,
            "sale_supply",
            "saleSupply"
          )
        ).toString(),

      tokensSoldRaw:
        asBigInt(
          readField(
            decoded,
            "tokens_sold",
            "tokensSold"
          )
        ).toString(),

      solCollectedRaw:
        asBigInt(
          readField(
            decoded,
            "sol_collected",
            "solCollected"
          )
        ).toString(),

      quoteAsset:
        quoteAssetFromCode(
          quoteAssetCode
        ),

      quoteAssetCode,

      pendingQuoteAsset:
        quoteAssetFromCode(
          pendingQuoteAssetCode
        ),

      pendingQuoteAssetCode,

      lastPoolSwitchTimestamp:
        asNumber(
          readField(
            decoded,
            "last_pool_switch_ts",
            "lastPoolSwitchTs"
          )
        ),

      switchStartedTimestamp:
        asNumber(
          readField(
            decoded,
            "switch_started_at",
            "switchStartedAt"
          )
        ),

      switchFeeEscrowedLamports:
        asBigInt(
          readField(
            decoded,
            "switch_fee_escrowed_lamports",
            "switchFeeEscrowedLamports"
          )
        ).toString(),

      switchAmountInRaw:
        asBigInt(
          readField(
            decoded,
            "switch_amount_in",
            "switchAmountIn"
          )
        ).toString(),

      switchMinAmountOutRaw:
        asBigInt(
          readField(
            decoded,
            "switch_min_amount_out",
            "switchMinAmountOut"
          )
        ).toString(),

      switchSwapExecuted:
        asBoolean(
          readField(
            decoded,
            "switch_swap_executed",
            "switchSwapExecuted"
          )
        ),

      lastTradeTimestamp:
        asNumber(
          readField(
            decoded,
            "last_trade_ts",
            "lastTradeTs"
          )
        ),

      metadata:
        asPubkeyString(
          readField(
            decoded,
            "metadata"
          )
        )
    };
  }

  public async getMetadata(
    mint: MoonzAddress
  ): Promise<MoonzMetadataInfo | null> {
    let mintKey: PublicKey;

    try {
      mintKey =
        asPublicKey(mint);
    } catch {
      return null;
    }

    const state =
      await this.getLaunchState(
        mintKey
      );

    if (!state) {
      return null;
    }

    const [metadataPda] =
      deriveMetadataPda(
        mintKey
      );

    const info =
      await this.connection
        .getAccountInfo(
          metadataPda,
          this.commitment
        );

    if (!info) {
      return null;
    }

    try {
      const decoded =
        decodeMetaplexMetadata(
          metadataPda,
          info.owner,
          mintKey,
          info.data
        );

      return {
        ...decoded,

        matchesLaunchState:
          decoded.address ===
          state.metadata,

        matchesDerivedPda:
          decoded.address ===
          metadataPda.toBase58()
      };
    } catch {
      return null;
    }
  }

  private vaultsFromState(
    mint: PublicKey,
    state: MoonzLaunchState
  ): MoonzVaults {
    const derivedKeys =
      deriveMoonzAddresses(
        mint
      );

    const derived:
      MoonzDerivedVaults = {
        launchState:
          derivedKeys.launchState
            .toBase58(),

        saleVault:
          derivedKeys.saleVault
            .toBase58(),

        lpVault:
          derivedKeys.lpVault
            .toBase58(),

        treasuryWsolVault:
          derivedKeys.treasuryWsolVault
            .toBase58(),

        treasuryUsdcVault:
          derivedKeys.treasuryUsdcVault
            .toBase58(),

        escrowSolVault:
          derivedKeys.escrowSolVault
            .toBase58()
      };

    const stored:
      MoonzDerivedVaults = {
        launchState:
          state.address,

        saleVault:
          state.saleVault,

        lpVault:
          state.lpVault,

        treasuryWsolVault:
          state.treasuryWsolVault,

        treasuryUsdcVault:
          state.treasuryUsdcVault,

        escrowSolVault:
          state.escrowSolVault
      };

    return {
      stored,
      derived
    };
  }

  public async getVaults(
    mint: MoonzAddress
  ): Promise<MoonzVaults | null> {
    const mintKey =
      asPublicKey(mint);

    const state =
      await this.getLaunchState(
        mintKey
      );

    if (!state) {
      return null;
    }

    return this.vaultsFromState(
      mintKey,
      state
    );
  }

  private async inspectTokenAccount(
    address: string
  ): Promise<MoonzTokenAccountInfo | null> {
    const key =
      new PublicKey(address);

    const response =
      await this.connection
        .getParsedAccountInfo(
          key,
          this.commitment
        );

    const value =
      response.value;

    if (!value) {
      return null;
    }

    const parsedData: any =
      value.data as any;

    const info =
      parsedData?.parsed?.info;

    if (
      !info ||
      !info.tokenAmount
    ) {
      return null;
    }

    const raw =
      String(
        info.tokenAmount.amount
      );

    const decimals =
      Number(
        info.tokenAmount.decimals
      );

    return {
      address,

      runtimeOwner:
        value.owner.toBase58(),

      mint:
        String(info.mint),

      authority:
        String(info.owner),

      amount:
        amount(
          raw,
          decimals
        )
    };
  }

  private async reservesFromState(
    state: MoonzLaunchState
  ): Promise<MoonzReserves> {
    const [
      saleTokens,
      lpTokens,
      wsol,
      usdc,
      escrowLamports
    ] = await Promise.all([
      this.inspectTokenAccount(
        state.saleVault
      ),

      this.inspectTokenAccount(
        state.lpVault
      ),

      this.inspectTokenAccount(
        state.treasuryWsolVault
      ),

      this.inspectTokenAccount(
        state.treasuryUsdcVault
      ),

      this.connection.getBalance(
        new PublicKey(
          state.escrowSolVault
        ),
        this.commitment
      )
    ]);

    return {
      saleTokens,
      lpTokens,
      wsol,
      usdc,

      escrowSol:
        amount(
          String(
            escrowLamports
          ),
          9
        )
    };
  }

  public async getReserves(
    mint: MoonzAddress
  ): Promise<MoonzReserves | null> {
    const state =
      await this.getLaunchState(
        mint
      );

    if (!state) {
      return null;
    }

    return this.reservesFromState(
      state
    );
  }

  private integrityFor(
    mint: PublicKey,
    state: MoonzLaunchState,
    vaults: MoonzVaults,
    reserves: MoonzReserves
  ): MoonzIntegrity {
    const launchState =
      state.address;

    const tokenAccounts = [
      reserves.saleTokens,
      reserves.lpTokens,
      reserves.wsol,
      reserves.usdc
    ];

    const tokenProgramOwners =
      tokenAccounts.every(
        (account) =>
          account !== null &&
          account.runtimeOwner ===
            TOKEN_PROGRAM_ID.toBase58()
      );

    const vaultAuthorities =
      tokenAccounts.every(
        (account) =>
          account !== null &&
          account.authority ===
            launchState
      );

    const vaultMints =
      reserves.saleTokens !== null &&
      reserves.lpTokens !== null &&
      reserves.wsol !== null &&
      reserves.usdc !== null &&

      reserves.saleTokens.mint ===
        mint.toBase58() &&

      reserves.lpTokens.mint ===
        mint.toBase58() &&

      reserves.wsol.mint ===
        WSOL_MINT.toBase58() &&

      reserves.usdc.mint ===
        USDC_MINT.toBase58();

    const integrity:
      Omit<MoonzIntegrity, "all"> = {
        programOwner: true,

        launchStatePda:
          state.address ===
          vaults.derived.launchState,

        saleVaultPda:
          vaults.stored.saleVault ===
          vaults.derived.saleVault,

        lpVaultPda:
          vaults.stored.lpVault ===
          vaults.derived.lpVault,

        treasuryWsolPda:
          vaults.stored
            .treasuryWsolVault ===
          vaults.derived
            .treasuryWsolVault,

        treasuryUsdcPda:
          vaults.stored
            .treasuryUsdcVault ===
          vaults.derived
            .treasuryUsdcVault,

        escrowSolPda:
          vaults.stored
            .escrowSolVault ===
          vaults.derived
            .escrowSolVault,

        tokenProgramOwners,
        vaultAuthorities,
        vaultMints
      };

    return {
      ...integrity,

      all:
        Object.values(
          integrity
        ).every(Boolean)
    };
  }

  public async getToken(
    mint: MoonzAddress
  ): Promise<MoonzTokenInfo | null> {
    let mintKey: PublicKey;

    try {
      mintKey =
        asPublicKey(mint);
    } catch {
      return null;
    }

    const state =
      await this.getLaunchState(
        mintKey
      );

    if (!state) {
      return null;
    }

    const vaults =
      this.vaultsFromState(
        mintKey,
        state
      );

    const [
      reserves,
      supplyResponse,
      metadata
    ] = await Promise.all([
      this.reservesFromState(
        state
      ),

      this.connection.getTokenSupply(
        mintKey,
        this.commitment
      ),

      this.getMetadata(
        mintKey
      )
    ]);

    const total =
      amount(
        supplyResponse.value.amount,
        supplyResponse.value.decimals
      );

    const saleRaw =
      state.saleSupplyRaw;

    const soldRaw =
      state.tokensSoldRaw;

    const remainingBig =
      BigInt(saleRaw) >
      BigInt(soldRaw)
        ? BigInt(saleRaw) -
          BigInt(soldRaw)
        : 0n;

    const supply:
      MoonzSupply = {
        total,

        saleRaw,
        soldRaw,

        remainingRaw:
          remainingBig.toString(),

        bondingProgress:
          percentage(
            soldRaw,
            saleRaw
          )
      };

    const integrity =
      this.integrityFor(
        mintKey,
        state,
        vaults,
        reserves
      );

    return {
      mint:
        mintKey.toBase58(),

      creator:
        state.creator,

      phase:
        state.phase,

      phaseCode:
        state.phaseCode,

      quoteAsset:
        state.quoteAsset,

      quoteAssetCode:
        state.quoteAssetCode,

      launchState:
        state,

      metadata,

      vaults,
      reserves,
      supply,

      switching: {
        active:
          state.phase ===
          "SWITCHING",

        currentQuoteAsset:
          state.quoteAsset,

        pendingQuoteAsset:
          state.pendingQuoteAsset,

        startedAt:
          state.switchStartedTimestamp,

        lastCompletedAt:
          state.lastPoolSwitchTimestamp,

        feeEscrowedLamports:
          state.switchFeeEscrowedLamports,

        amountInRaw:
          state.switchAmountInRaw,

        minAmountOutRaw:
          state.switchMinAmountOutRaw,

        swapExecuted:
          state.switchSwapExecuted
      },

      timestamps: {
        lastTrade:
          state.lastTradeTimestamp
      },

      integrity,

      programId:
        MOONZ_PROGRAM_ID
          .toBase58()
    };
  }
}
