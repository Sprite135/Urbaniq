using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.Interfaces.Orders;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Asp.Versioning;

namespace Ecommerce.Api.Controllers.Orders
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion("1.0")]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        public OrderController(IOrderService orderService) => _orderService = orderService;

        private Guid? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : null;
        }

        private bool IsAdmin() => User.IsInRole("Admin");

        [HttpPost("place-order")]
        public async Task<IActionResult> PlaceOrder([FromBody] CreateOrderRequestDto dto)
        {
            var userId = GetUserId();
            var orderId = await _orderService.CreateOrderAsync(userId, dto);
            if (orderId == Guid.Empty)
                return BadRequest(new { message = "Failed to place order" });
            return Ok(new { message = "Order placed successfully", orderId });
        }

        [HttpGet("validate-delivery/{addressId:guid}")]
        public async Task<IActionResult> ValidateDelivery(Guid addressId)
        {
            var userId = GetUserId();
            var canDeliver = await _orderService.CanDeliverCartToAddressAsync(userId, addressId);
            return Ok(new { canDeliver });
        }

        [HttpGet("user-orders")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetUserOrders([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
            => Ok(await _orderService.GetOrdersByUserIdAsync(GetUserId()!.Value, pageNumber, pageSize));

        [HttpGet("all-orders")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrders([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10, [FromQuery] string? status = null)
            => Ok(await _orderService.GetAllOrdersAsync(pageNumber, pageSize, status));

        [HttpGet("{orderId}")]
        [Authorize]
        public async Task<IActionResult> GetOrderById(Guid orderId)
            => Ok(await _orderService.GetOrderByIdAsync(orderId, GetUserId(), IsAdmin()));

        [HttpPut("change-status/{orderId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ChangeOrderStatus(Guid orderId, [FromBody] ChangeOrderStatusRequestDto dto)
        {
            var result = await _orderService.ChangeOrderStatusAsync(orderId, dto.Status);
            return result.Message == "invalidstatus"
                ? BadRequest(new { message = "Invalid order status provided." })
                : Ok(result);
        }

        [HttpPost("{orderId:guid}/cancel")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelOrder(Guid orderId, [FromBody] OrderActionRequestDto dto)
        {
            var result = await _orderService.CancelOrderAsync(GetUserId()!.Value, orderId, dto.Reason);
            return result.Message.Contains("successfully", StringComparison.OrdinalIgnoreCase)
                ? Ok(result)
                : BadRequest(result);
        }

        [HttpPost("{orderId:guid}/voucher")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> AttachVoucher(Guid orderId, [FromBody] AttachVoucherRequestDto dto)
        {
            try
            {
                await _orderService.AttachVoucherAsync(orderId, GetUserId()!.Value, IsAdmin(), dto.Url, dto.ApprovalCode);
                return Ok(new { message = "Voucher attached successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{orderId:guid}/mark-paid")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkPaid(Guid orderId)
        {
            try
            {
                await _orderService.MarkOrderPaidByStaffAsync(orderId);
                return Ok(new { message = "Order marked as paid" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("revenue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTotalRevenue() => Ok(await _orderService.GetRevenueAsync());
    }
}