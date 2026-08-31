namespace Ecommerce.Domain.Entities
{
    public class CartItem
    {
        public Guid Id { get; set; }
        public Guid CartId { get; set; }
        public Guid ProductId { get; set; }
        public Guid ProductVariantId { get; set; }
        public int Quantity { get; set; }
        public string SelectedSize { get; set; } = null!;
        public string SelectedColor { get; set; } = null!;
        public string? DeliveryCode { get; set; }

        // Navigation Properties
        public Cart Cart { get; set; } = null!;
        public Product Product { get; set; } = null!;
        public ProductVariant ProductVariant { get; set; } = null!;
    }
}
