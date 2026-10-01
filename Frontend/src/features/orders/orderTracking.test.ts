import { describe, expect, it } from 'vitest';
import { getTrackingStepIndex, getOrderStatusLabel, getPaymentStatusLabel } from './orderTracking';

describe('seguimiento de pedidos', () => {
  it.each([['Pending', 0], ['Processing', 1], ['Shipped', 2], ['Delivered', 3]])(
    'ubica el estado del servidor %s en el paso %i', (status, index) => {
      expect(getTrackingStepIndex(status)).toBe(index);
    },
  );
  it.each(['Cancelled', 'ReturnRequested', 'ReplacementRequested', 'Returned', 'RefundInitiated', 'Refunded', 'Unknown'])(
    'no presenta %s como un pedido pendiente', (status) => {
      expect(getTrackingStepIndex(status)).toBe(-1);
      expect(getOrderStatusLabel(status)).not.toBe('Pendiente');
    },
  );
  it('traduce estados sin distinguir mayúsculas', () => {
    expect(getOrderStatusLabel('SHIPPED')).toBe('Enviado');
    expect(getOrderStatusLabel('ReturnRequested')).toBe('Devolución solicitada');
  });
  it('no muestra una orden impaga como pagada', () => {
    expect(getPaymentStatusLabel(false, 'Pending')).toBe('Pago pendiente');
    expect(getPaymentStatusLabel(undefined, 'Processing')).toBe('Pago pendiente');
    expect(getPaymentStatusLabel(true, 'Processing')).toBe('Pago confirmado');
    expect(getPaymentStatusLabel(true, 'Refunded')).toBe('Reembolsado');
  });
});
