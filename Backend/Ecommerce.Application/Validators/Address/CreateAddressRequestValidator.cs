using Ecommerce.Application.DTOs.Address;
using FluentValidation;

namespace Ecommerce.Application.Validators.Address
{
    public class CreateAddressRequestValidator : AbstractValidator<CreateAddressRequestDto>
    {
        public CreateAddressRequestValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required")
                .MaximumLength(100)
                .Matches(@"^[A-Za-z][A-Za-z\s.'-]*$").WithMessage("Full name contains invalid characters");
            RuleFor(x => x.PhoneNumber).NotEmpty().Matches(@"^\d{9}$").WithMessage("El número de teléfono debe tener 9 dígitos");
            RuleFor(x => x.Department).NotEmpty().MaximumLength(100).WithMessage("Department is required");
            RuleFor(x => x.Province).NotEmpty().MaximumLength(100).WithMessage("Province is required");
            RuleFor(x => x.District).NotEmpty().MaximumLength(100).WithMessage("District is required");
            RuleFor(x => x.HouseName).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Place)
                .NotEmpty()
                .MaximumLength(100)
                .Matches(@"^[A-Za-z][A-Za-z\s.'-]*$").WithMessage("Place contains invalid characters");
            RuleFor(x => x.Reference).NotEmpty().MaximumLength(100);
            RuleFor(x => x.LandMark).NotEmpty().MaximumLength(200);
        }
    }
}
