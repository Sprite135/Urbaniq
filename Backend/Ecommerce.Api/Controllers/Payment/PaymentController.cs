using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.Interfaces.Orders;
using Ecommerce.Application.Interfaces.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Asp.Versioning;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Hosting;
using Stripe;
using System.IO;
using System.Security.Claims;

namespace Ecommerce.Api.Controllers.Payment
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion("1.0")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentGatewayService _paymentGatewayService;
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly IOrderService _orderService;
        private readonly StripeSettings _stripeSettings;
        private readonly MerchantPaymentSettings _merchantSettings;
        private readonly ILogger<PaymentController> _logger;
        private readonly IWebHostEnvironment _env;
        private readonly ShippingSettings _shippingSettings;
        private readonly Ecommerce.Api.Services.PaymentReceiptStorage _receiptStorage;

        public PaymentController(
            IPaymentGatewayService paymentGatewayService,
            IMercadoPagoService mercadoPagoService,
            IOrderService orderService,
            IOptions<StripeSettings> stripeSettings,
            IOptions<MerchantPaymentSettings> merchantSettings,
            ILogger<PaymentController> logger,
            IWebHostEnvironment env,
            IOptions<ShippingSettings> shippingSettings,
            Ecommerce.Api.Services.PaymentReceiptStorage receiptStorage)
        {
            _paymentGatewayService = paymentGatewayService;
            _mercadoPagoService = mercadoPagoService;
            _orderService = orderService;
            _stripeSettings = stripeSettings.Value;
            _merchantSettings = merchantSettings.Value;
            _logger = logger;
            _env = env;
            _shippingSettings = shippingSettings.Value;
            _receiptStorage = receiptStorage;
        }

        [HttpGet("shipping-config")]
        [AllowAnonymous]
        public IActionResult GetShippingConfig() => Ok(_shippingSettings);

        [HttpGet("config")]
        public IActionResult GetPaymentConfig()
        {
            // Return Stripe config if available, otherwise return empty config
            // This allows Yape/Plin to work without Stripe being configured
            if (!_paymentGatewayService.IsConfigured || string.IsNullOrWhiteSpace(_stripeSettings.PublishableKey) ||
                !_stripeSettings.PublishableKey.StartsWith("pk_", StringComparison.Ordinal))
            {
                return Ok(new PaymentConfigResponseDto
                {
                    PublishableKey = "", // Empty string indicates Stripe not configured
                    MercadoPagoEnabled = _mercadoPagoService.IsWebhookConfigured || _mercadoPagoService.IsSandboxMode,
                    MercadoPagoSandboxMode = _mercadoPagoService.IsSandboxMode,
                    MercadoPagoPublicKey = _mercadoPagoService.PublicKey,
                    YapeSandboxEnabled = _mercadoPagoService.IsYapeSandboxConfigured
                });
            }

            return Ok(new PaymentConfigResponseDto
            {
                PublishableKey = _stripeSettings.PublishableKey,
                MercadoPagoEnabled = _mercadoPagoService.IsWebhookConfigured || _mercadoPagoService.IsSandboxMode,
                MercadoPagoSandboxMode = _mercadoPagoService.IsSandboxMode,
                MercadoPagoPublicKey = _mercadoPagoService.PublicKey,
                YapeSandboxEnabled = _mercadoPagoService.IsYapeSandboxConfigured
            });
        }

        [HttpPost("mercadopago/checkout")]
        public async Task<IActionResult> CreateMercadoPagoCheckout([FromBody] CreatePaymentIntentRequestDto request)
        {
            var baseUri = new Uri($"{Request.Scheme}://{Request.Host}/");
            var result = await _orderService.StartMercadoPagoPaymentAsync(
                request.OrderId,
                Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
                baseUri);
            return Ok(result);
        }

        [HttpPost("mercadopago/yape-sandbox")]
        public async Task<IActionResult> CreateYapeSandboxPayment([FromBody] MercadoPagoYapeRequestDto request)
        {
            if (!_mercadoPagoService.IsYapeSandboxConfigured)
                return BadRequest(new { message = "Yape sandbox no está configurado." });

            var payment = await _orderService.StartYapeSandboxPaymentAsync(
                request.OrderId,
                Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
                request.Token,
                request.PhoneNumber);
            return Ok(new MercadoPagoYapeResponseDto
            {
                PaymentId = payment.PaymentId,
                Status = payment.Status,
                IsSuccessful = string.Equals(payment.Status, "approved", StringComparison.OrdinalIgnoreCase)
            });
        }

        [HttpPost("mercadopago/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> MercadoPagoWebhook()
        {
            var dataId = Request.Query["data.id"].ToString();
            var type = Request.Query["type"].ToString();
            if (string.IsNullOrWhiteSpace(dataId))
            {
                using var document = await System.Text.Json.JsonDocument.ParseAsync(Request.Body);
                var root = document.RootElement;
                if (root.TryGetProperty("data", out var data) && data.TryGetProperty("id", out var id)) dataId = id.ToString();
                if (root.TryGetProperty("type", out var bodyType)) type = bodyType.GetString() ?? type;
            }
            if (!string.Equals(type, "payment", StringComparison.OrdinalIgnoreCase)) return Ok();
            if (!_mercadoPagoService.ValidateWebhookSignature(
                    Request.Headers["x-signature"].ToString(),
                    Request.Headers["x-request-id"].ToString(),
                    dataId))
            {
                _logger.LogWarning("Mercado Pago webhook signature verification failed.");
                return Unauthorized();
            }
            var payment = await _mercadoPagoService.GetPaymentAsync(dataId);
            await _orderService.ConfirmMercadoPagoPaymentAsync(payment);
            return Ok();
        }

        /// <summary>
        /// Creates a Stripe PaymentIntent for the given amount.
        /// Returns a client_secret which the frontend uses to render Stripe Elements.
        /// </summary>
        [HttpPost("create-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequestDto request)
        {
            var result = await _orderService.StartCardPaymentAsync(request.OrderId, Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!));
            return StatusCode(result.StatusCode, result);
        }

        /// <summary>
        /// Verifies a payment's success via its PaymentIntent ID.
        /// </summary>
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequestDto request)
        {
            await _orderService.ConfirmCardPaymentAsync(request.OrderId, Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), request.PaymentIntentId);
            return Ok(new { data = new { isSuccessful = true, status = "succeeded" } });
        }

        /// <summary>
        /// Stripe webhook receiver. Stripe calls this endpoint (anonymously) after asynchronous
        /// payment events. The payload signature is verified against StripeSettings.WebhookSecret
        /// before any processing, so forged requests are rejected with 400.
        /// </summary>
        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook()
        {
            if (string.IsNullOrWhiteSpace(_stripeSettings.WebhookSecret) ||
                !_stripeSettings.WebhookSecret.StartsWith("whsec_", StringComparison.Ordinal))
            {
                _logger.LogWarning("Stripe webhook received but webhook secret is not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Stripe webhook is not configured."
                });
            }

            var json = await new StreamReader(Request.Body).ReadToEndAsync();
            var signature = Request.Headers["Stripe-Signature"].ToString();

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, signature, _stripeSettings.WebhookSecret);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning(ex, "Stripe webhook signature verification failed.");
                return BadRequest(new { message = "Webhook signature verification failed." });
            }

            switch (stripeEvent.Type)
            {
                case "payment_intent.succeeded":
                    var intent = stripeEvent.Data.Object as PaymentIntent;
                    if (intent != null)
                    {
                        await _orderService.MarkOrderPaidAsync(intent.Id);
                        _logger.LogInformation("Stripe payment_intent.succeeded confirmed for {PaymentIntentId}", intent.Id);
                    }
                    break;

                case "payment_intent.payment_failed":
                    _logger.LogInformation("Stripe event {EventType} received (no action required).", stripeEvent.Type);
                    break;

                case "charge.refunded":
                    var charge = stripeEvent.Data.Object as Charge;
                    if (charge != null && !string.IsNullOrWhiteSpace(charge.PaymentIntentId))
                    {
                        await _orderService.RecordRefundAsync(charge.PaymentIntentId, charge.AmountRefunded / 100m);
                        _logger.LogInformation("Stripe charge.refunded processed for PaymentIntent {PaymentIntentId}", charge.PaymentIntentId);
                    }
                    break;

                default:
                    _logger.LogDebug("Unhandled Stripe webhook event type: {EventType}", stripeEvent.Type);
                    break;
            }

            return Ok();
        }

        /// <summary>
        /// Returns the merchant's Yape / Plin details (phone, owner name, QR image URL) so the
        /// customer can scan and pay for offline orders. No authentication required.
        /// </summary>
        [HttpGet("merchant-methods")]
        [AllowAnonymous]
        public IActionResult GetMerchantMethods()
        {
            var m = _merchantSettings;
            return Ok(new
            {
                yape = new { phone = m.Yape.Phone, ownerName = m.Yape.OwnerName, qrImageUrl = m.Yape.QrImageUrl },
                plin = new { phone = m.Plin.Phone, ownerName = m.Plin.OwnerName, qrImageUrl = m.Plin.QrImageUrl }
            });
        }

        /// <summary>
        /// Uploads a payment voucher (proof of Yape/Plin/transfer) and returns its public URL.
        /// </summary>
        [HttpPost("upload-voucher")]
        public async Task<IActionResult> UploadVoucher(IFormFile file, [FromForm] Guid orderId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _orderService.GetOrderByIdAsync(orderId, userId, User.IsInRole("Admin"));
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" }.Contains(ext))
                return BadRequest(new { message = "Unsupported file type. Use png, jpg, jpeg, webp or pdf." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File too large (max 5 MB)." });

            var folder = _receiptStorage.DirectoryPath;
            Directory.CreateDirectory(folder);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var path = Path.Combine(folder, fileName);

            using var content = new MemoryStream();
            await file.CopyToAsync(content);
            if (!Ecommerce.Api.Services.PaymentReceiptStorage.HasValidSignature(content.ToArray(), ext))
                return BadRequest(new { message = "El contenido no corresponde al formato del comprobante." });
            content.Position = 0;
            using (var stream = System.IO.File.Create(path))
            {
                await content.CopyToAsync(stream);
            }
            await System.IO.File.WriteAllTextAsync(path + ".owner", userId.ToString());
            var url = $"/uploads/payments/{fileName}";
            await _orderService.AttachVoucherAsync(orderId, userId, User.IsInRole("Admin"), url, null);
            return Ok(new { url });
        }

        [HttpGet("/uploads/payments/{fileName}")]
        public async Task<IActionResult> DownloadVoucher(string fileName, [FromServices] Ecommerce.Infrastructure.Data.AppDbContext db)
        {
            if (!_receiptStorage.IsValidName(fileName)) return NotFound();
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isAdmin = User.IsInRole("Admin");
            var url = $"/uploads/payments/{fileName}";
            var order = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(db.Orders,
                o => o.PaymentReceiptUrl == url && (o.UserId == userId || isAdmin));
            if (order == null) return NotFound();
            var path = Path.Combine(_receiptStorage.DirectoryPath, fileName);
            // Read-only compatibility for receipts uploaded before private storage was introduced.
            if (!System.IO.File.Exists(path)) path = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "payments", fileName);
            if (!System.IO.File.Exists(path)) return NotFound();
            Response.Headers.CacheControl = "no-store";
            var mime = Path.GetExtension(fileName).ToLowerInvariant() switch { ".pdf" => "application/pdf", ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
            return PhysicalFile(path, mime, fileName);
        }
    }
}
