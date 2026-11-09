export type PaymentWebhookInput = {
    event: "payment.succeeded" | "payment.failed" | string;
    orderId: number;
    providerPaymentId?: string;
    amount?: number;
    failureReason?: string;
    metadata?: Record<string, any>;
};

