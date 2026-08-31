namespace Ecommerce.Application.DTOs.Catalog
{
    /// <summary>
    /// Response DTO for product data in the D2C men's clothing platform.
    /// Includes clothing-specific attributes and category information.
    /// </summary>
    public class ProductResponseDto
    {
        public Guid Id { get; set; }
        public string ProductName { get; set; } = null!;
        public string SKU { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal Discount { get; set; }
        public string Description { get; set; } = null!;
        public string Image { get; set; } = null!;
        public List<string> Images { get; set; } = new();
        public Dictionary<string, List<string>> ImagesByColor { get; set; } = new();
        public List<ProductImageResponseDto> ImageEntries { get; set; } = new();
        public string Size { get; set; } = null!;
        public string Color { get; set; } = null!;
        public List<string> AvailableSizes { get; set; } = new();
        public List<string> AvailableColors { get; set; } = new();
        public List<string> DeliverableZones { get; set; } = new();
        public bool RequiresConfiguration { get; set; }
        public List<ProductVariantResponseDto> Variants { get; set; } = new();
        public string? Material { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;
        public int? SubCategoryId { get; set; }
        public string? SubCategoryName { get; set; }
        public decimal? AverageRating { get; set; }
        public int TotalReviews { get; set; }
    }
}
