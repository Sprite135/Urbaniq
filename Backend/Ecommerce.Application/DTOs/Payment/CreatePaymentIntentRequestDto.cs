namespace Ecommerce.Application.DTOs.Payment
{
    public class CreatePaymentIntentRequestDto
    {
        public Guid OrderId { get; set; }
    }
}
