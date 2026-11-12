export type CreateFlashSaleInput = {
    productId: number;
    startsAt: string | Date;
    endsAt: string | Date;
    salePrice: number;
    stockLimit: number;
};

