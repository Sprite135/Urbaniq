import { apiSlice } from '@/app/apiSlice';

export interface Coupon {
  couponId: number;
  code: string;
  discountType: number;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  usesCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  applicableCategoryIds: number[];
  applicableProductIds: string[];
  isValid: boolean;
  discountAmount: number;
}

export interface UserCouponHistory {
  couponCode: string;
  discountAmount: number;
  usedAt: string;
  orderId: string;
}

export const couponApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAvailableCoupons: builder.query<Coupon[], { cartTotal: number }>({
      query: ({ cartTotal }) => `/Coupons/available?cartTotal=${cartTotal}`,
      providesTags: ['Coupon'],
    }),
    getUserCouponHistory: builder.query<UserCouponHistory[], void>({
      query: () => '/Coupons/history',
      providesTags: ['Coupon'],
    }),
  }),
});

export const {
  useGetAvailableCouponsQuery,
  useGetUserCouponHistoryQuery,
} = couponApiSlice;