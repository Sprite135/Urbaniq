namespace Ecommerce.Application.DTOs.Orders
{
    public class CreateOrderRequestDto
    {
        public Guid AddressId { get; set; }
        public string TransactionId { get; set; } = null!;
        public string PaymentMethod { get; set; } = null!;

        // Billing / SUNAT foundation
        public string InvoiceType { get; set; } = "Boleta"; // "Boleta" | "Factura"
        public string? Ruc { get; set; }
        public string? RazonSocial { get; set; }
        public string? FiscalAddress { get; set; }

        // Shipping provider chosen by the customer (agency for provinces, e.g. Shalom/Marvisur/Olva)
        public string? ShippingProvider { get; set; }

        // Guest checkout contact info (required when not authenticated)
        public string? Email { get; set; }
        public string? Phone { get; set; }

        // Coupon
        public string? CouponCode { get; set; }
    }
}
