namespace Ecommerce.Application.DTOs.Payment;

public sealed class MercadoPagoCheckoutResponseDto
{
    public string PreferenceId { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
}

public sealed class MercadoPagoPaymentDto
{
    public string PaymentId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public decimal TransactionAmount { get; set; }
    public string CurrencyId { get; set; } = string.Empty;
}
