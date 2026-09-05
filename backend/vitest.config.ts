import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true, // Allows describe, it, expect without importing
        root: "./",
        environment: "node",
        include: ["src/**/*.spec.ts"],
    },
    plugins: [
        // This is the "secret sauce" for NestJS decorators
        swc.vite({
            jsc: {
                parser: {
                    syntax: "typescript",
                    decorators: true,
                },
                transform: {
                    legacyDecorator: true,
                    decoratorMetadata: true,
                },
            },
        }),
    ],
});
