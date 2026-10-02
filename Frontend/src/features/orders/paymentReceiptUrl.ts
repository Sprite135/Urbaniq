export const getPaymentReceiptUrl = (path?: string): string | undefined => {
  if (!path || !/^\/uploads\/payments\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(?:png|jpe?g|webp|pdf)$/i.test(path)) return undefined;
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return new URL(path, new URL(apiBase, window.location.origin)).href;
};
