/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 桌面端唯一交付形态：静态导出到 out/，由 Electron 通过 app:// 协议加载
  output: "export"
};

export default nextConfig;
