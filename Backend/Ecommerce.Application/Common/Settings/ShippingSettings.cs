namespace Ecommerce.Application.Common.Settings
{
    /// <summary>
    /// Shipping cost rules, modelled on the Peruvian e-commerce model
    /// (Memory Kings / Impacto): Lima Metropolitana ships free with an owned fleet,
    /// provinces ship "contra entrega" via a transport agency (customer pays at destination),
    /// so the store's order total normally carries a 0 shipping fee unless explicitly configured.
    /// </summary>
    public class ShippingSettings
    {
        /// <summary>Flat shipping fee for Lima Metropolitana. Default 0 (free).</summary>
        public decimal LimaMetropolitanaFee { get; set; } = 0m;

        /// <summary>Flat shipping fee for provinces. Default 0 because provinces are contra entrega.</summary>
        public decimal ProvinceFee { get; set; } = 0m;

        /// <summary>
        /// If the order subtotal is greater than or equal to this value, shipping is free
        /// regardless of zone. 0 disables the threshold (zone rules only).
        /// </summary>
        public decimal FreeShippingThreshold { get; set; } = 0m;
    }
}
