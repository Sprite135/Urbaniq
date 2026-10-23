using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Application.Interfaces.Payment;
using Microsoft.Extensions.Options;

namespace Ecommerce.Infrastructure.Services;

public sealed class MercadoPagoService : IMercadoPagoService
{
    private readonly HttpClient _httpClient;
    private readonly MercadoPagoSettings _settings;

    public MercadoPagoService(HttpClient httpClient, IOptions<MercadoPagoSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        var validToken = _settings.AccessToken.StartsWith("APP_USR-", StringComparison.Ordinal) ||
                         _settings.AccessToken.StartsWith("TEST-", StringComparison.Ordinal);
        IsConfigured = validToken && !string.IsNullOrWhiteSpace(_settings.WebhookSecret) &&
                       !_settings.WebhookSecret.Contains("SET_VIA", StringComparison.OrdinalIgnoreCase);
    }

    public bool IsConfigured { get; }

    public async Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(decimal amount, Guid orderId, Uri applicationBaseUri)
    {
        EnsureConfigured();
        var orderUrl = new Uri(applicationBaseUri, $"orders/{orderId}").ToString();
        var notificationUrl = new Uri(applicationBaseUri, "api/v1/Payment/mercadopago/webhook").ToString();
        var payload = new
        {
            items = new[] { new { id = orderId.ToString(), title = $"Pedido Urbaniq {orderId:N}", quantity = 1, currency_id = "PEN", unit_price = amount } },
            external_reference = orderId.ToString(),
            back_urls = new { success = $"{orderUrl}?payment=approved", pending = $"{orderUrl}?payment=pending", failure = $"{orderUrl}?payment=failure" },
            auto_return = "approved",
            notification_url = notificationUrl,
            statement_descriptor = "URBANIQ"
        };

        using var request = CreateRequest(HttpMethod.Post, "checkout/preferences", payload, $"mp-preference-{orderId}");
        using var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo crear el checkout ({(int)response.StatusCode}).");
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        return new MercadoPagoCheckoutResponseDto
        {
            PreferenceId = root.GetProperty("id").GetString() ?? throw new InvalidOperationException("Mercado Pago no devolvió el ID de preferencia."),
            CheckoutUrl = root.GetProperty("init_point").GetString() ?? throw new InvalidOperationException("Mercado Pago no devolvió la URL de pago.")
        };
    }

    public async Task<MercadoPagoPaymentDto> GetPaymentAsync(string paymentId)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Get, $"v1/payments/{Uri.EscapeDataString(paymentId)}");
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo verificar el pago ({(int)response.StatusCode}).");
        var payment = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new MercadoPagoPaymentDto
        {
            PaymentId = payment.GetProperty("id").ToString(),
            Status = payment.GetProperty("status").GetString() ?? string.Empty,
            ExternalReference = payment.TryGetProperty("external_reference", out var reference) ? reference.GetString() ?? string.Empty : string.Empty,
            TransactionAmount = payment.GetProperty("transaction_amount").GetDecimal(),
            CurrencyId = payment.GetProperty("currency_id").GetString() ?? string.Empty
        };
    }

    public async Task RefundAsync(string paymentId, decimal amount, string idempotencyKey)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Post, $"v1/payments/{Uri.EscapeDataString(paymentId)}/refunds", new { amount }, idempotencyKey);
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo reembolsar el pago ({(int)response.StatusCode}).");
    }

    public bool ValidateWebhookSignature(string signature, string requestId, string dataId)
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookSecret) || string.IsNullOrWhiteSpace(signature) ||
            string.IsNullOrWhiteSpace(requestId) || string.IsNullOrWhiteSpace(dataId)) return false;
        var parts = signature.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2)).Where(part => part.Length == 2)
            .ToDictionary(part => part[0], part => part[1], StringComparer.OrdinalIgnoreCase);
        if (!parts.TryGetValue("ts", out var timestamp) || !parts.TryGetValue("v1", out var received)) return false;
        var manifest = $"id:{dataId.ToLowerInvariant()};request-id:{requestId};ts:{timestamp};";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.WebhookSecret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();
        return expected.Length == received.Length && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(received.ToLowerInvariant()));
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, object? body = null, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.AccessToken);
        if (!string.IsNullOrWhiteSpace(idempotencyKey)) request.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        if (body != null) request.Content = JsonContent.Create(body);
        return request;
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured) throw new InvalidOperationException("Mercado Pago no está configurado.");
    }
}
