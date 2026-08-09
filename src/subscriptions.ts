import type {
  MoonzDecodedEvent,
  MoonzWatchEventFilter
} from "./types";

export function matchesMoonzEventFilter(
  event: MoonzDecodedEvent,
  filters?: MoonzWatchEventFilter[]
): boolean {
  if (
    !filters ||
    filters.length === 0
  ) {
    return true;
  }

  for (const filter of filters) {
    if (filter === "ALL") {
      return true;
    }

    if (
      filter === event.type
    ) {
      return true;
    }

    if (
      filter === event.category
    ) {
      return true;
    }

    if (
      filter === "TRADE" &&
      (
        event.category === "BUY" ||
        event.category === "SELL"
      )
    ) {
      return true;
    }
  }

  return false;
}

export function matchesMoonzMintFilter(
  event: MoonzDecodedEvent,
  mints?: Set<string>
): boolean {
  if (
    !mints ||
    mints.size === 0
  ) {
    return true;
  }

  if (!event.mint) {
    return false;
  }

  return mints.has(
    event.mint
  );
}
