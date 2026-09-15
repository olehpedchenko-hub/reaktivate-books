import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Self-signed cert on the demo API: proxy it so the browser never talks to
// tdd.demo.reaktivate.com directly and no host name lives in application code.
export default defineConfig({
  plugins: [react()],
  // Pinned to match tsconfig's target explicitly, rather than relying on
  // Vite/esbuild's own default: this is native ES2022 classes, so
  // `class X extends Error` keeps a real prototype chain and `instanceof`
  // is reliable for the HttpClientError hierarchy. esbuild refuses outright
  // to downlevel class syntax below ES2015 (it errors, it doesn't silently
  // emit the broken constructor-function pattern tsc itself used to), so
  // there's no silent-breakage path through this build tool either way.
  build: {
    target: "es2022",
  },
  server: {
    proxy: {
      "/api": {
        target: "https://tdd.demo.reaktivate.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
});
