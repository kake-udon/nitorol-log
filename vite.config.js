import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Netlifyなどのプロジェクト専用ドメイン(例: nitorol-log.netlify.app)はルート("/")で
// 公開されるため、サブパスは不要。他のPWAと同じオリジンを共有しないことがAndroidで
// 独立アプリとしてインストールできるための前提になる。

export default defineConfig({
  base: "/",
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
        id: "/",
        start_url: "/",
        scope: "/",
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
