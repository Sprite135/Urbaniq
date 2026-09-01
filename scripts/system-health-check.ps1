# System Health Check Script for Urbaniq
# Verifica el estado de todos los componentes críticos del sistema

param(
    [string]$BackendUrl = "http://localhost:5215",
    [string]$DatabaseServer = "(localdb)\MSSQLLocalDB",
    [string]$DatabaseName = "EcommerceDb",
    [string]$RedisHost = "localhost",
    [int]$RedisPort = 6379
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Color = switch ($Status) {
        "OK" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$Timestamp] [$Status] $Message" -ForegroundColor $Color
}

Write-Status "=== System Health Check for Urbaniq ===" "INFO"
Write-Status ""

# ==================== 1. Backend API Check ====================
Write-Status "1. Checking Backend API..." "INFO"
try {
    $Response = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing -TimeoutSec 5
    if ($Response.StatusCode -eq 200 -and $Response.Content -eq "Healthy") {
        Write-Status "✅ Backend API is healthy" "OK"
    } else {
        Write-Status "❌ Backend API returned unexpected status: $($Response.StatusCode)" "ERROR"
    }
}
catch {
    Write-Status "❌ Backend API is not responding: $_" "ERROR"
}
Write-Status ""

# ==================== 2. Database Check ====================
Write-Status "2. Checking SQL Server Database..." "INFO"
try {
    $SqlCmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $SqlCmdPath) {
        Write-Status "❌ sqlcmd not found" "ERROR"
    } else {
        $TestConnectionSql = "SELECT 1"
        $TestResult = sqlcmd -S $DatabaseServer -Q $TestConnectionSql -E -h -1 -W 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Status "✅ SQL Server connection successful" "OK"
            
            # Check if database exists
            $DbCheckSql = "SELECT name FROM sys.databases WHERE name = '$DatabaseName'"
            $DbResult = sqlcmd -S $DatabaseServer -Q $DbCheckSql -E -h -1 -W 2>&1
            if ($LASTEXITCODE -eq 0 -and $DbResult -eq $DatabaseName) {
                Write-Status "✅ Database '$DatabaseName' exists" "OK"
            } else {
                Write-Status "❌ Database '$DatabaseName' not found" "ERROR"
            }
        } else {
            Write-Status "❌ SQL Server connection failed: $TestResult" "ERROR"
        }
    }
}
catch {
    Write-Status "❌ Database check error: $_" "ERROR"
}
Write-Status ""

# ==================== 3. Redis Check ====================
Write-Status "3. Checking Redis..." "INFO"
try {
    $RedisClient = New-Object System.Net.Sockets.TcpClient
    $RedisClient.Connect($RedisHost, $RedisPort)
    Write-Status "✅ Redis connection successful" "OK"
    $RedisClient.Close()
}
catch {
    Write-Status "⚠️ Redis connection failed (non-critical): $_" "WARNING"
}
Write-Status ""

# ==================== 4. File System Check ====================
Write-Status "4. Checking File System..." "INFO"
try {
    $BackupPath = "C:\Users\sprit\CascadeProjects\Urbaniq\backups"
    if (Test-Path $BackupPath) {
        $Writable = Test-Path "$BackupPath\write_test.tmp"
        if ($Writable) {
            "test" | Out-File -FilePath "$BackupPath\write_test.tmp" -Force
            Remove-Item "$BackupPath\write_test.tmp" -Force
            Write-Status "✅ Backup directory is writable" "OK"
        } else {
            Write-Status "❌ Backup directory is not writable" "ERROR"
        }
    } else {
        Write-Status "⚠️ Backup directory does not exist (will be created by backup script)" "WARNING"
    }
    
    $UploadPath = "Backend\Ecommerce.Api\wwwroot\uploads"
    if (Test-Path $UploadPath) {
        Write-Status "✅ Upload directory exists" "OK"
    } else {
        Write-Status "❌ Upload directory does not exist" "ERROR"
    }
}
catch {
    Write-Status "❌ File system check error: $_" "ERROR"
}
Write-Status ""

# ==================== 5. Recent Backups Check ====================
Write-Status "5. Checking Recent Backups..." "INFO"
try {
    $BackupPath = "C:\Users\sprit\CascadeProjects\Urbaniq\backups"
    if (Test-Path $BackupPath) {
        $RecentBackups = Get-ChildItem -Path $BackupPath -Filter "$DatabaseName_*.bak" | 
                          Sort-Object LastWriteTime -Descending | 
                          Select-Object -First 3
        
        if ($RecentBackups) {
            Write-Status "✅ Found $($RecentBackups.Count) recent backup(s)" "OK"
            foreach ($Backup in $RecentBackups) {
                $SizeMB = [math]::Round($Backup.Length / 1MB, 2)
                Write-Status "   - $($Backup.Name) ($SizeMB MB, $($Backup.LastWriteTime))" "INFO"
            }
        } else {
            Write-Status "⚠️ No recent backups found" "WARNING"
        }
    } else {
        Write-Status "⚠️ Backup directory does not exist" "WARNING"
    }
}
catch {
    Write-Status "❌ Backup check error: $_" "ERROR"
}
Write-Status ""

# ==================== 6. Configuration Check ====================
Write-Status "6. Checking Configuration Files..." "INFO"
try {
    $ConfigFiles = @(
        "Backend\Ecommerce.Api\appsettings.json",
        "Backend\Ecommerce.Api\appsettings.LocalDb.json",
        "Backend\Ecommerce.Api\appsettings.Production.json"
    )
    
    foreach ($ConfigFile in $ConfigFiles) {
        if (Test-Path $ConfigFile) {
            Write-Status "✅ $ConfigFile exists" "OK"
        } else {
            Write-Status "⚠️ $ConfigFile does not exist" "WARNING"
        }
    }
}
catch {
    Write-Status "❌ Configuration check error: $_" "ERROR"
}
Write-Status ""

# ==================== 7. Disk Space Check ====================
Write-Status "7. Checking Disk Space..." "INFO"
try {
    $Drive = Get-PSDrive C
    $FreeGB = [math]::Round($Drive.Free / 1GB, 2)
    $UsedGB = [math]::Round(($Drive.Used / 1GB), 2)
    $TotalGB = [math]::Round(($Drive.Used + $Drive.Free) / 1GB, 2)
    $PercentUsed = [math]::Round(($Drive.Used / ($Drive.Used + $Drive.Free)) * 100, 2)
    
    Write-Status "Disk C: $FreeGB GB free of $TotalGB GB ($PercentUsed% used)" "INFO"
    
    if ($FreeGB -lt 10) {
        Write-Status "⚠️ Low disk space warning (less than 10 GB free)" "WARNING"
    } else {
        Write-Status "✅ Disk space sufficient" "OK"
    }
}
catch {
    Write-Status "❌ Disk space check error: $_" "ERROR"
}
Write-Status ""

# ==================== 8. Processes Check ====================
Write-Status "8. Checking Running Processes..." "INFO"
try {
    $DotnetProcess = Get-Process dotnet -ErrorAction SilentlyContinue
    if ($DotnetProcess) {
        Write-Status "✅ dotnet process is running (PID: $($DotnetProcess.Id))" "OK"
    } else {
        Write-Status "⚠️ dotnet process not found (backend may not be running)" "WARNING"
    }
}
catch {
    Write-Status "❌ Process check error: $_" "ERROR"
}
Write-Status ""

# ==================== SUMMARY ====================
Write-Status "=== Health Check Complete ===" "INFO"
Write-Status "Run this script regularly to monitor system health" "INFO"
Write-Status "For automated monitoring, consider using UptimeRobot or similar services" "INFO"
