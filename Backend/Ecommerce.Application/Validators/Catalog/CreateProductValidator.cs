using Ecommerce.Application.DTOs.Catalog;
using FluentValidation;

namespace Ecommerce.Application.Validators.Catalog
{
    /// <summary>
    /// Validates product creation/update requests for the men's clothing store.
    /// Ensures all clothing-specific attributes meet business rules.
    /// </summary>
    public class CreateProductValidator : AbstractValidator<CreateProductRequestDto>
    {
        public CreateProductValidator()
        {
            RuleFor(p => p.ProductName)
                .NotEmpty().WithMessage("Product name is required.")
                .MaximumLength(200).WithMessage("Product name must not exceed 200 characters.");

            RuleFor(p => p.Price)
                .GreaterThan(0).WithMessage("Price must be greater than zero.");

            RuleFor(p => p.Discount)
                .GreaterThanOrEqualTo(0).WithMessage("Discount cannot be negative.")
                .LessThanOrEqualTo(p => p.Price).WithMessage("Discount cannot exceed the price.");

            RuleFor(p => p.Quantity)
                .GreaterThanOrEqualTo(0).WithMessage("Quantity cannot be negative.");

            RuleFor(p => p.DeliverableZones)
                .MaximumLength(500).WithMessage("Deliverable zones must not exceed 500 characters.");

            RuleFor(p => p.Variants)
                .NotEmpty().WithMessage("At least one product variant is required.")
                .Must(variants => variants
                    .Where(variant => !string.IsNullOrWhiteSpace(variant.Size) && !string.IsNullOrWhiteSpace(variant.Color))
                    .Select(variant => $"{variant.Size.Trim().ToLowerInvariant()}|{variant.Color.Trim().ToLowerInvariant()}")
                    .Distinct()
                    .Count() == variants.Count)
                .WithMessage("Each size and color combination must be unique.");

            RuleForEach(p => p.Variants)
                .ChildRules(variant =>
                {
                    variant.RuleFor(v => v.Size)
                        .NotEmpty().WithMessage("Variant size is required.")
                        .MaximumLength(20).WithMessage("Variant size must not exceed 20 characters.");

                    variant.RuleFor(v => v.Color)
                        .NotEmpty().WithMessage("Variant color is required.")
                        .MaximumLength(50).WithMessage("Variant color must not exceed 50 characters.");

                    variant.RuleFor(v => v.Quantity)
                        .GreaterThanOrEqualTo(0).WithMessage("Variant quantity cannot be negative.");
                });

            RuleFor(p => p.Material)
                .MaximumLength(100).WithMessage("Material must not exceed 100 characters.")
                .When(p => p.Material != null);

            RuleFor(p => p.Description)
                .NotEmpty().WithMessage("Description is required.")
                .MaximumLength(500).WithMessage("Description must not exceed 500 characters.");

            RuleFor(p => p.CategoryId)
                .GreaterThan(0).WithMessage("A valid category must be selected.");
        }
    }
}
