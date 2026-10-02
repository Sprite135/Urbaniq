# Verificación final de Urbaniq

## Compra real — pendiente

Usar una cuenta propia del propietario. No guardar contraseñas en el repositorio ni enviar códigos de autorización al soporte.

1. Comprobar un producto que exista físicamente, precio y variante; agregar una unidad al carrito.
2. Elegir una dirección real de prueba. Confirmar que Lima/Callao suma S/10 y provincias S/25 al total.
3. Seleccionar Yape y crear el pedido antes de transferir. Anotar el número del pedido; comprobar que queda pendiente y que se recibe el correo del pedido.
4. Cerrar la página y volver a Mis pedidos. Debe conservarse el mismo pedido, sin crear otro ni volver a descontar stock.
5. El propietario realiza personalmente el pago si desea verificar un abono real. Verificar en la app del destinatario el número 939810000 y Sebastian Cumpa. No usar un comprobante ficticio en producción.
6. Adjuntar el comprobante al pedido. Confirmar que permanece pendiente de revisión.
7. Desde administración, comprobar realmente el abono antes de marcar pagado. Confirmar que pasa a preparación.
8. Marcar enviado solamente después de un despacho real, y entregado después de la entrega. Comprobar correos y tracker.
9. Probar la solicitud de devolución únicamente con un pedido propio entregado, acordando antes con el comercio el procedimiento. La solicitud no devuelve dinero ni repone stock.

Cancelar un pedido de prueba sin pago permite verificar que el stock se repone una sola vez. Si el pedido ya estaba pagado, coordinar la devolución real del dinero; la cancelación no ejecuta una transferencia.

## Restauración de Azure SQL — pendiente

Última configuración observada: `urbaniqDb`, retención de restauración a un punto en el tiempo de 7 días. Confirmar esta configuración en el portal antes de la prueba. No se ha demostrado una restauración funcional.

El portal Azure y la CLI necesitan una sesión autenticada. Restaurar a un punto en el tiempo crea otra base de datos; acordar el costo y la duración de esa base antes de crearla. No sustituir la base de producción durante la prueba.

1. En Azure, abrir `urbaniqDb`, elegir Restaurar y un punto dentro de la retención disponible.
2. Elegir un nombre diferente y revisar el nivel de servicio y el precio mostrado. Registrar el punto y la hora UTC del respaldo.
3. Una vez creada la base de prueba, verificar tablas, cantidades, pedidos de control, relaciones y stock. Comparar con los datos esperados para el punto elegido, no con pedidos creados después.
4. Probar la aplicación contra la copia en un entorno aislado y con correos y pagos externos desactivados. No cambiar las variables de la tienda real.
5. Guardar un informe de resultados y de cuánto tardó la recuperación. Coordinar la eliminación de la copia cuando ya no sea necesaria.

La restauración de SQL no recupera por sí sola imágenes de Blob Storage ni comprobantes del disco persistente de App Service: acordar también su respaldo y conservación. No interpretar el almacenamiento persistente como una copia de seguridad.

Fuente oficial: https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?view=azuresql

## Catálogo — auditoría pública realizada

Ejecutar `pwsh -NoProfile -File scripts/Audit-Storefront.ps1` para actualizar `artifacts/storefront-audit/catalogo.csv` y `resumen.json`.

Resultado del 2 de octubre de 2026: 144 productos, 141 imágenes que responden 200 y 3 fichas cuya imagen responde 404. Ningún precio/descuento inválido ni stock publicado negativo. Las 144 descripciones tienen menos de 100 caracteres; completar especificaciones, contenido de la caja y condiciones reales de garantía.

Fichas con imagen rota:
- Corsair Vengeance 32 6000.
- Corsair Vengeance 32GB DDR5.
- Crucial Ballistix 32GB DDR4.

Las tres apuntan a `corsair-vengeance-32-6000.jpg`, inexistente. Existe una imagen PNG Corsair, pero no corresponde necesariamente a todos esos productos: especialmente no usar una foto Corsair como si fuera Crucial. Corregir desde administración con la foto del modelo real. No se cambiaron precios ni cantidades físicas sin confirmación del propietario.
