namespace Ecommerce.Application.DTOs.Payment
{
    public class PaymentConfigResponseDto
    {
        public string PublishableKey { get; set; } = null!;
        public bool MercadoPagoEnabled { get; set; }
    }
}
