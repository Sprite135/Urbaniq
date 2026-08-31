namespace Ecommerce.Domain.Entities
{
    /// <summary>
    /// Represents technical specifications for PC components.
    /// Stores key-value pairs for attributes like Socket, Cores, TDP, etc.
    /// </summary>
    public class PcSpecification
    {
        public Guid Id { get; set; }
        
        /// <summary>
        /// The product this specification belongs to.
        /// </summary>
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = null!;
        
        /// <summary>
        /// Specification key (e.g., "Socket", "Cores", "TDP", "VRAM", "Capacity").
        /// </summary>
        public string SpecKey { get; set; } = null!;
        
        /// <summary>
        /// Specification value (e.g., "AM5", "8", "120W", "24GB", "1TB").
        /// </summary>
        public string SpecValue { get; set; } = null!;
        
        /// <summary>
        /// Data type for validation and UI rendering (String, Number, Boolean, Select).
        /// </summary>
        public string DataType { get; set; } = "String";
        
        /// <summary>
        /// Display order for specifications in the UI.
        /// </summary>
        public int DisplayOrder { get; set; } = 0;
        
        /// <summary>
        /// Whether this specification is required for the product category.
        /// </summary>
        public bool IsRequired { get; set; } = false;
        
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
