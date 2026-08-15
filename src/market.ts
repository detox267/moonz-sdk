import {
  MOONZ_MARKET_DECIMAL_PRECISION,
  MOONZ_SOL_DECIMALS,
  MOONZ_TOKEN_DECIMALS,
  MOONZ_VIRTUAL_SOL_LAMPORTS,
  MOONZ_VIRTUAL_TOKEN_RAW
} from "./constants";

import type {
  MoonzAmount,
  MoonzMarketData,
  MoonzTokenInfo
} from "./types";

function pow10(
  decimals: number
): bigint {
  return 10n ** BigInt(decimals);
}

function formatAmount(
  raw: bigint,
  decimals: number
): string {
  const negative = raw < 0n;

  const value =
    negative
      ? -raw
      : raw;

  if (decimals === 0) {
    return raw.toString();
  }

  const base =
    pow10(decimals);

  const whole =
    value / base;

  const fraction =
    (value % base)
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");

  const formatted =
    fraction
      ? `${whole}.${fraction}`
      : whole.toString();

  return negative
    ? `-${formatted}`
    : formatted;
}

function makeAmount(
  raw: bigint,
  decimals: number
): MoonzAmount {
  return {
    raw: raw.toString(),
    decimals,
    ui: formatAmount(
      raw,
      decimals
    )
  };
}

function decimalRatio(
  numerator: bigint,
  denominator: bigint
): string | null {
  if (
    numerator < 0n ||
    denominator <= 0n
  ) {
    return null;
  }

  const whole =
    numerator / denominator;

  const remainder =
    numerator % denominator;

  if (remainder === 0n) {
    return whole.toString();
  }

  const scale =
    pow10(
      MOONZ_MARKET_DECIMAL_PRECISION
    );

  const fraction =
    (
      remainder *
      scale /
      denominator
    )
      .toString()
      .padStart(
        MOONZ_MARKET_DECIMAL_PRECISION,
        "0"
      )
      .replace(/0+$/, "");

  return fraction
    ? `${whole}.${fraction}`
    : whole.toString();
}

function priceRatio(
  quoteRaw: bigint,
  quoteDecimals: number,
  tokenRaw: bigint,
  tokenDecimals: number
) {
  if (
    quoteRaw < 0n ||
    tokenRaw <= 0n
  ) {
    return null;
  }

  return {
    numerator:
      quoteRaw *
      pow10(tokenDecimals),

    denominator:
      tokenRaw *
      pow10(quoteDecimals)
  };
}

function marketCapRatio(
  priceNumerator: bigint,
  priceDenominator: bigint,
  totalSupply: MoonzAmount
) {
  if (priceDenominator <= 0n) {
    return null;
  }

  const supplyRaw =
    BigInt(totalSupply.raw);

  if (supplyRaw < 0n) {
    return null;
  }

  return {
    numerator:
      priceNumerator *
      supplyRaw,

    denominator:
      priceDenominator *
      pow10(
        totalSupply.decimals
      )
  };
}

function unavailable(
  token: MoonzTokenInfo
): MoonzMarketData {
  return {
    mint: token.mint,

    phase: token.phase,
    phaseCode: token.phaseCode,

    market: "UNAVAILABLE",
    priceSource: "UNAVAILABLE",

    tradable: false,

    quoteAsset:
      token.quoteAsset,

    quoteAssetCode:
      token.quoteAssetCode,

    priceQuote: null,
    marketCapQuote: null,

    totalSupply:
      token.supply.total,

    bondingProgress:
      token.supply.bondingProgress,

    virtualQuoteReserve: null,
    virtualTokenReserve: null,

    tokenReserve: null,
    quoteReserve: null,

    integrityAll:
      token.integrity.all
  };
}

export function marketDataFromToken(
  token: MoonzTokenInfo
): MoonzMarketData {
  /*
   * Never expose canonical market data when
   * the full Moonz integrity check failed.
   */
  if (!token.integrity.all) {
    return unavailable(token);
  }

  /*
   * BONDING
   *
   * Immutable program formula:
   *
   * r_sol =
   *   117 SOL + sol_collected
   *
   * r_tok =
   *   760M tokens + remaining sale tokens
   */
  if (token.phase === "BONDING") {
    if (token.quoteAsset !== "SOL") {
      return unavailable(token);
    }

    const quoteRaw =
      BigInt(
        MOONZ_VIRTUAL_SOL_LAMPORTS
      ) +
      BigInt(
        token.launchState
          .solCollectedRaw
      );

    const tokenRaw =
      BigInt(
        MOONZ_VIRTUAL_TOKEN_RAW
      ) +
      BigInt(
        token.supply
          .remainingRaw
      );

    const price =
      priceRatio(
        quoteRaw,
        MOONZ_SOL_DECIMALS,
        tokenRaw,
        MOONZ_TOKEN_DECIMALS
      );

    if (!price) {
      return unavailable(token);
    }

    const cap =
      marketCapRatio(
        price.numerator,
        price.denominator,
        token.supply.total
      );

    if (!cap) {
      return unavailable(token);
    }

    return {
      mint: token.mint,

      phase: token.phase,
      phaseCode: token.phaseCode,

      market: "BONDING",
      priceSource:
        "VIRTUAL_CURVE",

      tradable: true,

      quoteAsset: "SOL",
      quoteAssetCode:
        token.quoteAssetCode,

      priceQuote:
        decimalRatio(
          price.numerator,
          price.denominator
        ),

      marketCapQuote:
        decimalRatio(
          cap.numerator,
          cap.denominator
        ),

      totalSupply:
        token.supply.total,

      bondingProgress:
        token.supply.bondingProgress,

      virtualQuoteReserve:
        makeAmount(
          quoteRaw,
          MOONZ_SOL_DECIMALS
        ),

      virtualTokenReserve:
        makeAmount(
          tokenRaw,
          MOONZ_TOKEN_DECIMALS
        ),

      tokenReserve: null,
      quoteReserve: null,

      integrityAll: true
    };
  }

  /*
   * AMM_LIVE
   *
   * Price comes from the protocol LP token
   * reserve and active quote reserve.
   */
  if (token.phase === "AMM_LIVE") {
    const tokenAccount =
      token.reserves.lpTokens;

    const quoteAccount =
      token.quoteAsset === "SOL"
        ? token.reserves.wsol
        : token.quoteAsset === "USDC"
          ? token.reserves.usdc
          : null;

    if (
      !tokenAccount ||
      !quoteAccount
    ) {
      return unavailable(token);
    }

    const tokenRaw =
      BigInt(
        tokenAccount.amount.raw
      );

    const quoteRaw =
      BigInt(
        quoteAccount.amount.raw
      );

    if (
      tokenRaw <= 0n ||
      quoteRaw <= 0n
    ) {
      return unavailable(token);
    }

    const price =
      priceRatio(
        quoteRaw,
        quoteAccount.amount.decimals,
        tokenRaw,
        tokenAccount.amount.decimals
      );

    if (!price) {
      return unavailable(token);
    }

    const cap =
      marketCapRatio(
        price.numerator,
        price.denominator,
        token.supply.total
      );

    if (!cap) {
      return unavailable(token);
    }

    return {
      mint: token.mint,

      phase: token.phase,
      phaseCode: token.phaseCode,

      market: "AMM",
      priceSource:
        "AMM_RESERVES",

      tradable: true,

      quoteAsset:
        token.quoteAsset,

      quoteAssetCode:
        token.quoteAssetCode,

      priceQuote:
        decimalRatio(
          price.numerator,
          price.denominator
        ),

      marketCapQuote:
        decimalRatio(
          cap.numerator,
          cap.denominator
        ),

      totalSupply:
        token.supply.total,

      bondingProgress:
        token.supply.bondingProgress,

      virtualQuoteReserve: null,
      virtualTokenReserve: null,

      tokenReserve:
        tokenAccount.amount,

      quoteReserve:
        quoteAccount.amount,

      integrityAll: true
    };
  }

  /*
   * PENDING_DEV_BUY
   * SWITCHING
   * CANCELLED
   * UNKNOWN
   */
  return unavailable(token);
}
