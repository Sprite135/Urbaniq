using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Interfaces.Notifications;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly IEmailSender _emailSender;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(IEmailSender emailSender, ILogger<NotificationService> logger)
        {
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task SendOrderConfirmationEmailAsync(string userEmail, string userName, OrderDetailsResponseDto order)
        {
            var subject = $"Tu pedido #{order.OrderId} ha sido confirmado";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 8px; margin-top: 20px; }}
        .order-info {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9d731e; }}
        .item {{ border-bottom: 1px solid #eee; padding: 15px 0; }}
        .item:last-child {{ border-bottom: none; }}
        .total {{ font-size: 20px; font-weight: bold; color: #9d731e; text-align: right; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>¡Pedido Confirmado!</h1>
            <p>Gracias por tu compra en Urbaniq</p>
        </div>
        <div class='content'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>Tu pedido ha sido confirmado exitosamente. Aquí están los detalles:</p>
            
            <div class='order-info'>
                <h3>Pedido #{order.OrderId}</h3>
                <p><strong>Fecha:</strong> {order.OrderDate:dd/MM/yyyy}</p>
                <p><strong>Método de pago:</strong> {order.PaymentMethod}</p>
                <p><strong>Estado:</strong> {order.OrderStatus}</p>
            </div>

            <h3>Productos:</h3>
            {order.OrderItems.Aggregate(string.Empty, (acc, item) => acc + $@"
            <div class='item'>
                <p><strong>{item.ProductName}</strong></p>
                <p>Cantidad: {item.Quantity} × S/ {item.Price:F2}</p>
                <p>Subtotal: S/ {(item.Quantity * item.Price):F2}</p>
            </div>
            ")}

            <div class='total'>
                Total: S/ {order.TotalPrice:F2}
            </div>

            <p><strong>Dirección de envío:</strong></p>
            <p>{order.Address?.HouseName ?? "N/A"}, {order.Address?.Place ?? "N/A"}</p>
            <p>{order.Address?.District ?? "N/A"}, {order.Address?.Province ?? "N/A"}, {order.Address?.Department ?? "N/A"}</p>

            <p style='text-align: center;'>
                <a href='https://urbaniq.com/orders/{order.OrderId}' class='btn'>Ver tu pedido</a>
            </p>
        </div>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
            <p>Si tienes preguntas, responde a este email.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Order confirmation email sent to {Email} for order {OrderId}", userEmail, order.OrderId);
        }

        public async Task SendOrderStatusUpdateEmailAsync(string userEmail, string userName, string orderNumber, string newStatus)
        {
            var subject = $"Actualización de tu pedido #{orderNumber}";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .status-box {{ background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9d731e; }}
        .status {{ font-size: 24px; font-weight: bold; color: #9d731e; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Actualización de Pedido</h1>
        </div>
        <div class='status-box'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>Tu pedido <strong>#{orderNumber}</strong> ha sido actualizado.</p>
            <p class='status'>Estado: {newStatus}</p>
        </div>
        <p style='text-align: center;'>
            <a href='https://urbaniq.com/orders' class='btn'>Ver detalles del pedido</a>
        </p>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Order status update email sent to {Email} for order {OrderNumber}", userEmail, orderNumber);
        }

        public async Task SendPasswordResetEmailAsync(string userEmail, string userName, string resetLink)
        {
            var subject = "Restablecer tu contraseña - Urbaniq";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 8px; margin-top: 20px; }}
        .warning {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Restablecer Contraseña</h1>
        </div>
        <div class='content'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            
            <p style='text-align: center;'>
                <a href='{resetLink}' class='btn'>Restablecer Contraseña</a>
            </p>

            <div class='warning'>
                <p><strong>⚠️ Importante:</strong></p>
                <ul>
                    <li>Este enlace expira en 1 hora</li>
                    <li>Si no solicitaste este cambio, ignora este email</li>
                    <li>No compartas este enlace con nadie</li>
                </ul>
            </div>
        </div>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Password reset email sent to {Email}", userEmail);
        }

        public async Task SendEmailVerificationEmailAsync(string userEmail, string userName, string verificationLink)
        {
            var subject = "Verifica tu email - Urbaniq";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 8px; margin-top: 20px; }}
        .info {{ background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Verifica tu Email</h1>
        </div>
        <div class='content'>
            <p>¡Bienvenido <strong>{userName}</strong>!</p>
            <p>Gracias por registrarte en Urbaniq. Para completar tu registro, necesitamos verificar tu dirección de email.</p>
            
            <p style='text-align: center;'>
                <a href='{verificationLink}' class='btn'>Verificar Email</a>
            </p>

            <div class='info'>
                <p><strong>¿Por qué verificar?</strong></p>
                <p>Verificar tu email nos permite:</p>
                <ul>
                    <li>Proteger tu cuenta de accesos no autorizados</li>
                    <li>Enviarte notificaciones importantes sobre tus pedidos</li>
                    <li>Recuperar tu contraseña si la olvidas</li>
                </ul>
            </div>
        </div>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Email verification sent to {Email}", userEmail);
        }

        public async Task SendWelcomeEmailAsync(string userEmail, string userName)
        {
            var subject = "¡Bienvenido a Urbaniq!";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 8px; margin-top: 20px; }}
        .offer {{ background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>¡Bienvenido a Urbaniq!</h1>
        </div>
        <div class='content'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>¡Nos emociona tenerte con nosotros! Estás a punto de descubrir la mejor selección de productos tecnológicos.</p>
            
            <div class='offer'>
                <h3>🎁 Tu regalo de bienvenida</h3>
                <p>Usa el código <strong>BIENVENIDO10</strong> para obtener un <strong>10% de descuento</strong> en tu primera compra.</p>
                <p><small>Válido por 30 días desde el registro.</small></p>
            </div>

            <p style='text-align: center;'>
                <a href='https://urbaniq.com/catalog' class='btn'>Explorar Productos</a>
            </p>

            <h3>¿Qué puedes hacer en Urbaniq?</h3>
            <ul>
                <li>📱 Comprar los mejores productos tecnológicos</li>
                <li>🎯 Rastrear tus pedidos en tiempo real</li>
                <li>💳 Pagos seguros con múltiples métodos</li>
                <li>⭐ Dejar reseñas de tus productos favoritos</li>
                <li>❤️ Crear listas de deseos</li>
            </ul>
        </div>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Welcome email sent to {Email}", userEmail);
        }

        public async Task SendLowStockAlertAsync(string productName, int currentStock, int threshold)
        {
            var subject = $"⚠️ Alerta: Stock bajo - {productName}";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #dc3545; color: white; padding: 30px; text-align: center; }}
        .alert {{ background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⚠️ Alerta de Stock Bajo</h1>
        </div>
        <div class='alert'>
            <h3>Producto: {productName}</h3>
            <p><strong>Stock actual:</strong> {currentStock} unidades</p>
            <p><strong>Umbral mínimo:</strong> {threshold} unidades</p>
            <p><strong>Acción requerida:</strong> Reabastecer producto urgentemente</p>
        </div>
        <div class='footer'>
            <p>© 2024 Urbaniq. Sistema de inventario.</p>
        </div>
    </div>
</body>
</html>";

            // Send to admin email (should be configured in settings)
            await _emailSender.SendAsync("admin@urbaniq.com", subject, body);
            _logger.LogWarning("Low stock alert sent for product {Product}", productName);
        }

        public async Task SendWishlistPriceDropAlertAsync(string userEmail, string userName, string productName, decimal oldPrice, decimal newPrice)
        {
            var discount = ((oldPrice - newPrice) / oldPrice) * 100;
            var subject = $"¡Precio reducido! {productName} - {discount:F0}% de descuento";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: white; padding: 30px; text-align: center; }}
        .price-drop {{ background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }}
        .old-price {{ text-decoration: line-through; color: #999; }}
        .new-price {{ font-size: 28px; font-weight: bold; color: #28a745; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>¡Buenas noticias!</h1>
        </div>
        <div class='price-drop'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>Un producto de tu lista de deseos ha reducido su precio:</p>
            <h3>{productName}</h3>
            <p>
                <span class='old-price'>S/ {oldPrice:F2}</span> → 
                <span class='new-price'>S/ {newPrice:F2}</span>
            </p>
            <p style='font-size: 20px; color: #28a745; font-weight: bold;'>¡{discount:F0}% de descuento!</p>
        </div>
        <p style='text-align: center;'>
            <a href='https://urbaniq.com/product/{productName.ToLower().Replace(' ', '-')}' class='btn'>Comprar Ahora</a>
        </p>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Price drop alert sent to {Email} for product {Product}", userEmail, productName);
        }

        public async Task SendWishlistStockAvailableAlertAsync(string userEmail, string userName, string productName)
        {
            var subject = $"¡Disponible nuevamente! {productName}";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9d731e 0%, #7a5918 100%); color: white; padding: 30px; text-align: center; }}
        .stock-alert {{ background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }}
        .btn {{ display: inline-block; background: #9d731e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>¡Stock Disponible!</h1>
        </div>
        <div class='stock-alert'>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>¡Buenas noticias! El producto que tenías en tu lista de deseos está disponible nuevamente:</p>
            <h3>{productName}</h3>
            <p>La cantidad es limitada, ¡apresúrate antes de que se agote!</p>
        </div>
        <p style='text-align: center;'>
            <a href='https://urbaniq.com/product/{productName.ToLower().Replace(' ', '-')}' class='btn'>Comprar Ahora</a>
        </p>
        <div class='footer'>
            <p>© 2024 Urbaniq. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>";

            await _emailSender.SendAsync(userEmail, subject, body);
            _logger.LogInformation("Stock available alert sent to {Email} for product {Product}", userEmail, productName);
        }
    }
}