using Ecommerce.Domain.Enums;

namespace Ecommerce.Domain.Entities
{
    public class Order
    {
        public Guid OrderId { get; set; }
        public Guid? UserId { get; set; }
        public Guid AddressId { get; set; }
        public decimal TotalPrice { get; set; }
        public OrderStatus OrderStatus { get; set; } = OrderStatus.Pending;
        public DateTime OrderDate { get; set; }
        public string TransactionId { get; set; } = null!;
        public string PaymentMethod { get; set; } = null!;
        public bool IsPaid { get; set; } = false;

        // Billing / SUNAT foundation
        public string InvoiceType { get; set; } = "Boleta"; // "Boleta" | "Factura"
        public string? Ruc { get; set; }
        public string? RazonSocial { get; set; }
        public string? FiscalAddress { get; set; }

        // Shipping (Peruvian model: Lima free / provinces contra entrega via agency)
        public decimal ShippingCost { get; set; } = 0m;
        public string? ShippingProvider { get; set; }

        // Offline payment proof (Yape / Plin / transfer)
        public string? PaymentReceiptUrl { get; set; }
        public string? PaymentApprovalCode { get; set; }
        public string? CancellationReason { get; set; }
        public string? ReturnReason { get; set; }
        public string? ReplacementReason { get; set; }
        public DateTime? CancelledAtUtc { get; set; }
        public DateTime? ReturnRequestedAtUtc { get; set; }
        public DateTime? ReplacementRequestedAtUtc { get; set; }
        public DateTime? RefundedAtUtc { get; set; }

        // Guest order contact info
        public string? GuestEmail { get; set; }
        public string? GuestPhone { get; set; }

        // Coupon
        public string? CouponCode { get; set; }
        public decimal CouponDiscount { get; set; }

        // Navigation Properties
        public List<OrderItem> OrderItems { get; set; } = new();
        public User? User { get; set; }
        public Address Address { get; set; } = null!;
    }
}
