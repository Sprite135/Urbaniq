import { describe, expect, it } from 'vitest';
import { calculateShippingCost, resolveZone } from './deliveryHelper';

describe('costos de entrega', () => {
  it.each([['Lima', 'Lima'], ['Callao', 'Callao'], [' lima ', ' callao ']])(
    'incluye %s/%s en la zona metropolitana', (department, province) => {
      expect(resolveZone(department, province)).toBe('LimaMetropolitana');
    },
  );
  it('mantiene las provincias fuera de la zona metropolitana', () => {
    expect(resolveZone('Lima', 'Huaral')).toBe('Provincias');
    expect(resolveZone('Arequipa', 'Arequipa')).toBe('Provincias');
  });
  it('aplica las tarifas configuradas y el umbral de envío gratis', () => {
    const settings = { limaMetropolitanaFee: 12, provinceFee: 25, freeShippingThreshold: 500 };
    expect(calculateShippingCost('LimaMetropolitana', 200, settings)).toBe(12);
    expect(calculateShippingCost('Provincias', 200, settings)).toBe(25);
    expect(calculateShippingCost('Provincias', 500, settings)).toBe(0);
  });
});
