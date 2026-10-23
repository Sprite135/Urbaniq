# Estado pendiente de Urbaniq

Estado verificado el 23 de octubre de 2026.

## Conclusión

Urbaniq está listo para una demostración y entrega universitaria local. La compilación, las pruebas automatizadas y el lint pasan. Esto no equivale a una operación comercial en producción: los servicios externos, las credenciales del propietario y los procesos operativos reales todavía deben configurarse y validarse.

## Verificación actual

| Comprobación | Resultado |
|---|---:|
| Backend .NET | Compilación correcta, 0 advertencias y 0 errores |
| Pruebas unitarias backend | 116 de 116 |
| Pruebas de integración backend | 21 de 21 |
| Pruebas frontend | 52 de 52 en 13 archivos |
| Pruebas E2E y visuales | 10 de 10, escritorio y móvil |
| ESLint | Correcto |
| TypeScript y Vite de producción | Correcto |
| Imágenes del catálogo | 144 de 144 responden correctamente |
| Auditoría npm | 0 vulnerabilidades conocidas |
| Auditoría NuGet | 0 paquetes vulnerables conocidos |

## Estado para la entrega universitaria

- El informe incluye las secciones 7 y 8, anexos, bibliografía y respaldo financiero editable.
- El recorrido público de inicio, catálogo, ayuda y términos se valida automáticamente en escritorio y móvil.
- El pipeline oficial compila y prueba el frontend y backend, ejecuta lint y verifica que el frontend quede dentro del paquete publicado.
- Los cambios de la entrega se conservan en Git; antes de exponer, puede crearse una etiqueta con la versión presentada.
- La presentación oral o diapositivas solo son necesarias si el docente las solicita.

## Pendiente antes de una operación comercial real

- Configurar y comprobar SQL Server, Stripe en modo de prueba, SMTP, almacenamiento, dominio y certificados con cuentas del propietario.
- Ejecutar migraciones desde cero y desde una copia anterior; probar respaldo y restauración de la base de datos y de los comprobantes.
- Validar cobros, webhooks duplicados o tardíos, reembolsos, vencimiento de reservas e inventario concurrente con servicios reales de prueba.
- Confirmar el proceso fiscal y legal con un proveedor autorizado. Los datos empresariales y comprobantes actuales son ficticios y académicos.
- Activar monitoreo y alertas, comprobar la salud después del despliegue y ensayar un rollback.
- Ampliar las pruebas E2E autenticadas, de accesibilidad, carga y seguridad antes de recibir usuarios reales.

## Mantenimiento recomendado

- Mantener `.env` y `.env.development` fuera de Git; ambos están ignorados actualmente.
- Mantener `.github/workflows/ci-cd.yml` como procedimiento oficial de CI/CD.
- No versionar carpetas de publicación, archivos ZIP, logs ni temporales. Guardarlos como artefactos de compilación o respaldo.
- Revisar dependencias vulnerables y actualizar paquetes de forma controlada, repitiendo todas las pruebas después de cada actualización.

La descripción vigente de la entrega está en `ENTREGA_UNIVERSITARIA.md`. Los documentos históricos de revisión sirven como evidencia del proceso, pero no deben usarse como estado actual del producto.
