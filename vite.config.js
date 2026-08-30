import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ⚠️ GitHub Pagesで公開する場合、ここをあなたのリポジトリ名に合わせて変更してください。
// 例: リポジトリ名が "nitorol-log" なら "/nitorol-log/" のままでOKです。
// 例: リポジトリ名が "my-app" なら "/my-app/" に変更してください。
const REPO_NAME = "nitorol-log";

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-64.png"],
      manifest: {
        name: "ニトロール服用記録",
        short_name: "ニトロール記録",
        description: "ニトログリセリンスプレーの服用状況を記録し、通院時にまとめて共有するためのアプリ",
        theme_color: "#173F3F",
        background_color: "#F6F4EF",
        display: "standalone",
        orientation: "portrait",
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
        lang: "ja",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
});
