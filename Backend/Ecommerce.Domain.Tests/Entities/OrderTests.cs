using System;
using Xunit;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Domain.Tests.Entities
{
    public class OrderTests
    {
        [Fact]
        public void Order_WhenCreated_ShouldHaveDefaultValues()
        {
            // Arrange & Act
            var order = new Order();

            // Assert
            Assert.Equal(OrderStatus.Pending, order.OrderStatus);
            Assert.False(order.IsPaid);
            Assert.Equal("Boleta", order.InvoiceType);
            Assert.Equal(0, order.ShippingCost);
        }

        [Fact]
        public void Order_WithPricing_ShouldSetTotalPrice()
        {
            // Arrange & Act
            var order = new Order
            {
                TotalPrice = 1500
            };

            // Assert
            Assert.Equal(1500, order.TotalPrice);
        }

        [Fact]
        public void Order_WithPayment_ShouldMarkAsPaid()
        {
            // Arrange & Act
            var order = new Order
            {
                IsPaid = true,
                PaymentMethod = "card"
            };

            // Assert
            Assert.True(order.IsPaid);
            Assert.Equal("card", order.PaymentMethod);
        }

        [Fact]
        public void Order_WithTransactionId_ShouldSetTransactionId()
        {
            // Arrange & Act
            var order = new Order
            {
                TransactionId = "txn_123456"
            };

            // Assert
            Assert.Equal("txn_123456", order.TransactionId);
        }

        [Fact]
        public void Order_WithShippingCost_ShouldSetCost()
        {
            // Arrange & Act
            var order = new Order
            {
                ShippingCost = 25
            };

            // Assert
            Assert.Equal(25, order.ShippingCost);
        }

        [Fact]
        public void Order_WithInvoice_ShouldSetInvoiceDetails()
        {
            // Arrange & Act
            var order = new Order
            {
                InvoiceType = "Factura",
                Ruc = "20123456789",
                RazonSocial = "Empresa SAC",
                FiscalAddress = "Av. Principal 123"
            };

            // Assert
            Assert.Equal("Factura", order.InvoiceType);
            Assert.Equal("20123456789", order.Ruc);
            Assert.Equal("Empresa SAC", order.RazonSocial);
            Assert.Equal("Av. Principal 123", order.FiscalAddress);
        }

        [Fact]
        public void Order_WithPaymentReceipt_ShouldSetReceiptUrl()
        {
            // Arrange & Act
            var order = new Order
            {
                PaymentReceiptUrl = "https://example.com/receipt.jpg",
                PaymentApprovalCode = "APPROVED123"
            };

            // Assert
            Assert.Equal("https://example.com/receipt.jpg", order.PaymentReceiptUrl);
            Assert.Equal("APPROVED123", order.PaymentApprovalCode);
        }

        [Fact]
        public void Order_WhenCancelled_ShouldSetCancellationDetails()
        {
            // Arrange
            var order = new Order();
            var cancelDate = DateTime.UtcNow;

            // Act
            order.CancellationReason = "Customer request";
            order.CancelledAtUtc = cancelDate;

            // Assert
            Assert.Equal("Customer request", order.CancellationReason);
            Assert.NotNull(order.CancelledAtUtc);
            Assert.Equal(cancelDate, order.CancelledAtUtc);
        }

        [Fact]
        public void Order_WhenReturned_ShouldSetReturnDetails()
        {
            // Arrange
            var order = new Order();
            var returnDate = DateTime.UtcNow;

            // Act
            order.ReturnReason = "Defective product";
            order.ReturnRequestedAtUtc = returnDate;

            // Assert
            Assert.Equal("Defective product", order.ReturnReason);
            Assert.NotNull(order.ReturnRequestedAtUtc);
            Assert.Equal(returnDate, order.ReturnRequestedAtUtc);
        }

        [Fact]
        public void Order_WhenReplaced_ShouldSetReplacementDetails()
        {
            // Arrange
            var order = new Order();
            var replacementDate = DateTime.UtcNow;

            // Act
            order.ReplacementReason = "Wrong size";
            order.ReplacementRequestedAtUtc = replacementDate;

            // Assert
            Assert.Equal("Wrong size", order.ReplacementReason);
            Assert.NotNull(order.ReplacementRequestedAtUtc);
            Assert.Equal(replacementDate, order.ReplacementRequestedAtUtc);
        }

        [Fact]
        public void Order_WhenRefunded_ShouldSetRefundDate()
        {
            // Arrange
            var order = new Order();
            var refundDate = DateTime.UtcNow;

            // Act
            order.RefundedAtUtc = refundDate;

            // Assert
            Assert.NotNull(order.RefundedAtUtc);
            Assert.Equal(refundDate, order.RefundedAtUtc);
        }

        [Fact]
        public void Order_WithGuestInfo_ShouldSetContactDetails()
        {
            // Arrange & Act
            var order = new Order
            {
                GuestEmail = "guest@example.com",
                GuestPhone = "+51987654321"
            };

            // Assert
            Assert.Equal("guest@example.com", order.GuestEmail);
            Assert.Equal("+51987654321", order.GuestPhone);
        }

        [Fact]
        public void Order_WithCoupon_ShouldSetCouponDetails()
        {
            // Arrange & Act
            var order = new Order
            {
                CouponCode = "DISCOUNT20",
                CouponDiscount = 100
            };

            // Assert
            Assert.Equal("DISCOUNT20", order.CouponCode);
            Assert.Equal(100, order.CouponDiscount);
        }

        [Fact]
        public void Order_WithOrderDate_ShouldSetDate()
        {
            // Arrange & Act
            var orderDate = DateTime.UtcNow;
            var order = new Order
            {
                OrderDate = orderDate
            };

            // Assert
            Assert.Equal(orderDate, order.OrderDate);
        }

        [Fact]
        public void Order_ShouldInitializeNavigationProperties()
        {
            // Arrange & Act
            var order = new Order();

            // Assert
            Assert.NotNull(order.OrderItems);
        }

        [Fact]
        public void Order_WithShippingProvider_ShouldSetProvider()
        {
            // Arrange & Act
            var order = new Order
            {
                ShippingProvider = "Olva Courier"
            };

            // Assert
            Assert.Equal("Olva Courier", order.ShippingProvider);
        }
    }
}
