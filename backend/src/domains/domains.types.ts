export type ResolvedStore = {
    storeId: number;
    storeSlug: string;
    storeName: string;
    hostname: string;
};

export type CreateDomainInput = {
    hostname: string;
};
