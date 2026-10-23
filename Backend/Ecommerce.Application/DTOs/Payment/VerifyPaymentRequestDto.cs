namespace Ecommerce.Application.DTOs.Payment
{
    public class VerifyPaymentRequestDto
    {
        public string PaymentIntentId { get; set; } = null!;
        public Guid OrderId { get; set; }
    }
}
