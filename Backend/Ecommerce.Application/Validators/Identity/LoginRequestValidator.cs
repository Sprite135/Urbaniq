using Ecommerce.Application.DTOs.Identity;
using FluentValidation;

namespace Ecommerce.Application.Validators.Identity
{
    public class LoginRequestValidator : AbstractValidator<LoginRequestDto>
    {
        public LoginRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Invalid email format");
            RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(20);
        }
    }
}
