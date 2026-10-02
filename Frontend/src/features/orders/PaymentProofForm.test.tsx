import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentProofForm from './PaymentProofForm';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), attach: vi.fn() }));
vi.mock('@/features/checkout/paymentApiSlice', () => ({ useUploadVoucherMutation: () => [mocks.upload, { isLoading: false }] }));
vi.mock('./orderApiSlice', () => ({ useAttachVoucherMutation: () => [mocks.attach, { isLoading: false }] }));

beforeEach(() => { mocks.upload.mockReset(); mocks.attach.mockReset(); });

describe('comprobantes para pago manual', () => {
  it('rechaza un envío sin comprobante ni referencia', async () => {
    render(<PaymentProofForm orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Adjunta tu comprobante');
    expect(mocks.attach).not.toHaveBeenCalled();
  });

  it('envía el archivo y lo vincula al pedido sin presentar el pago como confirmado', async () => {
    mocks.upload.mockReturnValue({ unwrap: () => Promise.resolve({ url: '/uploads/payments/receipt.png' }) });
    mocks.attach.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<PaymentProofForm orderId="order-1" />);
    await userEvent.upload(screen.getByLabelText('Imagen o PDF del pago'), new File(['receipt'], 'receipt.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(mocks.attach).toHaveBeenCalledWith({ orderId: 'order-1', url: '/uploads/payments/receipt.png', approvalCode: undefined });
    expect(screen.getByRole('status')).toHaveTextContent('Tu pago sigue pendiente de revisión');
  });

  it('reintenta la vinculación sin subir el archivo otra vez si ya se guardó', async () => {
    mocks.upload.mockReturnValue({ unwrap: () => Promise.resolve({ url: '/uploads/payments/receipt.pdf' }) });
    mocks.attach.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('fail')) }).mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<PaymentProofForm orderId="order-1" />);
    await userEvent.upload(screen.getByLabelText('Imagen o PDF del pago'), new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('permite enviar solo una referencia válida del pago', async () => {
    mocks.attach.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<PaymentProofForm orderId="order-1" />);
    await userEvent.type(screen.getByLabelText('Referencia del pago (opcional)'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.attach).toHaveBeenCalledWith({ orderId: 'order-1', url: undefined, approvalCode: '123456' });
  });
});
