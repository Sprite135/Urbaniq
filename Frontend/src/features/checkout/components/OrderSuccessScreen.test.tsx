import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/test-utils';
import OrderSuccessScreen from './OrderSuccessScreen';

describe('confirmación de transferencia', () => {
  it('mantiene el pago pendiente y abre el tracker del pedido recién creado', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OrderSuccessScreen orderId="new-order" paymentMethod="yape" cart={{ cartId: 'cart-1', items: [], totalPrice: 100, totalDiscount: 0, totalCount: 0, finalAmount: 100 }} />} />
        <Route path="/orders/new-order" element={<div>Seguimiento del pedido creado</div>} />
      </Routes>,
    );
    expect(screen.getByText(/el pago está pendiente/)).toBeInTheDocument();
    expect(screen.queryByText('¡Pago exitoso!')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Seguir mi pedido' }));
    expect(screen.getByText('Seguimiento del pedido creado')).toBeInTheDocument();
  });
});
