using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Domain.Entities
{
    /// <summary>
    /// Represents a clothing product in the D2C men's clothing platform.
    /// All products belong to a single brand (the store owner's brand).
    /// </summary>
    public class Product : ISoftDeletable
    {
        public Guid Id { get; set; }

        /// <summary>
        /// Display name of the product (e.g., "Classic Fit Crew Neck T-Shirt").
        /// </summary>
        public string ProductName { get; set; } = null!;

        /// <summary>
        /// Stock Keeping Unit — unique inventory identifier (e.g., "TS-BLK-M-001").
        /// Auto-generated from category, color, size on creation.
        /// </summary>
        public string SKU { get; set; } = null!;

        /// <summary>
        /// URL-friendly identifier for frontend routing (e.g., "classic-fit-crew-neck-t-shirt").
        /// </summary>
        public string Slug { get; set; } = null!;

        /// <summary>
        /// Available stock quantity for this specific product variant.
        /// </summary>
        public int Quantity { get; set; }

        /// <summary>
        /// Selling price in the store's currency (decimal for precision, e.g., 999.50).
        /// </summary>
        public decimal Price { get; set; }

        /// <summary>
        /// Discount amount in the same currency. Must be >= 0 and &lt;= Price.
        /// Effective price = Price - Discount.
        /// </summary>
        public decimal Discount { get; set; }

        /// <summary>
        /// Total number of units sold. Used for fast top-selling sorting.
        /// </summary>
        public int TotalSold { get; set; } = 0;

        /// <summary>
        /// Whether the product needs configuration/assembly before shipping
        /// (e.g., a custom PC build). Affects delivery ETA (24-48h instead of next-day).
        /// </summary>
        public bool RequiresConfiguration { get; set; } = false;

        public string Description { get; set; } = null!;

        /// <summary>
        /// Primary product image URL (stored via Cloudinary).
        /// </summary>
        public string Image { get; set; } = null!;

        /// <summary>
        /// Clothing size as a string to accommodate various formats:
        /// Apparel: "S", "M", "L", "XL", "XXL"
        /// Bottoms: "28", "30", "32", "34", "36"
        /// </summary>
        public string Size { get; set; } = null!;

        /// <summary>
        /// Primary color of the garment (e.g., "Black", "Navy Blue", "Olive Green").
        /// </summary>
        public string Color { get; set; } = null!;

        /// <summary>
        /// Comma-separated size choices the admin allows customers to select from.
        /// </summary>
        public string AvailableSizes { get; set; } = null!;

        /// <summary>
        /// Comma-separated color choices the admin allows customers to select from.
        /// </summary>
        public string AvailableColors { get; set; } = null!;

        /// <summary>
        /// Códigos de zona de entrega (opcional). El envío real se determina por la zona
        /// de la dirección (Lima Metropolitana / Provincias) al estilo Memory Kings.
        /// </summary>
        public string DeliverableZones { get; set; } = null!;

        /// <summary>
        /// Fabric composition (e.g., "100% Cotton", "Cotton-Polyester Blend").
        /// Optional — may not apply to all product types.
        /// </summary>
        public string? Material { get; set; }

        /// <summary>
        /// FK to the leaf category this product belongs to (e.g., T-Shirts, Jeans).
        /// </summary>
        public int CategoryId { get; set; }
        /// <summary>
        /// Optional FK to a leaf subcategory within the Category hierarchy.
        /// When set, this represents the specific subcategory (e.g., "T-Shirts" under "Top Wear").
        /// </summary>
        public int? SubCategoryId { get; set; }
        public Category? SubCategory { get; set; }

        // === Audit Fields ===

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        // === Soft Delete ===

        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // === Navigation Properties ===

        public Category Category { get; set; } = null!;
        public List<CartItem> CartItems { get; set; } = new();
        public List<ProductImage> ProductImages { get; set; } = new();
        public List<ProductVariant> Variants { get; set; } = new();
        public List<PcSpecification> Specifications { get; set; } = new();
        public List<Review> Reviews { get; set; } = new();
    }
}
