namespace Ecommerce.Application.DTOs.Cart
{
    public class CartItemResponseDto
    {
        public Guid CartItemId { get; set; }
        public Guid ProductId { get; set; }
        public Guid ProductVariantId { get; set; }
        public string ProductName { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public decimal Price { get; set; }
        public decimal Discount { get; set; }
        public int Quantity { get; set; }
        public decimal TotalPrice { get; set; }
        public string Image { get; set; } = null!;
        public string Size { get; set; } = null!;
        public string Color { get; set; } = null!;
        public string? DeliveryCode { get; set; }
    }
}
