# Script para crear tarea programada de backup (requiere ejecutar como Administrador)
# Ejecutar: Right-click → Ejecutar como Administrador

Write-Host "Creando tarea programada de backup de Urbaniq..." -ForegroundColor Cyan

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File 'C:\Users\sprit\CascadeProjects\Urbaniq\scripts\backup-database.ps1'"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

try {
    Register-ScheduledTask -TaskName "Urbaniq Database Backup" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force
    Write-Host "✅ Tarea programada creada exitosamente" -ForegroundColor Green
    Write-Host "   Nombre: Urbaniq Database Backup" -ForegroundColor White
    Write-Host "   Horario: 2:00 AM diario" -ForegroundColor White
    Write-Host "   Script: backup-database.ps1" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Para verificar la tarea:" -ForegroundColor Yellow
    Write-Host "  1. Abrir Programador de Tareas (taskschd.msc)" -ForegroundColor White
    Write-Host "  2. Buscar 'Urbaniq Database Backup'" -ForegroundColor White
    Write-Host "  3. Right-click → Ejecutar para probar manualmente" -ForegroundColor White
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script como Administrador" -ForegroundColor Yellow
    Write-Host "   Right-click → Ejecutar como Administrador" -ForegroundColor Yellow
    exit 1
}
