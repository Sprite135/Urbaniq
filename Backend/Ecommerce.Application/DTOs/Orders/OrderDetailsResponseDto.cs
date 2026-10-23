using Ecommerce.Application.DTOs.Address;

namespace Ecommerce.Application.DTOs.Orders
{
    public class OrderDetailsResponseDto
    {
        public Guid OrderId { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalPrice { get; set; }
        public string OrderStatus { get; set; } = null!;
        public string TransactionId { get; set; } = null!;
        public string? UserEmail { get; set; }
        public string PaymentMethod { get; set; } = null!;
        public bool IsPaid { get; set; }
        public string InvoiceType { get; set; } = "Boleta";
        public string? Ruc { get; set; }
        public string? RazonSocial { get; set; }
        public string? FiscalAddress { get; set; }
        public decimal ShippingCost { get; set; }
        public string? ShippingProvider { get; set; }
        public string? TrackingNumber { get; set; }
        public string? InvoiceReference { get; set; }
        public DateTime? ShippedAtUtc { get; set; }
        public DateTime? PaymentDueAtUtc { get; set; }
        public decimal RefundedAmount { get; set; }
        public string? PaymentReceiptUrl { get; set; }
        public string? PaymentApprovalCode { get; set; }
        public string? CancellationReason { get; set; }
        public string? ReturnReason { get; set; }
        public string? ReplacementReason { get; set; }
        public DateTime? CancelledAtUtc { get; set; }
        public DateTime? ReturnRequestedAtUtc { get; set; }
        public DateTime? ReplacementRequestedAtUtc { get; set; }
        public DateTime? RefundedAtUtc { get; set; }
        public AddressResponseDto Address { get; set; } = null!;
        public List<OrderItemResponseDto> OrderItems { get; set; } = new();
    }
}
