using Ecommerce.Application.DTOs.Payment;
using FluentValidation;

namespace Ecommerce.Application.Validators.Payment
{
    public class CreatePaymentIntentRequestValidator : AbstractValidator<CreatePaymentIntentRequestDto>
    {
        public CreatePaymentIntentRequestValidator()
        {
            RuleFor(x => x.OrderId).NotEmpty();
        }
    }

    public class VerifyPaymentRequestValidator : AbstractValidator<VerifyPaymentRequestDto>
    {
        public VerifyPaymentRequestValidator()
        {
            RuleFor(x => x.OrderId).NotEmpty();
            RuleFor(x => x.PaymentIntentId)
                .NotEmpty().WithMessage("PaymentIntentId is required.")
                .MaximumLength(100).WithMessage("PaymentIntentId must be under 100 characters.")
                .Matches(@"^pi_[A-Za-z0-9_]+$").WithMessage("PaymentIntentId format is invalid.");
        }
    }
}
