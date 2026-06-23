import type { NextConfig } from "next";

// Windows開発環境でのSSL証明書検証エラーを回避
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {};

export default nextConfig;
