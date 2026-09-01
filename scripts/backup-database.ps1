# SQL Server Database Backup Script for Urbaniq
# Run this script daily via Windows Task Scheduler
# Usage: .\backup-database.ps1 -BackupPath "C:\backups" -DatabaseName "EcommerceDb" -ServerInstance "(localdb)\MSSQLLocalDB" -RetentionDays 7

param(
    [string]$BackupPath = "C:\Users\sprit\CascadeProjects\Urbaniq\backups",
    [string]$DatabaseName = "EcommerceDb",
    [string]$ServerInstance = "(localdb)\MSSQLLocalDB",
    [int]$RetentionDays = 7
)

# Enable error handling
$ErrorActionPreference = "Stop"

# Logging function
function Log-Message {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Write-Host $LogMessage
    
    # Also log to file if log directory exists
    $LogPath = Join-Path $BackupPath "backup.log"
    if (Test-Path $BackupPath) {
        Add-Content -Path $LogPath -Value $LogMessage
    }
}

Log-Message "=== Starting backup process ==="

# Validate parameters
if ([string]::IsNullOrWhiteSpace($BackupPath)) {
    Log-Message "Backup path cannot be empty" "ERROR"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
    Log-Message "Database name cannot be empty" "ERROR"
    exit 1
}

if ($RetentionDays -lt 1) {
    Log-Message "Retention days must be at least 1" "ERROR"
    exit 1
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupPath)) {
    try {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
        Log-Message "Created backup directory: $BackupPath"
    }
    catch {
        Log-Message "Failed to create backup directory: $_" "ERROR"
        exit 1
    }
}

# Test if backup directory is writable
try {
    $TestFile = Join-Path $BackupPath "write_test.tmp"
    "test" | Out-File -FilePath $TestFile -Force
    Remove-Item $TestFile -Force
    Log-Message "Backup directory is writable"
}
catch {
    Log-Message "Backup directory is not writable: $_" "ERROR"
    exit 1
}

# Generate timestamp for backup file
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupPath\$DatabaseName_$Timestamp.bak"

Log-Message "Starting backup of $DatabaseName..."
Log-Message "Server: $ServerInstance"
Log-Message "Backup file: $BackupFile"

try {
    # Check if sqlcmd is available
    $SqlCmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $SqlCmdPath) {
        Log-Message "sqlcmd not found. Please install SQL Server Command Line Tools" "ERROR"
        exit 1
    }
    Log-Message "sqlcmd found at: $($SqlCmdPath.Source)"

    # Test database connection
    $TestConnectionSql = "SELECT 1"
    $TestResult = sqlcmd -S $ServerInstance -Q $TestConnectionSql -E -h -1 -W 2>&1
    if ($LASTEXITCODE -ne 0) {
        Log-Message "Failed to connect to SQL Server: $TestResult" "ERROR"
        exit 1
    }
    Log-Message "Database connection successful"

    # Execute backup using sqlcmd (without compression for Express Edition)
    $BackupSql = "BACKUP DATABASE [$DatabaseName] TO DISK = N'$BackupFile' WITH FORMAT, MEDIANAME = 'UrbaniqBackup', NAME = 'Full Backup of $DatabaseName';"
    
    $BackupResult = sqlcmd -S $ServerInstance -Q $BackupSql -E 2>&1
    $BackupOutput = $BackupResult | Out-String

    if ($LASTEXITCODE -eq 0) {
        Log-Message "✅ Backup completed successfully: $BackupFile"
        
        # Verify backup file exists and has content
        if (Test-Path $BackupFile) {
            $FileSize = (Get-Item $BackupFile).Length / 1MB
            if ($FileSize -gt 0) {
                Log-Message "Backup size: $([math]::Round($FileSize, 2)) MB"
                Log-Message "Backup file verified"
            } else {
                Log-Message "Backup file is empty!" "ERROR"
                exit 1
            }
        } else {
            Log-Message "Backup file was not created!" "ERROR"
            exit 1
        }
    } else {
        Log-Message "❌ Backup failed with exit code: $LASTEXITCODE" "ERROR"
        Log-Message "Backup output: $BackupOutput" "ERROR"
        exit 1
    }
}
catch {
    Log-Message "❌ Error during backup: $_" "ERROR"
    exit 1
}

# Clean up old backups
Log-Message "Cleaning up backups older than $RetentionDays days..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)

try {
    $OldBackups = Get-ChildItem -Path $BackupPath -Filter "$DatabaseName_*.bak" | 
        Where-Object { $_.LastWriteTime -lt $CutoffDate }
    
    if ($OldBackups) {
        $DeletedCount = 0
        foreach ($Backup in $OldBackups) {
            Remove-Item $Backup.FullName -Force
            Log-Message "Deleted old backup: $($Backup.Name)"
            $DeletedCount++
        }
        Log-Message "Deleted $DeletedCount old backup(s)"
    } else {
        Log-Message "No old backups to delete"
    }
}
catch {
    Log-Message "Error cleaning up old backups: $_" "WARNING"
}

# Summary
$TotalBackups = (Get-ChildItem -Path $BackupPath -Filter "$DatabaseName_*.bak").Count
$TotalSize = ((Get-ChildItem -Path $BackupPath -Filter "$DatabaseName_*.bak" | Measure-Object -Property Length -Sum).Sum / 1MB)

Log-Message "=== Backup process completed ==="
Log-Message "Total backups in directory: $TotalBackups"
Log-Message "Total backup size: $([math]::Round($TotalSize, 2)) MB"
Log-Message "Retention policy: $RetentionDays days"

exit 0
