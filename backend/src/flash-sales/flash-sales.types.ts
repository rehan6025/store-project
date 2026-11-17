export type FlashSaleReservationJob = {
    flashSaleId: number;
    customerId: number;
    quantity: number;
    reservationToken: string;
    expiresAt: string;
};

export type FlashSaleExpirationJob = {
    reservationId: number;
    flashSaleId: number;
    quantity: number;
};

export type ReserveResponse = {
    status: "RESERVED";
    reservationToken: string;
    flashSaleId: number;
    quantity: number;
    expiresInSeconds: number;
    expiresAt: string;
};

