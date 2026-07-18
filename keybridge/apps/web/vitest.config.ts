import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/injection/**", "src/app/api/internal/**"],
    },
  },
  resolve: {
    alias: {
      // @ maps to src/ — matches tsconfig paths and Next.js convention
      "@": path.resolve(__dirname, "./src"),
      "@keybridge/security": path.resolve(
        __dirname,
        "../../packages/security/src/index.ts"
      ),
      "@keybridge/validation": path.resolve(
        __dirname,
        "../../packages/validation/src/index.ts"
      ),
    },
  },
});
