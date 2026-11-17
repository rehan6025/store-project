import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true, // Allows describe, it, expect without importing
        root: "./",
        environment: "node",
        include: ["src/**/*.spec.ts"],
    },
});

