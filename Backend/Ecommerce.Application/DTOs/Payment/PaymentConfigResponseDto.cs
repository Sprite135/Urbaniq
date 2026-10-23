namespace Ecommerce.Application.DTOs.Payment
{
    public class PaymentConfigResponseDto
    {
        public string PublishableKey { get; set; } = null!;
        public bool MercadoPagoEnabled { get; set; }
        public bool MercadoPagoSandboxMode { get; set; }
        public string MercadoPagoPublicKey { get; set; } = string.Empty;
        public bool YapeSandboxEnabled { get; set; }
    }
}
