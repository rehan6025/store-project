import type { StoreConfigContent } from "../store-config.types.js";

export type SaveDraftInput = {
    schemaVersion?: string;
    contentJson: StoreConfigContent | Record<string, any>;
};