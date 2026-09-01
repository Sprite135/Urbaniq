<#
.SYNOPSIS
    Script para ver logs de Urbaniq de forma fácil.

.DESCRIPTION
    Este script permite ver los logs de la aplicación Urbaniq,
    filtrar por nivel de log, buscar patrones específicos y
    ver los logs más recientes.

.PARAMETER Tail
    Muestra las últimas N líneas (default: 50)

.PARAMETER Level
    Filtra por nivel de log: Information, Warning, Error, Fatal

.PARAMETER Search
    Busca un patrón específico en los logs

.PARAMETER ErrorOnly
    Muestra solo errores

.PARAMETER Today
    Muestra solo logs de hoy

.EXAMPLE
    .\view-logs.ps1
    Muestra las últimas 50 líneas

.EXAMPLE
    .\view-logs.ps1 -Tail 100
    Muestra las últimas 100 líneas

.EXAMPLE
    .\view-logs.ps1 -ErrorOnly
    Muestra solo errores

.EXAMPLE
    .\view-logs.ps1 -Search "Stripe"
    Busca logs que contengan "Stripe"

.EXAMPLE
    .\view-logs.ps1 -Level Error -Tail 20
    Muestra los últimos 20 errores
#>

param(
    [int]$Tail = 50,
    [string]$Level = "",
    [string]$Search = "",
    [switch]$ErrorOnly = $false,
    [switch]$Today = $false
)

# Obtener el directorio del script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "..\Backend\Ecommerce.Api\logs"

# Verificar que el directorio de logs existe
if (-not (Test-Path $LogDir)) {
    Write-Host "❌ Directorio de logs no encontrado: $LogDir" -ForegroundColor Red
    Write-Host "   Asegúrate de que la aplicación haya corrido al menos una vez." -ForegroundColor Yellow
    exit 1
}

# Obtener el archivo de log más reciente
if ($Today) {
    $LogPattern = "urbaniq-$((Get-Date).ToString('yyyyMMdd'))*.log"
} else {
    $LogPattern = "urbaniq-*.log"
}

$LogFiles = Get-ChildItem -Path $LogDir -Filter $LogPattern | Sort-Object LastWriteTime -Descending

if ($LogFiles.Count -eq 0) {
    Write-Host "❌ No se encontraron archivos de logs con el patrón: $LogPattern" -ForegroundColor Red
    Write-Host "   Archivos disponibles:" -ForegroundColor Yellow
    Get-ChildItem -Path $LogDir | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
    exit 1
}

$LatestLog = $LogFiles[0]
Write-Host "📄 Leyendo archivo: $($LatestLog.Name)" -ForegroundColor Cyan
Write-Host "📅 Última modificación: $($LatestLog.LastWriteTime)" -ForegroundColor Cyan
Write-Host ""

# Leer el log
$Content = Get-Content $LatestLog.FullName -Tail $Tail

# Filtrar por nivel si se especifica
if ($Level -ne "") {
    $Content = $Content | Where-Object { $_ -match "\[$Level\]" }
}

# Filtrar solo errores si se especifica
if ($ErrorOnly) {
    $Content = $Content | Where-Object { $_ -match "\[ERR\]" -or $_ -match "\[FAT\]" }
}

# Buscar patrón si se especifica
if ($Search -ne "") {
    $Content = $Content | Where-Object { $_ -match $Search }
}

# Mostrar resultados
if ($Content.Count -eq 0) {
    Write-Host "ℹ️  No se encontraron logs con los filtros especificados." -ForegroundColor Yellow
} else {
    foreach ($Line in $Content) {
        # Colorear según nivel
        if ($Line -match "\[INF\]") {
            Write-Host $Line -ForegroundColor Green
        } elseif ($Line -match "\[WRN\]") {
            Write-Host $Line -ForegroundColor Yellow
        } elseif ($Line -match "\[ERR\]") {
            Write-Host $Line -ForegroundColor Red
        } elseif ($Line -match "\[FAT\]") {
            Write-Host $Line -ForegroundColor Magenta
        } elseif ($Line -match "\[DBG\]") {
            Write-Host $Line -ForegroundColor Gray
        } else {
            Write-Host $Line
        }
    }
}

Write-Host ""
Write-Host "📊 Estadísticas:" -ForegroundColor Cyan
Write-Host "   Líneas mostradas: $($Content.Count)" -ForegroundColor Gray
Write-Host "   Tamaño del archivo: $([math]::Round($LatestLog.Length / 1KB, 2)) KB" -ForegroundColor Gray
Write-Host "   Total de archivos de logs: $($LogFiles.Count)" -ForegroundColor Gray
