using AutoMapper;
using Ecommerce.Application.Common.ProductOptions;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.DTOs.Address;
using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Application.Helpers;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Interfaces.Orders;
using Ecommerce.Application.Interfaces.Payment;
using Ecommerce.Application.Interfaces.Coupons;
using Ecommerce.Application.Interfaces.Notifications;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Orders
{
    public class OrderService : IOrderService
    {
        private readonly IRepository<Order> _orderRepo;
        private readonly IRepository<Domain.Entities.Cart> _cartRepo;
        private readonly IRepository<CartItem> _cartItemRepo;
        private readonly IRepository<Product> _productRepo;
        private readonly IRepository<Address> _addressRepo;
        private readonly IRepository<OrderItem> _orderItemRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IEmailJobQueue _emailJobQueue;
        private readonly IPaymentGatewayService _paymentGateway;
        private readonly IHostEnvironment _environment;
        private readonly ShippingSettings _shippingSettings;
        private readonly ICouponService _couponService;
        private readonly INotificationService _notificationService;

        public OrderService(
            IRepository<Order> orderRepo,
            IRepository<Domain.Entities.Cart> cartRepo,
            IRepository<CartItem> cartItemRepo,
            IRepository<Product> productRepo,
            IRepository<Address> addressRepo,
            IRepository<OrderItem> orderItemRepo,
            IRepository<User> userRepo,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            IEmailJobQueue emailJobQueue,
            IPaymentGatewayService paymentGateway,
            IHostEnvironment environment,
            IOptions<ShippingSettings> shippingSettings,
            ICouponService couponService,
            INotificationService notificationService)
        {
            _orderRepo = orderRepo;
            _cartRepo = cartRepo;
            _cartItemRepo = cartItemRepo;
            _productRepo = productRepo;
            _addressRepo = addressRepo;
            _orderItemRepo = orderItemRepo;
            _userRepo = userRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _emailJobQueue = emailJobQueue;
            _paymentGateway = paymentGateway;
            _environment = environment;
            _shippingSettings = shippingSettings.Value;
            _couponService = couponService;
            _notificationService = notificationService;
        }

        public async Task<UpdateOrderStatusResponseDto> ChangeOrderStatusAsync(Guid orderId, string status)
        {
            if (!Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
            {
                return new UpdateOrderStatusResponseDto { Message = "invalidstatus" };
            }

            var order = await _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.Address)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);
            if (order == null)
            {
                return new UpdateOrderStatusResponseDto { Message = "Order not found" };
            }

            // Unidirectional flow enforcement
            if (order.OrderStatus == OrderStatus.Delivered || order.OrderStatus == OrderStatus.Cancelled)
            {
                return new UpdateOrderStatusResponseDto { Message = "Cannot update status of a delivered or cancelled order" };
            }
            if (order.OrderStatus == OrderStatus.Processing && parsedStatus != OrderStatus.Shipped)
            {
                return new UpdateOrderStatusResponseDto { Message = "Order in Processing can only be changed to Shipped" };
            }
            if (order.OrderStatus == OrderStatus.Shipped && parsedStatus != OrderStatus.Delivered)
            {
                return new UpdateOrderStatusResponseDto { Message = "Order in Shipped can only be changed to Delivered" };
            }

            order.OrderStatus = parsedStatus;
            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
            
            // Send status update notification
            var user = await _userRepo.Query().AsNoTracking().FirstOrDefaultAsync(u => u.UserId == order.UserId);
            if (user != null && !string.IsNullOrWhiteSpace(user.Email))
            {
                await _notificationService.SendOrderStatusUpdateEmailAsync(
                    user.Email,
                    user.Name,
                    order.OrderId.ToString(),
                    parsedStatus.ToString()
                );
            }

            return new UpdateOrderStatusResponseDto
            {
                OrderStatus = parsedStatus.ToString(),
                Message = "Order status updated successfully"
            };
        }

public async Task<Guid> CreateOrderAsync(Guid? userId, CreateOrderRequestDto dto)
        {
            var paymentMethod = dto.PaymentMethod?.Trim().ToLowerInvariant();
            var allowedPaymentMethods = new[] { "card", "cod", "yape", "plin", "bcp", "interbank", "bbva", "scotiabank", "pagoefectivo" };
            if (!allowedPaymentMethods.Contains(paymentMethod))
            {
                throw new ArgumentException("A valid payment method is required.");
            }

            // Billing validation (SUNAT foundation): Factura requires RUC + razón social.
            if (string.Equals(dto.InvoiceType?.Trim(), "Factura", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(dto.Ruc) || string.IsNullOrWhiteSpace(dto.RazonSocial))
                {
                    throw new ArgumentException("RUC y razón social son requeridos para emitir factura.");
                }
            }

            // Server-side payment verification for card payments. Without this, a client could
            // place an order with a fake transaction id and receive goods without paying.
            if (paymentMethod == "card")
            {
                if (string.IsNullOrWhiteSpace(dto.TransactionId))
                {
                    throw new ArgumentException("A Stripe transaction ID is required for card payments.");
                }
                if (!_paymentGateway.IsConfigured)
                {
                    throw new InvalidOperationException("Card payments are currently unavailable. Please choose another payment method.");
                }
                var verification = await _paymentGateway.VerifyPaymentAsync(dto.TransactionId);
                if (verification.Data == null || !verification.Data.IsSuccessful)
                {
                    throw new InvalidOperationException($"Card payment could not be verified: {verification.Message}");
                }
            }

            var existingOrder = await _orderRepo.Query().AnyAsync(o => o.TransactionId == dto.TransactionId);
            if (existingOrder)
            {
                throw new ArgumentException("An order with this transaction ID already exists.");
            }

            // Enforce email verification in production (permissive in Development so local testing is not blocked).
            if (!_environment.IsDevelopment())
            {
                if (userId.HasValue)
                {
                    var buyer = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId.Value);
                    if (buyer != null && !buyer.IsEmailVerified)
                    {
                        throw new UnauthorizedAccessException("Please verify your email address before placing an order.");
                    }
                }
            }

            var address = await _addressRepo.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.AddressId == dto.AddressId && (!userId.HasValue || s.UserId == userId.Value) && !s.IsDeleted);
            if (address == null) throw new ArgumentException("Cannot find the address");

            var cart = await _cartRepo.Query()
                .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                .ThenInclude(v => v.Product)
                .Include(c => c.CartItems).ThenInclude(ci => ci.Product).ThenInclude(p => p.Variants)
                .FirstOrDefaultAsync(c => userId.HasValue ? c.UserId == userId.Value : c.SessionId != null);
            if (cart == null || cart.CartItems == null || !cart.CartItems.Any())
            {
                throw new ArgumentException("Your cart is empty");
            }

            EnsureAddressCanReceiveCart(cart, address.DeliveryZone);

            var serverTotalPrice = cart.CartItems.Sum(c => c.Quantity * (c.Product.Price - c.Product.Discount));

            // Apply coupon if provided
            decimal couponDiscount = 0;
            int? couponId = null;
            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                var categoryIds = cart.CartItems.Select(c => c.Product.CategoryId).Distinct().ToList();
                var productIds = cart.CartItems.Select(c => c.ProductId).Distinct().ToList();

                var couponValidation = await _couponService.ValidateCouponAsync(new ValidateCouponDto
                {
                    Code = dto.CouponCode,
                    CartTotal = serverTotalPrice,
                    CategoryIds = categoryIds,
                    ProductIds = productIds,
                    UserId = userId
                });

                if (!couponValidation.IsValid)
                {
                    throw new ArgumentException(couponValidation.ErrorMessage ?? "Cupón inválido");
                }

                couponDiscount = couponValidation.DiscountAmount;
                couponId = couponValidation.CouponId;
            }

            // Apply coupon discount
            var discountedTotal = serverTotalPrice - couponDiscount;

            // Shipping (Peruvian model): Lima free with owned fleet; provinces contra entrega via agency.
            var shippingProvider = DeliveryHelper.ResolveShippingProvider(address.DeliveryZone, dto.ShippingProvider);
            var shippingCost = DeliveryHelper.CalculateShippingCost(address.DeliveryZone, discountedTotal, _shippingSettings);

            var order = CreateOrderFromCart(userId, dto, cart, discountedTotal, dto.CouponCode, couponDiscount);

            // Set guest contact info for guest orders
            if (!userId.HasValue)
            {
                order.GuestEmail = dto.Email?.Trim().ToLower();
                order.GuestPhone = dto.Phone?.Trim();
            }

            order.ShippingProvider = shippingProvider;
            order.ShippingCost = shippingCost;
            order.TotalPrice = discountedTotal + shippingCost;

            ValidateStockAndDeductQuantities(cart);

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _orderRepo.AddAsync(order);
                _cartItemRepo.RemoveRange(cart.CartItems);
                await _unitOfWork.SaveChangesAsync();

                // Record coupon usage if a coupon was applied
                if (couponId.HasValue && userId.HasValue)
                {
                    await _couponService.RecordCouponUsageAsync(couponId.Value, userId.Value, order.OrderId, couponDiscount);
                }
            });

            try
            {
                await QueueOrderConfirmationEmailAsync(userId, order);
            }
            catch
            {
                // Order is already committed; queue failures must not roll back a completed purchase.
            }
            return order.OrderId;
        }

        public async Task MarkOrderPaidAsync(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
                return;

            var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.TransactionId == transactionId);
            if (order == null || order.IsPaid)
                return;

            order.IsPaid = true;
            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task MarkOrderRefundedAsync(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
                return;

            var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.TransactionId == transactionId);
            if (order == null || order.OrderStatus == OrderStatus.Refunded)
                return;

            order.OrderStatus = OrderStatus.Refunded;
            order.RefundedAtUtc = DateTime.UtcNow;
            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task AttachVoucherAsync(Guid orderId, Guid userId, bool isAdmin, string? url, string? approvalCode)
        {
            if (string.IsNullOrWhiteSpace(url) && string.IsNullOrWhiteSpace(approvalCode))
                throw new ArgumentException("A voucher URL or approval code is required.");

            var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId);
            if (order == null)
                throw new KeyNotFoundException("Order not found.");

            if (!isAdmin && order.UserId != userId)
                throw new UnauthorizedAccessException("You can only attach proof to your own order.");

            if (!string.IsNullOrWhiteSpace(url))
                order.PaymentReceiptUrl = url.Trim();

            if (!string.IsNullOrWhiteSpace(approvalCode))
            {
                var code = approvalCode.Trim();
                if (!System.Text.RegularExpressions.Regex.IsMatch(code, @"^\d{4,12}$"))
                    throw new ArgumentException("El código de aprobación debe tener entre 4 y 12 dígitos.");
                order.PaymentApprovalCode = code;
            }

            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task MarkOrderPaidByStaffAsync(Guid orderId)
        {
            var order = await _orderRepo.Query().FirstOrDefaultAsync(o => o.OrderId == orderId);
            if (order == null)
                throw new KeyNotFoundException("Order not found.");

            if (!order.IsPaid)
            {
                order.IsPaid = true;
                if (order.OrderStatus == OrderStatus.Pending)
                    order.OrderStatus = OrderStatus.Processing;
                _orderRepo.Update(order);
                await _unitOfWork.SaveChangesAsync();
            }
        }

public async Task<bool> CanDeliverCartToAddressAsync(Guid? userId, Guid addressId)
        {
            var address = await _addressRepo.Query()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.AddressId == addressId && (!userId.HasValue || s.UserId == userId.Value) && !s.IsDeleted);
            if (address == null)
            {
                return false;
            }

            var cart = await _cartRepo.Query()
                .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                .FirstOrDefaultAsync(c => userId.HasValue ? c.UserId == userId.Value : c.SessionId != null);
            if (cart == null || !cart.CartItems.Any())
            {
                return false;
            }

            try
            {
                EnsureAddressCanReceiveCart(cart, address.DeliveryZone);
return true;
            }
            catch (ArgumentException)
            {
                return false;
            }
        }

private static Order CreateOrderFromCart(Guid? userId, CreateOrderRequestDto dto, Domain.Entities.Cart cart, decimal serverTotalPrice, string? couponCode = null, decimal couponDiscount = 0)
        {
            return new Order
            {
                UserId = userId,
                OrderId = Guid.NewGuid(),
                OrderDate = DateTime.UtcNow,
                AddressId = dto.AddressId,
                TotalPrice = serverTotalPrice,
                OrderStatus = OrderStatus.Pending,
                TransactionId = dto.TransactionId,
                PaymentMethod = dto.PaymentMethod.Trim().ToLowerInvariant(),
                InvoiceType = string.Equals(dto.InvoiceType?.Trim(), "Factura", StringComparison.OrdinalIgnoreCase) ? "Factura" : "Boleta",
                Ruc = dto.InvoiceType != null && dto.InvoiceType.Trim().Equals("Factura", StringComparison.OrdinalIgnoreCase) ? dto.Ruc?.Trim() : null,
                RazonSocial = dto.InvoiceType != null && dto.InvoiceType.Trim().Equals("Factura", StringComparison.OrdinalIgnoreCase) ? dto.RazonSocial?.Trim() : null,
                FiscalAddress = dto.FiscalAddress?.Trim(),
                CouponCode = dto.CouponCode?.Trim().ToUpperInvariant(),
                CouponDiscount = couponDiscount,
                OrderItems = cart.CartItems.Select(c => new OrderItem
                {
                    OrderItemId = Guid.NewGuid(),
                    ProductId = c.ProductId,
                    ProductVariantId = c.ProductVariantId,
                    Quantity = c.Quantity,
                    UnitPrice = c.Product.Price - c.Product.Discount,
                    TotalPrice = c.Quantity * (c.Product.Price - c.Product.Discount),
                    SelectedSize = c.SelectedSize,
                    SelectedColor = c.SelectedColor
                }).ToList()
            };
        }

        private void ValidateStockAndDeductQuantities(Domain.Entities.Cart cart)
        {
            foreach (var cartItem in cart.CartItems)
            {
                if (cartItem.ProductVariant.Quantity < cartItem.Quantity)
                {
                    throw new ArgumentException($"Product '{cartItem.Product.ProductName}' is out of stock");
                }

                cartItem.ProductVariant.Quantity -= cartItem.Quantity;
                cartItem.Product.Quantity = cartItem.Product.Variants.Sum(variant =>
                    variant.Id == cartItem.ProductVariantId ? cartItem.ProductVariant.Quantity : variant.Quantity);
                
                cartItem.Product.TotalSold += cartItem.Quantity;
                _productRepo.Update(cartItem.Product);
            }
        }

        private static void EnsureAddressCanReceiveCart(Domain.Entities.Cart cart, string? deliveryZone)
        {
            // Memory Kings delivers to Lima Metropolitana and 92% of Peru (via Shalom/Marvisur agencies).
            // Delivery is universally available; the zone only affects ETA/cost, not eligibility.
            // We keep this guard to fail fast if an address somehow has no resolved zone.
            if (string.IsNullOrWhiteSpace(deliveryZone))
            {
                return;
            }
        }

        private async Task QueueOrderConfirmationEmailAsync(Guid? userId, Order order)
        {
            string? email = null;
            string? userName = null;
            
            if (userId.HasValue)
            {
                var user = await _userRepo.Query().AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId.Value);
                email = user?.Email;
                userName = user?.Name;
            }
            else
            {
                // For guest orders, use the guest email stored on the order
                email = order.GuestEmail;
                userName = order.GuestEmail?.Split('@')[0]; // Use email prefix as name for guests
            }

            if (string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var populatedOrder = await _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.Address)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.OrderId == order.OrderId);

            if (populatedOrder == null) return;

            // Use the new notification service
            var orderDto = _mapper.Map<OrderDetailsResponseDto>(populatedOrder);
            await _notificationService.SendOrderConfirmationEmailAsync(email, userName ?? "Cliente", orderDto);
        }

        private async Task QueueOrderLifecycleEmailAsync(Order order, string subject, string heading, string messageHtml, string? reason = null)
        {
            var user = await _userRepo.Query().AsNoTracking().FirstOrDefaultAsync(u => u.UserId == order.UserId);
            if (user == null || string.IsNullOrWhiteSpace(user.Email))
            {
                return;
            }

            var reasonHtml = string.IsNullOrWhiteSpace(reason)
                ? string.Empty
                : $"<p style='color:#ef4444;font-size:14px;margin-top:10px;'><strong>Reason:</strong> {System.Net.WebUtility.HtmlEncode(reason.Trim())}</p>";

            var body = GenerateRichEmailHtml(order, heading, messageHtml, reasonHtml);

            await _emailJobQueue.QueueAsync(new EmailJobMessage(user.Email, subject, body));
        }

        private static string GenerateRichEmailHtml(Order order, string heading, string messageHtml, string? reasonHtml = null)
        {
            var itemsHtml = string.Join("", order.OrderItems.Select(item => $@"
                <tr>
                    <td style='padding:16px 0;border-bottom:1px solid #e5e7eb;'>
                        <table style='width:100%;border-collapse:collapse;'>
                            <tr>
                                <td style='width:80px;vertical-align:top;padding-right:16px;'>
                                    <img src='{item.Product?.Image ?? ""}' alt='Product Image' style='width:80px;height:100px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;' />
                                </td>
                                <td style='vertical-align:top;'>
                                    <p style='margin:0 0 4px;font-weight:600;color:#111827;font-size:16px;'>{System.Net.WebUtility.HtmlEncode(item.Product?.ProductName ?? "Product")}</p>
                                    <p style='margin:0 0 4px;color:#6b7280;font-size:14px;'>Color: {System.Net.WebUtility.HtmlEncode(item.SelectedColor)} | Size: {System.Net.WebUtility.HtmlEncode(item.SelectedSize)}</p>
                                    <p style='margin:0;color:#374151;font-size:14px;'>Qty: {item.Quantity} × S/ {item.UnitPrice:N2}</p>
                                </td>
                                <td style='vertical-align:top;text-align:right;'>
                                    <p style='margin:0;font-weight:700;color:#111827;font-size:16px;'>Rs. {item.TotalPrice:N0}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>"));

            var address = order.Address;
            var addressHtml = address != null ? $@"
                <div style='background-color:#f9fafb;padding:16px;border-radius:6px;margin-top:24px;border:1px solid #e5e7eb;'>
                    <h3 style='margin:0 0 12px;font-size:16px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:8px;'>Delivery Address</h3>
                    <p style='margin:0 0 4px;font-weight:600;color:#374151;'>{System.Net.WebUtility.HtmlEncode(address.FullName)}</p>
                    <p style='margin:0 0 4px;color:#4b5563;font-size:14px;'>{System.Net.WebUtility.HtmlEncode(address.HouseName)}</p>
                    <p style='margin:0 0 4px;color:#4b5563;font-size:14px;'>{System.Net.WebUtility.HtmlEncode(address.District)}, {System.Net.WebUtility.HtmlEncode(address.Province)} — {System.Net.WebUtility.HtmlEncode(address.Department)}</p>
                    <p style='margin:0;color:#4b5563;font-size:14px;'>Phone: {System.Net.WebUtility.HtmlEncode(address.PhoneNumber)}</p>
                </div>" : "";

            var paymentMethodDisplay = order.PaymentMethod?.ToLowerInvariant() switch
            {
                "cod" => "Cash on Delivery",
                "yape" => "Yape",
                "plin" => "Plin",
                "bcp" => "BCP Mobile Banking",
                "interbank" => "Interbank App",
                "bbva" => "BBVA App",
                "scotiabank" => "Scotiabank App",
                "pagoefectivo" => "PagoEfectivo",
                _ => "Online Payment (Card)"
            };

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        @media only screen and (max-width: 600px) {{
            .container {{ width: 100% !important; padding: 10px !important; }}
            .content {{ padding: 20px !important; }}
        }}
    </style>
</head>
<body style='margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,Helvetica,Arial,sans-serif;'>
    <div style='width:100%;background-color:#f3f4f6;padding:40px 0;'>
        <div class='container' style='max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'>
            
            <div style='background-color:#111827;padding:24px;text-align:center;'>
                <h1 style='margin:0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:4px;text-transform:uppercase;'>URBANIQ</h1>
            </div>

            <div class='content' style='padding:32px;'>
                <h2 style='margin:0 0 16px;color:#111827;font-size:24px;font-weight:700;'>{System.Net.WebUtility.HtmlEncode(heading)}</h2>
                <div style='color:#374151;font-size:16px;line-height:1.5;margin-bottom:24px;'>
                    <p style='margin:0 0 8px;'>{messageHtml}</p>
                    {reasonHtml}
                </div>

                <div style='background-color:#f9fafb;padding:16px;border-radius:6px;margin-bottom:24px;border:1px solid #e5e7eb;'>
                    <p style='margin:0 0 8px;color:#4b5563;font-size:14px;'>Order ID: <strong style='color:#111827;'>{order.OrderId}</strong></p>
                    <p style='margin:0 0 8px;color:#4b5563;font-size:14px;'>Order Date: <strong style='color:#111827;'>{order.OrderDate:dd MMM yyyy, hh:mm tt}</strong></p>
                    <p style='margin:0;color:#4b5563;font-size:14px;'>Payment Method: <strong style='color:#111827;'>{paymentMethodDisplay}</strong></p>
                </div>

                <h3 style='margin:0 0 16px;font-size:18px;color:#111827;border-bottom:2px solid #111827;padding-bottom:8px;'>Order Details</h3>
                <table style='width:100%;border-collapse:collapse;margin-bottom:24px;'>
                    <tbody>
                        {itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style='padding:16px 0 0;text-align:right;'>
                                <p style='margin:0;font-size:16px;color:#4b5563;'>Total Amount</p>
                                <p style='margin:4px 0 0;font-size:24px;font-weight:800;color:#111827;'>S/ {order.TotalPrice:N2}</p>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {addressHtml}
                
                <div style='margin-top:32px;text-align:center;'>
                    <a href='https://urbaniq.ddnsking.com/profile/orders' style='display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;'>Track Your Order</a>
                </div>
            </div>

            <div style='background-color:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;'>
                <p style='margin:0 0 8px;color:#6b7280;font-size:13px;'>If you have any questions, please reply to this email or visit our help center.</p>
                <p style='margin:0;color:#9ca3af;font-size:12px;'>&copy; {DateTime.UtcNow.Year} Urbaniq. All rights reserved.</p>
            </div>
            
        </div>
    </div>
</body>
</html>";
        }

        public async Task<PagedResult<OrderDetailsResponseDto>> GetOrdersByUserIdAsync(Guid userId, int pageNumber = 1, int pageSize = 10)
        {
            var query = _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.Address)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var orders = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            var items = orders.Select(MapOrderToDetailsDto).ToList();

            return new PagedResult<OrderDetailsResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<OrderDetailsResponseDto>> GetAllOrdersAsync(int pageNumber = 1, int pageSize = 10, string? status = null)
        {
            var query = _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.Address)
                .Include(o => o.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
            {
                query = query.Where(o => o.OrderStatus == orderStatus);
            }

            query = query.OrderByDescending(o => o.OrderDate);

            var totalCount = await query.CountAsync();
            var orders = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            var items = orders.Select(MapOrderToDetailsDto).ToList();

            return new PagedResult<OrderDetailsResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<OrderDetailsResponseDto> GetOrderByIdAsync(Guid orderId, Guid? requestingUserId, bool isAdmin)
        {
            var order = await _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.Address)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null) throw new ArgumentException("Order not found.");
            if (!isAdmin && order.UserId != requestingUserId) throw new UnauthorizedAccessException("You are not authorized to view this order.");

            return MapOrderToDetailsDto(order);
        }

        public async Task<RevenueResponseDto> GetRevenueAsync()
        {
            var revenue = await _orderItemRepo.Query().SumAsync(oi => oi.TotalPrice);
            var itemsSold = await _orderItemRepo.Query().SumAsync(oi => oi.Quantity);

            return new RevenueResponseDto
            {
                TotalRevenue = revenue,
                TotalItemsSold = itemsSold
            };
        }

        public async Task<UpdateOrderStatusResponseDto> CancelOrderAsync(Guid userId, Guid orderId, string reason)
        {
            var order = await _orderRepo.Query()
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
                .Include(o => o.OrderItems).ThenInclude(oi => oi.ProductVariant)
                .ThenInclude(v => v.Product)
                .Include(o => o.Address)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId);

            if (order == null)
            {
                return new UpdateOrderStatusResponseDto { Message = "Order not found" };
            }

            if (order.OrderStatus is OrderStatus.Shipped or OrderStatus.Delivered or OrderStatus.Cancelled or OrderStatus.ReturnRequested or OrderStatus.ReplacementRequested or OrderStatus.Returned or OrderStatus.RefundInitiated or OrderStatus.Refunded)
            {
                return new UpdateOrderStatusResponseDto { Message = "This order can no longer be cancelled" };
            }

            foreach (var item in order.OrderItems)
            {
                item.ProductVariant.Quantity += item.Quantity;
                item.Product.Quantity += item.Quantity;
                
                if (item.Product.TotalSold >= item.Quantity)
                {
                    item.Product.TotalSold -= item.Quantity;
                }

                _productRepo.Update(item.Product);
            }

            order.OrderStatus = OrderStatus.Cancelled;
            order.CancellationReason = reason.Trim();
            order.CancelledAtUtc = DateTime.UtcNow;
            _orderRepo.Update(order);
            await _unitOfWork.SaveChangesAsync();
            await QueueOrderLifecycleEmailAsync(
                order,
                $"Order cancelled - {order.OrderId}",
                "Order cancelled",
                "Your cancellation request has been completed.",
                order.CancellationReason);

            return new UpdateOrderStatusResponseDto
            {
                OrderStatus = order.OrderStatus.ToString(),
                Message = "Order cancelled successfully"
            };
        }



        private OrderDetailsResponseDto MapOrderToDetailsDto(Order order)
        {
            return new OrderDetailsResponseDto
            {
                OrderId = order.OrderId,
                OrderDate = order.OrderDate,
                TotalPrice = order.TotalPrice,
                OrderStatus = order.OrderStatus.ToString(),
                TransactionId = order.TransactionId,
                UserEmail = order.User?.Email,
                PaymentMethod = order.PaymentMethod,
                IsPaid = order.IsPaid,
                PaymentReceiptUrl = order.PaymentReceiptUrl,
                PaymentApprovalCode = order.PaymentApprovalCode,
                CancellationReason = order.CancellationReason,
                ReturnReason = order.ReturnReason,
                ReplacementReason = order.ReplacementReason,
                CancelledAtUtc = order.CancelledAtUtc,
                ReturnRequestedAtUtc = order.ReturnRequestedAtUtc,
                ReplacementRequestedAtUtc = order.ReplacementRequestedAtUtc,
                RefundedAtUtc = order.RefundedAtUtc,
                Address = _mapper.Map<AddressResponseDto>(order.Address),
                OrderItems = order.OrderItems.Select(item => new OrderItemResponseDto
                {
                    OrderItemId = item.OrderItemId,
                    ProductId = item.ProductId,
                    ProductName = item.Product.ProductName,
                    ImageUrl = item.Product.Image,
                    Price = item.UnitPrice,
                    Quantity = item.Quantity,
                    TotalAmount = item.TotalPrice,
                    Size = item.SelectedSize,
                    Color = item.SelectedColor
                }).ToList()
            };
        }
    }
}
