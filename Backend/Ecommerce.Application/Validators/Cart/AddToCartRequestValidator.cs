using Ecommerce.Application.DTOs.Cart;
using FluentValidation;

namespace Ecommerce.Application.Validators.Cart
{
    public class AddToCartRequestValidator : AbstractValidator<AddToCartRequestDto>
    {
        public AddToCartRequestValidator()
        {
            RuleFor(x => x.ProductId).NotEmpty().WithMessage("ProductId is required");
            RuleFor(x => x.ProductVariantId).NotEmpty().WithMessage("Product variant is required");
            RuleFor(x => x.Quantity).InclusiveBetween(1, 10).WithMessage("Quantity must be between 1 and 10");
        }
    }
}
