using Ecommerce.Application.Common.Settings;

namespace Ecommerce.Application.Helpers
{
    public static class DeliveryHelper
    {
        public const string LimaMetropolitana = "LimaMetropolitana";
        public const string Provincias = "Provincias";

        /// <summary>Transport agencies used for province shipments (contra entrega).</summary>
        public static readonly string[] ProvinceAgencies = { "Shalom", "Marvisur", "Olva" };

        public static string ResolveZone(string? department, string? province)
        {
            if (string.Equals(department?.Trim(), "Lima", StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(province?.Trim(), "Lima", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(province?.Trim(), "Callao", StringComparison.OrdinalIgnoreCase)))
            {
                return LimaMetropolitana;
            }

            return Provincias;
        }

        /// <summary>
        /// Computes the shipping fee. Lima Metropolitana ships with the owned fleet (free by default);
        /// provinces ship "contra entrega" via an agency, so the store fee is 0 unless explicitly configured.
        /// A configured FreeShippingThreshold makes shipping free once the subtotal reaches it.
        /// </summary>
        public static decimal CalculateShippingCost(string? zone, decimal subtotal, ShippingSettings settings)
        {
            if (settings.FreeShippingThreshold > 0 && subtotal >= settings.FreeShippingThreshold)
            {
                return 0m;
            }

            return zone == LimaMetropolitana ? settings.LimaMetropolitanaFee : settings.ProvinceFee;
        }

        /// <summary>Resolves the shipping provider label stored on the order.</summary>
        public static string ResolveShippingProvider(string? zone, string? chosenAgency)
        {
            if (zone == LimaMetropolitana)
            {
                return "Flota Propia";
            }

            var agency = chosenAgency?.Trim();
            if (!string.IsNullOrWhiteSpace(agency) &&
                Array.Exists(ProvinceAgencies, a => string.Equals(a, agency, StringComparison.OrdinalIgnoreCase)))
            {
                return agency!;
            }

            return ProvinceAgencies[0]; // default agency when none chosen
        }

        public static string EstimateText(string? zone, bool requiresConfiguration)
        {
            if (zone == LimaMetropolitana)
            {
                return requiresConfiguration
                    ? "Entrega en Lima Metropolitana en 24-48 horas (requiere configuración/ensamblaje)."
                    : "Entrega en Lima Metropolitana al día siguiente (24 horas), con flota propia.";
            }

            return "Envío a provincia vía agencias Shalom/Marvisur/Olva (contra entrega, el cliente paga el envío en destino). Cobertura 92% del territorio nacional.";
        }

        public static bool IsLimaMetropolitana(string? zone) => zone == LimaMetropolitana;
    }
}