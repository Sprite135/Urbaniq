# SQL Server Backup Configuration - Urbaniq

## 📋 **RESUMEN**

Script automatizado para backup diario de la base de datos SQL Server.

---

## 🛠️ **INSTALACIÓN**

### **1. Verificar SQL Server y sqlcmd**

```powershell
# Verificar si sqlcmd está instalado
sqlcmd -?

# Si no está instalado, instalar SQL Server Management Studio o SQL Server Command Line Tools
```

### **2. Crear directorio de backups**

```powershell
# El script crea automáticamente el directorio:
C:\Users\sprit\CascadeProjects\Urbaniq\backups
```

### **3. Probar el backup manualmente**

```powershell
cd C:\Users\sprit\CascadeProjects\Urbaniq\scripts
.\backup-database.ps1
```

---

## ⏰ **CONFIGURAR TAREA PROGRAMADA (WINDOWS TASK SCHEDULER)**

### **Método 1: Usando Programador de Tareas de Windows**

1. **Abrir Programador de Tareas:**
   - Win + R → `taskschd.msc`

2. **Crear Tarea Básica:**
   - Acción: `Crear tarea básica`
   - Nombre: `Urbaniq Database Backup`
   - Descripción: `Backup diario de la base de datos Urbaniq`

3. **Desencadenador (Trigger):**
   - Diario
   - Hora: 2:00 AM (o cuando menos tráfico)
   - Recurrir cada: 1 día

4. **Acción:**
   - Programa: `powershell.exe`
   - Argumentos: `-ExecutionPolicy Bypass -File "C:\Users\sprit\CascadeProjects\Urbaniq\scripts\backup-database.ps1"`
   - Iniciar en: `C:\Users\sprit\CascadeProjects\Urbaniq\scripts`

5. **Condiciones:**
   - ✅ Ejecutar solo si el equipo está conectado a la red
   - ✅ Ejecutar aunque el usuario no haya iniciado sesión

6. **Configuración:**
   - ✅ Ejecutar con los máximos privilegios
   - ✅ Ejecutar aunque la tarea esté programada

### **Método 2: Usando PowerShell (Automático)**

```powershell
# Crear tarea programada automáticamente
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File 'C:\Users\sprit\CascadeProjects\Urbaniq\scripts\backup-database.ps1'"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Urbaniq Database Backup" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest
```

---

## 📁 **UBICACIÓN DE BACKUPS**

```
C:\Users\sprit\CascadeProjects\Urbaniq\backups\
├── EcommerceDb_20260831_020000.bak
├── EcommerceDb_20260830_020000.bak
└── EcommerceDb_20260829_020000.bak
```

---

## 🔄 **POLÍTICA DE RETENCIÓN**

- **Por defecto:** 7 días
- **Cambio:** Modificar `$RetentionDays` en el script
- **Ejemplo:** Para 30 días: `$RetentionDays = 30`

---

## 🛡️ **RESTAURACIÓN DE BACKUP**

### **Restaurar desde PowerShell:**

```powershell
# Restaurar backup más reciente
$LatestBackup = Get-ChildItem C:\Users\sprit\CascadeProjects\Urbaniq\backups -Filter "EcommerceDb_*.bak" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

sqlcmd -S "(localdb)\MSSQLLocalDB" -Q "RESTORE DATABASE [EcommerceDb] FROM DISK = N'$($LatestBackup.FullName)' WITH REPLACE;"
```

### **Restaurar desde SQL Server Management Studio:**

1. Abrir SSMS
2. Right-click en `Databases` → `Restore Database`
3. Seleccionar `Device` → buscar archivo `.bak`
4. Click `OK`

---

## 🚨 **MONITOREO DE BACKUPS**

### **Verificar último backup:**

```powershell
Get-ChildItem C:\Users\sprit\CascadeProjects\Urbaniq\backups -Filter "EcommerceDb_*.bak" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1 | 
    Format-List Name, LastWriteTime, Length
```

### **Alerta de backup fallido:**

El script retorna exit code 1 si falla, lo que genera alerta en Task Scheduler.

---

## 📋 **CHECKLIST PRODUCCIÓN**

- [ ] Script de backup creado
- [ ] Tarea programada configurada
- [ ] Backup manual probado exitosamente
- [ ] Restauración probada exitosamente
- [ ] Política de retención definida
- [ ] Off-site backup (opcional) configurado

---

## 💾 **OFF-SITE BACKUP (OPCIONAL)**

Para copias de seguridad en la nube:

```powershell
# Agregar al script backup-database.ps1
# Copiar backup a Azure Blob Storage
az storage blob upload --container backups --file $BackupFile --name $DatabaseName_$Timestamp.bak

# O copiar a Google Drive / Dropbox
# Agregar comandos de tu proveedor
```

---

## ✅ **ESTADO**

- **Script:** ✅ Creado
- **Tarea programada:** ⏳ Configurar
- **Restauración:** ⏳ Probar
- **Off-site:** ⏳ Opcional
