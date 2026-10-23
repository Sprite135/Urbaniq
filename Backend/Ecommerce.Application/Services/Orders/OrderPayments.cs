using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Orders;

public partial class OrderService
{
    public async Task<MercadoPagoCheckoutResponseDto> StartMercadoPagoPaymentAsync(Guid orderId, Guid userId, Uri applicationBaseUri)
    {
        var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        if (order.PaymentMethod != "mercadopago" || order.IsPaid || order.OrderStatus != OrderStatus.Pending || order.PaymentDueAtUtc <= DateTime.UtcNow)
            throw new InvalidOperationException("Este pedido ya no admite un pago con Mercado Pago.");
        var result = await _mercadoPagoService.CreateCheckoutAsync(order.TotalPrice, order.OrderId, applicationBaseUri);
        order.PaymentIntentId = result.PreferenceId;
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
        return result;
    }

    public async Task ConfirmMercadoPagoPaymentAsync(MercadoPagoPaymentDto payment)
    {
        if (!string.Equals(payment.Status, "approved", StringComparison.OrdinalIgnoreCase)) return;
        if (!Guid.TryParse(payment.ExternalReference, out var orderId))
            throw new InvalidOperationException("Mercado Pago devolvió una referencia inválida.");
        var order = await _orderRepo.Query().IgnoreQueryFilters().FirstOrDefaultAsync(o => o.OrderId == orderId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        if (order.PaymentMethod != "mercadopago" || payment.TransactionAmount != order.TotalPrice ||
            !string.Equals(payment.CurrencyId, "PEN", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("El pago no coincide con el pedido.");
        if (order.IsPaid) return;
        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            await _mercadoPagoService.RefundAsync(payment.PaymentId, order.TotalPrice, $"late-mp-payment-{order.OrderId}");
            return;
        }
        order.PaymentIntentId = payment.PaymentId;
        order.IsPaid = true;
        order.PaymentDueAtUtc = null;
        order.OrderStatus = OrderStatus.Processing;
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<ApiResponse<PaymentIntentResponseDto>> StartCardPaymentAsync(Guid orderId, Guid userId)
    {
        var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        if (order.PaymentMethod != "card" || order.IsPaid || order.OrderStatus != OrderStatus.Pending || order.PaymentDueAtUtc <= DateTime.UtcNow)
            throw new InvalidOperationException("Este pedido ya no admite un pago con tarjeta.");
        var result = await _paymentGateway.CreateOrderPaymentIntentAsync(order.TotalPrice, order.OrderId, userId);
        if (result.Data != null)
        {
            order.PaymentIntentId = result.Data.PaymentIntentId;
            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
        }
        return result;
    }

    public async Task ConfirmCardPaymentAsync(Guid orderId, Guid userId, string paymentIntentId)
    {
        var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        if (order.PaymentMethod != "card" || order.PaymentIntentId != paymentIntentId)
            throw new UnauthorizedAccessException("El pago no pertenece a este pedido.");
        var verification = await _paymentGateway.VerifyPaymentAsync(paymentIntentId);
        var payment = verification.Data;
        if (payment == null || !payment.IsSuccessful || payment.AmountReceived != decimal.Round(order.TotalPrice * 100, 0) || payment.Currency != "pen")
            throw new InvalidOperationException("La pasarela aún no confirma el importe de este pedido.");
        await MarkOrderPaidAsync(paymentIntentId);
    }

    private void RestoreStock(Order order)
    {
        if (order.StockRestored) return;
        foreach (var item in order.OrderItems)
        {
            if (item.ProductVariant is not null)
                item.ProductVariant.Quantity += item.Quantity;
            if (item.Product is not null)
            {
                item.Product.Quantity += item.Quantity;
                item.Product.TotalSold = Math.Max(0, item.Product.TotalSold - item.Quantity);
                _productRepo.Update(item.Product);
            }
        }
        order.StockRestored = true;
    }

    public async Task ExpirePendingOrderAsync(Guid orderId)
    {
        var order = await _orderRepo.Query().IgnoreQueryFilters()
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .Include(o => o.OrderItems).ThenInclude(i => i.ProductVariant)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null || order.IsPaid || order.OrderStatus != OrderStatus.Pending || !order.PaymentDueAtUtc.HasValue || order.PaymentDueAtUtc > DateTime.UtcNow) return;
        // Never release a card reservation while the gateway outcome is uncertain.
        if (order.PaymentMethod == "card" && order.PaymentIntentId != null)
        {
            var verified = await _paymentGateway.VerifyPaymentAsync(order.PaymentIntentId);
            if (verified.Data?.IsSuccessful == true)
            {
                await ConfirmCardPaymentAsync(order.OrderId, order.UserId!.Value, order.PaymentIntentId);
                return;
            }
            await _paymentGateway.CancelPaymentAsync(order.PaymentIntentId);
        }
        RestoreStock(order);
        order.OrderStatus = OrderStatus.Cancelled;
        order.CancelledAtUtc = DateTime.UtcNow;
        order.CancellationReason = "La reserva venció sin un pago confirmado.";
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
    }

    // amount is the desired cumulative refund, not an increment. Repeating a request is safe.
    public async Task RefundOrderAsync(Guid orderId, decimal amount, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 1000) throw new ArgumentException("Indica un motivo de hasta 1000 caracteres.");
        var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        if (!order.IsPaid || amount <= 0 || amount > order.TotalPrice || decimal.Round(amount, 2) != amount)
            throw new ArgumentException("El total reembolsado debe estar entre cero y el total pagado, con dos decimales.");
        if (amount <= order.RefundedAmount) return;
        if (order.OrderStatus == OrderStatus.RefundInitiated && order.RefundTargetAmount != amount)
            throw new InvalidOperationException("Finaliza el reembolso pendiente antes de iniciar otro.");
        var delta = amount - order.RefundedAmount;
        if (order.OrderStatus != OrderStatus.RefundInitiated) order.StatusBeforeRefund = order.OrderStatus;
        order.RefundTargetAmount = amount;
        order.ReturnDecisionReason = reason.Trim();
        order.OrderStatus = OrderStatus.RefundInitiated;
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
        if (order.PaymentMethod == "card")
            await _paymentGateway.RefundAsync(order.PaymentIntentId ?? order.TransactionId, delta,
                $"refund-{order.OrderId}-{amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}");
        else if (order.PaymentMethod == "mercadopago")
            await _mercadoPagoService.RefundAsync(order.PaymentIntentId ?? order.TransactionId, delta,
                $"refund-mp-{order.OrderId}-{amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}");
        // Offline refunds are explicitly attested by staff at the endpoint.
        await RecordRefundAsync(order.PaymentIntentId ?? order.TransactionId, amount);
    }

    public async Task RecordRefundAsync(string paymentIntentId, decimal refundedAmount)
    {
        var order = await _orderRepo.Query().IgnoreQueryFilters()
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .Include(o => o.OrderItems).ThenInclude(i => i.ProductVariant)
            .FirstOrDefaultAsync(o => o.PaymentIntentId == paymentIntentId || o.TransactionId == paymentIntentId);
        if (order == null || refundedAmount <= order.RefundedAmount) return;
        if (refundedAmount > order.TotalPrice) throw new InvalidOperationException("El reembolso supera el importe del pedido.");
        order.RefundedAmount = refundedAmount;
        order.RefundedAtUtc = DateTime.UtcNow;
        var previous = order.StatusBeforeRefund ?? order.OrderStatus;
        if (refundedAmount == order.TotalPrice && previous is OrderStatus.Pending or OrderStatus.Processing or OrderStatus.Cancelled)
            RestoreStock(order);
        order.OrderStatus = refundedAmount == order.TotalPrice ? OrderStatus.Refunded : previous;
        order.RefundTargetAmount = null;
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task SetFulfillmentAsync(Guid orderId, string? trackingNumber, string? invoiceReference)
    {
        if (trackingNumber?.Length > 100 || invoiceReference?.Length > 100) throw new ArgumentException("Máximo 100 caracteres por referencia.");
        var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");
        order.TrackingNumber = trackingNumber?.Trim();
        order.InvoiceReference = invoiceReference?.Trim();
        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync();
    }
}
