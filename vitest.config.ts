import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // الملفات بالتتابع + مهلة أوسع عشان الاختبارات ماتتقلبش تحت الحمل
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
