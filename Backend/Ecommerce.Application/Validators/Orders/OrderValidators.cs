using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Domain.Enums;
using FluentValidation;

namespace Ecommerce.Application.Validators.Orders
{
    public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequestDto>
    {
        private static readonly string[] AllowedPaymentMethods = 
        {
            "card", "cod", "yape", "plin", "bcp", "interbank", "bbva", "scotiabank", "pagoefectivo"
        };

        public CreateOrderRequestValidator()
        {
            RuleFor(x => x.AddressId).NotEmpty().WithMessage("AddressId is required");
            RuleFor(x => x.TransactionId).NotEmpty().MaximumLength(100)
                .WithMessage("TransactionId is required and must be under 100 characters");
            RuleFor(x => x.PaymentMethod)
                .NotEmpty().WithMessage("Payment method is required")
                .Must(method => AllowedPaymentMethods.Contains(method.ToLowerInvariant()))
                .WithMessage($"Payment method must be one of: {string.Join(", ", AllowedPaymentMethods)}");
        }
    }

    public class ChangeOrderStatusRequestValidator : AbstractValidator<ChangeOrderStatusRequestDto>
    {
        public ChangeOrderStatusRequestValidator()
        {
            RuleFor(x => x.Status).NotEmpty()
                .Must(s => Enum.TryParse<OrderStatus>(s, true, out _))
                .WithMessage("Status must be one of: Pending, Processing, Shipped, Delivered, Cancelled, ReturnRequested, ReplacementRequested, Returned, RefundInitiated, Refunded");
        }
    }

    public class OrderActionRequestValidator : AbstractValidator<OrderActionRequestDto>
    {
        public OrderActionRequestValidator()
        {
            RuleFor(x => x.Reason)
                .NotEmpty()
                .MaximumLength(500)
                .WithMessage("Reason is required and must be under 500 characters");
        }
    }
}
