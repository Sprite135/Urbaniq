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
