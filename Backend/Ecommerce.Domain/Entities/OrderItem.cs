namespace Ecommerce.Domain.Entities
{
    /// <summary>
    /// Represents a line item within an order, capturing the product, quantity,
    /// and pricing at the time of purchase. Prices are stored as decimal for currency precision.
    /// </summary>
    public class OrderItem
    {
        public Guid OrderItemId { get; set; }
        public Guid OrderId { get; set; }
        public Guid? ProductId { get; set; }
        public Guid? ProductVariantId { get; set; }
        public string? ProductNameSnapshot { get; set; }
        public string? ImageSnapshot { get; set; }
        public string? SkuSnapshot { get; set; }
        public int Quantity { get; set; }

        /// <summary>
        /// Price per unit at the time of purchase (decimal for currency precision).
        /// </summary>
        public decimal UnitPrice { get; set; }

        /// <summary>
        /// Total price for this line item: UnitPrice * Quantity.
        /// </summary>
        public decimal TotalPrice { get; set; }

        public string SelectedSize { get; set; } = null!;
        public string SelectedColor { get; set; } = null!;

        // Navigation Properties
        public Order Order { get; set; } = null!;
        public Product? Product { get; set; }
        public ProductVariant? ProductVariant { get; set; }
    }
}
