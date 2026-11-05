import type { NextConfig } from "next";

import { getAuthSecret } from "./src/lib/session-config";

getAuthSecret();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
