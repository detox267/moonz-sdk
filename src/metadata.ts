import {
  PublicKey
} from "@solana/web3.js";

import {
  TOKEN_METADATA_PROGRAM_ID
} from "./constants";

export interface MoonzTokenMetadata {
  address: string;

  runtimeOwner: string;

  updateAuthority: string;
  mint: string;

  name: string;
  symbol: string;
  uri: string;

  sellerFeeBasisPoints: number;

  primarySaleHappened: boolean | null;
  mutable: boolean | null;

  validOwner: boolean;
  validMint: boolean;
}

class Cursor {
  private offset = 0;

  public constructor(
    private readonly data: Buffer
  ) {}

  public remaining(): number {
    return this.data.length -
      this.offset;
  }

  public u8(): number {
    this.ensure(1);

    const value =
      this.data.readUInt8(
        this.offset
      );

    this.offset += 1;

    return value;
  }

  public u16(): number {
    this.ensure(2);

    const value =
      this.data.readUInt16LE(
        this.offset
      );

    this.offset += 2;

    return value;
  }

  public u32(): number {
    this.ensure(4);

    const value =
      this.data.readUInt32LE(
        this.offset
      );

    this.offset += 4;

    return value;
  }

  public publicKey(): PublicKey {
    this.ensure(32);

    const value =
      new PublicKey(
        this.data.subarray(
          this.offset,
          this.offset + 32
        )
      );

    this.offset += 32;

    return value;
  }

  public string(): string {
    const length =
      this.u32();

    this.ensure(length);

    const value =
      this.data
        .subarray(
          this.offset,
          this.offset + length
        )
        .toString("utf8");

    this.offset += length;

    return value
      .replace(/\0+$/g, "")
      .trim();
  }

  public skip(
    bytes: number
  ): void {
    this.ensure(bytes);
    this.offset += bytes;
  }

  private ensure(
    bytes: number
  ): void {
    if (
      bytes < 0 ||
      this.offset + bytes >
        this.data.length
    ) {
      throw new Error(
        "Invalid Metaplex metadata account data"
      );
    }
  }
}

function skipCreators(
  cursor: Cursor
): void {
  const option =
    cursor.u8();

  if (option === 0) {
    return;
  }

  if (option !== 1) {
    throw new Error(
      "Invalid creators option"
    );
  }

  const count =
    cursor.u32();

  /*
   * Each Metaplex creator:
   *
   * address 32
   * verified 1
   * share 1
   */
  const creatorSize = 34;

  cursor.skip(
    count * creatorSize
  );
}

export function decodeMetaplexMetadata(
  address: PublicKey,
  runtimeOwner: PublicKey,
  expectedMint: PublicKey,
  data: Buffer
): MoonzTokenMetadata {
  const cursor =
    new Cursor(data);

  /*
   * First byte is Metadata key enum.
   * We don't depend on a particular numeric
   * variant here because the runtime owner,
   * PDA and embedded mint are independently
   * verified by the SDK.
   */
  cursor.u8();

  const updateAuthority =
    cursor.publicKey();

  const mint =
    cursor.publicKey();

  const name =
    cursor.string();

  const symbol =
    cursor.string();

  const uri =
    cursor.string();

  const sellerFeeBasisPoints =
    cursor.u16();

  skipCreators(cursor);

  const primarySaleHappened =
    cursor.remaining() >= 1
      ? cursor.u8() !== 0
      : null;

  const mutable =
    cursor.remaining() >= 1
      ? cursor.u8() !== 0
      : null;

  return {
    address:
      address.toBase58(),

    runtimeOwner:
      runtimeOwner.toBase58(),

    updateAuthority:
      updateAuthority.toBase58(),

    mint:
      mint.toBase58(),

    name,
    symbol,
    uri,

    sellerFeeBasisPoints,

    primarySaleHappened,
    mutable,

    validOwner:
      runtimeOwner.equals(
        TOKEN_METADATA_PROGRAM_ID
      ),

    validMint:
      mint.equals(
        expectedMint
      )
  };
}
