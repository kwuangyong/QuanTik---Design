// Feature flag for the redesigned Quant reader (G2/G3). Off by default: when off, the current UI is unchanged.
// Next.js inlines NEXT_PUBLIC_* only for literal property access, so keep the direct reference.
export const quantReaderV2Enabled = (): boolean => /^(1|true|on)$/i.test(process.env.NEXT_PUBLIC_QUANT_READER_V2 ?? '');
