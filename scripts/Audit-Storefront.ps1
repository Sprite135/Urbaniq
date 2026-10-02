param(
    [string]$StoreBase = 'https://urbaniq-backend-jesus2024-b0d6huewaubghcg7.brazilsouth-01.azurewebsites.net',
    [string]$OutputDirectory = 'artifacts/storefront-audit'
)
$ErrorActionPreference = 'Stop'
$items = @()
$page = 1
do {
    $result = Invoke-RestMethod "$StoreBase/api/v1/Product/All?pageNumber=$page&pageSize=100"
    $items += $result.items
    $page++
} while ($page -le $result.totalPages)
$imageChecks = $items | ForEach-Object -Parallel {
    $product = $_
    $imageStatus = 'Sin imagen'
    if ($product.image -match '^https://urbaniqstorage\.blob\.core\.windows\.net/products/') {
        try { $imageStatus = [string](Invoke-WebRequest $product.image -Method Head -TimeoutSec 20).StatusCode }
        catch { $imageStatus = 'Error: ' + $_.Exception.Message }
    } elseif ($product.image) { $imageStatus = 'Origen externo pendiente de revisión' }
    $issues = @()
    if ($product.price -le 0 -or $product.discount -lt 0 -or $product.discount -ge $product.price) { $issues += 'Revisar precio/descuento' }
    if ($product.quantity -lt 0) { $issues += 'Stock negativo' }
    if ($imageStatus -ne '200') { $issues += 'Revisar imagen' }
    if ([string]::IsNullOrWhiteSpace($product.description)) { $issues += 'Sin descripción' }
    elseif ($product.description.Length -lt 100) { $issues += 'Descripción breve: revisar especificaciones y garantía' }
    [PSCustomObject]@{
        Producto = $product.productName; Slug = $product.slug; Precio = $product.price;
        Descuento = $product.discount; PrecioFinal = $product.price - $product.discount;
        StockPublicado = $product.quantity; Imagen = $product.image; EstadoImagen = $imageStatus;
        Observaciones = $issues -join '; '; ConfirmacionComercial = 'Verificar precio, stock físico y garantía con el propietario'
    }
} -ThrottleLimit 6
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$imageChecks | Sort-Object Producto | Export-Csv (Join-Path $OutputDirectory 'catalogo.csv') -NoTypeInformation -Encoding utf8
[PSCustomObject]@{
    Productos = $items.Count;
    ImagenesCorrectas = @($imageChecks | Where-Object EstadoImagen -eq '200').Count;
    ImagenesParaRevisar = @($imageChecks | Where-Object EstadoImagen -ne '200').Count;
    PreciosInvalidos = @($items | Where-Object { $_.price -le 0 -or $_.discount -lt 0 -or $_.discount -ge $_.price }).Count;
    StockNegativo = @($items | Where-Object quantity -lt 0).Count;
    DescripcionesBreves = @($items | Where-Object { $_.description.Length -lt 100 }).Count;
    Nota = 'Auditoría de datos publicados; no verifica inventario físico ni costo del proveedor.'
} | ConvertTo-Json | Tee-Object -FilePath (Join-Path $OutputDirectory 'resumen.json')
