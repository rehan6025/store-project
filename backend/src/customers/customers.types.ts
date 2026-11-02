export type CustomerJwtPayload = {
    sub: number;       // customer.id
    email: string;
    storeId: number;   // store this customer belongs to
    role: "CUSTOMER";
};

export type CustomerAuthResponse = {
    accessToken: string;
    customer: {
        id: number;
        storeId: number;
        name: string;
        email: string;
        phone: string;
        address: string;
    };
};

export type LoginCustomerInput = {
    email: string;
    password: string;
};