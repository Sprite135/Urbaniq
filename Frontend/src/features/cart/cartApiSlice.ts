import { apiSlice } from '@/app/apiSlice';

export interface CartItem {
  cartItemId: string;
  productId: string;
  productVariantId: string;
  productName: string;
  image: string;
  size: string;
  color: string;
  price: number;
  discount: number;
  quantity: number;
  totalPrice: number;
  slug?: string;
  deliveryCode?: string;
}

export interface CartResponse {
  cartId: string;
  items: CartItem[];
  totalPrice: number;
  totalDiscount: number;
  totalCount: number;
  finalAmount: number;
  couponCode?: string;
  couponDiscount?: number;
}

interface AddToCartRequest {
  productId: string;
  productVariantId: string;
  quantity: number;
  deliveryCode: string;
}

export const cartApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<CartResponse, void>({
      query: () => '/Cart',
      providesTags: ['Cart'],
    }),

    addToCart: builder.mutation<void, AddToCartRequest>({
      query: (body) => ({
        url: '/Cart/add',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),

    removeFromCart: builder.mutation<void, string>({
      query: (cartItemId) => ({
        url: `/Cart/${cartItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    increaseQuantity: builder.mutation<void, { cartItemId: string; delta?: number }>({
      query: ({ cartItemId, delta = 1 }) => ({
        url: `/Cart/increase/${cartItemId}?delta=${delta}`,
        method: 'PUT',
      }),
      invalidatesTags: ['Cart'],
    }),

    decreaseQuantity: builder.mutation<void, { cartItemId: string; delta?: number }>({
      query: ({ cartItemId, delta = 1 }) => ({
        url: `/Cart/decrease/${cartItemId}?delta=${delta}`,
        method: 'PUT',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useRemoveFromCartMutation,
  useIncreaseQuantityMutation,
  useDecreaseQuantityMutation,
} = cartApiSlice;
