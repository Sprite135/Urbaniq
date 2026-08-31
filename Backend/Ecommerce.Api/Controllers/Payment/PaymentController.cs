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

namespace Ecommerce.Api.Controllers.Payment
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion("1.0")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentGatewayService _paymentGatewayService;
        private readonly IOrderService _orderService;
        private readonly StripeSettings _stripeSettings;
        private readonly MerchantPaymentSettings _merchantSettings;
        private readonly ILogger<PaymentController> _logger;
        private readonly IWebHostEnvironment _env;

        public PaymentController(
            IPaymentGatewayService paymentGatewayService,
            IOrderService orderService,
            IOptions<StripeSettings> stripeSettings,
            IOptions<MerchantPaymentSettings> merchantSettings,
            ILogger<PaymentController> logger,
            IWebHostEnvironment env)
        {
            _paymentGatewayService = paymentGatewayService;
            _orderService = orderService;
            _stripeSettings = stripeSettings.Value;
            _merchantSettings = merchantSettings.Value;
            _logger = logger;
            _env = env;
        }

        [HttpGet("config")]
        public IActionResult GetPaymentConfig()
        {
            if (string.IsNullOrWhiteSpace(_stripeSettings.PublishableKey) ||
                !_stripeSettings.PublishableKey.StartsWith("pk_", StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Stripe publishable key is not configured."
                });
            }

            return Ok(new PaymentConfigResponseDto
            {
                PublishableKey = _stripeSettings.PublishableKey
            });
        }

        /// <summary>
        /// Creates a Stripe PaymentIntent for the given amount.
        /// Returns a client_secret which the frontend uses to render Stripe Elements.
        /// </summary>
        [HttpPost("create-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequestDto request)
        {
            var result = await _paymentGatewayService.CreatePaymentIntentAsync(request.Amount);
            return StatusCode(result.StatusCode, result);
        }

        /// <summary>
        /// Verifies a payment's success via its PaymentIntent ID.
        /// </summary>
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequestDto request)
        {
            var result = await _paymentGatewayService.VerifyPaymentAsync(request.PaymentIntentId);
            return StatusCode(result.StatusCode, result);
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
                        await _orderService.MarkOrderRefundedAsync(charge.PaymentIntentId);
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
        public async Task<IActionResult> UploadVoucher(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" }.Contains(ext))
                return BadRequest(new { message = "Unsupported file type. Use png, jpg, jpeg, webp or pdf." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File too large (max 5 MB)." });

            var folder = Path.Combine(_env.WebRootPath, "uploads", "payments");
            Directory.CreateDirectory(folder);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var path = Path.Combine(folder, fileName);

            using (var stream = System.IO.File.Create(path))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { url = $"/uploads/payments/{fileName}" });
        }
    }
}
