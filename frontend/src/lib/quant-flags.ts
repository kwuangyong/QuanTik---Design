// Feature flag for the redesigned Quant reader (G2/G3). On by default since batch 5; set NEXT_PUBLIC_QUANT_READER_V2=0 (or false/off) at build time to fall back to the legacy reader.
// Next.js inlines NEXT_PUBLIC_* only for literal property access, so keep the direct reference.
export const quantReaderV2Enabled = (): boolean => !/^(0|false|off)$/i.test((process.env.NEXT_PUBLIC_QUANT_READER_V2 ?? '').trim());
