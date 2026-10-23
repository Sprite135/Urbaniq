using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Domain.Common;

namespace Ecommerce.Application.Interfaces.Orders
{
    /// <summary>
    /// Manages order lifecycle — creation, retrieval, status updates, and revenue reporting.
    /// </summary>
    public interface IOrderService
    {
        Task<Guid> CreateOrderAsync(Guid? userId, CreateOrderRequestDto createOrderDto);
        Task<PagedResult<OrderDetailsResponseDto>> GetOrdersByUserIdAsync(Guid userId, int pageNumber = 1, int pageSize = 10);
        Task<PagedResult<OrderDetailsResponseDto>> GetAllOrdersAsync(int pageNumber = 1, int pageSize = 10, string? status = null);
        Task<OrderDetailsResponseDto> GetOrderByIdAsync(Guid orderId, Guid? requestingUserId, bool isAdmin);
        Task<UpdateOrderStatusResponseDto> ChangeOrderStatusAsync(Guid orderId, string status, string? reason = null);
        Task<UpdateOrderStatusResponseDto> CancelOrderAsync(Guid userId, Guid orderId, string reason);
        Task<UpdateOrderStatusResponseDto> RequestReturnAsync(Guid userId, Guid orderId, string reason);

        Task<RevenueResponseDto> GetRevenueAsync();
        Task<bool> CanDeliverCartToAddressAsync(Guid? userId, Guid addressId);
        Task MarkOrderPaidAsync(string transactionId);
        Task MarkOrderRefundedAsync(string transactionId);

        /// <summary>Attach offline-payment proof (voucher URL and/or Yape/Plin approval code) to an order. Owner or admin only.</summary>
        Task AttachVoucherAsync(Guid orderId, Guid userId, bool isAdmin, string? url, string? approvalCode);

        /// <summary>Manually mark an order as paid (offline methods: Yape/Plin/transfer). Admin only.</summary>
        Task MarkOrderPaidByStaffAsync(Guid orderId);
        Task<ApiResponse<Ecommerce.Application.DTOs.Payment.PaymentIntentResponseDto>> StartCardPaymentAsync(Guid orderId, Guid userId);
        Task ConfirmCardPaymentAsync(Guid orderId, Guid userId, string paymentIntentId);
        Task<Ecommerce.Application.DTOs.Payment.MercadoPagoCheckoutResponseDto> StartMercadoPagoPaymentAsync(Guid orderId, Guid userId, Uri applicationBaseUri);
        Task ConfirmMercadoPagoPaymentAsync(Ecommerce.Application.DTOs.Payment.MercadoPagoPaymentDto payment);
        Task ExpirePendingOrderAsync(Guid orderId);
        Task RefundOrderAsync(Guid orderId, decimal amount, string reason);
        Task RecordRefundAsync(string paymentIntentId, decimal refundedAmount);
        Task SetFulfillmentAsync(Guid orderId, string? trackingNumber, string? invoiceReference);
    }
}
