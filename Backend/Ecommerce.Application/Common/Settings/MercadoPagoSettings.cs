namespace Ecommerce.Application.Common.Settings;

public sealed class MercadoPagoSettings
{
    public string AccessToken { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}
