namespace Ecommerce.Application.DTOs.Catalog
{
    /// <summary>
    /// Request DTO for creating or updating a product in the D2C clothing store.
    /// All products are from the store owner's brand — no multi-brand fields needed.
    /// </summary>
    public class CreateProductRequestDto
    {
        /// <summary>
        /// Display name of the product (e.g., "Classic Fit Crew Neck T-Shirt").
        /// </summary>
        public string ProductName { get; set; } = null!;

        /// <summary>
        /// Available stock quantity for this product variant.
        /// </summary>
        public int Quantity { get; set; }

        /// <summary>
        /// Selling price in the store's currency (e.g., 999.50).
        /// </summary>
        public decimal Price { get; set; }

        /// <summary>
        /// Discount amount. Must be >= 0 and &lt;= Price.
        /// </summary>
        public decimal Discount { get; set; }

        public string Description { get; set; } = null!;

        /// <summary>
        /// Códigos de zona de entrega opcionales (separados por comas). El envío se resuelve por zona.
        /// </summary>
        public string DeliverableZones { get; set; } = null!;

        /// <summary>
        /// Whether the product needs configuration/assembly before shipping (affects delivery ETA).
        /// </summary>
        public bool RequiresConfiguration { get; set; }

        /// <summary>
        /// Variant rows with actual size/color/stock combinations.
        /// </summary>
        public List<ProductVariantRequestDto> Variants { get; set; } = new();

        /// <summary>
        /// Fabric composition (e.g., "100% Cotton"). Optional.
        /// </summary>
        public string? Material { get; set; }

        /// <summary>
        /// Existing product image URLs that should remain on update.
        /// New uploads are appended after these images in the same request.
        /// </summary>
        public List<string> RetainedImageUrls { get; set; } = new();

        /// <summary>
        /// Colour assignment for each retained image URL. Use empty value to keep an image shared across colours.
        /// </summary>
        public List<string> RetainedImageColors { get; set; } = new();

        /// <summary>
        /// Colour assignment for each newly uploaded image. Index matches the uploaded file order.
        /// </summary>
        public List<string> NewImageColors { get; set; } = new();

        /// <summary>
        /// ID of the root category (e.g., "Top Wear").
        /// </summary>
        public int CategoryId { get; set; }

        /// <summary>
        /// Optional ID of the subcategory under the root category (e.g., "T-Shirts").
        /// Nullable — if the category has no subcategories, this can be omitted.
        /// </summary>
        public int? SubCategoryId { get; set; }
    }
}
