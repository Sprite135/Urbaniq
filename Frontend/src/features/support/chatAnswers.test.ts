import { describe, expect, it } from 'vitest';
import { getChatAnswer } from './chatAnswers';

describe('respuestas del asistente', () => {
  it('usa las tarifas configuradas y no promete un plazo de entrega', () => {
    const answer = getChatAnswer('¿Cuánto cuesta el envío?', { limaMetropolitanaFee: 15, provinceFee: 30, freeShippingThreshold: 300 });
    expect(answer.text).toContain('15.00');
    expect(answer.text).toContain('30.00');
    expect(answer.text).toContain('300.00');
    expect(answer.text).toContain('Confirma la cobertura');
  });
  it('no inventa tarifas sin configuración ni confirma pagos', () => {
    expect(getChatAnswer('envíos').text).not.toContain('S/');
    expect(getChatAnswer('ya pagué por Yape').text).toContain('pendiente de revisión');
  });
  it('deriva consultas desconocidas en lugar de inventar respuestas', () => {
    expect(getChatAnswer('¿Quién fabricó la placa del modelo ZZ999?').text).toContain('no tengo una respuesta específica');
  });
  it('no solicita claves y prioriza devoluciones frente a pedidos', () => {
    expect(getChatAnswer('mi contraseña').link?.to).toBe('/forgot-password');
    expect(getChatAnswer('quiero cancelar mi pedido').link?.to).toBe('/help#returns');
  });
});
