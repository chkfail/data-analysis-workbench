const isElectronBuild = process.env.ELECTRON_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Electron 打包用静态导出（输出到 out/），Docker 部署仍用 standalone
  output: isElectronBuild ? "export" : "standalone",
  // file:// 协议下加载静态资源必须用相对路径
  assetPrefix: isElectronBuild ? "./" : undefined
};

export default nextConfig;
