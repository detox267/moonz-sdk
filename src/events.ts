import {
  BorshCoder,
  EventParser,
  type Idl
} from "@coral-xyz/anchor";

import {
  PublicKey
} from "@solana/web3.js";

import idlJson from "../idl/moonz_launchpad.json";

import {
  MOONZ_PROGRAM_ID
} from "./constants";

import type {
  MoonzDecodedEvent,
  MoonzEventCategory,
  MoonzEventContext,
  MoonzEventDataValue,
  MoonzEventType,
  MoonzQuoteAsset,
  MoonzTradeMarket,
  MoonzTradeSide
} from "./types";

const IDL =
  idlJson as unknown as Idl;

const CODER =
  new BorshCoder(IDL);

export const MOONZ_EVENT_NAMES =
  [
    "PoolSwitchSwapExecutedEvent",
    "LaunchEscrowFundedEvent",
    "LaunchEscrowRefundedEvent",
    "CreatedTxn",
    "BuyEvent",
    "SellEvent",
    "ClaimFeesEvent",
    "AmmBuyEvent",
    "AmmSellEvent",
    "MigratedEvent",
    "PoolSwitchStartedEvent",
    "PoolSwitchCancelledEvent",
    "PoolSwitchCompletedEvent"
  ] as const;

type RawMoonzEventName =
  typeof MOONZ_EVENT_NAMES[number];

interface EventMapping {
  type: MoonzEventType;
  category: MoonzEventCategory;

  market?: MoonzTradeMarket;
  side?: MoonzTradeSide;
}

const EVENT_MAP:
  Record<
    RawMoonzEventName,
    EventMapping
  > = {
    PoolSwitchSwapExecutedEvent: {
      type:
        "POOL_SWITCH_SWAP_EXECUTED",
      category:
        "POOL_SWITCH"
    },

    LaunchEscrowFundedEvent: {
      type:
        "LAUNCH_ESCROW_FUNDED",
      category:
        "ESCROW"
    },

    LaunchEscrowRefundedEvent: {
      type:
        "LAUNCH_ESCROW_REFUNDED",
      category:
        "ESCROW"
    },

    CreatedTxn: {
      type:
        "TOKEN_CREATED",
      category:
        "CREATE"
    },

    BuyEvent: {
      type:
        "BONDING_BUY",
      category:
        "BUY",
      market:
        "BONDING",
      side:
        "BUY"
    },

    SellEvent: {
      type:
        "BONDING_SELL",
      category:
        "SELL",
      market:
        "BONDING",
      side:
        "SELL"
    },

    ClaimFeesEvent: {
      type:
        "FEES_CLAIMED",
      category:
        "FEES"
    },

    AmmBuyEvent: {
      type:
        "AMM_BUY",
      category:
        "BUY",
      market:
        "AMM",
      side:
        "BUY"
    },

    AmmSellEvent: {
      type:
        "AMM_SELL",
      category:
        "SELL",
      market:
        "AMM",
      side:
        "SELL"
    },

    MigratedEvent: {
      type:
        "MIGRATED",
      category:
        "MIGRATION"
    },

    PoolSwitchStartedEvent: {
      type:
        "POOL_SWITCH_STARTED",
      category:
        "POOL_SWITCH"
    },

    PoolSwitchCancelledEvent: {
      type:
        "POOL_SWITCH_CANCELLED",
      category:
        "POOL_SWITCH"
    },

    PoolSwitchCompletedEvent: {
      type:
        "POOL_SWITCH_COMPLETED",
      category:
        "POOL_SWITCH"
    }
  };

function isKnownEvent(
  name: string
): name is RawMoonzEventName {
  return Object.prototype
    .hasOwnProperty.call(
      EVENT_MAP,
      name
    );
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

function field(
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

function publicKeyString(
  value: any
): string | undefined {
  if (value === undefined ||
      value === null) {
    return undefined;
  }

  if (value instanceof PublicKey) {
    return value.toBase58();
  }

  if (
    typeof value?.toBase58 ===
    "function"
  ) {
    return value.toBase58();
  }

  if (typeof value === "string") {
    try {
      return new PublicKey(
        value
      ).toBase58();
    } catch {
      return value;
    }
  }

  return undefined;
}

function numericCode(
  value: any
): number | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === "number"
  ) {
    return value;
  }

  if (
    typeof value === "bigint"
  ) {
    return Number(value);
  }

  if (
    typeof value?.toString ===
    "function"
  ) {
    const parsed =
      Number(
        value.toString()
      );

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  return undefined;
}

function jsonSafeScalar(
  value: any
): MoonzEventDataValue {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value === "bigint"
  ) {
    return value.toString();
  }

  if (value instanceof PublicKey) {
    return value.toBase58();
  }

  if (
    typeof value?.toBase58 ===
    "function"
  ) {
    return value.toBase58();
  }

  /*
   * Anchor integer values such as
   * u64/u128/i64 are generally BN.
   */
  if (
    value?.constructor?.name ===
      "BN" &&
    typeof value.toString ===
      "function"
  ) {
    return value.toString();
  }

  if (
    typeof value?.toString ===
    "function"
  ) {
    return value.toString();
  }

  return String(value);
}

function jsonSafeData(
  data: any
): Record<
  string,
  MoonzEventDataValue
> {
  const output:
    Record<
      string,
      MoonzEventDataValue
    > = {};

  if (!data ||
      typeof data !== "object") {
    return output;
  }

  for (
    const [name, value]
    of Object.entries(data)
  ) {
    output[name] =
      jsonSafeScalar(value);
  }

  return output;
}

function normalizeEvent(
  rawName: RawMoonzEventName,
  rawData: any,
  context: MoonzEventContext
): MoonzDecodedEvent {
  const mapping =
    EVENT_MAP[rawName];

  const quoteAssetCode =
    numericCode(
      field(
        rawData,
        "quote_asset",
        "quoteAsset"
      )
    );

  const timestamp =
    numericCode(
      field(
        rawData,
        "timestamp"
      )
    );

  const event:
    MoonzDecodedEvent = {
      type:
        mapping.type,

      category:
        mapping.category,

      rawName,

      data:
        jsonSafeData(
          rawData
        ),

      signature:
        context.signature,

      slot:
        context.slot,

      blockTime:
        context.blockTime
    };

  const mint =
    publicKeyString(
      field(
        rawData,
        "mint"
      )
    );

  const creator =
    publicKeyString(
      field(
        rawData,
        "creator"
      )
    );

  const user =
    publicKeyString(
      field(
        rawData,
        "user"
      )
    );

  const executor =
    publicKeyString(
      field(
        rawData,
        "executor"
      )
    );

  const feeMint =
    publicKeyString(
      field(
        rawData,
        "fee_mint",
        "feeMint"
      )
    );

  if (mint !== undefined) {
    event.mint = mint;
  }

  if (creator !== undefined) {
    event.creator = creator;
  }

  if (user !== undefined) {
    event.user = user;
  }

  if (executor !== undefined) {
    event.executor = executor;
  }

  if (feeMint !== undefined) {
    event.feeMint = feeMint;
  }

  if (
    quoteAssetCode !== undefined
  ) {
    event.quoteAssetCode =
      quoteAssetCode;

    event.quoteAsset =
      quoteAssetFromCode(
        quoteAssetCode
      );
  }

  if (
    timestamp !== undefined
  ) {
    event.timestamp =
      timestamp;
  }

  if (mapping.market) {
    event.market =
      mapping.market;
  }

  if (mapping.side) {
    event.side =
      mapping.side;
  }

  return event;
}

export function parseMoonzLogs(
  logs: string[],
  context: MoonzEventContext = {}
): MoonzDecodedEvent[] {
  const parser =
    new EventParser(
      MOONZ_PROGRAM_ID,
      CODER
    );

  const output:
    MoonzDecodedEvent[] = [];

  for (
    const event
    of parser.parseLogs(logs)
  ) {
    if (
      !isKnownEvent(
        event.name
      )
    ) {
      continue;
    }

    const normalized =
      normalizeEvent(
        event.name,
        event.data,
        context
      );

    normalized.eventIndex =
      output.length;

    output.push(
      normalized
    );
  }

  return output;
}
