import type { StoreConfigContent } from "../store-config.types.js";

export type PublishConfigInput = {
    schemaVersion?: string;
    contentJson: StoreConfigContent;
};
