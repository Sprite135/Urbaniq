using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.Validators.Orders;

namespace Ecommerce.UnitTests.Validators;

public class CreateOrderRequestValidatorTests
{
    private readonly CreateOrderRequestValidator _validator = new();

    [Theory]
    [InlineData("card")]
    [InlineData("cod")]
    [InlineData("yape")]
    [InlineData("plin")]
    public void Validate_AvailablePaymentMethod_AcceptsMethod(string paymentMethod)
    {
        var result = _validator.Validate(CreateRequest(paymentMethod));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("bcp")]
    [InlineData("interbank")]
    [InlineData("bbva")]
    [InlineData("scotiabank")]
    [InlineData("pagoefectivo")]
    public void Validate_UnconfiguredPaymentMethod_RejectsMethod(string paymentMethod)
    {
        var result = _validator.Validate(CreateRequest(paymentMethod));

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(CreateOrderRequestDto.PaymentMethod));
    }

    private static CreateOrderRequestDto CreateRequest(string paymentMethod) => new()
    {
        AddressId = Guid.NewGuid(),
        TransactionId = "TXN_TEST",
        PaymentMethod = paymentMethod
    };
}
