type YapeTokenResponse = { id?: string };

type MercadoPagoInstance = {
  yape: (options: { phoneNumber: string; otp: string }) => {
    create: () => Promise<YapeTokenResponse>;
  };
};
type MercadoPagoConstructor = new (publicKey: string) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

let sdkPromise: Promise<void> | undefined;

const loadSdk = async (): Promise<void> => {
  if (window.MercadoPago) return;
  sdkPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mercadopago-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar MercadoPago.js.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.dataset.mercadopagoSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar MercadoPago.js.'));
    document.head.appendChild(script);
  });
  await sdkPromise;
};

export const createYapeSandboxToken = async (publicKey: string, phoneNumber: string, otp: string): Promise<string> => {
  await loadSdk();
  if (!window.MercadoPago) throw new Error('MercadoPago.js no está disponible.');
  const mercadoPago = new window.MercadoPago(publicKey);
  const result = await mercadoPago.yape({ phoneNumber, otp }).create();
  if (!result.id) throw new Error('Mercado Pago no devolvió un token de Yape.');
  return result.id;
};
