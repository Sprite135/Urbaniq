import type { MerchantOfflineMethod } from './paymentApiSlice';

export const isMerchantPaymentConfigured = (method?: MerchantOfflineMethod): boolean =>
  Boolean(method?.ownerName?.trim() && /^9\d{8}$/.test((method?.phone ?? '').replace(/^\+51\s*/, '').replace(/\s/g, '')));
