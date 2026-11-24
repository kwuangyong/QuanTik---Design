import type { NextConfig } from "next";
import path from "node:path";
const config:NextConfig={
  reactStrictMode:true,
  output:"standalone",
  outputFileTracingRoot:path.resolve(process.cwd(), ".."),
  outputFileTracingIncludes:{"/phai-sinh/desk/*":["./private/derivatives/**/*"]},
  poweredByHeader:false,
};
export default config;
