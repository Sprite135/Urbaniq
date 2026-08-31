# SQL Server Database Backup Script for Urbaniq
# Run this script daily via Windows Task Scheduler

param(
    [string]$BackupPath = "C:\Users\sprit\CascadeProjects\Urbaniq\backups",
    [string]$DatabaseName = "EcommerceDb",
    [string]$ServerInstance = "(localdb)\MSSQLLocalDB",
    [int]$RetentionDays = 7
)

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
    Write-Host "Created backup directory: $BackupPath"
}

# Generate timestamp for backup file
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupPath\$DatabaseName_$Timestamp.bak"

Write-Host "Starting backup of $DatabaseName..."
Write-Host "Server: $ServerInstance"
Write-Host "Backup file: $BackupFile"

try {
    # Execute backup using sqlcmd (without compression for Express Edition)
    $BackupSql = "BACKUP DATABASE [$DatabaseName] TO DISK = N'$BackupFile' WITH FORMAT, MEDIANAME = 'UrbaniqBackup', NAME = 'Full Backup of $DatabaseName';"
    
    sqlcmd -S $ServerInstance -Q $BackupSql -E

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup completed successfully: $BackupFile"
        
        # Get file size
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "Backup size: $([math]::Round($FileSize, 2)) MB"
    } else {
        Write-Host "❌ Backup failed with exit code: $LASTEXITCODE"
        exit 1
    }
}
catch {
    Write-Host "❌ Error during backup: $_"
    exit 1
}

# Clean up old backups
Write-Host "Cleaning up backups older than $RetentionDays days..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)

Get-ChildItem -Path $BackupPath -Filter "$DatabaseName_*.bak" | 
    Where-Object { $_.LastWriteTime -lt $CutoffDate } | 
    ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Deleted old backup: $($_.Name)"
    }

Write-Host "✅ Backup process completed"
