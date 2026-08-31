import { apiSlice } from '@/app/apiSlice';
import type { User } from '@/features/auth/authSlice';
import type { Order } from '@/features/orders/orderApiSlice';

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

interface AdminUser extends User {
  isBlocked: boolean;
}

type OrderDetails = Order & {
  userEmail?: string;
};

interface DashboardStats {
  totalRevenue: number;
  totalItemsDelivered: number;
  totalItemsCancelled: number;
  totalProcessingOrders: number;
  totalShippedOrders: number;
  totalCustomers: number;
  lowStockCount: number;
}

interface LowStockProduct {
  id: string;
  productName: string;
  sku: string;
  image: string;
  quantity: number;
}

interface Coupon {
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
}

interface CouponAnalytics {
  couponId: number;
  code: string;
  totalDiscountGiven: number;
  totalUses: number;
  uniqueUsers: number;
  averageOrderValue: number;
  totalRevenueGenerated: number;
  conversionRate: number;
  createdAt: string;
  lastUsedAt?: string;
}

interface UserCouponHistory {
  couponCode: string;
  discountAmount: number;
  usedAt: string;
  orderId: string;
}

interface AvailableCouponSuggestion {
  code: string;
  description: string;
  discountType: number;
  value: number;
  minOrderAmount?: number;
  validUntil: string;
}

interface CouponUsageByPeriod {
  period: string;
  usesCount: number;
  totalDiscount: number;
}

interface CouponPerformance {
  topPerformingCoupons: CouponAnalytics[];
  usageByDay: CouponUsageByPeriod[];
  usageByWeek: CouponUsageByPeriod[];
  usageByMonth: CouponUsageByPeriod[];
  totalDiscountGivenAllTime: number;
  totalCouponsActive: number;
  totalCouponsUsed: number;
}

interface CreateCouponRequest {
  code: string;
  discountType: number;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startDate?: string;
  endDate?: string;
  applicableCategoryIds?: number[];
  applicableProductIds?: string[];
}

interface UpdateCouponRequest {
  discountType?: number;
  value?: number;
  minOrderAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  applicableCategoryIds?: number[];
  applicableProductIds?: string[];
}

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // User Management
    getAllUsers: builder.query<PaginatedResponse<AdminUser>, { pageNumber: number; pageSize: number }>({
      query: (params) => ({
        url: '/Admin/users',
        params,
      }),
      providesTags: ['User'],
    }),
    toggleUserBlockStatus: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `/Admin/users/block-unblock/${userId}`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),

    // Category Management
    createCategory: builder.mutation<{ message: string }, { categoryName: string; description: string; parentCategoryId?: number | null }>({
      query: (body) => ({
        url: '/Admin/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    // Orders Management
    getAllOrders: builder.query<PaginatedResponse<OrderDetails>, { pageNumber: number; pageSize: number; status?: string }>({
      query: (params) => ({
        url: '/Order/all-orders',
        params,
      }),
      providesTags: ['Order'],
    }),
    changeOrderStatus: builder.mutation<{ message: string; orderStatus: string }, { orderId: string; status: string }>({
      query: ({ orderId, status }) => ({
        url: `/Order/change-status/${orderId}`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Order'],
    }),

    // Dashboard Statistics
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/Admin/dashboard-stats',
      providesTags: ['Order', 'User', 'Product'],
    }),
    getLowStockProducts: builder.query<LowStockProduct[], void>({
      query: () => '/Admin/low-stock-products?threshold=10&limit=5',
      providesTags: ['Product'],
    }),

    // Toggle Category Status
    toggleCategoryStatus: builder.mutation<{ message: string; isActive: boolean }, number>({
      query: (categoryId) => ({
        url: `/Admin/categories/${categoryId}/toggle-status`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Category'],
    }),
    // Delete Category
    deleteCategory: builder.mutation<{ message: string }, number>({
      query: (categoryId) => ({
        url: `/Admin/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    // Coupon Management
    getAllCoupons: builder.query<PaginatedResponse<Coupon>, { pageNumber: number; pageSize: number; isActive?: boolean }>({
      query: (params) => ({
        url: '/Coupons',
        params,
      }),
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation<Coupon, CreateCouponRequest>({
      query: (body) => ({
        url: '/Coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    updateCoupon: builder.mutation<Coupon, { couponId: number; data: UpdateCouponRequest }>({
      query: ({ couponId, data }) => ({
        url: `/Coupons/${couponId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Coupon'],
    }),
    deleteCoupon: builder.mutation<{ message: string }, number>({
      query: (couponId) => ({
        url: `/Coupons/${couponId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),

    // Coupon Analytics
    getCouponPerformance: builder.query<CouponPerformance, void>({
      query: () => '/Coupons/analytics/performance',
      providesTags: ['Coupon'],
    }),
    getCouponAnalytics: builder.query<CouponAnalytics, number>({
      query: (couponId) => `/Coupons/${couponId}/analytics`,
      providesTags: ['Coupon'],
    }),

    // User-facing coupon endpoints
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
  useGetAllUsersQuery,
  useToggleUserBlockStatusMutation,
  useCreateCategoryMutation,
  useGetAllOrdersQuery,
  useChangeOrderStatusMutation,
  useGetDashboardStatsQuery,
  useGetLowStockProductsQuery,
  useToggleCategoryStatusMutation,
  useDeleteCategoryMutation,
  useGetAllCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useGetCouponPerformanceQuery,
  useGetCouponAnalyticsQuery,
  useGetAvailableCouponsQuery,
  useGetUserCouponHistoryQuery,
} = adminApiSlice;
