import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Ahmed_Zain_GIS",
  assetPrefix: "/Ahmed_Zain_GIS",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
