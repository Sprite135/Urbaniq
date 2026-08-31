import { apiSlice } from '@/app/apiSlice';

// === Coupon DTOs ===
export interface ValidateCouponRequest {
  code: string;
  cartTotal: number;
  productIds: string[];
  categoryIds: string[];
  userId?: string;
}

export interface CouponValidationResponse {
  isValid: boolean;
  code: string;
  discountAmount: number;
  errorMessage?: string;
}

// === Order DTOs ===

export interface OrderItem {
  orderItemId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  totalAmount: number;
}

export interface Order {
  orderId: string;
  orderDate: string;
  orderStatus: string;
  totalPrice: number;
  transactionId: string;
  paymentMethod: string;
  cancellationReason?: string;
  cancelledAtUtc?: string;
  refundedAtUtc?: string;
  address: {
    addressId: string;
    fullName: string;
    phoneNumber: string;
    postalCode: string;
    houseName: string;
    place: string;
    reference: string;
    landMark: string;
  };
  orderItems: OrderItem[];
  isPaid?: boolean;
  paymentReceiptUrl?: string;
  paymentApprovalCode?: string;
}

export interface CreateOrderRequest {
  addressId: string;
  transactionId: string;
  paymentMethod: 'card' | 'cod' | 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'scotiabank' | 'pagoefectivo';
  invoiceType?: 'Boleta' | 'Factura';
  ruc?: string;
  razonSocial?: string;
  fiscalAddress?: string;
  couponCode?: string;
}

export interface PaginatedOrders {
  items: Order[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

// === Order API ===

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** Places a new order after payment is confirmed */
    placeOrder: builder.mutation<{ message: string; orderId: string }, CreateOrderRequest>({
      query: (body) => ({
        url: '/Order/place-order',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),

    validateDelivery: builder.query<{ canDeliver: boolean }, string>({
      query: (addressId) => `/Order/validate-delivery/${addressId}`,
    }),

    /** Fetches the authenticated user's order history */
    getUserOrders: builder.query<PaginatedOrders, { pageNumber?: number; pageSize?: number }>({
      query: (params) => ({
        url: '/Order/user-orders',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              { type: 'Order' as const, id: 'LIST' },
              ...result.items.map((order) => ({ type: 'Order' as const, id: order.orderId })),
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),

    /** Fetches a single order by its ID */
    getOrderById: builder.query<Order, string>({
      query: (orderId) => `/Order/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: 'Order' as const, id: orderId }],
    }),

    cancelOrder: builder.mutation<{ orderStatus: string; message: string }, { orderId: string; reason: string }>({
      query: ({ orderId, reason }) => ({
        url: `/Order/${orderId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    /** Attaches offline-payment proof (voucher URL and/or Yape/Plin approval code) to an order */
    attachVoucher: builder.mutation<{ message: string }, { orderId: string; url?: string; approvalCode?: string }>({
      query: ({ orderId, url, approvalCode }) => ({
        url: `/Order/${orderId}/voucher`,
        method: 'POST',
        body: { url, approvalCode },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    /** Admin: manually marks an offline order as paid */
    markOrderPaid: builder.mutation<{ message: string }, string>({
      query: (orderId) => ({
        url: `/Order/${orderId}/mark-paid`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    validateCoupon: builder.mutation<CouponValidationResponse, ValidateCouponRequest>({
      query: (body) => ({
        url: '/Coupons/validate',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  usePlaceOrderMutation,
  useValidateDeliveryQuery,
  useLazyValidateDeliveryQuery,
  useGetUserOrdersQuery,
  useGetOrderByIdQuery,
  useCancelOrderMutation,
  useAttachVoucherMutation,
  useMarkOrderPaidMutation,
  useValidateCouponMutation,
} = orderApiSlice;
