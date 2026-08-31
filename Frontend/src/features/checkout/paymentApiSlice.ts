import { apiSlice } from '@/app/apiSlice';

// === Payment DTOs ===

export interface PaymentIntentResponse {
  statusCode: number;
  message: string;
  data: {
    clientSecret: string;
    paymentIntentId: string;
  };
}

interface CreatePaymentIntentRequest {
  amount: number;
}

interface VerifyPaymentRequest {
  paymentIntentId: string;
}

export interface PaymentVerifyResponse {
  statusCode: number;
  message: string;
  data: {
    status: string;
    isSuccessful: boolean;
  };
}

export interface PaymentConfigResponse {
  publishableKey: string;
}

export interface MerchantOfflineMethod {
  phone: string;
  ownerName: string;
  qrImageUrl: string;
}

export interface MerchantMethodsResponse {
  yape: MerchantOfflineMethod;
  plin: MerchantOfflineMethod;
}

export interface UploadVoucherResponse {
  url: string;
}

// === Payment API (Stripe Integration) ===

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** Gets Stripe browser configuration from the backend to avoid frontend/backend key mismatch */
    getPaymentConfig: builder.query<PaymentConfigResponse, void>({
      query: () => '/Payment/config',
    }),

    /** Returns merchant Yape/Plin details (phone, owner, QR) for offline payments */
    getMerchantMethods: builder.query<MerchantMethodsResponse, void>({
      query: () => '/Payment/merchant-methods',
    }),

    /** Uploads a payment voucher image and returns its public URL */
    uploadVoucher: builder.mutation<UploadVoucherResponse, FormData>({
      query: (formData) => ({
        url: '/Payment/upload-voucher',
        method: 'POST',
        body: formData,
      }),
    }),

    /** Creates a Stripe PaymentIntent for the given amount */
    createPaymentIntent: builder.mutation<PaymentIntentResponse, CreatePaymentIntentRequest>({
      query: (body) => ({
        url: '/Payment/create-intent',
        method: 'POST',
        body,
      }),
    }),

    /** Verifies a payment using its PaymentIntent ID */
    verifyPayment: builder.mutation<PaymentVerifyResponse, VerifyPaymentRequest>({
      query: (body) => ({
        url: '/Payment/verify',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetPaymentConfigQuery,
  useGetMerchantMethodsQuery,
  useUploadVoucherMutation,
  useCreatePaymentIntentMutation,
  useVerifyPaymentMutation,
} = paymentApiSlice;
