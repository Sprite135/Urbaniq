namespace Ecommerce.Application.DTOs.Payment
{
    public class PaymentVerificationResponseDto
    {
        public string Status { get; set; } = null!;
        public bool IsSuccessful { get; set; }
        public long AmountReceived { get; set; }
        public string Currency { get; set; } = "";
    }
}
