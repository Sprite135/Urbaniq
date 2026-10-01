import { describe, expect, it } from 'vitest';
import { isMerchantPaymentConfigured } from './merchantPayment';

describe('configuración de billeteras', () => {
  it('no permite pagar usando datos ausentes o marcadores de configuración', () => {
    expect(isMerchantPaymentConfigured()).toBe(false);
    expect(isMerchantPaymentConfigured({ phone: 'SET_VIA_ENV_OR_DEVELOPMENT_CONFIG', ownerName: 'Urbaniq', qrImageUrl: '/qr.png' })).toBe(false);
    expect(isMerchantPaymentConfigured({ phone: '987654321', ownerName: '', qrImageUrl: '' })).toBe(false);
  });
  it('reconoce un destino configurado con prefijo peruano opcional', () => {
    expect(isMerchantPaymentConfigured({ phone: '+51 987654321', ownerName: 'Comercio', qrImageUrl: '' })).toBe(true);
  });
});
